"""Chat models for agent conversations."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Column, Text
from sqlmodel import Field

from app.core.time import utcnow
from app.models.tenancy import TenantScoped

RUNTIME_ANNOTATION_TYPES = (datetime,)


class ChatSession(TenantScoped, table=True):
    """Chat session linking a user to an agent conversation."""

    __tablename__ = "chat_sessions"  # pyright: ignore[reportAssignmentType]

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    task_id: UUID | None = Field(default=None, foreign_key="tasks.id", index=True)
    agent_id: UUID | None = Field(default=None, foreign_key="agents.id", index=True)
    gateway_id: UUID = Field(foreign_key="gateways.id", index=True)
    session_type: str = Field(default="standalone", index=True)  # standalone, task_scoped
    gateway_session_key: str | None = Field(default=None, index=True)
    title: str | None = Field(default=None)
    status: str = Field(default="active", index=True)  # active, archived
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class ChatMessage(TenantScoped, table=True):
    """Individual message in a chat session."""

    __tablename__ = "chat_messages"  # pyright: ignore[reportAssignmentType]

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    session_id: UUID = Field(foreign_key="chat_sessions.id", index=True)
    sender_type: str = Field(index=True)  # user, agent, system
    content: str = Field(sa_column=Column(Text))
    message_type: str = Field(default="text")  # text, code, error
    created_at: datetime = Field(default_factory=utcnow)
