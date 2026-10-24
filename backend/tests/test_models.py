import pytest
from sqlalchemy import insert
from sqlalchemy.exc import IntegrityError

from app.models.questions import Question
from app.models.question_options import QuestionOption
from app.models.session_questions import SessionQuestion
from app.models.session_answers import SessionAnswer

from app.models.access_points import AccessPoint, AccessPointType
from app.models.zone import Zone

from app.models.assessment_session import (
    AssessmentSession,
    AgeRange,
    WorkStatus,
    SchoolingLevel,
    CompletionStatus
)
from tests.conftest import db_session


@pytest.fixture
def question(db_session):
    q = Question(
        category="R1",
        question_text="What does STOP mean?"
    )
    q.options = [
        QuestionOption(
            option_text="Stop",
            is_correct=True
        ),
        QuestionOption(
            option_text="Go",
            is_correct=False
        )
    ]
    db_session.add(q)
    db_session.flush()
    return q


def test_create_question(db_session, question):
    saved_question = db_session.get(Question, question.id)
    assert saved_question is not None

    assert saved_question.category == "R1"
    assert saved_question.question_text == \
           "What does STOP mean?"


def test_invalid_question_category(db_session):
    with pytest.raises(IntegrityError):
        db_session.execute(
            insert(Question.__table__).values(
                category="R5", question_text="INVALID QUESTION"
            )
        )

    db_session.rollback()


def test_question_has_options(question):
    assert len(question.options) == 2
    assert question.options[0].option_text == "Stop"

    assert question.options[1].option_text == "Go"


def test_question_option_relationship(question):
    for option in question.options:
        assert option.question_id == question.id
        assert option.question == question


@pytest.fixture
def assessment_session(db_session):
    access_point = AccessPoint(
        code="DIRECT_WEB",
        name="Direct_Web",
        type=AccessPointType.WEB
    )
    zone = Zone(
        code="Z001",
        name="Test Zone"
    )
    db_session.add_all([access_point, zone])
    db_session.flush()

    session = AssessmentSession(
        session_id=100,
        access_point_code="DIRECT_WEB",
        assisted_mode=False,
        age_range=AgeRange.AGE_18_24,
        work_status=WorkStatus.STUDENT,
        schooling_level=SchoolingLevel.TERTIARY,
        zone_code="Z001",
        location_declined=False,
        completion_status=CompletionStatus.ABANDONED,
        duration_seconds=0
    )
    db_session.add(session)
    db_session.flush()
    return session


def test_assign_question_to_session(
        db_session, assessment_session, question
):
    assigned = SessionQuestion(
        session_id=assessment_session.session_id,
        question_id=question.id,
        position=1
    )
    db_session.add(assigned)
    db_session.flush()

    assert assigned.session.session_id == 100
    assert assigned.question_id == question.id
    assert assigned.position == 1


def test_invalid_question_position(
        db_session, assessment_session, question
):
    with pytest.raises(IntegrityError):
        db_session.execute(
            insert(SessionQuestion).values(
                session_id=assessment_session.session_id,
                question_id=question.id,
                position=10
            )
        )

    db_session.rollback()


def test_duplicate_session_position(db_session, assessment_session, question):
    another_question = Question(
        category="R2",
        question_text="Another question text"

    )
    db_session.add(another_question)
    db_session.flush()
    db_session.add_all([
        SessionQuestion(
            session_id=assessment_session.session_id,
            question_id=question.id,
            position=1
        ),
        SessionQuestion(
            session_id=assessment_session.session_id,
            question_id=another_question.id,
            position=1
        )
    ])
    with pytest.raises(IntegrityError):
        db_session.flush()

    db_session.rollback()


@pytest.fixture
def assigned_question(db_session, assessment_session, question):
    assigned = SessionQuestion(
        session_id=assessment_session.session_id,
        question_id=question.id,
        position=1
    )
    db_session.add(assigned)
    db_session.flush()
    return assigned


def test_save_session_answer(db_session, assigned_question, question):
    selected_option = question.options[0]

    answer = SessionAnswer(
        session_id=assigned_question.session_id,
        question_id=question.id,
        option_id=selected_option.id
    )
    db_session.add(answer)
    db_session.flush()

    saved_answer = db_session.get(
        SessionAnswer,
        (assigned_question.session_id, question.id)
    )

    assert saved_answer is not None
    assert saved_answer.option_id == selected_option.id
    assert saved_answer.session_question.question_id == question.id


def test_answer_with_wrong_option(db_session, assigned_question, question):
    other_question = Question(
        category="R2",
        question_text="Choose the correct word."

    )
    other_question_options = [
        QuestionOption(
            option_text="Water"
            , is_correct=True
        )
    ]
    db_session.add(other_question)
    db_session.flush()

    wrong_answer = SessionAnswer(
        session_id=assigned_question.session_id,
        question_id=question.id,
        option_id=other_question_options[0].id
    )
    db_session.add(wrong_answer)
    with pytest.raises(IntegrityError):
        db_session.flush()

    db_session.rollback()


def test_answer_to_unassigned_question(db_session, assessment_session, question):
    answer = SessionAnswer(
        session_id=assessment_session.session_id,
        question_id=question.id,
        option_id=question.options[0].id
    )
    db_session.add(answer)

    with pytest.raises(IntegrityError):
        db_session.flush()

    db_session.rollback()


def test_duplicate_session_answer(db_session, assigned_question, question):
    option_id = question.options[0].id
    answer = SessionAnswer(
        session_id=assigned_question.session_id,
        question_id=question.id,
        option_id=option_id
    )
    db_session.add(answer)
    db_session.flush()

    with pytest.raises(IntegrityError):
        db_session.execute(
            insert(SessionAnswer.__table__).values(
                session_id=assigned_question.session_id,
                question_id=question.id,
                option_id=option_id
            )
        )

    db_session.rollback()
