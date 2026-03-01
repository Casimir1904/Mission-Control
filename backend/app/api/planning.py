"""API endpoints for AI-driven task planning."""

from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import require_org_admin
from app.db import crud
from app.db.session import get_session
from app.models.tasks import Task
from app.schemas.common import OkResponse
from app.schemas.planning import (
    PlanningAnswerRequest,
    PlanningQuestionRead,
    PlanningSessionRead,
    PlanningStartRequest,
)
from app.services.planning_service import PlanningService

if TYPE_CHECKING:
    from sqlmodel.ext.asyncio.session import AsyncSession

    from app.services.organizations import OrganizationContext

router = APIRouter(prefix="/tasks/{task_id}/planning", tags=["planning"])
SESSION_DEP = Depends(get_session)
ORG_ADMIN_DEP = Depends(require_org_admin)


async def _get_task_or_404(
    task_id: UUID,
    session: AsyncSession,
) -> Task:
    task = await crud.get_by_id(session, Task, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


@router.post("/start", response_model=PlanningSessionRead)
async def start_planning(
    task_id: UUID,
    payload: PlanningStartRequest,
    session: AsyncSession = SESSION_DEP,
    ctx: OrganizationContext = ORG_ADMIN_DEP,
) -> PlanningSessionRead:
    """Start an AI planning session for a task."""
    task = await _get_task_or_404(task_id, session)
    service = PlanningService(session)
    planning_session = await service.start_planning(
        task_id=task.id,
        gateway_id=payload.gateway_id,
        task_title=task.title,
        task_description=task.description,
    )
    questions = await service.get_questions(planning_session.id)
    return PlanningSessionRead(
        id=planning_session.id,
        task_id=planning_session.task_id,
        gateway_id=planning_session.gateway_id,
        gateway_session_key=planning_session.gateway_session_key,
        status=planning_session.status,
        current_question_index=planning_session.current_question_index,
        planning_spec=planning_session.planning_spec,
        planning_agents=planning_session.planning_agents,
        questions=[PlanningQuestionRead.model_validate(q) for q in questions],
        created_at=planning_session.created_at,
        updated_at=planning_session.updated_at,
    )


@router.get("", response_model=PlanningSessionRead | None)
async def get_planning(
    task_id: UUID,
    session: AsyncSession = SESSION_DEP,
    ctx: OrganizationContext = ORG_ADMIN_DEP,
) -> PlanningSessionRead | None:
    """Get the planning session for a task."""
    await _get_task_or_404(task_id, session)
    service = PlanningService(session)
    planning_session = await service.get_planning(task_id)
    if planning_session is None:
        return None
    questions = await service.get_questions(planning_session.id)
    return PlanningSessionRead(
        id=planning_session.id,
        task_id=planning_session.task_id,
        gateway_id=planning_session.gateway_id,
        gateway_session_key=planning_session.gateway_session_key,
        status=planning_session.status,
        current_question_index=planning_session.current_question_index,
        planning_spec=planning_session.planning_spec,
        planning_agents=planning_session.planning_agents,
        questions=[PlanningQuestionRead.model_validate(q) for q in questions],
        created_at=planning_session.created_at,
        updated_at=planning_session.updated_at,
    )


@router.post("/answer", response_model=PlanningSessionRead)
async def submit_planning_answer(
    task_id: UUID,
    payload: PlanningAnswerRequest,
    session: AsyncSession = SESSION_DEP,
    ctx: OrganizationContext = ORG_ADMIN_DEP,
) -> PlanningSessionRead:
    """Submit an answer to the current planning question."""
    await _get_task_or_404(task_id, session)
    service = PlanningService(session)
    planning_session = await service.get_planning(task_id)
    if planning_session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No planning session for this task",
        )
    planning_session = await service.submit_answer(
        session_id=planning_session.id,
        answer=payload.answer,
    )
    questions = await service.get_questions(planning_session.id)
    return PlanningSessionRead(
        id=planning_session.id,
        task_id=planning_session.task_id,
        gateway_id=planning_session.gateway_id,
        gateway_session_key=planning_session.gateway_session_key,
        status=planning_session.status,
        current_question_index=planning_session.current_question_index,
        planning_spec=planning_session.planning_spec,
        planning_agents=planning_session.planning_agents,
        questions=[PlanningQuestionRead.model_validate(q) for q in questions],
        created_at=planning_session.created_at,
        updated_at=planning_session.updated_at,
    )


@router.delete("", response_model=OkResponse)
async def cancel_planning(
    task_id: UUID,
    session: AsyncSession = SESSION_DEP,
    ctx: OrganizationContext = ORG_ADMIN_DEP,
) -> OkResponse:
    """Cancel an active planning session."""
    await _get_task_or_404(task_id, session)
    service = PlanningService(session)
    await service.cancel_planning(task_id)
    return OkResponse()


@router.post("/approve", response_model=PlanningSessionRead | None)
async def approve_planning(
    task_id: UUID,
    session: AsyncSession = SESSION_DEP,
    ctx: OrganizationContext = ORG_ADMIN_DEP,
) -> PlanningSessionRead | None:
    """Approve a completed planning spec for dispatch."""
    await _get_task_or_404(task_id, session)
    service = PlanningService(session)
    planning_session = await service.approve_planning(task_id)
    if planning_session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No planning session for this task",
        )
    questions = await service.get_questions(planning_session.id)
    return PlanningSessionRead(
        id=planning_session.id,
        task_id=planning_session.task_id,
        gateway_id=planning_session.gateway_id,
        gateway_session_key=planning_session.gateway_session_key,
        status=planning_session.status,
        current_question_index=planning_session.current_question_index,
        planning_spec=planning_session.planning_spec,
        planning_agents=planning_session.planning_agents,
        questions=[PlanningQuestionRead.model_validate(q) for q in questions],
        created_at=planning_session.created_at,
        updated_at=planning_session.updated_at,
    )
