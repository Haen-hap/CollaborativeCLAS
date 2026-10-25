"""add in progress session status

Revision ID: 8972d54398b1
Revises: 40565b858a6d
Create Date: 2026-10-25 16:26:07.857722

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '8972d54398b1'
down_revision: Union[str, Sequence[str], None] = '40565b858a6d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    with op.get_context().autocommit_block():
        op.execute(
            "ALTER TYPE completionstatus "
            "ADD VALUE IF NOT EXISTS 'IN_PROGRESS'"
        )


def downgrade() -> None:
    """Downgrade schema."""
    pass
