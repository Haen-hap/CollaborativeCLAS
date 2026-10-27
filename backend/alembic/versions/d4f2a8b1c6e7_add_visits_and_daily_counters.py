"""Add visits (anonymous entries) and daily_counters (opt-out aggregates)

Revision ID: d4f2a8b1c6e7
Revises: c3e8f1a2d9b4
Create Date: 2026-10-17 12:00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from app.core.canonical import COUNTER_CHECKS, VISIT_CHECKS

revision: str = "d4f2a8b1c6e7"
down_revision: Union[str, Sequence[str], None] = "c3e8f1a2d9b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "visits",
        sa.Column("visit_id", sa.String(length=40), nullable=False),
        sa.Column("kiosk_id", sa.String(length=20), nullable=False),
        sa.Column("origin", sa.String(length=10), nullable=False),
        sa.Column("assisted_mode", sa.Boolean(), nullable=False),
        sa.Column("outcome", sa.String(length=12), nullable=False),
        sa.Column("session_id", sa.String(length=40), nullable=True),
        sa.Column("first_seen_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["kiosk_id"], ["kiosks.code"], name="fk_visits_kiosk_id_kiosks"),
        sa.PrimaryKeyConstraint("visit_id"),
        *[sa.CheckConstraint(e, name=n) for n, e in VISIT_CHECKS.items()],
    )
    op.create_index(op.f("ix_visits_kiosk_id"), "visits", ["kiosk_id"], unique=False)
    op.create_index(op.f("ix_visits_session_id"), "visits", ["session_id"], unique=False)
    op.create_table(
        "daily_counters",
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("kiosk_id", sa.String(length=20), nullable=False),
        sa.Column("outcome", sa.String(length=16), nullable=False),
        sa.Column("entries", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["kiosk_id"], ["kiosks.code"], name="fk_daily_counters_kiosk_id_kiosks"),
        sa.PrimaryKeyConstraint("day", "kiosk_id", "outcome"),
        *[sa.CheckConstraint(e, name=n) for n, e in COUNTER_CHECKS.items()],
    )


def downgrade() -> None:
    op.drop_table("daily_counters")
    op.drop_index(op.f("ix_visits_session_id"), table_name="visits")
    op.drop_index(op.f("ix_visits_kiosk_id"), table_name="visits")
    op.drop_table("visits")
