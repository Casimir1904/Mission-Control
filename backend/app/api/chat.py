"""Chat session and message API endpoints."""

from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import require_org_member
from app.db.session import get_session
from app.schemas.chat import (
    ChatMessageCreate,
    ChatMessageRead,
    ChatSessionCreate,
    ChatSessionRead,
)
from app.services.chat_service import ChatService
from app.services.organizations import OrganizationContext

if TYPE_CHECKING:
    from sqlmodel.ext.asyncio.session import AsyncSession

router = APIRouter(prefix="/chat", tags=["chat"])

SESSION_DEP = Depends(get_session)
ORG_MEMBER_DEP = Depends(require_org_member)


@router.get("/sessions", response_model=list[ChatSessionRead])
async def list_chat_sessions(
    gateway_id: UUID | None = Query(default=None),
    agent_id: UUID | None = Query(default=None),
    task_id: UUID | None = Query(default=None),
    session: AsyncSession = SESSION_DEP,
    ctx: OrganizationContext = ORG_MEMBER_DEP,
) -> list[ChatSessionRead]:
    """List active chat sessions."""
    service = ChatService(session)
    sessions = await service.list_sessions(
        gateway_id=gateway_id,
        agent_id=agent_id,
        task_id=task_id,
    )
    return [ChatSessionRead.model_validate(s) for s in sessions]


@router.post(
    "/sessions",
    response_model=ChatSessionRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_chat_session(
    payload: ChatSessionCreate,
    session: AsyncSession = SESSION_DEP,
    ctx: OrganizationContext = ORG_MEMBER_DEP,
) -> ChatSessionRead:
    """Create a new chat session."""
    service = ChatService(session)
    try:
        chat_session = await service.create_session(
            gateway_id=payload.gateway_id,
            organization_id=ctx.organization.id,
            agent_id=payload.agent_id,
            task_id=payload.task_id,
            title=payload.title,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    return ChatSessionRead.model_validate(chat_session)


@router.get("/sessions/{session_id}", response_model=ChatSessionRead)
async def get_chat_session(
    session_id: UUID,
    session: AsyncSession = SESSION_DEP,
    ctx: OrganizationContext = ORG_MEMBER_DEP,
) -> ChatSessionRead:
    """Get a chat session by ID."""
    service = ChatService(session)
    chat_session = await service.get_session(session_id)
    if chat_session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return ChatSessionRead.model_validate(chat_session)


@router.get(
    "/sessions/{session_id}/messages",
    response_model=list[ChatMessageRead],
)
async def list_chat_messages(
    session_id: UUID,
    limit: int = Query(default=50, le=200),
    session: AsyncSession = SESSION_DEP,
    ctx: OrganizationContext = ORG_MEMBER_DEP,
) -> list[ChatMessageRead]:
    """Get messages for a chat session."""
    service = ChatService(session)
    messages = await service.get_messages(session_id, limit=limit)
    return [ChatMessageRead.model_validate(m) for m in messages]


@router.post(
    "/sessions/{session_id}/messages",
    response_model=ChatMessageRead,
    status_code=status.HTTP_201_CREATED,
)
async def send_chat_message(
    session_id: UUID,
    payload: ChatMessageCreate,
    session: AsyncSession = SESSION_DEP,
    ctx: OrganizationContext = ORG_MEMBER_DEP,
) -> ChatMessageRead:
    """Send a message in a chat session."""
    service = ChatService(session)
    try:
        message = await service.send_message(
            session_id=session_id,
            content=payload.content,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    return ChatMessageRead.model_validate(message)


@router.post(
    "/sessions/{session_id}/poll",
    response_model=ChatMessageRead | None,
)
async def poll_agent_response(
    session_id: UUID,
    session: AsyncSession = SESSION_DEP,
    ctx: OrganizationContext = ORG_MEMBER_DEP,
) -> ChatMessageRead | None:
    """Poll for new agent responses in a chat session."""
    service = ChatService(session)
    message = await service.poll_agent_response(session_id)
    if message is None:
        return None
    return ChatMessageRead.model_validate(message)


@router.delete(
    "/sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def archive_chat_session(
    session_id: UUID,
    session: AsyncSession = SESSION_DEP,
    ctx: OrganizationContext = ORG_MEMBER_DEP,
) -> None:
    """Archive (soft-delete) a chat session."""
    service = ChatService(session)
    await service.archive_session(session_id)
