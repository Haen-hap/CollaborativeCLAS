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
    category_averages: CategoryAverages = Field(
        default_factory=lambda: CategoryAverages(
            c1_visual_signs=0.0,
            c2_sentence_comprehension=0.0,
            c3_mobile_icons=0.0,
            c4_cybersecurity=0.0,
        )
    )
    most_common_classifications: list[str]
    classification_distribution: list[ClassificationDistributionItem]


class ZoneVulnerabilityItem(BaseModel):
    model_config = ConfigDict(strict=True)

    zone_code: str
    zone_name: str
    total_sessions: int = Field(ge=0)
    red_sessions: int = Field(ge=0)
    yellow_sessions: int = Field(ge=0)
    green_sessions: int = Field(ge=0)
    avg_total_score: float = Field(ge=0, le=9)
    critical_literacy_index: float = Field(ge=0, le=100)
    vulnerability_rank: int = Field(ge=1)
    dense_vulnerability_rank: int = Field(ge=1)


class ZoneVulnerabilityRankingResponse(BaseModel):
    model_config = ConfigDict(strict=True)

    global_avg_critical_index: float = Field(ge=0, le=100)
    zones: list[ZoneVulnerabilityItem]


class KioskC4DispersalItem(BaseModel):
    model_config = ConfigDict(strict=True)

    kiosk_id: str
    kiosk_name: str
    zone_code: str | None = None
    total_sessions: int = Field(ge=0)
    avg_c4_score: float = Field(ge=0, le=3)
    stddev_c4_score: float = Field(ge=0, le=3)
    min_c4_score: int = Field(ge=0, le=3)
    max_c4_score: int = Field(ge=0, le=3)
    p25_c4_score: float = Field(ge=0, le=3)
    p50_c4_score: float = Field(ge=0, le=3)
    p75_c4_score: float = Field(ge=0, le=3)
    iqr_c4_score: float = Field(ge=0, le=3)
    avg_duration_seconds: float = Field(ge=0)
    stddev_duration_seconds: float = Field(ge=0)
    dispersal_rank: int = Field(ge=1)
    is_outlier: bool


class KioskC4DispersalResponse(BaseModel):
    model_config = ConfigDict(strict=True)

    global_avg_c4_score: float = Field(ge=0, le=3)
    kiosks: list[KioskC4DispersalItem]
