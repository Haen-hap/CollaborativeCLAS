from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
import logging

from app.core.database import get_db
from app.models.assessment_session import AssessmentSession
from app.schemas.assessment import (
    AnswerSubmission,
    AnswerSubmissionResponse,
    AssessmentCompletionResponse,
    AssessmentSessionCreate,
    AssessmentSessionResponse,
    QuestionResponse,
)
from app.services.assessment import (
    complete_session,
    create_session,
    get_session_questions,
    submit_answer,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/assessment-sessions", tags=["assessment sessions"])


@router.post(
    "",
    response_model=AssessmentSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_assessment_session(
    payload: AssessmentSessionCreate,
    db: Session = Depends(get_db),
) -> AssessmentSession:
    return create_session(db, payload)


@router.get(
    "/{session_id}/questions",
    response_model=list[QuestionResponse],
)
def get_assessment_questions(
    session_id: int,
    db: Session = Depends(get_db),
):
    return get_session_questions(db, session_id)


@router.post(
    "/{session_id}/answers",
    response_model=AnswerSubmissionResponse,
    status_code=status.HTTP_201_CREATED,
)
def submit_assessment_answer(
    session_id: int,
    payload: AnswerSubmission,
    db: Session = Depends(get_db),
) -> AnswerSubmissionResponse:
    answer = submit_answer(
        db,
        session_id,
        payload.question_id,
        payload.option_id,
    )

    return AnswerSubmissionResponse(
        session_id=answer.session_id,
        question_id=answer.question_id,
        accepted=True,
    )


@router.post(
    "/{session_id}/complete",
    response_model=AssessmentCompletionResponse,
    status_code=status.HTTP_200_OK,
)
def complete_assessment_session(
    session_id: int,
    db: Session = Depends(get_db),
) -> AssessmentCompletionResponse:
    result = complete_session(db, session_id)

    return AssessmentCompletionResponse(
        session_id=result.session_id,
        completion_status=result.result.completion_status,
        total_literacy_score=result.total_literacy_score,
        literacy_classification=result.literacy_classification,
    )