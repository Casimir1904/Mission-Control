"""Add recurrence fields to tasks for scheduled repeating tasks.

Revision ID: c9f8e7d6b5a4
Revises: a2f6c9d4b7e8
Create Date: 2026-03-02 00:00:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision = "c9f8e7d6b5a4"
down_revision = "a2f6c9d4b7e8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add recurrence fields to tasks table."""
    # Add recurrence_rule as JSON for storing recurrence pattern
    op.add_column(
        "tasks",
        sa.Column("recurrence_rule", sa.JSON(), nullable=True),
    )

    # Add recurrence_parent_id as UUID with foreign key to tasks.id
    op.add_column(
        "tasks",
        sa.Column("recurrence_parent_id", sa.Uuid(), nullable=True),
    )

    # Add recurrence_next_task_id as UUID with foreign key to tasks.id
    op.add_column(
        "tasks",
        sa.Column("recurrence_next_task_id", sa.Uuid(), nullable=True),
    )

    # Create foreign key constraints
    op.create_foreign_key(
        "fk_tasks_recurrence_parent_id",
        "tasks",
        "tasks",
        ["recurrence_parent_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_foreign_key(
        "fk_tasks_recurrence_next_task_id",
        "tasks",
        "tasks",
        ["recurrence_next_task_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # Create indexes for the foreign key columns
    op.create_index(
        "ix_tasks_recurrence_parent_id",
        "tasks",
        ["recurrence_parent_id"],
    )

    op.create_index(
        "ix_tasks_recurrence_next_task_id",
        "tasks",
        ["recurrence_next_task_id"],
    )


def downgrade() -> None:
    """Remove recurrence fields from tasks table."""
    # Drop indexes
    op.drop_index("ix_tasks_recurrence_next_task_id", table_name="tasks")
    op.drop_index("ix_tasks_recurrence_parent_id", table_name="tasks")

    # Drop foreign key constraints
    op.drop_constraint("fk_tasks_recurrence_next_task_id", "tasks", type_="foreignkey")
    op.drop_constraint("fk_tasks_recurrence_parent_id", "tasks", type_="foreignkey")

    # Drop columns
    op.drop_column("tasks", "recurrence_next_task_id")
    op.drop_column("tasks", "recurrence_parent_id")
    op.drop_column("tasks", "recurrence_rule")
