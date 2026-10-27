from sqlalchemy import Numeric, String, case, cast, distinct, func, select, true
from sqlalchemy.orm import Session

from app.models.assessment_results import AssessmentResult, LiteracyClassification
from app.models.assessment_session import AssessmentSession, CompletionStatus
from app.models.game_session import GameSession
from app.models.session_answers import SessionAnswer
from app.schemas.analytics import (
    CategoryAverages,
    ClassificationDistributionItem,
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
    game_sessions_cte = select(
        cast(GameSession.session_id, String).label("session_id"),
        cast(GameSession.completion_status, String).label("completion_status"),
        case(
            (GameSession.completion_status == "COMPLETED", 1),
            else_=0,
        ).label("has_answers"),
    )

    legacy_sessions_cte = select(
        cast(AssessmentSession.session_id, String).label("session_id"),
        case(
            (
                AssessmentSession.completion_status == CompletionStatus.COMPLETED,
                "COMPLETED",
            ),
            (
                AssessmentSession.completion_status == CompletionStatus.IN_PROGRESS,
                "IN_PROGRESS",
            ),
            else_="ABANDONED",
        ).label("completion_status"),
        case(
            (
                select(1)
                .where(SessionAnswer.session_id == AssessmentSession.session_id)
                .exists(),
                1,
            ),
            else_=0,
        ).label("has_answers"),
    )

    all_sessions = game_sessions_cte.union_all(legacy_sessions_cte).cte("all_sessions")

    session_stats = select(
        func.count(all_sessions.c.session_id).label("total_assessments"),
        func.count(
            case((all_sessions.c.completion_status == "COMPLETED", 1))
        ).label("completed_assessments"),
        func.count(
            case((all_sessions.c.completion_status == "IN_PROGRESS", 1))
        ).label("in_progress_assessments"),
        func.count(
            case((all_sessions.c.completion_status == "ABANDONED", 1))
        ).label("abandoned_assessments"),
        func.count(
            case((all_sessions.c.has_answers == 0, 1))
        ).label("assessments_without_answers"),
    ).cte("session_stats")

    game_completed_count = (
        select(func.count(GameSession.session_id))
        .where(GameSession.completion_status == "COMPLETED")
        .scalar_subquery()
    )

    answer_stats = select(
        (func.count(SessionAnswer.question_id) + game_completed_count).label(
            "total_answers"
        ),
        (
            func.count(distinct(SessionAnswer.session_id)) + game_completed_count
        ).label("sessions_with_answers"),
    ).cte("answer_stats")

    game_results = select(
        cast(GameSession.session_id, String).label("session_id"),
        GameSession.c1_visual_signs_score.label("c1_visual_signs_score"),
        GameSession.c2_sentence_comprehension_score.label(
            "c2_sentence_comprehension_score"
        ),
        GameSession.c3_mobile_icons_score.label("c3_mobile_icons_score"),
        GameSession.c4_cybersecurity_score.label("c4_cybersecurity_score"),
        GameSession.total_literacy_score.label("total_literacy_score"),
        case(
            (GameSession.total_literacy_score <= 3, LiteracyClassification.RED.value),
            (
                GameSession.total_literacy_score <= 6,
                LiteracyClassification.YELLOW.value,
            ),
            else_=LiteracyClassification.GREEN.value,
        ).label("literacy_classification"),
    )

    legacy_results = select(
        cast(AssessmentResult.session_id, String).label("session_id"),
        AssessmentResult.c1_visual_signs_score.label("c1_visual_signs_score"),
        AssessmentResult.c2_sentence_comprehension_score.label(
            "c2_sentence_comprehension_score"
        ),
        AssessmentResult.c3_mobile_icons_score.label("c3_mobile_icons_score"),
        AssessmentResult.c4_cybersecurity_score.label("c4_cybersecurity_score"),
        AssessmentResult.total_literacy_score.label("total_literacy_score"),
        case(
            (
                AssessmentResult.total_literacy_score <= 3,
                LiteracyClassification.RED.value,
            ),
            (
                AssessmentResult.total_literacy_score <= 6,
                LiteracyClassification.YELLOW.value,
            ),
            else_=LiteracyClassification.GREEN.value,
        ).label("literacy_classification"),
    )

    all_results = game_results.union_all(legacy_results).cte("all_results")

    result_stats = select(
        func.count(all_results.c.session_id).label("total_submissions"),
        func.round(
            cast(
                func.avg(
                    all_results.c.total_literacy_score
                    * 100.0
                    / MAX_TOTAL_SCORE
                ),
                Numeric,
            ),
            1,
        ).label("average_score_percentage"),
        func.round(
            cast(func.avg(all_results.c.c1_visual_signs_score), Numeric),
            1,
        ).label("c1_visual_signs"),
        func.round(
            cast(
                func.avg(all_results.c.c2_sentence_comprehension_score), Numeric
            ),
            1,
        ).label("c2_sentence_comprehension"),
        func.round(
            cast(func.avg(all_results.c.c3_mobile_icons_score), Numeric),
            1,
        ).label("c3_mobile_icons"),
        func.round(
            cast(func.avg(all_results.c.c4_cybersecurity_score), Numeric),
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

    classification_count = func.count(all_results.c.session_id)
    distribution_rows = db.execute(
        select(
            all_results.c.literacy_classification,
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
        ).group_by(all_results.c.literacy_classification)
    ).all()
    counts_by_classification = {
        row.literacy_classification: row for row in distribution_rows
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
