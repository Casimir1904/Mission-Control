"""AI-driven planning service for task decomposition and Q&A."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING, Any
from uuid import UUID, uuid4

from app.core.time import utcnow
from app.db import crud
from app.models.gateways import Gateway
from app.models.planning import PlanningQuestion, PlanningSession
from app.services.openclaw.gateway_rpc import (
    GatewayConfig,
    OpenClawGatewayError,
    ensure_session,
    get_chat_history,
    send_message,
)

if TYPE_CHECKING:
    from sqlmodel.ext.asyncio.session import AsyncSession

PLANNING_SESSION_PREFIX = "mc-planning-"

PLANNING_SYSTEM_PROMPT = """You are a planning assistant for Mission Control. Your job is to help break down tasks into clear, actionable plans.

When given a task, ask clarifying questions one at a time to understand scope, constraints, and requirements. Format your responses as JSON:

For questions:
{"type": "question", "question": "Your question here", "question_type": "text"}

For multiple choice questions:
{"type": "question", "question": "Your question here", "question_type": "multiple_choice", "options": ["Option A", "Option B", "Option C"]}

When you have enough information, provide a final spec:
{"type": "spec", "summary": "Brief summary", "objectives": ["Objective 1", "Objective 2"], "steps": [{"title": "Step 1", "description": "Details", "agent_role": "developer"}], "agents": [{"role": "developer", "count": 1, "description": "What this agent does"}]}

