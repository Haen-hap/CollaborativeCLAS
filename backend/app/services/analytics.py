from sqlalchemy import Numeric, case, cast, distinct, func, select, true
from sqlalchemy.orm import Session

from app.models.assessment_results import AssessmentResult, LiteracyClassification
from app.models.assessment_session import AssessmentSession, CompletionStatus
from app.models.session_answers import SessionAnswer
from app.schemas.analytics import (
    AnalyticsSummaryResponse,
    CategoryAverages,
    ClassificationDistributionItem,
    ClassificationStats,
    FunnelStats,
    LegacyAnalyticsSummaryResponse,
)


MAX_BY_CHALLENGE = (2, 2, 2, 3)
MAX_TOTAL_SCORE = sum(MAX_BY_CHALLENGE)

CLASSIFICATION_LABELS = {
    LiteracyClassification.RED: "Red",
    LiteracyClassification.YELLOW: "Yellow",
    LiteracyClassification.GREEN: "Green",
}


def classify(total: int) -> LiteracyClassification:
    if total <= 3:
        return LiteracyClassification.RED
    if total <= 6:
        return LiteracyClassification.YELLOW
    return LiteracyClassification.GREEN


def get_analytics_summary(db: Session) -> LegacyAnalyticsSummaryResponse:
    session_stats = select(
        func.count(AssessmentSession.session_id).label("total_assessments"),
        func.count(
            case(
                (AssessmentSession.completion_status == CompletionStatus.COMPLETED, 1)
            )
        ).label("completed_assessments"),
        func.count(
            case(
                (
                    AssessmentSession.completion_status
                    == CompletionStatus.IN_PROGRESS,
                    1,
                )
            )
        ).label("in_progress_assessments"),
        func.count(
            case(
                (AssessmentSession.completion_status == CompletionStatus.ABANDONED, 1)
            )
        ).label("abandoned_assessments"),
        func.count(
            case(
                (
                    ~select(1)
                    .where(SessionAnswer.session_id == AssessmentSession.session_id)
                    .exists(),
                    1,
                )
            )
        ).label("assessments_without_answers"),
    ).cte("session_stats")

    answer_stats = select(
        func.count(SessionAnswer.question_id).label("total_answers"),
        func.count(distinct(SessionAnswer.session_id)).label("sessions_with_answers"),
    ).cte("answer_stats")

    result_stats = select(
        func.count(AssessmentResult.session_id).label("total_submissions"),
        func.round(
            cast(
                func.avg(
                    AssessmentResult.total_literacy_score * 100.0 / MAX_TOTAL_SCORE
                ),
                Numeric,
            ),
            1,
        ).label("average_score_percentage"),
        func.round(
            cast(func.avg(AssessmentResult.c1_visual_signs_score), Numeric),
            1,
        ).label("c1_visual_signs"),
        func.round(
            cast(
                func.avg(AssessmentResult.c2_sentence_comprehension_score), Numeric
            ),
            1,
        ).label("c2_sentence_comprehension"),
        func.round(
            cast(func.avg(AssessmentResult.c3_mobile_icons_score), Numeric),
            1,
        ).label("c3_mobile_icons"),
        func.round(
            cast(func.avg(AssessmentResult.c4_cybersecurity_score), Numeric),
            1,
        ).label("c4_cybersecurity"),
    ).cte("result_stats")

    summary_query = (
        select(
            session_stats.c.total_assessments,
            session_stats.c.completed_assessments,
            session_stats.c.in_progress_assessments,
            session_stats.c.abandoned_assessments,
            session_stats.c.assessments_without_answers,
            answer_stats.c.total_answers,
            answer_stats.c.sessions_with_answers,
            result_stats.c.total_submissions,
            result_stats.c.average_score_percentage,
            result_stats.c.c1_visual_signs,
            result_stats.c.c2_sentence_comprehension,
            result_stats.c.c3_mobile_icons,
            result_stats.c.c4_cybersecurity,
        )
        .select_from(
            session_stats.join(answer_stats, true()).join(result_stats, true())
        )
    )
    summary = db.execute(summary_query).one()

    classification_count = func.count(AssessmentResult.session_id)
    distribution_rows = db.execute(
        select(
            AssessmentResult.literacy_classification,
            classification_count.label("count"),
            func.round(
                cast(
                    classification_count
                    * 100.0
                    / func.nullif(func.sum(classification_count).over(), 0),
                    Numeric,
                ),
                1,
            ).label("percentage"),
            (classification_count == func.max(classification_count).over()).label(
                "is_most_common"
            ),
        ).group_by(AssessmentResult.literacy_classification)
    ).all()
    counts_by_classification = {
        (
            row.literacy_classification.value
            if isinstance(row.literacy_classification, LiteracyClassification)
            else row.literacy_classification
        ): row
        for row in distribution_rows
    }

    distribution = []
    most_common_classifications = []
    for classification in LiteracyClassification:
        row = counts_by_classification.get(classification.value)
        count = row.count if row is not None else 0
        percentage = float(row.percentage) if row is not None else 0.0
        distribution.append(
            ClassificationDistributionItem(
                classification=CLASSIFICATION_LABELS[classification],
                count=count,
                percentage=percentage,
            )
        )
        if row is not None and row.is_most_common:
            most_common_classifications.append(CLASSIFICATION_LABELS[classification])

    return LegacyAnalyticsSummaryResponse(
        total_assessments=summary.total_assessments,
        completed_assessments=summary.completed_assessments,
        in_progress_assessments=summary.in_progress_assessments,
        abandoned_assessments=summary.abandoned_assessments,
        assessments_without_answers=summary.assessments_without_answers,
        sessions_with_answers=summary.sessions_with_answers,
        total_answers=summary.total_answers,
        total_submissions=summary.total_submissions,
        average_score_percentage=(
            float(summary.average_score_percentage)
            if summary.average_score_percentage is not None
            else None
        ),
        category_averages=CategoryAverages(
            c1_visual_signs=(
                float(summary.c1_visual_signs)
                if summary.c1_visual_signs is not None
                else 0.0
            ),
            c2_sentence_comprehension=(
                float(summary.c2_sentence_comprehension)
                if summary.c2_sentence_comprehension is not None
                else 0.0
            ),
            c3_mobile_icons=(
                float(summary.c3_mobile_icons)
                if summary.c3_mobile_icons is not None
                else 0.0
            ),
            c4_cybersecurity=(
                float(summary.c4_cybersecurity)
                if summary.c4_cybersecurity is not None
                else 0.0
            ),
        ),
        most_common_classifications=most_common_classifications,
        classification_distribution=distribution,
    )


def get_funnel_analytics_summary(db: Session) -> AnalyticsSummaryResponse:
    summary = get_analytics_summary(db)
    counts = {
        item.classification.lower(): item.count
        for item in summary.classification_distribution
    }
    return AnalyticsSummaryResponse(
        funnel=FunnelStats(
            total_sessions=summary.total_assessments,
            completed_sessions=summary.completed_assessments,
            abandoned_sessions=summary.abandoned_assessments,
        ),
        classifications=ClassificationStats(
            red=counts.get("red", 0),
            yellow=counts.get("yellow", 0),
            green=counts.get("green", 0),
        ),
        category_averages=summary.category_averages,
    )
