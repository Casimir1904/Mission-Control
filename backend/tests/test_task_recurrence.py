# ruff: noqa: INP001

"""Integration tests for task recurrence flow."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from unittest.mock import patch
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from sqlmodel import SQLModel, col, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.deps import ActorContext
from app.api.tasks import _apply_lead_task_update, _TaskUpdateInput
from app.models.agents import Agent
from app.models.boards import Board
from app.models.organizations import Organization
from app.models.tasks import Task
from app.services.recurrence import calculate_next_occurrence
from app.services.recurrence_queue import QueuedRecurrenceTask


async def _make_engine() -> AsyncEngine:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.connect() as conn, conn.begin():
        await conn.run_sync(SQLModel.metadata.create_all)
    return engine


async def _make_session(engine: AsyncEngine) -> AsyncSession:
    return AsyncSession(engine, expire_on_commit=False)


@pytest.mark.asyncio
async def test_daily_recurrence_calculates_next_occurrence() -> None:
    """Test that calculate_next_occurrence correctly adds one day for daily frequency."""
    base_date = datetime(2026, 3, 2, 10, 0, 0, tzinfo=UTC)
    recurrence_rule = {"frequency": "daily", "interval": 1}

    next_occurrence = calculate_next_occurrence(recurrence_rule, base_date)

    expected = datetime(2026, 3, 3, 10, 0, 0, tzinfo=UTC)
    assert next_occurrence == expected


@pytest.mark.asyncio
async def test_daily_recurrence_enqueue_on_task_completion() -> None:
    """Test that completing a daily recurring task enqueues next occurrence generation."""
    engine = await _make_engine()
    try:
        async with await _make_session(engine) as session:
            org_id = uuid4()
            board_id = uuid4()
            lead_id = uuid4()
            task_id = uuid4()

            session.add(Organization(id=org_id, name="Test Org"))
            session.add(
                Board(
                    id=board_id,
                    organization_id=org_id,
                    name="Test Board",
                    slug="test-board",
                    require_approval_for_done=False,
                    require_review_before_done=False,
                ),
            )
            session.add(
                Agent(
                    id=lead_id,
                    name="Lead",
                    board_id=board_id,
                    gateway_id=uuid4(),
                    is_board_lead=True,
                    openclaw_session_id="agent:lead:session",
                ),
            )
            # Lead can only change status when task is in 'review' status
            session.add(
                Task(
                    id=task_id,
                    board_id=board_id,
                    title="Daily Standup",
                    description="Daily team standup meeting",
                    status="review",
                    recurrence_rule={"frequency": "daily", "interval": 1},
                ),
            )
            await session.commit()

            lead = (await session.exec(select(Agent).where(col(Agent.id) == lead_id))).first()
            task = (await session.exec(select(Task).where(col(Task.id) == task_id))).first()
            assert lead is not None
            assert task is not None

            # Mock enqueue_recurrence_task to capture the payload
            enqueued_payloads: list[QueuedRecurrenceTask] = []

            def mock_enqueue(payload: QueuedRecurrenceTask) -> bool:
                enqueued_payloads.append(payload)
                return True

            with patch("app.api.tasks.enqueue_recurrence_task", side_effect=mock_enqueue):
                update = _TaskUpdateInput(
                    task=task,
                    actor=ActorContext(actor_type="agent", agent=lead),
                    board_id=board_id,
                    previous_status=task.status,
                    previous_assigned=task.assigned_agent_id,
                    status_requested=True,
                    updates={"status": "done"},
                    comment=None,
                    depends_on_task_ids=None,
                    tag_ids=None,
                    custom_field_values={},
                    custom_field_values_set=False,
                )

                await _apply_lead_task_update(session, update=update)
                await session.commit()

            # Verify the task was marked done
            reloaded = (await session.exec(select(Task).where(col(Task.id) == task_id))).first()
            assert reloaded is not None
            assert reloaded.status == "done"

            # Verify that a recurrence task was enqueued
            assert len(enqueued_payloads) == 1
            payload = enqueued_payloads[0]
            assert payload.task_id == task_id
            assert payload.board_id == board_id

            # Verify the scheduled time is approximately 1 day in the future
            now = datetime.now(UTC)
            expected_future = now + timedelta(days=1)
            # Allow 5 minute tolerance for test execution time
            assert abs((payload.scheduled_at - expected_future).total_seconds()) < 300

    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_no_recurrence_enqueue_when_no_recurrence_rule() -> None:
    """Test that completing a non-recurring task does not enqueue anything."""
    engine = await _make_engine()
    try:
        async with await _make_session(engine) as session:
            org_id = uuid4()
            board_id = uuid4()
            lead_id = uuid4()
            task_id = uuid4()

            session.add(Organization(id=org_id, name="Test Org"))
            session.add(
                Board(
                    id=board_id,
                    organization_id=org_id,
                    name="Test Board",
                    slug="test-board",
                    require_approval_for_done=False,
                    require_review_before_done=False,
                ),
            )
            session.add(
                Agent(
                    id=lead_id,
                    name="Lead",
                    board_id=board_id,
                    gateway_id=uuid4(),
                    is_board_lead=True,
                    openclaw_session_id="agent:lead:session",
                ),
            )
            # Lead can only change status when task is in 'review' status
            session.add(
                Task(
                    id=task_id,
                    board_id=board_id,
                    title="One-time Task",
                    description="Non-recurring task",
                    status="review",
                    recurrence_rule=None,
                ),
            )
            await session.commit()

            lead = (await session.exec(select(Agent).where(col(Agent.id) == lead_id))).first()
            task = (await session.exec(select(Task).where(col(Task.id) == task_id))).first()
            assert lead is not None
            assert task is not None

            # Mock enqueue_recurrence_task to capture the payload
            enqueued_payloads: list[QueuedRecurrenceTask] = []

            def mock_enqueue(payload: QueuedRecurrenceTask) -> bool:
                enqueued_payloads.append(payload)
                return True

            with patch("app.api.tasks.enqueue_recurrence_task", side_effect=mock_enqueue):
                update = _TaskUpdateInput(
                    task=task,
                    actor=ActorContext(actor_type="agent", agent=lead),
                    board_id=board_id,
                    previous_status=task.status,
                    previous_assigned=task.assigned_agent_id,
                    status_requested=True,
                    updates={"status": "done"},
                    comment=None,
                    depends_on_task_ids=None,
                    tag_ids=None,
                    custom_field_values={},
                    custom_field_values_set=False,
                )

                await _apply_lead_task_update(session, update=update)
                await session.commit()

            # Verify the task was marked done
            reloaded = (await session.exec(select(Task).where(col(Task.id) == task_id))).first()
            assert reloaded is not None
            assert reloaded.status == "done"

            # Verify that NO recurrence task was enqueued
            assert len(enqueued_payloads) == 0

    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_no_recurrence_enqueue_when_not_done() -> None:
    """Test that moving a recurring task to inbox (not done) does not enqueue."""
    engine = await _make_engine()
    try:
        async with await _make_session(engine) as session:
            org_id = uuid4()
            board_id = uuid4()
            lead_id = uuid4()
            task_id = uuid4()

            session.add(Organization(id=org_id, name="Test Org"))
            session.add(
                Board(
                    id=board_id,
                    organization_id=org_id,
                    name="Test Board",
                    slug="test-board",
                    require_approval_for_done=False,
                    require_review_before_done=False,
                ),
            )
            session.add(
                Agent(
                    id=lead_id,
                    name="Lead",
                    board_id=board_id,
                    gateway_id=uuid4(),
                    is_board_lead=True,
                    openclaw_session_id="agent:lead:session",
                ),
            )
            # Lead can only change status when task is in 'review' status
            session.add(
                Task(
                    id=task_id,
                    board_id=board_id,
                    title="Daily Standup",
                    description="Daily team standup meeting",
                    status="review",
                    recurrence_rule={"frequency": "daily", "interval": 1},
                ),
            )
            await session.commit()

            lead = (await session.exec(select(Agent).where(col(Agent.id) == lead_id))).first()
            task = (await session.exec(select(Task).where(col(Task.id) == task_id))).first()
            assert lead is not None
            assert task is not None

            # Mock enqueue_recurrence_task to capture the payload
            enqueued_payloads: list[QueuedRecurrenceTask] = []

            def mock_enqueue(payload: QueuedRecurrenceTask) -> bool:
                enqueued_payloads.append(payload)
                return True

            with patch("app.api.tasks.enqueue_recurrence_task", side_effect=mock_enqueue):
                # Move to inbox (not done)
                update = _TaskUpdateInput(
                    task=task,
                    actor=ActorContext(actor_type="agent", agent=lead),
                    board_id=board_id,
                    previous_status=task.status,
                    previous_assigned=task.assigned_agent_id,
                    status_requested=True,
                    updates={"status": "inbox"},
                    comment=None,
                    depends_on_task_ids=None,
                    tag_ids=None,
                    custom_field_values={},
                    custom_field_values_set=False,
                )

                await _apply_lead_task_update(session, update=update)
                await session.commit()

            # Verify the task was moved to inbox
            reloaded = (await session.exec(select(Task).where(col(Task.id) == task_id))).first()
            assert reloaded is not None
            assert reloaded.status == "inbox"

            # Verify that NO recurrence task was enqueued (status is not done)
            assert len(enqueued_payloads) == 0

    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_weekly_recurrence_calculates_next_occurrence() -> None:
    """Test that calculate_next_occurrence correctly adds one week for weekly frequency."""
    base_date = datetime(2026, 3, 2, 10, 0, 0, tzinfo=UTC)
    recurrence_rule = {"frequency": "weekly", "interval": 1}

    next_occurrence = calculate_next_occurrence(recurrence_rule, base_date)

    expected = datetime(2026, 3, 9, 10, 0, 0, tzinfo=UTC)
    assert next_occurrence == expected


@pytest.mark.asyncio
async def test_monthly_recurrence_calculates_next_occurrence() -> None:
    """Test that calculate_next_occurrence correctly adds one month for monthly frequency."""
    base_date = datetime(2026, 3, 15, 10, 0, 0, tzinfo=UTC)
    recurrence_rule = {"frequency": "monthly", "interval": 1}

    next_occurrence = calculate_next_occurrence(recurrence_rule, base_date)

    expected = datetime(2026, 4, 15, 10, 0, 0, tzinfo=UTC)
    assert next_occurrence == expected
