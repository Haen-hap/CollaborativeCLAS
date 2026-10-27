import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from tests.helpers import IS_SQLITE, URL  # fija DATABASE_URL antes de importar app

from app.core.database import Base  # noqa: E402
import app.models  # noqa: E402,F401  (registra todas las tablas en Base.metadata)
from app.core.zones_data import KIOSKS, ZONES  # noqa: E402
from app.models import Kiosk, Zone  # noqa: E402


@pytest.fixture(scope="session")
def engine():
    kw = {"connect_args": {"check_same_thread": False}, "poolclass": StaticPool} if IS_SQLITE else {}
    eng = create_engine(URL, **kw)
    if IS_SQLITE:
        @event.listens_for(eng, "connect")
        def _fk_on(dbapi_conn, _):  # SQLite ignora las llaves foráneas si no se activan
            dbapi_conn.execute("PRAGMA foreign_keys=ON")
    yield eng
    eng.dispose()


@pytest.fixture()
def db(engine):
    """Base limpia por prueba, con zonas y kioscos ya cargados."""
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    s = sessionmaker(bind=engine, autoflush=False)()
    s.add_all([Zone(code=c, name=n) for c, n in ZONES])
    s.commit()
    s.add_all([Kiosk(code=c, name=n, zone_code=z) for c, n, z in KIOSKS])
    s.commit()
    yield s
    s.close()


@pytest.fixture()
def db_session(engine):
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, autoflush=False)()
    yield session
    session.close()


@pytest.fixture()
def test_client(db_session):
    from fastapi.testclient import TestClient

    from app.core.database import get_db
    from app.main import app

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as client:
            yield client
    finally:
        app.dependency_overrides.pop(get_db, None)
