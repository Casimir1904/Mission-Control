"""add agent_roles and model_defaults tables, extend agents

Revision ID: a1b2c3d4e5f6
Revises: b7a1d9c3e4f5
Create Date: 2026-03-01 14:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "f1b2c3d4e5a6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "agent_roles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("avatar_emoji", sa.String(), nullable=True),
        sa.Column("is_preset", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("default_model", sa.String(), nullable=True),
        sa.Column("identity_profile", sa.JSON(), nullable=True),
        sa.Column("soul_template", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_agent_roles_organization_id", "agent_roles", ["organization_id"])
    op.create_index("ix_agent_roles_name", "agent_roles", ["name"])
    op.create_index("ix_agent_roles_is_preset", "agent_roles", ["is_preset"])

    op.create_table(
        "model_defaults",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("global_default_model", sa.String(), nullable=True),
        sa.Column("preferences", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id"),
    )
    op.create_index("ix_model_defaults_organization_id", "model_defaults", ["organization_id"])

    op.add_column("agents", sa.Column("role_id", sa.Uuid(), nullable=True))
    op.add_column("agents", sa.Column("model", sa.String(), nullable=True))
    op.create_index("ix_agents_role_id", "agents", ["role_id"])
    op.create_foreign_key(
        "fk_agents_role_id",
        "agents",
        "agent_roles",
        ["role_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_agents_role_id", "agents", type_="foreignkey")
    op.drop_index("ix_agents_role_id", table_name="agents")
    op.drop_column("agents", "model")
    op.drop_column("agents", "role_id")

    op.drop_index("ix_model_defaults_organization_id", table_name="model_defaults")
    op.drop_table("model_defaults")

    op.drop_index("ix_agent_roles_is_preset", table_name="agent_roles")
    op.drop_index("ix_agent_roles_name", table_name="agent_roles")
    op.drop_index("ix_agent_roles_organization_id", table_name="agent_roles")
    op.drop_table("agent_roles")
