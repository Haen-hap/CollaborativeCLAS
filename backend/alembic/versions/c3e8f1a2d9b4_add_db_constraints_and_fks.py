"""Add canonical CHECK constraints and foreign keys to game_sessions / kiosks

Carga primero el catálogo de zonas y kioscos (si no existe) para que las llaves foráneas no fallen.

Revision ID: c3e8f1a2d9b4
Revises: b7d4a1c9e2f0
Create Date: 2026-10-16 12:00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from app.core.canonical import GAME_SESSION_CHECKS
from app.core.zones_data import KIOSKS, ZONES

revision: str = "c3e8f1a2d9b4"
down_revision: Union[str, Sequence[str], None] = "b7d4a1c9e2f0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    for code, name in ZONES:
        conn.execute(sa.text("INSERT INTO zones (code, name) VALUES (:c, :n) ON CONFLICT (code) DO NOTHING"),
                     {"c": code, "n": name})
    for code, name, zone in KIOSKS:
        conn.execute(sa.text("INSERT INTO kiosks (code, name, zone_code) VALUES (:c, :n, :z) ON CONFLICT (code) DO NOTHING"),
                     {"c": code, "n": name, "z": zone})

    op.create_foreign_key("fk_kiosks_zone_code_zones", "kiosks", "zones", ["zone_code"], ["code"])
    op.create_foreign_key("fk_game_sessions_kiosk_id_kiosks", "game_sessions", "kiosks", ["kiosk_id"], ["code"])
    for name, expr in GAME_SESSION_CHECKS.items():
        op.create_check_constraint(name, "game_sessions", expr)


def downgrade() -> None:
    for name in reversed(list(GAME_SESSION_CHECKS)):
        op.drop_constraint(name, "game_sessions", type_="check")
    op.drop_constraint("fk_game_sessions_kiosk_id_kiosks", "game_sessions", type_="foreignkey")
    op.drop_constraint("fk_kiosks_zone_code_zones", "kiosks", type_="foreignkey")
