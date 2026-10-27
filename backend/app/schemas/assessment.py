from pydantic import BaseModel, ConfigDict, Field, model_validator


from app.models.assessment_session import (
    AgeRange,
    CompletionStatus,
    SchoolingLevel,
    WorkStatus,
)

from app.models.assessment_results import LiteracyClassification



class AssessmentSessionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")


    access_point_code: str = Field(min_length=1, max_length=255)
    assisted_mode: bool
    age_range: AgeRange
    work_status: WorkStatus
    schooling_level: SchoolingLevel
    zone_code: str = Field(min_length=1, max_length=255)
    location_declined: bool


    @model_validator(mode="after")
    def validate_location(self):
        if self.location_declined != (self.zone_code == "DECLINED"):
            raise ValueError("zone_code and location_declined must agree")
        return self



class AssessmentSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)


    session_id: int
    completion_status: CompletionStatus



class AnswerSubmission(BaseModel):
    model_config = ConfigDict(extra="forbid")


    question_id: int = Field(gt=0, strict=True)
    option_id: int = Field(gt=0, strict=True)



class AnswerSubmissionResponse(BaseModel):
    session_id: int
    question_id: int
    option_id: int
    accepted: bool



class AssessmentCompletionResponse(BaseModel):
    session_id: int
    completion_status: CompletionStatus
    total_literacy_score: int
    literacy_classification: LiteracyClassification



class QuestionOptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)


    option_id: int
    option_text: str



class QuestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)


    question_id: int
    question_text: str
    options: list[QuestionOptionResponse]