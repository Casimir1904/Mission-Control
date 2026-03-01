"""add planning_sessions and planning_questions tables

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-03-01 15:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "planning_sessions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("task_id", sa.Uuid(), nullable=False),
        sa.Column("gateway_id", sa.Uuid(), nullable=False),
        sa.Column("gateway_session_key", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        sa.Column("planning_messages", sa.JSON(), nullable=True),
        sa.Column("planning_spec", sa.JSON(), nullable=True),
        sa.Column("planning_agents", sa.JSON(), nullable=True),
        sa.Column("current_question_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"]),
        sa.ForeignKeyConstraint(["gateway_id"], ["gateways.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("task_id"),
    )
    op.create_index("ix_planning_sessions_task_id", "planning_sessions", ["task_id"])
    op.create_index("ix_planning_sessions_gateway_id", "planning_sessions", ["gateway_id"])
    op.create_index("ix_planning_sessions_status", "planning_sessions", ["status"])
    op.create_index(
        "ix_planning_sessions_gateway_session_key",
        "planning_sessions",
        ["gateway_session_key"],
    )

    op.create_table(
        "planning_questions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("session_id", sa.Uuid(), nullable=False),
        sa.Column("question_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column("question_type", sa.String(), nullable=False, server_default="text"),
        sa.Column("options", sa.JSON(), nullable=True),
        sa.Column("answer", sa.Text(), nullable=True),
        sa.Column("answered_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["session_id"], ["planning_sessions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_planning_questions_session_id", "planning_questions", ["session_id"])


def downgrade() -> None:
    op.drop_index("ix_planning_questions_session_id", table_name="planning_questions")
    op.drop_table("planning_questions")

    op.drop_index(
        "ix_planning_sessions_gateway_session_key",
        table_name="planning_sessions",
    )
    op.drop_index("ix_planning_sessions_status", table_name="planning_sessions")
    op.drop_index("ix_planning_sessions_gateway_id", table_name="planning_sessions")
    op.drop_index("ix_planning_sessions_task_id", table_name="planning_sessions")
    op.drop_table("planning_sessions")
