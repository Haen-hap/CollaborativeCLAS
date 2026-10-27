"""Add zones, kiosks and game_sessions (canonical-code storage per spec v1.1)

Revision ID: b7d4a1c9e2f0
Revises: 03e9c5141867
Create Date: 2026-10-16 00:00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b7d4a1c9e2f0"
down_revision: Union[str, Sequence[str], None] = "03e9c5141867"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "zones",
        sa.Column("code", sa.String(length=4), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.PrimaryKeyConstraint("code"),
    )
    op.create_table(
        "kiosks",
        sa.Column("code", sa.String(length=20), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("zone_code", sa.String(length=4), nullable=True),
        sa.PrimaryKeyConstraint("code"),
    )
    op.create_table(
        "game_sessions",
        sa.Column("session_id", sa.String(length=40), nullable=False),
        sa.Column("kiosk_id", sa.String(length=20), nullable=False),
        sa.Column("origin", sa.String(length=10), nullable=False),
        sa.Column("assisted_mode", sa.Boolean(), nullable=False),
        sa.Column("age_range", sa.String(length=10), nullable=True),
        sa.Column("work_status", sa.String(length=15), nullable=True),
        sa.Column("schooling_level", sa.String(length=25), nullable=True),
        sa.Column("zone_code", sa.String(length=10), nullable=True),
        sa.Column("c1_visual_signs_score", sa.SmallInteger(), nullable=False),
        sa.Column("c2_sentence_comprehension_score", sa.SmallInteger(), nullable=False),
        sa.Column("c3_mobile_icons_score", sa.SmallInteger(), nullable=False),
        sa.Column("c4_cybersecurity_score", sa.SmallInteger(), nullable=False),
        sa.Column("total_literacy_score", sa.SmallInteger(), nullable=False),
        sa.Column("internal_zone_classification", sa.String(length=6), nullable=False),
        sa.Column("completion_status", sa.String(length=10), nullable=False),
        sa.Column("last_step", sa.String(length=15), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=False),
        sa.Column("reward_issued", sa.Boolean(), nullable=False),
        sa.Column("iot_trigger_type", sa.String(length=20), nullable=False),
        sa.Column("repeat_device", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("session_id"),
    )
    op.create_index(op.f("ix_game_sessions_kiosk_id"), "game_sessions", ["kiosk_id"], unique=False)
    op.create_index(op.f("ix_game_sessions_zone_code"), "game_sessions", ["zone_code"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_game_sessions_zone_code"), table_name="game_sessions")
    op.drop_index(op.f("ix_game_sessions_kiosk_id"), table_name="game_sessions")
    op.drop_table("game_sessions")
    op.drop_table("kiosks")
    op.drop_table("zones")
