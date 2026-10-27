from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload
import logging

from app.models.assessment_session import AssessmentSession, CompletionStatus
from app.models.assessment_results import AssessmentResult, LiteracyClassification
from app.models.questions import Question
from app.models.question_options import QuestionOption
from app.models.session_questions import SessionQuestion
from app.models.session_answers import SessionAnswer
from app.schemas.assessment import AssessmentSessionCreate

logger = logging.getLogger(__name__)


def create_session(
    db: Session,
    payload: AssessmentSessionCreate,
) -> AssessmentSession:
    try:
        question_ids = db.scalars(
            select(Question.id)
            .order_by(Question.id)
            .limit(6)
        ).all()

        if len(question_ids) < 6:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="At least 6 questions are required",
            )

        new_session = AssessmentSession(
            **payload.model_dump(),
            completion_status=CompletionStatus.IN_PROGRESS,
            duration_seconds=0,
        )
        db.add(new_session)
        db.flush()

        for position, question_id in enumerate(question_ids, start=1):
            db.add(
                SessionQuestion(
                    session_id=new_session.session_id,
                    question_id=question_id,
                    position=position,
                )
            )

        db.commit()
        db.refresh(new_session)
        return new_session
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Failed to create assessment session")
        raise


def get_session_questions(db: Session, session_id: int):
    session = db.get(AssessmentSession, session_id)

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment session not found",
        )

    statement = (
        select(SessionQuestion)
        .where(SessionQuestion.session_id == session_id)
        .options(
            selectinload(SessionQuestion.question)
            .selectinload(Question.options)
        )
        .order_by(SessionQuestion.position)
    )
    session_questions = db.scalars(statement).all()

    return [
        {
            "question_id": session_question.question.id,
            "question_text": session_question.question.question_text,
            "category": session_question.question.category,
            "position": session_question.position,
            "options": [
                {
                    "option_id": option.id,
                    "option_text": option.option_text,
                }
                for option in sorted(
                    session_question.question.options,
                    key=lambda option: option.id,
                )
            ],
        }
        for session_question in session_questions
    ]


def submit_answer(
    db: Session,
    session_id: int,
    question_id: int,
    option_id: int,
) -> SessionAnswer:
    session = db.get(AssessmentSession, session_id)

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment session not found",
        )

    if session.completion_status != CompletionStatus.IN_PROGRESS:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Assessment session is already completed",
        )

    session_question = db.get(SessionQuestion, (session_id, question_id))

    if session_question is None:
        if db.get(Question, question_id) is not None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Question is not part of this assessment session",
            )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question is not part of this assessment session",
        )

    option = db.get(QuestionOption, option_id)

    if option is None or option.question_id != question_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Selected option does not belong to this question",
        )

    answer = db.get(SessionAnswer, (session_id, question_id))

    if answer is None:
        answer = SessionAnswer(
            session_id=session_id,
            question_id=question_id,
            option_id=option_id,
        )
        db.add(answer)
    else:
        answer.option_id = option_id

    db.commit()
    return answer


def complete_session(db: Session, session_id: int) -> AssessmentResult:
    session = db.get(AssessmentSession, session_id)

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment session not found",
        )

    if session.completion_status == CompletionStatus.COMPLETED:
        existing_result = db.get(AssessmentResult, session_id)

        if existing_result is not None:
            return existing_result

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Assessment session is already completed",
        )

    statement = (
        select(SessionQuestion)
        .where(SessionQuestion.session_id == session_id)
        .options(
            selectinload(SessionQuestion.question)
            .selectinload(Question.options),
            selectinload(SessionQuestion.answer),
        )
        .order_by(SessionQuestion.position)
    )
    session_questions = db.scalars(statement).all()

    if len(session_questions) != 6:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Assessment session must contain 6 questions",
        )

    unanswered = [
        session_question.question_id
        for session_question in session_questions
        if session_question.answer is None
    ]

    if unanswered:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="All questions must be answered before completing the session",
        )

    category_scores = {
        "R1": 0,
        "R2": 0,
        "R3": 0,
    }

    for session_question in session_questions:
        selected_option_id = session_question.answer.option_id
        selected_option = next(
            (
                option
                for option in session_question.question.options
                if option.id == selected_option_id
            ),
            None,
        )

        if selected_option and selected_option.is_correct:
            category = session_question.question.category
            category_scores[category] += 1

    c1_score = category_scores["R1"]
    c2_score = category_scores["R2"]
    c3_score = category_scores["R3"]
    c4_score = 0
    total_score = c1_score + c2_score + c3_score + c4_score

    if total_score <= 3:
        classification = LiteracyClassification.RED
    elif total_score <= 6:
        classification = LiteracyClassification.YELLOW
    else:
        classification = LiteracyClassification.GREEN

    result = AssessmentResult(
        session_id=session_id,
        c1_visual_signs_score=c1_score,
        c2_sentence_comprehension_score=c2_score,
        c3_mobile_icons_score=c3_score,
        c4_cybersecurity_score=c4_score,
        total_literacy_score=total_score,
        literacy_classification=classification,
    )

    session.completion_status = CompletionStatus.COMPLETED

    db.add(result)
    db.commit()
    db.refresh(result)

    return result