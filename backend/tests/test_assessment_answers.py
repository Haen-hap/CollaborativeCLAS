import pytest
from sqlalchemy import func, select

from app.models.access_points import AccessPoint, AccessPointType
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


@pytest.fixture
def answer_api(db_session, test_client):
    access_point = AccessPoint(
        code="DIRECT_WEB",
        name="Direct Web",
        type=AccessPointType.WEB,
    )
    zone = Zone(code="Z001", name="Test Zone")
    db_session.add_all([access_point, zone])
    db_session.flush()

    session = AssessmentSession(
        session_id=100,
        access_point_code=access_point.code,
        assisted_mode=False,
        age_range=AgeRange.AGE_18_24,
        work_status=WorkStatus.STUDENT,
        schooling_level=SchoolingLevel.TERTIARY,
        zone_code=zone.code,
        location_declined=False,
        completion_status=CompletionStatus.IN_PROGRESS,
        duration_seconds=0,
    )
    assigned_question = Question(
        category="R1",
        question_text="What does this sign mean?",
    )
    unassigned_question = Question(
        category="R2",
        question_text="Choose the correct word.",
    )
    db_session.add_all([session, assigned_question, unassigned_question])
    db_session.flush()

    valid_option = QuestionOption(
        question_id=assigned_question.id,
        option_text="Stop",
        is_correct=True,
    )
    alternate_option = QuestionOption(
        question_id=assigned_question.id,
        option_text="Go",
        is_correct=False,
    )
    unrelated_option = QuestionOption(
        question_id=unassigned_question.id,
        option_text="Water",
        is_correct=True,
    )
    db_session.add_all([valid_option, alternate_option, unrelated_option])
    db_session.flush()
    db_session.add(
        SessionQuestion(
            session_id=session.session_id,
            question_id=assigned_question.id,
            position=1,
        )
    )
    db_session.commit()

    yield {
        "client": test_client,
        "db": db_session,
        "session": session,
        "question": assigned_question,
        "unassigned_question": unassigned_question,
        "valid_option": valid_option,
        "alternate_option": alternate_option,
        "unrelated_option": unrelated_option,
    }


def test_submit_answer_persists_only_the_selected_option(answer_api):
    response = answer_api["client"].post(
        f"/assessment-sessions/{answer_api['session'].session_id}/answers",
        json={
            "question_id": answer_api["question"].id,
            "option_id": answer_api["valid_option"].id,
        },
    )

    assert response.status_code == 201
    assert response.json() == {
        "session_id": answer_api["session"].session_id,
        "question_id": answer_api["question"].id,
        "option_id": answer_api["valid_option"].id,
        "accepted": True,
    }
    saved = answer_api["db"].get(
        SessionAnswer,
        (answer_api["session"].session_id, answer_api["question"].id),
    )
    assert saved is not None
    assert saved.option_id == answer_api["valid_option"].id

    response_keys = set(response.json())
    answer_columns = set(SessionAnswer.__table__.columns.keys())
    pii_fields = {"name", "email", "phone", "address", "respondent_id"}
    assert response_keys.isdisjoint(pii_fields)
    assert answer_columns.isdisjoint(pii_fields)


def test_resubmitting_updates_the_existing_answer_without_a_duplicate(answer_api):
    client = answer_api["client"]
    endpoint = (
        f"/assessment-sessions/{answer_api['session'].session_id}/answers"
    )
    payload = {
        "question_id": answer_api["question"].id,
        "option_id": answer_api["valid_option"].id,
    }
    first = client.post(endpoint, json=payload)
    payload["option_id"] = answer_api["alternate_option"].id
    second = client.post(endpoint, json=payload)

    assert first.status_code == 201
    assert second.status_code == 200
    assert second.json()["option_id"] == answer_api["alternate_option"].id
    assert answer_api["db"].scalar(
        select(func.count()).select_from(SessionAnswer)
    ) == 1


def test_submit_answer_rejects_a_nonexistent_session(answer_api):
    response = answer_api["client"].post(
        "/assessment-sessions/999/answers",
        json={
            "question_id": answer_api["question"].id,
            "option_id": answer_api["valid_option"].id,
        },
    )

    assert response.status_code == 404


def test_submit_answer_rejects_a_nonexistent_question(answer_api):
    response = answer_api["client"].post(
        f"/assessment-sessions/{answer_api['session'].session_id}/answers",
        json={"question_id": 999, "option_id": answer_api["valid_option"].id},
    )

    assert response.status_code == 404


def test_submit_answer_rejects_a_question_not_assigned_to_the_session(answer_api):
    response = answer_api["client"].post(
        f"/assessment-sessions/{answer_api['session'].session_id}/answers",
        json={
            "question_id": answer_api["unassigned_question"].id,
            "option_id": answer_api["unrelated_option"].id,
        },
    )

    assert response.status_code == 422


@pytest.mark.parametrize("option_id", [999, 0, -1])
def test_submit_answer_rejects_an_invalid_option(answer_api, option_id):
    response = answer_api["client"].post(
        f"/assessment-sessions/{answer_api['session'].session_id}/answers",
        json={
            "question_id": answer_api["question"].id,
            "option_id": option_id,
        },
    )

    assert response.status_code == 422


def test_submit_answer_rejects_an_option_from_another_question(answer_api):
    response = answer_api["client"].post(
        f"/assessment-sessions/{answer_api['session'].session_id}/answers",
        json={
            "question_id": answer_api["question"].id,
            "option_id": answer_api["unrelated_option"].id,
        },
    )

    assert response.status_code == 422


def test_submit_answer_rejects_invalid_request_fields(answer_api):
    response = answer_api["client"].post(
        f"/assessment-sessions/{answer_api['session'].session_id}/answers",
        json={
            "question_id": answer_api["question"].id,
            "option_id": answer_api["valid_option"].id,
            "email": "respondent@example.org",
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "Invalid request data"


@pytest.mark.parametrize(
    "completion_status", [CompletionStatus.COMPLETED, CompletionStatus.ABANDONED]
)
def test_submit_answer_rejects_a_session_that_is_not_in_progress(
    answer_api, completion_status
):
    answer_api["session"].completion_status = completion_status
    answer_api["db"].commit()

    response = answer_api["client"].post(
        f"/assessment-sessions/{answer_api['session'].session_id}/answers",
        json={
            "question_id": answer_api["question"].id,
            "option_id": answer_api["valid_option"].id,
        },
    )

    assert response.status_code == 409
