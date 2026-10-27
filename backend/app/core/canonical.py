"""Valores canónicos (única fuente de verdad para modelos, migración y pruebas).

Deben coincidir con el Data_Dictionary del cliente y con frontend/src/lib/codes.js.
"""
AGE_RANGES = ("18_24", "25_34", "35_49", "50_59", "60_PLUS")
WORK_STATUSES = ("FORMAL", "INFORMAL", "HOME", "STUDENT", "UNEMPLOYED")
SCHOOLING_LEVELS = ("PRIMARY_INCOMPLETE", "PRIMARY_COMPLETE", "SECONDARY_INCOMPLETE", "SECONDARY_COMPLETE", "TERTIARY")
ORIGINS = ("KIOSK", "UNKNOWN", "MOCK")
COMPLETION_STATUSES = ("COMPLETED", "ABANDONED")
CLASSIFICATIONS = ("RED", "YELLOW", "GREEN")
IOT_TYPES = ("NONE", "BEVERAGE_DISPENSER", "POWER_STATION", "WIFI_CREDENTIAL")
ZONE_CODES = tuple(f"Z{i:03d}" for i in range(1, 37))  # Z001–Z036
ZONE_VALUES = ZONE_CODES + ("DECLINED",)
MAX_SCORES = {"c1": 2, "c2": 2, "c3": 2, "c4": 3}  # total máximo = 9


def sql_in(col: str, values: tuple, nullable: bool = False) -> str:
    items = ", ".join(f"'{v}'" for v in values)
    expr = f"{col} IN ({items})"
    return f"({col} IS NULL OR {expr})" if nullable else expr


# Restricciones de game_sessions: se aplican en PostgreSQL, no solo en Pydantic
GAME_SESSION_CHECKS = {
    "ck_gs_origin": sql_in("origin", ORIGINS),
    "ck_gs_age_range": sql_in("age_range", AGE_RANGES, True),
    "ck_gs_work_status": sql_in("work_status", WORK_STATUSES, True),
    "ck_gs_schooling_level": sql_in("schooling_level", SCHOOLING_LEVELS, True),
    "ck_gs_zone_code": sql_in("zone_code", ZONE_VALUES, True),
    "ck_gs_completion_status": sql_in("completion_status", COMPLETION_STATUSES),
    "ck_gs_classification": sql_in("internal_zone_classification", CLASSIFICATIONS),
    "ck_gs_iot_type": sql_in("iot_trigger_type", IOT_TYPES),
    "ck_gs_c1_range": "c1_visual_signs_score BETWEEN 0 AND 2",
    "ck_gs_c2_range": "c2_sentence_comprehension_score BETWEEN 0 AND 2",
    "ck_gs_c3_range": "c3_mobile_icons_score BETWEEN 0 AND 2",
    "ck_gs_c4_range": "c4_cybersecurity_score BETWEEN 0 AND 3",
    "ck_gs_total_range": "total_literacy_score BETWEEN 0 AND 9",
    "ck_gs_total_is_sum": ("total_literacy_score = c1_visual_signs_score + c2_sentence_comprehension_score"
                           " + c3_mobile_icons_score + c4_cybersecurity_score"),
    "ck_gs_class_matches_total": ("((total_literacy_score <= 3 AND internal_zone_classification = 'RED')"
                                  " OR (total_literacy_score BETWEEN 4 AND 6 AND internal_zone_classification = 'YELLOW')"
                                  " OR (total_literacy_score >= 7 AND internal_zone_classification = 'GREEN'))"),
    "ck_gs_duration_nonneg": "duration_seconds >= 0",
}


# ---- Registro anónimo de entradas al sitio (visits) ----
VISIT_ORIGINS = ("KIOSK", "UNKNOWN")
VISIT_OUTCOMES = ("ENTERED", "CONSENTED", "ABANDONED", "COMPLETED")  # una fila por visita
OPT_OUT_OUTCOMES = ("DECLINED_PRIVACY", "UNDER_18")  # spec US-02/US-03: sin fila, solo contador agregado
VISIT_RANK = {"ENTERED": 0, "CONSENTED": 1, "ABANDONED": 2, "COMPLETED": 3}  # un reintento tardío no retrocede el estado

VISIT_CHECKS = {
    "ck_visit_origin": sql_in("origin", VISIT_ORIGINS),
    "ck_visit_outcome": sql_in("outcome", VISIT_OUTCOMES),
}
COUNTER_CHECKS = {
    "ck_counter_outcome": sql_in("outcome", OPT_OUT_OUTCOMES),
    "ck_counter_nonneg": "entries >= 0",
}
