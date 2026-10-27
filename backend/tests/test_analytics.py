import pytest

from app.models.access_points import AccessPoint, AccessPointType
from app.models.assessment_results import AssessmentResult, LiteracyClassification
from app.models.assessment_session import (
    AgeRange,
    AssessmentSession,
    CompletionStatus,
    SchoolingLevel,
    WorkStatus,
)
from app.models.game_session import GameSession
from app.models.question_options import QuestionOption
from app.models.questions import Question
from app.models.session_answers import SessionAnswer
from app.models.session_questions import SessionQuestion
from app.models.zone import Kiosk, Zone


def create_session(session_id, access_point_code, zone_code, status):
    return AssessmentSession(
        session_id=session_id,
        access_point_code=access_point_code,
        assisted_mode=False,
        age_range=AgeRange.AGE_18_24,
        work_status=WorkStatus.STUDENT,
        schooling_level=SchoolingLevel.TERTIARY,
        zone_code=zone_code,
        location_declined=False,
        completion_status=status,
        duration_seconds=0,
    )


def create_result(session_id, scores, classification):
    c1, c2, c3, c4 = scores
    return AssessmentResult(
        session_id=session_id,
        c1_visual_signs_score=c1,
        c2_sentence_comprehension_score=c2,
        c3_mobile_icons_score=c3,
        c4_cybersecurity_score=c4,
        total_literacy_score=sum(scores),
        literacy_classification=classification,
    )


@pytest.fixture
def analytics_api(db_session, test_client):
    access_point = AccessPoint(
        code="DIRECT_WEB",
        name="Direct Web",
        type=AccessPointType.WEB,
    )
    zone = Zone(code="Z001", name="Test Zone")
    db_session.add_all([access_point, zone])
    db_session.flush()

    sessions = [
        create_session(101, access_point.code, zone.code, CompletionStatus.COMPLETED),
        create_session(102, access_point.code, zone.code, CompletionStatus.COMPLETED),
        create_session(103, access_point.code, zone.code, CompletionStatus.COMPLETED),
        create_session(104, access_point.code, zone.code, CompletionStatus.IN_PROGRESS),
        create_session(105, access_point.code, zone.code, CompletionStatus.IN_PROGRESS),
        create_session(106, access_point.code, zone.code, CompletionStatus.ABANDONED),
    ]
    db_session.add_all(sessions)
    db_session.flush()
    db_session.add_all(
        [
            create_result(101, (2, 0, 0, 0), LiteracyClassification.RED),
            create_result(102, (1, 1, 1, 2), LiteracyClassification.YELLOW),
            create_result(103, (2, 2, 2, 2), LiteracyClassification.GREEN),
        ]
    )

    question_one = Question(category="R1", question_text="First test question")
    question_two = Question(category="R2", question_text="Second test question")
    db_session.add_all([question_one, question_two])
    db_session.flush()
    option_one = QuestionOption(
        question_id=question_one.id,
        option_text="First option",
        is_correct=True,
    )
    option_two = QuestionOption(
        question_id=question_two.id,
        option_text="Second option",
        is_correct=True,
    )
    db_session.add_all([option_one, option_two])
    db_session.flush()
    db_session.add_all(
        [
            SessionQuestion(
                session_id=104,
                question_id=question_one.id,
                position=1,
            ),
            SessionQuestion(
                session_id=104,
                question_id=question_two.id,
                position=2,
            ),
        ]
    )
    db_session.flush()
    db_session.add_all(
        [
            SessionAnswer(
                session_id=104,
                question_id=question_one.id,
                option_id=option_one.id,
            ),
            SessionAnswer(
                session_id=104,
                question_id=question_two.id,
                option_id=option_two.id,
            ),
        ]
    )
    db_session.commit()

    yield {"client": test_client, "db": db_session}


@pytest.fixture
def empty_analytics_api(db_session, test_client):
    yield test_client


def test_summary_aggregates_sessions_results_and_classification_distribution(
    analytics_api,
):
    response = analytics_api["client"].get("/analytics/summary")

    assert response.status_code == 200
    data = response.json()
    assert data["total_assessments"] == 6
    assert data["completed_assessments"] == 3
    assert data["in_progress_assessments"] == 2
    assert data["abandoned_assessments"] == 1
    assert data["assessments_without_answers"] == 5
    assert data["sessions_with_answers"] == 1
    assert data["total_answers"] == 2
    assert data["total_submissions"] == 3
    assert data["average_score_percentage"] == 55.6
    assert data["category_averages"] == {
        "c1_visual_signs": 1.7,
        "c2_sentence_comprehension": 1.0,
        "c3_mobile_icons": 1.0,
        "c4_cybersecurity": 1.3,
    }
    assert data["most_common_classifications"] == ["Red", "Yellow", "Green"]
    assert data["classification_distribution"] == [
        {"classification": "Red", "count": 1, "percentage": 33.3},
        {"classification": "Yellow", "count": 1, "percentage": 33.3},
        {"classification": "Green", "count": 1, "percentage": 33.3},
    ]


