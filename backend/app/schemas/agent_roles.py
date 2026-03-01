"""Schemas for agent role CRUD API payloads."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from sqlmodel import Field, SQLModel

RUNTIME_ANNOTATION_TYPES = (datetime, UUID)


class AgentRoleBase(SQLModel):
    """Shared fields for agent role create/read payloads."""

    name: str
    description: str | None = None
    avatar_emoji: str | None = None
    default_model: str | None = None
    identity_profile: dict[str, Any] | None = None
    soul_template: str | None = None
    sort_order: int = 0


class AgentRoleCreate(AgentRoleBase):
    """Payload for creating an agent role."""


class AgentRoleUpdate(SQLModel):
    """Payload for partial agent role updates."""

    name: str | None = None
    description: str | None = None
    avatar_emoji: str | None = None
    default_model: str | None = None
    identity_profile: dict[str, Any] | None = None
    soul_template: str | None = None
    sort_order: int | None = None


class AgentRoleRead(AgentRoleBase):
    """Agent role payload returned from read endpoints."""

    id: UUID
    organization_id: UUID
    is_preset: bool = False
    created_at: datetime
    updated_at: datetime


class ModelDefaultsRead(SQLModel):
    """Model defaults payload returned from read endpoints."""

    id: UUID
    organization_id: UUID
    global_default_model: str | None = None
    preferences: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime


class ModelDefaultsUpdate(SQLModel):
    """Payload for updating model defaults."""

    global_default_model: str | None = None
    preferences: dict[str, Any] | None = None


class GatewayModelInfo(SQLModel):
    """Model information returned from gateway models.list."""

    id: str = Field(description="Model identifier.")
    name: str | None = Field(default=None, description="Human-readable model name.")
    provider: str | None = Field(default=None, description="Model provider.")
