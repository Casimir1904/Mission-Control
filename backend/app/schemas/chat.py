"""Schemas for chat session and message API payloads."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlmodel import Field, SQLModel

RUNTIME_ANNOTATION_TYPES = (datetime, UUID)


class ChatMessageRead(SQLModel):
    """Chat message payload returned from read endpoints."""

    id: UUID
    session_id: UUID
    sender_type: str
    content: str
    message_type: str = "text"
    created_at: datetime


class ChatSessionRead(SQLModel):
    """Chat session payload returned from read endpoints."""

    id: UUID
    task_id: UUID | None = None
    agent_id: UUID | None = None
    gateway_id: UUID
    session_type: str = "standalone"
    title: str | None = None
    status: str = "active"
    last_message: ChatMessageRead | None = None
    created_at: datetime
    updated_at: datetime


class ChatSessionCreate(SQLModel):
    """Payload for creating a chat session."""

    agent_id: UUID | None = Field(default=None, description="Agent to chat with.")
    gateway_id: UUID = Field(description="Gateway to use for the chat.")
    task_id: UUID | None = Field(default=None, description="Optional task scope.")
    title: str | None = Field(default=None, description="Optional chat title.")


class ChatMessageCreate(SQLModel):
    """Payload for sending a chat message."""

    content: str = Field(description="Message content.")
