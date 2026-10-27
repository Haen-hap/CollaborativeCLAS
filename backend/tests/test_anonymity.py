"""Ley 81 de Panamá / spec v1.1: cero información personal en la base de datos."""
from app.core.database import Base
import app.models  # noqa: F401

FORBIDDEN_FRAGMENTS = ("cedula", "cédula", "dni", "email", "correo", "phone", "telefono", "teléfono", "address",
                       "direccion", "dirección", "passport", "pasaporte", "birth", "nacimiento", "surname",
                       "apellido", "nombre", "ssn", "username", "password")
FORBIDDEN_EXACT = {"name", "full_name", "first_name", "last_name", "ip", "ip_address", "device_id", "user_agent"}
ALLOWED = {("zones", "name"), ("kiosks", "name"), ("access_points", "name")}  # nombres de lugares, no de personas

GAME_SESSION_COLUMNS = {
    "session_id", "kiosk_id", "origin", "assisted_mode", "age_range", "work_status", "schooling_level", "zone_code",
    "c1_visual_signs_score", "c2_sentence_comprehension_score", "c3_mobile_icons_score", "c4_cybersecurity_score",
    "total_literacy_score", "internal_zone_classification", "completion_status", "last_step", "duration_seconds",
    "reward_issued", "iot_trigger_type", "repeat_device", "created_at",
}


def test_no_table_has_personal_data_columns():
    offenders = []
    for table in Base.metadata.tables.values():
        for col in table.columns:
            n = col.name.lower()
            if (table.name, n) in ALLOWED:
                continue
            if n in FORBIDDEN_EXACT or any(f in n for f in FORBIDDEN_FRAGMENTS):
                offenders.append(f"{table.name}.{n}")
    assert not offenders, f"Columnas que parecen datos personales: {offenders}"


def test_game_sessions_columns_are_exactly_the_reviewed_whitelist():
    """Si alguien agrega una columna, esta prueba falla y obliga a revisar que no sea PII."""
    cols = {c.name for c in Base.metadata.tables["game_sessions"].columns}
    assert cols == GAME_SESSION_COLUMNS


def test_demographics_are_codes_not_free_text():
    t = Base.metadata.tables["game_sessions"]
    checked = {c.name for c in t.constraints if getattr(c, "name", None)}
    for name in ("ck_gs_age_range", "ck_gs_work_status", "ck_gs_schooling_level", "ck_gs_zone_code"):
        assert name in checked


VISITS_COLUMNS = {"visit_id", "kiosk_id", "origin", "assisted_mode", "outcome", "session_id", "first_seen_at", "updated_at"}
COUNTER_COLUMNS = {"day", "kiosk_id", "outcome", "entries"}


def test_visits_and_counters_columns_are_exactly_the_reviewed_whitelist():
    """El registro de entradas es anónimo: ni IP, ni user agent, ni identificador de dispositivo."""
    assert {c.name for c in Base.metadata.tables["visits"].columns} == VISITS_COLUMNS
    assert {c.name for c in Base.metadata.tables["daily_counters"].columns} == COUNTER_COLUMNS
