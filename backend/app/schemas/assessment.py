from pydantic import BaseModel, ConfigDict, Field

from app.models.assessment_session import (
    AgeRange,
    CompletionStatus,
    SchoolingLevel,
    WorkStatus,
)


class AssessmentSessionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    access_point_code: str = Field(min_length=1, max_length=255)
    assisted_mode: bool
    age_range: AgeRange
    work_status: WorkStatus
    schooling_level: SchoolingLevel
    zone_code: str = Field(min_length=1, max_length=255)
    location_declined: bool


class AssessmentSessionResponse(BaseModel):
    session_id: int
    completion_status: CompletionStatus


class AnswerSubmission(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question_id: int = Field(gt=0, strict=True)
    answer_value: int = Field(ge=0, strict=True)


class AnswerSubmissionResponse(BaseModel):
    session_id: int
    question_id: int
    accepted: bool


class AssessmentCompletionResponse(BaseModel):
    session_id: int
    completion_status: CompletionStatus
