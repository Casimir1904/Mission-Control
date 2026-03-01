"""API endpoints for agent roles and model defaults management."""

from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import col

from app.api.deps import require_org_admin
from app.core.time import utcnow
from app.db import crud
from app.db.pagination import paginate
from app.db.session import get_session
from app.models.agent_roles import AgentRole
from app.models.model_defaults import ModelDefaults
from app.schemas.agent_roles import (
    AgentRoleCreate,
    AgentRoleRead,
    AgentRoleUpdate,
    GatewayModelInfo,
    ModelDefaultsRead,
    ModelDefaultsUpdate,
)
from app.schemas.common import OkResponse
from app.schemas.pagination import DefaultLimitOffsetPage
from app.services.openclaw.gateway_rpc import (
    GatewayConfig,
    OpenClawGatewayError,
    openclaw_call,
)

if TYPE_CHECKING:
    from fastapi_pagination.limit_offset import LimitOffsetPage
    from sqlmodel.ext.asyncio.session import AsyncSession

    from app.services.organizations import OrganizationContext

router = APIRouter(prefix="/agent-roles", tags=["agent-roles"])
SESSION_DEP = Depends(get_session)
ORG_ADMIN_DEP = Depends(require_org_admin)

# ── Preset seed data ──────────────────────────────────────────────────────────

PRESET_ROLES = [
    {
        "name": "Developer",
        "description": "Writes and reviews code, fixes bugs, implements features.",
        "avatar_emoji": "👨‍💻",
        "identity_profile": {"role": "developer", "skill": "coding"},
        "soul_template": (
            "You are an expert software developer. Write clean, well-tested code. "
            "Follow best practices and project conventions."
        ),
        "sort_order": 1,
    },
    {
        "name": "Designer",
        "description": "Creates UI/UX designs, mockups, and design systems.",
        "avatar_emoji": "🎨",
        "identity_profile": {"role": "designer", "skill": "design"},
        "soul_template": (
            "You are a skilled UI/UX designer. Focus on user experience, accessibility, "
            "and visual consistency."
        ),
        "sort_order": 2,
    },
    {
        "name": "Researcher",
        "description": "Investigates topics, analyzes data, and synthesizes findings.",
        "avatar_emoji": "🔬",
        "identity_profile": {"role": "researcher", "skill": "analysis"},
        "soul_template": (
            "You are a thorough researcher. Gather information from multiple sources, "
            "verify facts, and present clear findings."
        ),
        "sort_order": 3,
    },
    {
        "name": "Writer",
        "description": "Creates documentation, content, and written communications.",
        "avatar_emoji": "✍️",
        "identity_profile": {"role": "writer", "skill": "writing"},
        "soul_template": (
            "You are a professional writer. Create clear, concise, and well-structured content. "
            "Adapt your tone to the audience and purpose."
        ),
        "sort_order": 4,
    },
]


async def _ensure_presets(
    session: AsyncSession,
    organization_id: UUID,
) -> None:
    """Seed preset roles for an organization if none exist."""
    existing = await AgentRole.objects.filter_by(
        organization_id=organization_id,
        is_preset=True,
    ).all(session)
    if existing:
        return
    for preset in PRESET_ROLES:
        await crud.create(
            session,
            AgentRole,
            id=uuid4(),
            organization_id=organization_id,
            is_preset=True,
            commit=False,
            refresh=False,
            **preset,
        )
    await session.commit()


# ── Agent Roles CRUD ──────────────────────────────────────────────────────────


@router.get("", response_model=DefaultLimitOffsetPage[AgentRoleRead])
async def list_agent_roles(
    session: AsyncSession = SESSION_DEP,
    ctx: OrganizationContext = ORG_ADMIN_DEP,
) -> LimitOffsetPage[AgentRoleRead]:
    """List agent roles for the caller's organization, seeding presets if needed."""
    await _ensure_presets(session, ctx.organization.id)
    statement = (
        AgentRole.objects.filter_by(organization_id=ctx.organization.id)
        .order_by(col(AgentRole.sort_order).asc(), col(AgentRole.created_at).asc())
        .statement
    )
    return await paginate(session, statement)


@router.post("", response_model=AgentRoleRead, status_code=status.HTTP_201_CREATED)
async def create_agent_role(
    payload: AgentRoleCreate,
    session: AsyncSession = SESSION_DEP,
    ctx: OrganizationContext = ORG_ADMIN_DEP,
) -> AgentRole:
    """Create a custom agent role."""
    data = payload.model_dump()
    data["id"] = uuid4()
    data["organization_id"] = ctx.organization.id
    data["is_preset"] = False
    return await crud.create(session, AgentRole, **data)