Start with 2-4 clarifying questions, then produce the spec."""


def _gateway_config(gateway: Gateway) -> GatewayConfig:
    return GatewayConfig(
        url=gateway.url,
        token=gateway.token,
        allow_insecure_tls=gateway.allow_insecure_tls,
        disable_device_pairing=gateway.disable_device_pairing,
    )


def _planning_session_key(session_id: UUID) -> str:
    return f"{PLANNING_SESSION_PREFIX}{session_id}"


def _parse_ai_response(text: str) -> dict[str, Any] | None:
    """Try to extract a JSON object from the AI response."""
    text = text.strip()
    # Try to find JSON in the response
    start = text.find("{")
    if start == -1:
        return None
    # Find matching closing brace
    depth = 0
    for i in range(start, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(text[start : i + 1])
                except json.JSONDecodeError:
                    return None
    return None


class PlanningService:
    """Manages AI-driven planning sessions for tasks."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def start_planning(
        self,
        *,
        task_id: UUID,
        gateway_id: UUID,
        task_title: str,
        task_description: str | None,
    ) -> PlanningSession:
        """Start a new planning session for a task."""
        # Check for existing session
        existing = await crud.get_one_by(
            self._session,
            PlanningSession,
            task_id=task_id,
        )
        if existing and existing.status == "active":
            return existing

        gateway = await crud.get_by_id(self._session, Gateway, gateway_id)
        if gateway is None:
            msg = "Gateway not found"
            raise ValueError(msg)

        session_id = uuid4()
        session_key = _planning_session_key(session_id)

        # Create gateway session
        config = _gateway_config(gateway)
        try:
            await ensure_session(session_key, config=config, label=f"Planning: {task_title}")
        except OpenClawGatewayError:
            pass  # Session may already exist or gateway may not support it

        # Send initial planning prompt
        initial_message = PLANNING_SYSTEM_PROMPT + f"\n\nTask: {task_title}"
        if task_description:
            initial_message += f"\nDescription: {task_description}"

        try:
            await send_message(
                initial_message,
                session_key=session_key,
                config=config,
                deliver=True,
            )
        except OpenClawGatewayError:
            pass  # Best effort

        # Create planning session record
        planning_session = await crud.create(
            self._session,
            PlanningSession,
            id=session_id,
            task_id=task_id,
            gateway_id=gateway_id,
            gateway_session_key=session_key,
            status="active",
            planning_messages=[
                {"role": "system", "content": initial_message},
            ],
        )

        # Poll for AI response and create first question
        await self._poll_and_create_question(planning_session, gateway)

        return planning_session

    async def get_planning(self, task_id: UUID) -> PlanningSession | None:
        """Get the planning session for a task."""
        return await crud.get_one_by(
            self._session,
            PlanningSession,
            task_id=task_id,
        )

    async def get_questions(self, session_id: UUID) -> list[PlanningQuestion]:
        """Get all questions for a planning session."""
        return await crud.list_by(
            self._session,
            PlanningQuestion,
            session_id=session_id,
            order_by=[PlanningQuestion.question_index],  # type: ignore[list-item]
        )

    async def submit_answer(
        self,
        *,
        session_id: UUID,
        answer: str,
    ) -> PlanningSession:
        """Submit an answer to the current planning question."""
        planning_session = await crud.get_by_id(
            self._session,
            PlanningSession,
            session_id,
        )
        if planning_session is None:
            msg = "Planning session not found"
            raise ValueError(msg)

        if planning_session.status != "active":
            msg = "Planning session is not active"
            raise ValueError(msg)

        gateway = await crud.get_by_id(
            self._session,
            Gateway,
            planning_session.gateway_id,
        )
        if gateway is None:
            msg = "Gateway not found"
            raise ValueError(msg)

        # Find current unanswered question
        questions = await self.get_questions(session_id)
        current_question = next(
            (q for q in questions if q.answer is None),
            None,
        )
        if current_question:
            current_question.answer = answer
            current_question.answered_at = utcnow()
            await crud.save(self._session, current_question)

        # Send answer to AI
        config = _gateway_config(gateway)
        session_key = planning_session.gateway_session_key or ""

        # Update messages
        messages = list(planning_session.planning_messages or [])
        messages.append({"role": "user", "content": answer})
        planning_session.planning_messages = messages

        try:
            await send_message(
                answer,
                session_key=session_key,
                config=config,
                deliver=True,
            )
        except OpenClawGatewayError:
            pass

        # Poll for next AI response
        await self._poll_and_create_question(planning_session, gateway)

        planning_session.updated_at = utcnow()
        planning_session.current_question_index += 1
        await crud.save(self._session, planning_session)

        return planning_session

    async def cancel_planning(self, task_id: UUID) -> None:
        """Cancel a planning session."""
        planning_session = await crud.get_one_by(
            self._session,
            PlanningSession,
            task_id=task_id,
        )
        if planning_session is None:
            return
        planning_session.status = "cancelled"
        planning_session.updated_at = utcnow()
        await crud.save(self._session, planning_session)

    async def approve_planning(self, task_id: UUID) -> PlanningSession | None:
        """Approve a completed planning spec."""
        planning_session = await crud.get_one_by(
            self._session,
            PlanningSession,
            task_id=task_id,
        )
        if planning_session is None:
            return None
        if planning_session.status != "completed":
            msg = "Planning session is not completed"
            raise ValueError(msg)
        planning_session.status = "approved"
        planning_session.updated_at = utcnow()
        await crud.save(self._session, planning_session)
        return planning_session

    async def _poll_and_create_question(
        self,
        planning_session: PlanningSession,
        gateway: Gateway,
    ) -> None:
        """Poll gateway for AI response and create a question or finalize spec."""
        config = _gateway_config(gateway)
        session_key = planning_session.gateway_session_key or ""

        try:
            history = await get_chat_history(session_key, config, limit=5)
        except OpenClawGatewayError:
            # If we can't get history, create a fallback question
            await self._create_fallback_question(planning_session)
            return

        # Parse last AI message from history
        ai_text = ""
        if isinstance(history, dict):
            messages = history.get("messages") or history.get("items") or []
            if isinstance(messages, list):
                for msg in reversed(messages):
                    if isinstance(msg, dict):
                        role = msg.get("role") or msg.get("sender")
                        if role in ("assistant", "agent", "ai"):
                            ai_text = msg.get("content") or msg.get("text") or ""
                            break

        if not ai_text:
            await self._create_fallback_question(planning_session)
            return

        # Parse AI response
        parsed = _parse_ai_response(ai_text)
        messages = list(planning_session.planning_messages or [])
        messages.append({"role": "assistant", "content": ai_text})
        planning_session.planning_messages = messages

        if parsed and parsed.get("type") == "spec":
            # Planning is complete
            planning_session.status = "completed"
            planning_session.planning_spec = parsed
            planning_session.planning_agents = parsed.get("agents", [])
            await crud.save(self._session, planning_session)
            return

        if parsed and parsed.get("type") == "question":
            await crud.create(
                self._session,
                PlanningQuestion,
                session_id=planning_session.id,
                question_index=planning_session.current_question_index,
                question_text=parsed.get("question", ""),
                question_type=parsed.get("question_type", "text"),
                options=parsed.get("options"),
            )
            return

        # If we can't parse, create the AI text as a free-form question
        await crud.create(
            self._session,
            PlanningQuestion,
            session_id=planning_session.id,
            question_index=planning_session.current_question_index,
            question_text=ai_text,
            question_type="text",
        )

    async def _create_fallback_question(
        self,
        planning_session: PlanningSession,
    ) -> None:
        """Create a generic fallback question when AI is unavailable."""
        await crud.create(
            self._session,
            PlanningQuestion,
            session_id=planning_session.id,
            question_index=planning_session.current_question_index,
            question_text="What are the main requirements and constraints for this task?",
            question_type="text",
        )
