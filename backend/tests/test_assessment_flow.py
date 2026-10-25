import pytest
from sqlalchemy import func, select

from app.models.access_points import AccessPoint, AccessPointType
from app.models.assessment_session import AssessmentSession
from app.models.question_options import QuestionOption
from app.models.questions import Question
from app.models.session_answers import SessionAnswer
from app.models.session_questions import SessionQuestion
from app.models.zone import Zone


def assessment_payload():
    return {
        "access_point_code": "DIRECT_WEB",
        "assisted_mode": False,
        "age_range": "18_24",
        "work_status": "STUDENT",
        "schooling_level": "TERTIARY",
        "zone_code": "Z001",
        "location_declined": False,
    }


@pytest.fixture
def seed_assessment_catalog(db_session, test_client):
    db_session.add_all(
        [
            AccessPoint(
                code="DIRECT_WEB",
                name="Direct Web",
                type=AccessPointType.WEB,
            ),
            Zone(code="Z001", name="Test Zone"),
        ]
    )
    db_session.flush()

    questions = [
        Question(category=f"R{index % 3 + 1}", question_text=f"Question {index}")
        for index in range(1, 7)
    ]
    db_session.add_all(questions)
    db_session.flush()

    for question in questions:
        options = [
            QuestionOption(
                question_id=question.id,
                option_text=f"Correct option for {question.id}",
                is_correct=True,
            ),
            QuestionOption(
                question_id=question.id,
                option_text=f"Other option for {question.id}",
                is_correct=False,
            ),
        ]
        db_session.add_all(options)
    db_session.commit()
    return {"client": test_client, "db": db_session}


def test_assessment_session_question_and_answer_flow(seed_assessment_catalog):
    client = seed_assessment_catalog["client"]
    db = seed_assessment_catalog["db"]

    created = client.post("/assessment-sessions", json=assessment_payload())

    assert created.status_code == 201
    session_data = created.json()
    assert set(session_data) == {"session_id", "completion_status"}
    assert session_data["completion_status"] == "IN_PROGRESS"
    session_id = session_data["session_id"]

    retrieved = client.get(f"/assessment-sessions/{session_id}/questions")
    assert retrieved.status_code == 200
    questions = retrieved.json()
    assert len(questions) == 6
    assert [question["question_id"] for question in questions] == sorted(
        question["question_id"] for question in questions
    )
    assert all(
        set(question) == {"question_id", "question_text", "options"}
        for question in questions
    )
    assert all(
        set(option) == {"option_id", "option_text"}
        for question in questions
        for option in question["options"]
    )

    for question in questions:
        selected_option_id = question["options"][0]["option_id"]
        submitted = client.post(
            f"/assessment-sessions/{session_id}/answers",
            json={
                "question_id": question["question_id"],
                "option_id": selected_option_id,
            },
        )
        assert submitted.status_code == 201
        assert submitted.json() == {
            "session_id": session_id,
            "question_id": question["question_id"],
            "option_id": selected_option_id,
            "accepted": True,
        }

    assigned_question_count = db.scalar(
        select(func.count())
        .select_from(SessionQuestion)
        .where(SessionQuestion.session_id == session_id)
    )
    saved_answers = db.scalars(
        select(SessionAnswer).where(SessionAnswer.session_id == session_id)
    ).all()
    assert assigned_question_count == 6
    assert len(saved_answers) == 6
    assert {answer.question_id for answer in saved_answers} == {
        question["question_id"] for question in questions
    }
    assert {answer.option_id for answer in saved_answers} == {
        question["options"][0]["option_id"] for question in questions
    }

    # SCRUM-80's existing aggregate endpoint consumes these submissions without
    # returning session, question, or option identifiers.
    summary_response = client.get("/analytics/summary")
    assert summary_response.status_code == 200
    summary = summary_response.json()
    assert summary["total_assessments"] == 1
    assert summary["in_progress_assessments"] == 1
    assert summary["total_answers"] == 6
    assert summary["sessions_with_answers"] == 1
    assert summary["assessments_without_answers"] == 0
    assert summary["total_submissions"] == 0
    assert "session_id" not in summary_response.text
    assert "question_id" not in summary_response.text
    assert "option_id" not in summary_response.text


def test_assessment_session_rejects_personal_fields(seed_assessment_catalog):
    payload = assessment_payload()
    payload.update({"name": "Test Respondent", "email": "respondent@example.org"})

    response = seed_assessment_catalog["client"].post(
        "/assessment-sessions", json=payload
    )

    assert response.status_code == 422
    assert seed_assessment_catalog["db"].scalar(
        select(func.count()).select_from(AssessmentSession)
    ) == 0


def test_assessment_session_requires_six_questions(test_client, db_session):
    db_session.add_all(
        [
            AccessPoint(
                code="DIRECT_WEB",
                name="Direct Web",
                type=AccessPointType.WEB,
            ),
            Zone(code="Z001", name="Test Zone"),
            Question(category="R1", question_text="Only question"),
        ]
    )
    db_session.commit()

    response = test_client.post("/assessment-sessions", json=assessment_payload())

    assert response.status_code == 404
    assert db_session.scalar(select(func.count()).select_from(AssessmentSession)) == 0
