"""Recurrence service for calculating next occurrence of scheduled tasks."""

from __future__ import annotations

import calendar
from datetime import UTC, datetime, timedelta
from typing import Literal

# Lazy import of logger to allow usage without full app context
def _get_logger():
    try:
        from app.core.logging import get_logger
        return get_logger(__name__)
    except Exception:
        return None


RecurrenceFrequency = Literal["daily", "weekly", "monthly", "yearly"]


def calculate_next_occurrence(
    recurrence: dict[str, object],
    current: datetime,
) -> datetime:
    """Calculate the next occurrence based on recurrence rules.

    Args:
        recurrence: Dictionary containing recurrence configuration.
            Must include 'frequency' key with value 'daily', 'weekly',
            'monthly', or 'yearly'.
        current: The current datetime from which to calculate the next occurrence.

    Returns:
        The next occurrence datetime.

    Raises:
        ValueError: If frequency is not a valid recurrence frequency.
    """
    frequency = recurrence.get("frequency")

    if frequency == "daily":
        return current + timedelta(days=1)
    if frequency == "weekly":
        return current + timedelta(weeks=1)
    if frequency == "monthly":
        return _add_months(current, 1)
    if frequency == "yearly":
        return _add_months(current, 12)

    logger = _get_logger()
    if logger:
        logger.warning(
            "recurrence.invalid_frequency",
            extra={"frequency": frequency, "current": current.isoformat()},
        )
    raise ValueError(f"Invalid recurrence frequency: {frequency}")


def _add_months(dt: datetime, months: int) -> datetime:
    """Add months to a datetime, handling end-of-month edge cases.

    Args:
        dt: The datetime to add months to.
        months: Number of months to add.

    Returns:
        The resulting datetime after adding months.
    """
    year = dt.year
    month = dt.month + months

    # Adjust year and month
    while month > 12:
        month -= 12
        year += 1

    # Handle end-of-month: if current day is the last day of month,
    # use the last day of the target month
    last_day_of_current = calendar.monthrange(dt.year, dt.month)[1]
    last_day_of_target = calendar.monthrange(year, month)[1]

    if dt.day == last_day_of_current:
        day = last_day_of_target
    else:
        day = min(dt.day, last_day_of_target)

    return dt.replace(year=year, month=month, day=day)


def parse_frequency(frequency: str) -> RecurrenceFrequency:
    """Parse and validate a recurrence frequency string.

    Args:
        frequency: The frequency string to parse.

    Returns:
        The validated RecurrenceFrequency.

    Raises:
        ValueError: If frequency is not valid.
    """
    valid_frequencies: tuple[RecurrenceFrequency, ...] = (
        "daily",
        "weekly",
        "monthly",
        "yearly",
    )
    if frequency in valid_frequencies:
        return frequency  # type: ignore[return-value]
    raise ValueError(
        f"Invalid frequency '{frequency}'. Must be one of: {', '.join(valid_frequencies)}"
    )


def get_recurrence_description(recurrence: dict[str, object]) -> str:
    """Get a human-readable description of the recurrence rule.

    Args:
        recurrence: Dictionary containing recurrence configuration.

    Returns:
        A human-readable description string.
    """
    frequency = recurrence.get("frequency")
    descriptions: dict[str, str] = {
        "daily": "Every day",
        "weekly": "Every week",
        "monthly": "Every month",
        "yearly": "Every year",
    }
    return descriptions.get(str(frequency), f"Unknown frequency: {frequency}")
