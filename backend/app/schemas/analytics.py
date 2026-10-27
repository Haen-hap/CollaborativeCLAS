from pydantic import BaseModel, ConfigDict, Field


class FunnelStats(BaseModel):
    model_config = ConfigDict(strict=True)

    total_sessions: int = Field(ge=0)
    completed_sessions: int = Field(ge=0)
    abandoned_sessions: int = Field(ge=0)


class ClassificationStats(BaseModel):
    model_config = ConfigDict(strict=True)

    red: int = Field(ge=0)
    yellow: int = Field(ge=0)
    green: int = Field(ge=0)


class CategoryAverages(BaseModel):
    model_config = ConfigDict(strict=True)

    c1_visual_signs: float = Field(ge=0, le=2)
    c2_sentence_comprehension: float = Field(ge=0, le=2)
    c3_mobile_icons: float = Field(ge=0, le=2)
    c4_cybersecurity: float = Field(ge=0, le=3)


class AnalyticsSummaryResponse(BaseModel):
    model_config = ConfigDict(strict=True)

    funnel: FunnelStats
    classifications: ClassificationStats
    category_averages: CategoryAverages


class ClassificationDistributionItem(BaseModel):
    model_config = ConfigDict(strict=True)

    classification: str
    count: int = Field(ge=0)
    percentage: float = Field(ge=0, le=100)


class LegacyAnalyticsSummaryResponse(BaseModel):
    model_config = ConfigDict(strict=True)

    total_assessments: int = Field(ge=0)
    completed_assessments: int = Field(ge=0)
    in_progress_assessments: int = Field(ge=0)
    abandoned_assessments: int = Field(ge=0)
    assessments_without_answers: int = Field(ge=0)
    sessions_with_answers: int = Field(ge=0)
    total_answers: int = Field(ge=0)
    total_submissions: int = Field(ge=0)
    average_score_percentage: float | None = Field(default=None, ge=0, le=100)
    most_common_classifications: list[str]
    classification_distribution: list[ClassificationDistributionItem]
