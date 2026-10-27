"""Solo con PostgreSQL real: TEST_DATABASE_URL=postgresql+psycopg://.../cclas_test"""
from pathlib import Path

import pytest
from sqlalchemy import inspect, text

from app.core.canonical import COUNTER_CHECKS, GAME_SESSION_CHECKS, VISIT_CHECKS
from app.core.database import Base
from tests.helpers import IS_SQLITE

pytestmark = pytest.mark.skipif(IS_SQLITE, reason="requiere PostgreSQL en TEST_DATABASE_URL")


def test_migrations_apply_and_revert_constraints(engine):
    from alembic import command
    from alembic.config import Config

    cfg = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    cfg.set_main_option("script_location", str(Path(__file__).resolve().parents[1] / "alembic"))
    Base.metadata.drop_all(engine)
    with engine.begin() as c:
        c.execute(text("DROP TABLE IF EXISTS alembic_version"))
    try:
        command.upgrade(cfg, "head")
        insp = inspect(engine)
        names = {c["name"] for c in insp.get_check_constraints("game_sessions")}
        assert set(GAME_SESSION_CHECKS) <= names
        assert any(fk["referred_table"] == "kiosks" for fk in insp.get_foreign_keys("game_sessions"))
        assert set(VISIT_CHECKS) <= {c["name"] for c in insp.get_check_constraints("visits")}
        assert set(COUNTER_CHECKS) <= {c["name"] for c in insp.get_check_constraints("daily_counters")}
        with engine.connect() as c:
            assert c.execute(text("SELECT count(*) FROM zones")).scalar() == 36

        command.downgrade(cfg, "b7d4a1c9e2f0")
        names = {c["name"] for c in inspect(engine).get_check_constraints("game_sessions")}
        assert not (set(GAME_SESSION_CHECKS) & names)
    finally:
        Base.metadata.drop_all(engine)
        with engine.begin() as c:
            c.execute(text("DROP TABLE IF EXISTS alembic_version"))
