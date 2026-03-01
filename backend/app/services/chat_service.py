"""Chat service for managing agent conversations."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any
from uuid import UUID, uuid4

from sqlmodel import col

from app.core.time import utcnow
from app.db import crud
from app.db.pagination import paginate
from app.models.chat import ChatMessage, ChatSession
from app.models.gateways import Gateway
from app.services.openclaw.gateway_rpc import (
    GatewayConfig,
    OpenClawGatewayError,
    ensure_session,
    get_chat_history,
    send_message,
)

if TYPE_CHECKING:
    from sqlmodel.ext.asyncio.session import AsyncSession

CHAT_SESSION_PREFIX = "mc-chat-"


def _gateway_config(gateway: Gateway) -> GatewayConfig:
    return GatewayConfig(
        url=gateway.url,
        token=gateway.token,
        allow_insecure_tls=gateway.allow_insecure_tls,
        disable_device_pairing=gateway.disable_device_pairing,
    )


def _chat_session_key(session_id: UUID) -> str:
    return f"{CHAT_SESSION_PREFIX}{session_id}"


class ChatService:
    """Manages chat sessions and messages between users and agents."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create_session(
        self,
        *,
        gateway_id: UUID,
        agent_id: UUID | None = None,
        task_id: UUID | None = None,
        title: str | None = None,
    ) -> ChatSession:
        """Create a new chat session."""
        gateway = await crud.get_by_id(self._session, Gateway, gateway_id)
        if gateway is None:
            msg = "Gateway not found"
            raise ValueError(msg)

        session_id = uuid4()
        session_key = _chat_session_key(session_id)
        session_type = "task_scoped" if task_id else "standalone"

        # Ensure gateway session exists
        config = _gateway_config(gateway)
        try:
            label = title or f"Chat {session_id}"
            await ensure_session(session_key, config=config, label=label)
        except OpenClawGatewayError:
            pass  # Best effort

        return await crud.create(
            self._session,
            ChatSession,
            id=session_id,
            gateway_id=gateway_id,
            agent_id=agent_id,
            task_id=task_id,
            session_type=session_type,
            gateway_session_key=session_key,
            title=title,
            status="active",
        )

    async def list_sessions(
        self,
        *,
        gateway_id: UUID | None = None,
        agent_id: UUID | None = None,
        task_id: UUID | None = None,
    ) -> list[ChatSession]:
        """List chat sessions with optional filters."""
        lookup: dict[str, Any] = {"status": "active"}
        if gateway_id:
            lookup["gateway_id"] = gateway_id
        if agent_id:
            lookup["agent_id"] = agent_id
        if task_id:
            lookup["task_id"] = task_id
        return await crud.list_by(
            self._session,
            ChatSession,
            order_by=[col(ChatSession.updated_at).desc()],
            **lookup,
        )

    async def get_session(self, session_id: UUID) -> ChatSession | None:
        """Get a chat session by ID."""
        return await crud.get_by_id(self._session, ChatSession, session_id)

    async def send_message(
        self,
        *,
        session_id: UUID,
        content: str,
        sender_type: str = "user",
    ) -> ChatMessage:
        """Send a message in a chat session."""
        chat_session = await crud.get_by_id(
            self._session,
            ChatSession,
            session_id,
        )
        if chat_session is None:
            msg = "Chat session not found"
            raise ValueError(msg)

        # Persist message locally
        message = await crud.create(
            self._session,
            ChatMessage,
            session_id=session_id,
            sender_type=sender_type,
            content=content,
            message_type="text",
        )

        # Send to gateway
        gateway = await crud.get_by_id(
            self._session,
            Gateway,
            chat_session.gateway_id,
        )
        if gateway and chat_session.gateway_session_key:
            config = _gateway_config(gateway)
            try:
                await send_message(
                    content,
                    session_key=chat_session.gateway_session_key,
                    config=config,
                    deliver=True,
                )
            except OpenClawGatewayError:
                pass  # Best effort

        # Update session timestamp
        chat_session.updated_at = utcnow()
        await crud.save(self._session, chat_session)

        return message

    async def get_messages(
        self,
        session_id: UUID,
        *,
        limit: int = 50,
    ) -> list[ChatMessage]:
        """Get messages for a chat session."""
        return await crud.list_by(
            self._session,
            ChatMessage,
            session_id=session_id,
            order_by=[col(ChatMessage.created_at).asc()],
            limit=limit,
        )

    async def poll_agent_response(
        self,
        session_id: UUID,
    ) -> ChatMessage | None:
        """Poll the gateway for new agent responses and persist them."""
        chat_session = await crud.get_by_id(
            self._session,
            ChatSession,
            session_id,
        )
        if chat_session is None:
            return None

        gateway = await crud.get_by_id(
            self._session,
            Gateway,
            chat_session.gateway_id,
        )
        if gateway is None or not chat_session.gateway_session_key:
            return None

        config = _gateway_config(gateway)
        try:
            history = await get_chat_history(
                chat_session.gateway_session_key,
                config,
                limit=5,
            )
        except OpenClawGatewayError:
            return None

        # Find latest agent message from gateway
        if not isinstance(history, dict):
            return None

        messages = history.get("messages") or history.get("items") or []
        if not isinstance(messages, list):
            return None

        for msg in reversed(messages):
            if not isinstance(msg, dict):
                continue
            role = msg.get("role") or msg.get("sender")
            if role not in ("assistant", "agent", "ai"):
                continue
            content = msg.get("content") or msg.get("text") or ""
            if not content:
                continue

            # Check if we already have this message
            existing = await crud.list_by(
                self._session,
                ChatMessage,
                session_id=session_id,
                sender_type="agent",
                limit=1,
                order_by=[col(ChatMessage.created_at).desc()],
            )
            if existing and existing[0].content == content:
                return None

            # Persist the new agent message
            return await crud.create(
                self._session,
                ChatMessage,
                session_id=session_id,
                sender_type="agent",
                content=content,
                message_type="text",
            )

        return None

    async def archive_session(self, session_id: UUID) -> None:
        """Archive a chat session."""
        chat_session = await crud.get_by_id(
            self._session,
            ChatSession,
            session_id,
        )
        if chat_session is None:
            return
        chat_session.status = "archived"
        chat_session.updated_at = utcnow()
        await crud.save(self._session, chat_session)
