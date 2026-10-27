import pytest
from sqlalchemy.exc import IntegrityError

from app.core import canonical as C
from app.models import GameSession
from tests.helpers import valid

# (cambios sobre una sesión válida, restricción que debe saltar)
INVALID = [
    ({"origin": "HACK"}, "ck_gs_origin"),
    ({"age_range": "ABC"}, "ck_gs_age_range"),
    ({"age_range": "18-24"}, "ck_gs_age_range"),
    ({"work_status": "BOSS"}, "ck_gs_work_status"),
    ({"schooling_level": "PHD"}, "ck_gs_schooling_level"),
    ({"zone_code": "Z000"}, "ck_gs_zone_code"),
    ({"zone_code": "Z037"}, "ck_gs_zone_code"),
    ({"zone_code": "tocumen"}, "ck_gs_zone_code"),  # nunca texto libre
    ({"completion_status": "DONE"}, "ck_gs_completion_status"),
    ({"iot_trigger_type": "LASER"}, "ck_gs_iot_type"),
    ({"internal_zone_classification": "BLUE"}, "ck_gs_classification"),
    # puntajes fuera de rango (el total se ajusta para aislar la regla)
    ({"c1_visual_signs_score": 3, "total_literacy_score": 7, "internal_zone_classification": "GREEN"}, "ck_gs_c1_range"),
    ({"c1_visual_signs_score": -1, "total_literacy_score": 3, "internal_zone_classification": "RED"}, "ck_gs_c1_range"),
    ({"c2_sentence_comprehension_score": 3, "total_literacy_score": 7, "internal_zone_classification": "GREEN"}, "ck_gs_c2_range"),
    ({"c3_mobile_icons_score": 3, "total_literacy_score": 7, "internal_zone_classification": "GREEN"}, "ck_gs_c3_range"),
    ({"c4_cybersecurity_score": 4, "total_literacy_score": 7, "internal_zone_classification": "GREEN"}, "ck_gs_c4_range"),
    ({"duration_seconds": -1}, "ck_gs_duration_nonneg"),
    # coherencia entre campos calculados
    ({"total_literacy_score": 6, "internal_zone_classification": "YELLOW"}, "ck_gs_total_is_sum"),
    ({"internal_zone_classification": "GREEN"}, "ck_gs_class_matches_total"),  # total 5 = YELLOW
]


@pytest.mark.parametrize("changes,constraint", INVALID)
def test_invalid_values_are_rejected_by_the_database(db, changes, constraint):
    db.add(GameSession(**valid(**changes)))
    with pytest.raises(IntegrityError) as exc:
        db.commit()
    db.rollback()
    assert constraint in str(exc.value)


def test_unknown_kiosk_is_rejected_by_foreign_key(db):
    db.add(GameSession(**valid(kiosk_id="PTYK099")))
    with pytest.raises(IntegrityError):
        db.commit()


@pytest.mark.parametrize("field,values", [
    ("age_range", C.AGE_RANGES), ("work_status", C.WORK_STATUSES), ("schooling_level", C.SCHOOLING_LEVELS),
    ("origin", C.ORIGINS), ("iot_trigger_type", C.IOT_TYPES), ("completion_status", C.COMPLETION_STATUSES),
])
def test_every_canonical_value_is_accepted(db, field, values):
    for i, v in enumerate(values):
        db.add(GameSession(**valid(session_id=f"SES-{field}-{i}", **{field: v})))
    db.commit()
    assert db.query(GameSession).count() == len(values)


def test_zone_boundaries_and_declined(db):
    for i, z in enumerate(("Z001", "Z036", "DECLINED", None)):
        db.add(GameSession(**valid(session_id=f"SES-Z{i}", zone_code=z)))
    db.commit()
    assert db.query(GameSession).count() == 4


@pytest.mark.parametrize("total,cls", [(0, "RED"), (3, "RED"), (4, "YELLOW"), (6, "YELLOW"), (7, "GREEN"), (9, "GREEN")])
def test_classification_thresholds(db, total, cls):
    scores = {0: (0, 0, 0, 0), 3: (1, 1, 1, 0), 4: (1, 1, 1, 1), 6: (2, 2, 1, 1), 7: (2, 2, 2, 1), 9: (2, 2, 2, 3)}[total]
    c1, c2, c3, c4 = scores
    db.add(GameSession(**valid(c1_visual_signs_score=c1, c2_sentence_comprehension_score=c2, c3_mobile_icons_score=c3,
                               c4_cybersecurity_score=c4, total_literacy_score=total, internal_zone_classification=cls)))
    db.commit()
