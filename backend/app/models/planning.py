"""Planning models for AI-driven task planning with interactive Q&A."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import JSON, Column, Text
from sqlmodel import Field

from app.core.time import utcnow
from app.models.tenancy import TenantScoped

RUNTIME_ANNOTATION_TYPES = (datetime,)


class PlanningSession(TenantScoped, table=True):
    """AI planning session linked to a task."""

    __tablename__ = "planning_sessions"  # pyright: ignore[reportAssignmentType]

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    task_id: UUID = Field(foreign_key="tasks.id", index=True, unique=True)
    gateway_id: UUID = Field(foreign_key="gateways.id", index=True)
    gateway_session_key: str | None = Field(default=None, index=True)
    status: str = Field(default="active", index=True)  # active, completed, cancelled
    planning_messages: list[dict[str, Any]] | None = Field(
        default=None,
        sa_column=Column(JSON),
    )
    planning_spec: dict[str, Any] | None = Field(
        default=None,
        sa_column=Column(JSON),
    )
    planning_agents: list[dict[str, Any]] | None = Field(
        default=None,
        sa_column=Column(JSON),
    )
    current_question_index: int = Field(default=0)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class PlanningQuestion(TenantScoped, table=True):
    """Individual Q&A record within a planning session."""

    __tablename__ = "planning_questions"  # pyright: ignore[reportAssignmentType]

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    session_id: UUID = Field(foreign_key="planning_sessions.id", index=True)
    question_index: int = Field(default=0)
    question_text: str = Field(sa_column=Column(Text))
    question_type: str = Field(default="text")  # text, multiple_choice
    options: list[str] | None = Field(
        default=None,
        sa_column=Column(JSON),
    )
    answer: str | None = Field(default=None, sa_column=Column(Text))
    answered_at: datetime | None = Field(default=None)
    created_at: datetime = Field(default_factory=utcnow)
