"""add chat_sessions and chat_messages tables

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-03-01 16:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "chat_sessions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("task_id", sa.Uuid(), nullable=True),
        sa.Column("agent_id", sa.Uuid(), nullable=True),
        sa.Column("gateway_id", sa.Uuid(), nullable=False),
        sa.Column(
            "session_type",
            sa.String(),
            nullable=False,
            server_default="standalone",
        ),
        sa.Column("gateway_session_key", sa.String(), nullable=True),
        sa.Column("title", sa.String(), nullable=True),
        sa.Column(
            "status",
            sa.String(),
            nullable=False,
            server_default="active",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"]),
        sa.ForeignKeyConstraint(["agent_id"], ["agents.id"]),
        sa.ForeignKeyConstraint(["gateway_id"], ["gateways.id"]),
    )
    op.create_index(
        "ix_chat_sessions_task_id", "chat_sessions", ["task_id"]
    )
    op.create_index(
        "ix_chat_sessions_agent_id", "chat_sessions", ["agent_id"]
    )
    op.create_index(
        "ix_chat_sessions_gateway_id", "chat_sessions", ["gateway_id"]
    )
    op.create_index(
        "ix_chat_sessions_session_type",
        "chat_sessions",
        ["session_type"],
    )
    op.create_index(
        "ix_chat_sessions_gateway_session_key",
        "chat_sessions",
        ["gateway_session_key"],
    )
    op.create_index(
        "ix_chat_sessions_status", "chat_sessions", ["status"]
    )

    op.create_table(
        "chat_messages",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("session_id", sa.Uuid(), nullable=False),
        sa.Column("sender_type", sa.String(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "message_type",
            sa.String(),
            nullable=False,
            server_default="text",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["session_id"], ["chat_sessions.id"]
        ),
    )
    op.create_index(
        "ix_chat_messages_session_id",
        "chat_messages",
        ["session_id"],
    )
    op.create_index(
        "ix_chat_messages_sender_type",
        "chat_messages",
        ["sender_type"],
    )


def downgrade() -> None:
    op.drop_table("chat_messages")
    op.drop_table("chat_sessions")
