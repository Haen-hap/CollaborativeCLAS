import os

# Por defecto las pruebas corren en SQLite en memoria (rápido, sin instalar nada).
# Para probar contra PostgreSQL real: TEST_DATABASE_URL=postgresql+psycopg://user:pass@localhost:5432/cclas_test
URL = os.environ.get("TEST_DATABASE_URL", "sqlite://")
IS_SQLITE = URL.startswith("sqlite")
os.environ["DATABASE_URL"] = URL  # debe fijarse ANTES de importar app.*

if not IS_SQLITE and "test" not in URL.rsplit("/", 1)[-1].lower():
    raise RuntimeError("Por seguridad, la base de pruebas debe tener 'test' en su nombre (las pruebas borran las tablas).")

VALID = dict(
    session_id="SES-TEST-1", kiosk_id="PTYK001", origin="KIOSK", assisted_mode=False,
    age_range="35_49", work_status="INFORMAL", schooling_level="PRIMARY_INCOMPLETE", zone_code="Z001",
    c1_visual_signs_score=1, c2_sentence_comprehension_score=1, c3_mobile_icons_score=1, c4_cybersecurity_score=2,
    total_literacy_score=5, internal_zone_classification="YELLOW", completion_status="COMPLETED", last_step="reward",
    duration_seconds=95, reward_issued=True, iot_trigger_type="WIFI_CREDENTIAL", repeat_device=False,
)


def valid(**over):
    """Sesión válida de referencia; cada prueba cambia solo lo que quiere romper."""
    return {**VALID, **over}
