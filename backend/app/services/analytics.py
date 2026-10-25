from sqlalchemy import case, distinct, func, select, true
from sqlalchemy.orm import Session

from app.models.assessment_results import AssessmentResult, LiteracyClassification
from app.models.assessment_session import AssessmentSession, CompletionStatus
from app.models.session_answers import SessionAnswer
from app.schemas.analytics import (
    AnalyticsSummaryResponse,
    ClassificationDistributionItem,
)


CLASSIFICATION_LABELS = {
    LiteracyClassification.RED: "Red",
    LiteracyClassification.YELLOW: "Yellow",
    LiteracyClassification.GREEN: "Green",
}


def get_analytics_summary(db: Session) -> AnalyticsSummaryResponse:
    """Return aggregate dashboard metrics for the current assessment."""
    session_stats = select(
        func.count(AssessmentSession.session_id).label("total_assessments"),
        func.count(
            case(
                (AssessmentSession.completion_status == CompletionStatus.COMPLETED, 1)
            )
        ).label("completed_assessments"),
        func.count(
            case(
                (AssessmentSession.completion_status == CompletionStatus.IN_PROGRESS, 1)
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
            func.avg(AssessmentResult.total_literacy_score * 100.0 / 9), 1
        ).label("average_score_percentage"),
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
                classification_count
                * 100.0
                / func.nullif(func.sum(classification_count).over(), 0),
                1,
            ).label("percentage"),
            (classification_count == func.max(classification_count).over()).label(
                "is_most_common"
            ),
        ).group_by(AssessmentResult.literacy_classification)
    ).all()
    counts_by_classification = {
        row.literacy_classification: row for row in distribution_rows
    }

    result_count = summary.total_submissions
    distribution = []
    most_common_classifications = []
    for classification in LiteracyClassification:
        row = counts_by_classification.get(classification)
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

    return AnalyticsSummaryResponse(
        total_assessments=summary.total_assessments,
        completed_assessments=summary.completed_assessments,
        in_progress_assessments=summary.in_progress_assessments,
        abandoned_assessments=summary.abandoned_assessments,
        assessments_without_answers=summary.assessments_without_answers,
        sessions_with_answers=summary.sessions_with_answers,
        total_answers=summary.total_answers,
        total_submissions=result_count,
        average_score_percentage=summary.average_score_percentage,
        most_common_classifications=most_common_classifications,
        classification_distribution=distribution,
    )
