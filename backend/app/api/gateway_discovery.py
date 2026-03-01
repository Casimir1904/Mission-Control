"""Gateway agent discovery and import endpoints."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import SQLModel, Field

from app.api.deps import require_org_admin
from app.db import crud
from app.db.session import get_session
from app.models.agents import Agent
from app.models.gateways import Gateway
from app.services.openclaw.gateway_rpc import (
    GatewayConfig,
    OpenClawGatewayError,
    openclaw_call,
)
from app.services.organizations import OrganizationContext

if TYPE_CHECKING:
    from sqlmodel.ext.asyncio.session import AsyncSession

router = APIRouter(prefix="/gateways", tags=["gateways"])
SESSION_DEP = Depends(get_session)
ORG_ADMIN_DEP = Depends(require_org_admin)


class DiscoveredAgent(SQLModel):
    """Agent discovered from a gateway."""

    gateway_agent_id: str | None = None
    name: str
    status: str | None = None
    model: str | None = None
    session_key: str | None = None
    already_imported: bool = False
    local_agent_id: str | None = None


class ImportAgentEntry(SQLModel):
    """Single agent entry to import."""

    name: str
    gateway_agent_id: str | None = None
    model: str | None = None
    role_id: str | None = None


class ImportAgentsRequest(SQLModel):
    """Request payload for importing agents from gateway."""

    agents: list[ImportAgentEntry] = Field(default_factory=list)


class ImportAgentsResponse(SQLModel):
    """Result of agent import operation."""

    imported: int = 0
    skipped: int = 0
    agents: list[dict[str, Any]] = Field(default_factory=list)


def _gateway_config(gateway: Gateway) -> GatewayConfig:
    return GatewayConfig(
        url=gateway.url,
        token=gateway.token,
        allow_insecure_tls=gateway.allow_insecure_tls,
        disable_device_pairing=gateway.disable_device_pairing,
    )


@router.get(
    "/{gateway_id}/discover-agents",
    response_model=list[DiscoveredAgent],
)
async def discover_agents(
    gateway_id: UUID,
    session: AsyncSession = SESSION_DEP,
    ctx: OrganizationContext = ORG_ADMIN_DEP,
) -> list[DiscoveredAgent]:
    """Discover agents from a gateway and cross-reference with local DB."""
    gateway = await crud.get_by_id(session, Gateway, gateway_id)
    if gateway is None or gateway.organization_id != ctx.organization.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    config = _gateway_config(gateway)
    try:
        result = await openclaw_call("agents.list", config=config)
    except OpenClawGatewayError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to list agents from gateway: {exc}",
        ) from exc

    # Parse gateway response
    agents_data: list[dict[str, Any]] = []
    if isinstance(result, dict):
        agents_data = result.get("agents") or result.get("items") or []
    elif isinstance(result, list):
        agents_data = result

    # Get existing local agents for this gateway
    local_agents = await crud.list_by(
        session,
        Agent,
        gateway_id=gateway_id,
    )
    local_names = {a.name for a in local_agents}
    local_by_name = {a.name: a for a in local_agents}

    discovered: list[DiscoveredAgent] = []
    for agent_data in agents_data:
        if not isinstance(agent_data, dict):
            continue
        name = agent_data.get("name") or agent_data.get("id") or ""
        if not name:
            continue
        already_imported = name in local_names
        local_agent = local_by_name.get(name)
        discovered.append(
            DiscoveredAgent(
                gateway_agent_id=str(agent_data.get("id", "")),
                name=name,
                status=agent_data.get("status"),
                model=agent_data.get("model"),
                session_key=agent_data.get("sessionKey")
                or agent_data.get("session_key"),
                already_imported=already_imported,
                local_agent_id=str(local_agent.id) if local_agent else None,
            )
        )

    return discovered


@router.post(
    "/{gateway_id}/import-agents",
    response_model=ImportAgentsResponse,
)
async def import_agents(
    gateway_id: UUID,
    payload: ImportAgentsRequest,
    session: AsyncSession = SESSION_DEP,
    ctx: OrganizationContext = ORG_ADMIN_DEP,
) -> ImportAgentsResponse:
    """Import discovered agents from a gateway into the local DB."""
    gateway = await crud.get_by_id(session, Gateway, gateway_id)
    if gateway is None or gateway.organization_id != ctx.organization.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    # Get existing local agents for this gateway
    local_agents = await crud.list_by(
        session,
        Agent,
        gateway_id=gateway_id,
    )
    local_names = {a.name for a in local_agents}

    imported = 0
    skipped = 0
    result_agents: list[dict[str, Any]] = []

    for entry in payload.agents:
        if entry.name in local_names:
            skipped += 1
            continue

        create_kwargs: dict[str, Any] = {
            "name": entry.name,
            "gateway_id": gateway_id,
            "organization_id": ctx.organization.id,
            "status": "active",
        }
        if entry.model:
            create_kwargs["model"] = entry.model
        if entry.role_id:
            create_kwargs["role_id"] = entry.role_id

        agent = await crud.create(session, Agent, **create_kwargs)
        imported += 1
        result_agents.append({"id": str(agent.id), "name": agent.name})
        local_names.add(entry.name)

    return ImportAgentsResponse(
        imported=imported,
        skipped=skipped,
        agents=result_agents,
    )
