"""Evita que el esquema de la API, la base de datos y el frontend se desincronicen."""
from typing import get_args

from app.core import canonical as C
from app.core.zones_data import KIOSKS, ZONES
from app.schemas import session as S
from app.schemas import visit as VS


def test_api_schema_matches_canonical_values():
    assert get_args(S.AgeRange) == C.AGE_RANGES
    assert get_args(S.WorkStatus) == C.WORK_STATUSES
    assert get_args(S.Schooling) == C.SCHOOLING_LEVELS
    assert get_args(S.RewardType) == C.IOT_TYPES
    assert get_args(S.SessionIn.model_fields["origin"].annotation) == C.ORIGINS


def test_zone_catalog_is_z001_to_z036():
    assert [c for c, _ in ZONES] == list(C.ZONE_CODES)
    assert dict(ZONES)["Z014"] == "Tocumen"  # único código confirmado por la spec


def test_every_kiosk_points_to_an_existing_zone():
    zones = {c for c, _ in ZONES}
    assert all(z is None or z in zones for _, _, z in KIOSKS)


def test_max_score_is_nine():
    assert sum(C.MAX_SCORES.values()) == 9


def test_visit_outcomes_match_between_api_and_database():
    assert set(get_args(VS.VisitIn.model_fields["outcome"].annotation)) == set(C.VISIT_OUTCOMES) | set(C.OPT_OUT_OUTCOMES)
    assert set(get_args(VS.VisitIn.model_fields["origin"].annotation)) == set(C.VISIT_ORIGINS)
    assert set(C.VISIT_RANK) == set(C.VISIT_OUTCOMES)
