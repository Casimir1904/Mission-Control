"""Task dispatch service - sends task briefs to agents via chat when tasks start."""

from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

from app.core.logging import get_logger
from app.db import crud
from app.models.agents import Agent
from app.models.chat import ChatMessage, ChatSession
from app.models.gateways import Gateway
from app.models.tasks import Task
from app.services.chat_service import CHAT_SESSION_PREFIX, ChatService
from app.services.openclaw.gateway_rpc import (
    GatewayConfig,
    OpenClawGatewayError,
    send_message,
    ensure_session,
)

if TYPE_CHECKING:
    from sqlmodel.ext.asyncio.session import AsyncSession

logger = get_logger(__name__)


def _format_task_brief(task: Task) -> str:
    """Format a task into a brief message for agent dispatch."""
    parts = [f"## Task: {task.title}"]
    if task.description:
        parts.append(f"\n{task.description}")
    parts.append(f"\n**Status:** {task.status}")
    if task.priority:
        parts.append(f"**Priority:** {task.priority}")
    return "\n".join(parts)


class TaskDispatchService:
    """Sends formatted task briefs to assigned agents when tasks are dispatched."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def dispatch_task_to_agent(
        self,
        *,
        task_id: UUID,
        agent_id: UUID | None = None,
    ) -> ChatSession | None:
        """Send a task brief to the assigned agent via chat.

        Creates or reuses a task-scoped chat session and sends
        the task description as a system message.
        """
        task = await crud.get_by_id(self._session, Task, task_id)
        if task is None:
            return None

        # Determine agent
        target_agent_id = agent_id or task.assigned_agent_id
        if target_agent_id is None:
            return None

        agent = await crud.get_by_id(self._session, Agent, target_agent_id)
        if agent is None:
            return None

        gateway = await crud.get_by_id(self._session, Gateway, agent.gateway_id)
        if gateway is None:
            return None

        # Find or create a task-scoped chat session
        existing_sessions = await crud.list_by(
            self._session,
            ChatSession,
            task_id=task_id,
            agent_id=target_agent_id,
            status="active",
            limit=1,
        )

        chat_service = ChatService(self._session)
        if existing_sessions:
            chat_session = existing_sessions[0]
        else:
            chat_session = await chat_service.create_session(
                gateway_id=gateway.id,
                agent_id=target_agent_id,
                task_id=task_id,
                title=f"Task: {task.title}",
            )

        # Send the task brief
        brief = _format_task_brief(task)
        try:
            await chat_service.send_message(
                session_id=chat_session.id,
                content=brief,
                sender_type="system",
            )
        except (ValueError, OpenClawGatewayError) as exc:
            logger.warning(
                "task_dispatch.send_brief.failed task_id=%s error=%s",
                task_id,
                exc,
            )

        return chat_session
