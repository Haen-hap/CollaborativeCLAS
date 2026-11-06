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
from app.models.question_options import QuestionOption
from app.models.questions import Question
from app.models.session_answers import SessionAnswer
from app.models.session_questions import SessionQuestion
from app.models.zone import Zone


def create_session(session_id, access_point_code, zone_code, status, duration=0):
    return AssessmentSession(
        session_id=session_id,
        access_point_code=access_point_code,
        assisted_mode=False,
        age_range=AgeRange.AGE_18_24,
        work_status=WorkStatus.STUDENT,
        schooling_level=SchoolingLevel.TERTIARY,
        zone_code=zone_code,
        location_declined=(zone_code == "DECLINED"),
        completion_status=status,
        duration_seconds=duration,
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
    access_point = AccessPoint(
        code="DIRECT_WEB",
        name="Acceso directo web",
        type=AccessPointType.WEB,
    )
    db_session.add_all([zone, access_point])
    db_session.flush()
    db_session.add_all(
        [
            create_session(201, "DIRECT_WEB", "Z001", CompletionStatus.COMPLETED, 80),
            create_session(202, "DIRECT_WEB", "Z001", CompletionStatus.COMPLETED, 90),
        ]
    )
    db_session.flush()
    db_session.add_all(
        [
            create_result(201, (2, 2, 2, 3), LiteracyClassification.GREEN),
            create_result(202, (1, 1, 1, 2), LiteracyClassification.YELLOW),
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


def test_zone_vulnerability_ranking_orders_by_red_percentage_with_window_rank(
    db_session, test_client
):
    z1 = Zone(code="Z001", name="Curundú")
    z2 = Zone(code="Z002", name="Bethania")
    ap = AccessPoint(
        code="PTYK001",
        name="Smart Kiosk Curundú",
        type=AccessPointType.KIOSK,
    )
    db_session.add_all([z1, z2, ap])
    db_session.flush()

    db_session.add_all(
        [
            create_session(301, "PTYK001", "Z001", CompletionStatus.COMPLETED, 60),
            create_session(302, "PTYK001", "Z001", CompletionStatus.COMPLETED, 70),
            create_session(303, "PTYK001", "Z002", CompletionStatus.COMPLETED, 65),
            create_session(304, "PTYK001", "Z002", CompletionStatus.COMPLETED, 80),
        ]
    )
    db_session.flush()
    db_session.add_all(
        [
            # Z001: 2 RED de 2 sesiones (100% crítico -> rank 1)
            create_result(301, (1, 0, 1, 0), LiteracyClassification.RED),
            create_result(302, (1, 1, 1, 0), LiteracyClassification.RED),
            # Z002: 1 RED y 1 GREEN (50% crítico -> rank 2)
            create_result(303, (1, 0, 0, 1), LiteracyClassification.RED),
            create_result(304, (2, 2, 2, 2), LiteracyClassification.GREEN),
        ]
    )
    db_session.commit()

    response = test_client.get("/analytics/vulnerability-ranking")
    assert response.status_code == 200
    data = response.json()
    assert data["global_avg_critical_index"] == 75.0
    assert len(data["zones"]) == 2
    assert data["zones"][0]["zone_code"] == "Z001"
    assert data["zones"][0]["critical_literacy_index"] == 100.0
    assert data["zones"][0]["vulnerability_rank"] == 1
    assert data["zones"][1]["zone_code"] == "Z002"
    assert data["zones"][1]["critical_literacy_index"] == 50.0
    assert data["zones"][1]["vulnerability_rank"] == 2


def test_kiosk_c4_dispersal_identifies_high_variance_outliers(
    db_session, test_client
):
    z1 = Zone(code="Z001", name="Curundú")
    ap1 = AccessPoint(
        code="PTYK001",
        name="Smart Kiosk Curundú",
        type=AccessPointType.KIOSK,
    )
    ap2 = AccessPoint(
        code="PTYK002",
        name="Smart Kiosk Bethania",
        type=AccessPointType.KIOSK,
    )
    db_session.add_all([z1, ap1, ap2])
    db_session.flush()

    db_session.add_all(
        [
            create_session(401, "PTYK001", "Z001", CompletionStatus.COMPLETED, 50),
            create_session(402, "PTYK001", "Z001", CompletionStatus.COMPLETED, 110),
            create_session(403, "PTYK002", "Z001", CompletionStatus.COMPLETED, 75),
            create_session(404, "PTYK002", "Z001", CompletionStatus.COMPLETED, 75),
        ]
    )
    db_session.flush()
    db_session.add_all(
        [
            # PTYK001: puntajes C4 polarizados (0 y 3) -> alta desviación estándar (1.5 -> outlier)
            create_result(401, (1, 1, 1, 0), LiteracyClassification.RED),
            create_result(402, (2, 2, 2, 3), LiteracyClassification.GREEN),
            # PTYK002: puntajes C4 uniformes (2 y 2) -> desviación estándar 0.0
            create_result(403, (1, 1, 1, 2), LiteracyClassification.YELLOW),
            create_result(404, (1, 1, 1, 2), LiteracyClassification.YELLOW),
        ]
    )
    db_session.commit()

    response = test_client.get("/analytics/kiosk-c4-dispersal")
    assert response.status_code == 200
    data = response.json()
    assert len(data["kiosks"]) == 2

    first = data["kiosks"][0]
    assert first["kiosk_id"] == "PTYK001"
    assert first["stddev_c4_score"] == 1.5
    assert first["dispersal_rank"] == 1
    assert first["is_outlier"] is True

    second = data["kiosks"][1]
    assert second["kiosk_id"] == "PTYK002"
    assert second["stddev_c4_score"] == 0.0
    assert second["dispersal_rank"] == 2
    assert second["is_outlier"] is False
