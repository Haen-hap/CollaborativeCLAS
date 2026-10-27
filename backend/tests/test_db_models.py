from app.models import (Answer, Assessment, AssessmentResult, AssessmentSubmission, DemographicProfiles,
                        GameSession, Kiosk, Location, Questions, Zone)
from tests.helpers import valid

EXPECTED_TABLES = {"locations", "assessments", "questions", "demographic_profiles", "assessment_submissions",
                   "answers", "assessment_results", "zones", "kiosks", "game_sessions", "visits", "daily_counters"}


def test_all_tables_are_created(engine, db):
    from sqlalchemy import inspect
    assert EXPECTED_TABLES <= set(inspect(engine).get_table_names())


def test_reference_data_is_loaded(db):
    assert db.query(Zone).count() == 36
    assert {k.code for k in db.query(Kiosk)} == {"PTYK001", "PTYK002", "PTYK003", "DIRECT_WEB"}


def test_kiosk_zone_session_relationships(db):
    db.add(GameSession(**valid()))
    db.commit()
    kiosk = db.get(Kiosk, "PTYK001")
    assert kiosk.zone.name == "Curundú"
    assert [s.session_id for s in kiosk.sessions] == ["SES-TEST-1"]
    assert kiosk in db.get(Zone, "Z001").kiosks
    assert db.get(GameSession, "SES-TEST-1").kiosk.code == "PTYK001"


def test_new_session_fields_roundtrip(db):
    db.add(GameSession(**valid(assisted_mode=True, last_step="c3", repeat_device=True,
                               iot_trigger_type="POWER_STATION", completion_status="ABANDONED", reward_issued=False)))
    db.commit()
    db.expire_all()
    s = db.get(GameSession, "SES-TEST-1")
    assert (s.assisted_mode, s.last_step, s.repeat_device) == (True, "c3", True)
    assert (s.iot_trigger_type, s.completion_status, s.reward_issued) == ("POWER_STATION", "ABANDONED", False)
    assert s.created_at is not None


def test_defaults_for_minimal_session(db):
    db.add(GameSession(session_id="SES-MIN", kiosk_id="DIRECT_WEB",
                       internal_zone_classification="RED", completion_status="ABANDONED"))
    db.commit()
    s = db.get(GameSession, "SES-MIN")
    assert (s.origin, s.assisted_mode, s.reward_issued, s.repeat_device) == ("UNKNOWN", False, False, False)
    assert (s.iot_trigger_type, s.total_literacy_score, s.duration_seconds) == ("NONE", 0, 0)
    assert s.age_range is None and s.zone_code is None


def test_legacy_models_relationships_and_cascade(db):
    a = Assessment(title="t", description="d", assessment_type="literacy")
    q = Questions(category="test", question_text="?", question_type="mc", correct_answer="a", points=1)
    a.questions.append(q)
    loc = Location(country="PA", city="Panamá", zone_name="Curundú")
    prof = DemographicProfiles(age_group="35_49", education_level="PRIMARY_INCOMPLETE", employment_status="INFORMAL")
    sub = AssessmentSubmission(assessment=a, location=loc, demographic_profile=prof, consent_given=True)
    Answer(question=q, submission=sub, is_correct=True, answer_value=1, points_awarded=1)
    AssessmentResult(submission=sub, literacy_score=1, total_score=1, digital_score=0, priority_level=1)
    db.add_all([a, loc, prof, sub])
    db.commit()
    assert sub.result is not None and len(sub.answers) == 1 and q.answers[0].submission is sub
    db.delete(sub)
    db.commit()
    assert db.query(Answer).count() == 0 and db.query(AssessmentResult).count() == 0
