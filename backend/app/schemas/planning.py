"""Schemas for AI planning session API payloads."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from sqlmodel import Field, SQLModel

RUNTIME_ANNOTATION_TYPES = (datetime, UUID)


class PlanningQuestionRead(SQLModel):
    """Question payload returned from planning endpoints."""

    id: UUID
    session_id: UUID
    question_index: int
    question_text: str
    question_type: str = "text"
    options: list[str] | None = None
    answer: str | None = None
    answered_at: datetime | None = None
    created_at: datetime


class PlanningSessionRead(SQLModel):
    """Planning session payload returned from read endpoints."""

    id: UUID
    task_id: UUID
    gateway_id: UUID
    gateway_session_key: str | None = None
    status: str = "active"
    current_question_index: int = 0
    planning_spec: dict[str, Any] | None = None
    planning_agents: list[dict[str, Any]] | None = None
    questions: list[PlanningQuestionRead] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class PlanningStartRequest(SQLModel):
    """Payload to start a new planning session."""

    gateway_id: UUID = Field(description="Gateway to use for AI planning.")


class PlanningAnswerRequest(SQLModel):
    """Payload to submit an answer to a planning question."""

    answer: str = Field(description="The answer text.")


class PlanningSpecRead(SQLModel):
    """Completed planning specification."""

    task_id: UUID
    spec: dict[str, Any]
    agents: list[dict[str, Any]] = Field(default_factory=list)
    status: str