def test_summary_aggregates_game_sessions(db_session, test_client):
    zone = Zone(code="Z001", name="Curundú")
    kiosk = Kiosk(code="DIRECT_WEB", name="Acceso directo web", zone_code="Z001")
    db_session.add_all([zone, kiosk])
    db_session.flush()
    db_session.add_all(
        [
            GameSession(
                session_id="SES-GAME-1",
                kiosk_id="DIRECT_WEB",
                origin="UNKNOWN",
                assisted_mode=False,
                age_range="25_34",
                work_status="FORMAL",
                schooling_level="SECONDARY_COMPLETE",
                zone_code="Z001",
                c1_visual_signs_score=2,
                c2_sentence_comprehension_score=2,
                c3_mobile_icons_score=2,
                c4_cybersecurity_score=3,
                total_literacy_score=9,
                internal_zone_classification="GREEN",
                completion_status="COMPLETED",
                last_step="step_17",
                duration_seconds=80,
                reward_issued=True,
                iot_trigger_type="WIFI_CREDENTIAL",
                repeat_device=False,
            ),
            GameSession(
                session_id="SES-GAME-2",
                kiosk_id="DIRECT_WEB",
                origin="UNKNOWN",
                assisted_mode=False,
                age_range="35_49",
                work_status="INFORMAL",
                schooling_level="PRIMARY_COMPLETE",
                zone_code="Z001",
                c1_visual_signs_score=1,
                c2_sentence_comprehension_score=1,
                c3_mobile_icons_score=1,
                c4_cybersecurity_score=2,
                total_literacy_score=5,
                internal_zone_classification="YELLOW",
                completion_status="COMPLETED",
                last_step="step_17",
                duration_seconds=90,
                reward_issued=False,
                iot_trigger_type="NONE",
                repeat_device=True,
            ),
        ]
    )
    db_session.commit()

    response = test_client.get("/analytics/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["total_assessments"] == 2
    assert data["completed_assessments"] == 2
    assert data["abandoned_assessments"] == 0
    assert data["total_submissions"] == 2
    assert data["average_score_percentage"] == 77.8
    assert data["category_averages"] == {
        "c1_visual_signs": 1.5,
        "c2_sentence_comprehension": 1.5,
        "c3_mobile_icons": 1.5,
        "c4_cybersecurity": 2.5,
    }
    assert data["classification_distribution"] == [
        {"classification": "Red", "count": 0, "percentage": 0.0},
        {"classification": "Yellow", "count": 1, "percentage": 50.0},
        {"classification": "Green", "count": 1, "percentage": 50.0},
    ]


def test_multiple_answers_do_not_multiply_result_counts(analytics_api):
    data = analytics_api["client"].get("/analytics/summary").json()

    assert data["total_answers"] == 2
    assert data["sessions_with_answers"] == 1
    assert data["total_submissions"] == 3
    assert sum(
        item["count"] for item in data["classification_distribution"]
    ) == 3


def test_empty_dataset_returns_zero_counts_and_no_average(empty_analytics_api):
    response = empty_analytics_api.get("/analytics/summary")

    assert response.status_code == 200
    data = response.json()
    assert data["total_assessments"] == 0
    assert data["completed_assessments"] == 0
    assert data["assessments_without_answers"] == 0
    assert data["total_answers"] == 0
    assert data["total_submissions"] == 0
    assert data["average_score_percentage"] is None
    assert data["category_averages"] == {
        "c1_visual_signs": 0.0,
        "c2_sentence_comprehension": 0.0,
        "c3_mobile_icons": 0.0,
        "c4_cybersecurity": 0.0,
    }
    assert data["most_common_classifications"] == []
    assert data["classification_distribution"] == [
        {"classification": "Red", "count": 0, "percentage": 0.0},
        {"classification": "Yellow", "count": 0, "percentage": 0.0},
        {"classification": "Green", "count": 0, "percentage": 0.0},
    ]


def test_summary_contains_only_aggregates_and_no_personal_data(analytics_api):
    response = analytics_api["client"].get("/analytics/summary")

    assert response.status_code == 200
    data = response.json()
    assert set(data) == {
        "total_assessments",
        "completed_assessments",
        "in_progress_assessments",
        "abandoned_assessments",
        "assessments_without_answers",
        "sessions_with_answers",
        "total_answers",
        "total_submissions",
        "average_score_percentage",
        "category_averages",
        "most_common_classifications",
        "classification_distribution",
    }
    serialized = response.text.lower()
    assert "session_id" not in serialized
    assert "question_id" not in serialized
    assert "option_id" not in serialized
    for pii_field in ("name", "email", "phone", "address", "respondent_id"):
        assert pii_field not in serialized


def test_unknown_analytics_endpoint_returns_not_found(empty_analytics_api):
    response = empty_analytics_api.get("/analytics/not-a-metric")

    assert response.status_code == 404
