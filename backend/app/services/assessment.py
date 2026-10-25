from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload
import logging

from app.models.assessment_session import AssessmentSession, CompletionStatus
from app.schemas.assessment import AssessmentSessionCreate
from app.models.questions import Question

from app.models.session_questions import SessionQuestion

logger = logging.getLogger(__name__)


def create_session(
        db: Session,
        payload: AssessmentSessionCreate
) -> AssessmentSession:
    try:
        question_ids = db.scalars(
            select(Question.id)
            .order_by(Question.id)
            .limit(6)
        ).all()

        if len(question_ids) < 6:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="At least 6 questions are required")
        new_session = AssessmentSession(
            **payload.model_dump(),
            completion_status=CompletionStatus.IN_PROGRESS,
            duration_seconds=0
        )
        db.add(new_session)
        db.flush()

        for position, question_id in enumerate(question_ids, start=1):
            session_question = SessionQuestion(
                session_id=new_session.session_id,
                question_id=question_id,
                position=position
            )
            db.add(session_question)

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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment session not found")

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

    result = []

    for session_question in session_questions:
        question = session_question.question

        result.append({
            "question_id": question.id,
            "question_text": question.question_text,
            "category": question.category,
            "position": session_question.position,
            "options": [
                {
                    "option_id": option.id,
                    "option_text": option.option_text

                }
                for option in sorted(
                    question.options, key=lambda option: option.id
                )
            ]

        })
    return result
