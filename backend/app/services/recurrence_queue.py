"""Queue payload helpers for recurring task next-occurrence generation."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any
from uuid import UUID

from app.core.config import settings
from app.core.logging import get_logger
from app.core.time import utcnow
from app.services.queue import QueuedTask, enqueue_task_with_delay
from app.services.queue import requeue_if_failed as generic_requeue_if_failed

logger = get_logger(__name__)
TASK_TYPE = "recurrence"


@dataclass(frozen=True)
class QueuedRecurrenceTask:
    """Queued payload metadata for generating the next recurring task occurrence."""

    task_id: UUID
    board_id: UUID
    scheduled_at: datetime
    attempts: int = 0


def _task_from_payload(payload: QueuedRecurrenceTask) -> QueuedTask:
    return QueuedTask(
        task_type=TASK_TYPE,
        payload={
            "task_id": str(payload.task_id),
            "board_id": str(payload.board_id),
            "scheduled_at": payload.scheduled_at.isoformat(),
        },
        created_at=utcnow(),
        attempts=payload.attempts,
    )


def decode_recurrence_task(task: QueuedTask) -> QueuedRecurrenceTask:
    if task.task_type not in {TASK_TYPE, "legacy"}:
        raise ValueError(f"Unexpected task_type={task.task_type!r}; expected {TASK_TYPE!r}")
    payload: dict[str, Any] = task.payload
    raw_scheduled_at = payload.get("scheduled_at")
    if not isinstance(raw_scheduled_at, str):
        raise ValueError("scheduled_at is required")
    return QueuedRecurrenceTask(
        task_id=UUID(str(payload["task_id"])),
        board_id=UUID(str(payload["board_id"])),
        scheduled_at=datetime.fromisoformat(raw_scheduled_at),
        attempts=int(payload.get("attempts", task.attempts)),
    )


def enqueue_recurrence_task(payload: QueuedRecurrenceTask) -> bool:
    """Enqueue a delayed recurrence task for generating the next occurrence."""
    now = utcnow()
    delay_seconds = max(0.0, (payload.scheduled_at - now).total_seconds())
    queued = _task_from_payload(payload)
    ok = enqueue_task_with_delay(
        queued,
        settings.rq_queue_name,
        delay_seconds=delay_seconds,
        redis_url=settings.rq_redis_url,
    )
    if ok:
        logger.info(
            "recurrence.queue.enqueued",
            extra={
                "task_id": str(payload.task_id),
                "board_id": str(payload.board_id),
                "scheduled_at": payload.scheduled_at.isoformat(),
                "delay_seconds": delay_seconds,
                "attempt": payload.attempts,
            },
        )
    return ok


def defer_recurrence_task(
    task: QueuedTask,
    *,
    delay_seconds: float,
) -> bool:
    """Defer a recurrence task without incrementing retry attempts."""
    payload = decode_recurrence_task(task)
    deferred = QueuedRecurrenceTask(
        task_id=payload.task_id,
        board_id=payload.board_id,
        scheduled_at=payload.scheduled_at,
        attempts=task.attempts,
    )
    queued = _task_from_payload(deferred)
    return enqueue_task_with_delay(
        queued,
        settings.rq_queue_name,
        delay_seconds=max(0.0, delay_seconds),
        redis_url=settings.rq_redis_url,
    )


def requeue_recurrence_task(task: QueuedTask, *, delay_seconds: float = 0) -> bool:
    """Requeue a failed recurrence task with capped retries."""
    return generic_requeue_if_failed(
        task,
        settings.rq_queue_name,
        max_retries=settings.rq_dispatch_max_retries,
        redis_url=settings.rq_redis_url,
        delay_seconds=max(0.0, delay_seconds),
    )
