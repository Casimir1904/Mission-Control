"""merge_multiple_heads

Revision ID: eab9ec26b6c2
Revises: c9f8e7d6b5a4, c3d4e5f6a7b8
Create Date: 2026-03-02 12:43:03.668731

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'eab9ec26b6c2'
down_revision = ('c9f8e7d6b5a4', 'c3d4e5f6a7b8')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
