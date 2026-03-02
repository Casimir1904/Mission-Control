"""Test task creation with recurrence_rule field."""

from __future__ import annotations

from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.boards import Board
from app.models.organizations import Organization
from app.models.tasks import Task
from app.schemas.tasks import RecurrenceRule, TaskCreate


async def _make_engine() -> AsyncEngine:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.connect() as conn, conn.begin():
        await conn.run_sync(SQLModel.metadata.create_all)
    return engine


async def _make_session(engine: AsyncEngine) -> AsyncSession:
    return AsyncSession(engine, expire_on_commit=False)


@pytest.mark.asyncio
async def test_task_create_schema_with_recurrence_rule() -> None:
    """Test that TaskCreate schema accepts recurrence_rule."""
    # Test with daily frequency
    tc = TaskCreate(
        title="Daily Standup",
        recurrence_rule=RecurrenceRule(frequency="daily", interval=1),
    )
    assert tc.recurrence_rule is not None
    assert tc.recurrence_rule.frequency == "daily"
    assert tc.recurrence_rule.interval == 1

    # Test model_dump converts to dict
    data = tc.model_dump(exclude={"depends_on_task_ids", "tag_ids", "custom_field_values"})
    assert "recurrence_rule" in data
    assert data["recurrence_rule"] == {"frequency": "daily", "interval": 1, "until": None}


@pytest.mark.asyncio
async def test_task_create_schema_with_weekly_recurrence() -> None:
    """Test TaskCreate with weekly recurrence."""
    tc = TaskCreate(
        title="Weekly Review",
        recurrence_rule=RecurrenceRule(frequency="weekly", interval=2),
    )
    assert tc.recurrence_rule.frequency == "weekly"
    assert tc.recurrence_rule.interval == 2


@pytest.mark.asyncio
async def test_task_model_accepts_recurrence_rule_dict() -> None:
    """Test that Task model accepts recurrence_rule as dict."""
    engine = await _make_engine()
    try:
        async with await _make_session(engine) as session:
            org_id = uuid4()
            board_id = uuid4()

            session.add(Organization(id=org_id, name="Test Org"))
            session.add(
                Board(
                    id=board_id,
                    organization_id=org_id,
                    name="Test Board",
                    slug="test-board",
                ),
            )
            await session.commit()

            # Create task with recurrence_rule dict
            task = Task(
                board_id=board_id,
                title="Daily Task",
                recurrence_rule={"frequency": "daily", "interval": 1},
            )
            session.add(task)
            await session.commit()
            await session.refresh(task)

            assert task.recurrence_rule is not None
            assert task.recurrence_rule["frequency"] == "daily"
            assert task.recurrence_rule["interval"] == 1
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_task_model_accepts_none_recurrence_rule() -> None:
    """Test that Task model works without recurrence_rule."""
    engine = await _make_engine()
    try:
        async with await _make_session(engine) as session:
            org_id = uuid4()
            board_id = uuid4()

            session.add(Organization(id=org_id, name="Test Org"))
            session.add(
                Board(
                    id=board_id,
                    organization_id=org_id,
                    name="Test Board",
                    slug="test-board",
                ),
            )
            await session.commit()

            # Create task without recurrence_rule
            task = Task(
                board_id=board_id,
                title="One-time Task",
                recurrence_rule=None,
            )
            session.add(task)
            await session.commit()
            await session.refresh(task)

            assert task.recurrence_rule is None
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_task_model_validate_with_recurrence_rule() -> None:
    """Test Task.model_validate with recurrence_rule from TaskCreate."""
    tc = TaskCreate(
        title="Daily Standup",
        recurrence_rule=RecurrenceRule(frequency="daily", interval=1),
    )

    data = tc.model_dump(exclude={"depends_on_task_ids", "tag_ids", "custom_field_values"})
    task = Task.model_validate(data)

    assert task.title == "Daily Standup"
    assert task.recurrence_rule == {"frequency": "daily", "interval": 1, "until": None}
