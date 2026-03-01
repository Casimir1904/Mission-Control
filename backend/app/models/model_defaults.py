"""ModelDefaults model for organization-level default model preferences."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import JSON, Column
from sqlmodel import Field

from app.core.time import utcnow
from app.models.tenancy import TenantScoped

RUNTIME_ANNOTATION_TYPES = (datetime,)


class ModelDefaults(TenantScoped, table=True):
    """Organization-level default model configuration."""

    __tablename__ = "model_defaults"  # pyright: ignore[reportAssignmentType]

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    organization_id: UUID = Field(
        foreign_key="organizations.id", index=True, unique=True
    )
    global_default_model: str | None = Field(default=None)
    preferences: dict[str, Any] | None = Field(
        default=None,
        sa_column=Column(JSON),
    )
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
