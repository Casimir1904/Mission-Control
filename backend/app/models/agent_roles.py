"""AgentRole model for configurable agent role presets and custom roles."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import JSON, Column, Text
from sqlmodel import Field

from app.core.time import utcnow
from app.models.tenancy import TenantScoped

RUNTIME_ANNOTATION_TYPES = (datetime,)


class AgentRole(TenantScoped, table=True):
    """Configurable agent role with default model and templates."""

    __tablename__ = "agent_roles"  # pyright: ignore[reportAssignmentType]

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    organization_id: UUID = Field(foreign_key="organizations.id", index=True)
    name: str = Field(index=True)
    description: str | None = Field(default=None, sa_column=Column(Text))
    avatar_emoji: str | None = Field(default=None)
    is_preset: bool = Field(default=False, index=True)
    default_model: str | None = Field(default=None)
    identity_profile: dict[str, Any] | None = Field(
        default=None,
        sa_column=Column(JSON),
    )
    soul_template: str | None = Field(default=None, sa_column=Column(Text))
    sort_order: int = Field(default=0)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