@router.get("/{role_id}", response_model=AgentRoleRead)
async def get_agent_role(
    role_id: UUID,
    session: AsyncSession = SESSION_DEP,
    ctx: OrganizationContext = ORG_ADMIN_DEP,
) -> AgentRole:
    """Get one agent role by id."""
    role = await crud.get_one_by(
        session,
        AgentRole,
        id=role_id,
        organization_id=ctx.organization.id,
    )
    if role is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return role


@router.patch("/{role_id}", response_model=AgentRoleRead)
async def update_agent_role(
    role_id: UUID,
    payload: AgentRoleUpdate,
    session: AsyncSession = SESSION_DEP,
    ctx: OrganizationContext = ORG_ADMIN_DEP,
) -> AgentRole:
    """Update an agent role."""
    role = await crud.get_one_by(
        session,
        AgentRole,
        id=role_id,
        organization_id=ctx.organization.id,
    )
    if role is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    updates = payload.model_dump(exclude_unset=True)
    updates["updated_at"] = utcnow()
    return await crud.patch(session, role, updates)


@router.delete("/{role_id}", response_model=OkResponse)
async def delete_agent_role(
    role_id: UUID,
    session: AsyncSession = SESSION_DEP,
    ctx: OrganizationContext = ORG_ADMIN_DEP,
) -> OkResponse:
    """Delete an agent role."""
    role = await crud.get_one_by(
        session,
        AgentRole,
        id=role_id,
        organization_id=ctx.organization.id,
    )
    if role is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    await crud.delete(session, role)
    return OkResponse()


# ── Model Defaults ────────────────────────────────────────────────────────────

model_defaults_router = APIRouter(prefix="/model-defaults", tags=["agent-roles"])


@model_defaults_router.get("", response_model=ModelDefaultsRead)
async def get_model_defaults(
    session: AsyncSession = SESSION_DEP,
    ctx: OrganizationContext = ORG_ADMIN_DEP,
) -> ModelDefaults:
    """Get or create model defaults for the caller's organization."""
    defaults, _created = await crud.get_or_create(
        session,
        ModelDefaults,
        organization_id=ctx.organization.id,
    )
    return defaults


@model_defaults_router.patch("", response_model=ModelDefaultsRead)
async def update_model_defaults(
    payload: ModelDefaultsUpdate,
    session: AsyncSession = SESSION_DEP,
    ctx: OrganizationContext = ORG_ADMIN_DEP,
) -> ModelDefaults:
    """Update model defaults for the caller's organization."""
    defaults, _created = await crud.get_or_create(
        session,
        ModelDefaults,
        organization_id=ctx.organization.id,
    )
    updates = payload.model_dump(exclude_unset=True)
    updates["updated_at"] = utcnow()
    return await crud.patch(session, defaults, updates)


# ── Gateway Models Discovery ─────────────────────────────────────────────────

from app.models.gateways import Gateway  # noqa: E402
from app.services.openclaw.admin_service import GatewayAdminLifecycleService  # noqa: E402

gateway_models_router = APIRouter(prefix="/gateways", tags=["gateways"])


@gateway_models_router.get(
    "/{gateway_id}/models",
    response_model=list[GatewayModelInfo],
)
async def list_gateway_models(
    gateway_id: UUID,
    session: AsyncSession = SESSION_DEP,
    ctx: OrganizationContext = ORG_ADMIN_DEP,
) -> list[GatewayModelInfo]:
    """List models available on a gateway via models.list RPC."""
    service = GatewayAdminLifecycleService(session)
    gateway = await service.require_gateway(
        gateway_id=gateway_id,
        organization_id=ctx.organization.id,
    )
    config = GatewayConfig(
        url=gateway.url,
        token=gateway.token,
        allow_insecure_tls=gateway.allow_insecure_tls,
        disable_device_pairing=gateway.disable_device_pairing,
    )
    try:
        payload = await openclaw_call("models.list", config=config)
    except OpenClawGatewayError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gateway error: {exc}",
        ) from exc

    models: list[GatewayModelInfo] = []
    if isinstance(payload, dict):
        raw_models = payload.get("models") or payload.get("items") or []
        if isinstance(raw_models, list):
            for item in raw_models:
                if isinstance(item, dict):
                    model_id = item.get("id") or item.get("name") or ""
                    if model_id:
                        models.append(
                            GatewayModelInfo(
                                id=str(model_id),
                                name=item.get("name") or str(model_id),
                                provider=item.get("provider"),
                            )
                        )
                elif isinstance(item, str):
                    models.append(GatewayModelInfo(id=item, name=item))
    elif isinstance(payload, list):
        for item in payload:
            if isinstance(item, dict):
                model_id = item.get("id") or item.get("name") or ""
                if model_id:
                    models.append(
                        GatewayModelInfo(
                            id=str(model_id),
                            name=item.get("name") or str(model_id),
                            provider=item.get("provider"),
                        )
                    )
            elif isinstance(item, str):
                models.append(GatewayModelInfo(id=item, name=item))
    return models
