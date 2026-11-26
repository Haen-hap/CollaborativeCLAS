from sqlalchemy import Numeric, case, cast, distinct, func, select, true
from sqlalchemy.orm import Session

from app.core.zones_data import KIOSKS, ZONES
from app.models.access_points import AccessPoint, AccessPointType
from app.models.assessment_results import AssessmentResult, LiteracyClassification
from app.models.assessment_session import (
    AgeRange,
    AssessmentSession,
    CompletionStatus,
    SchoolingLevel,
    WorkStatus,
)
from app.models.rewards import Reward, TriggerType
from app.models.session_answers import SessionAnswer
from app.models.zone import Kiosk, Zone
from app.schemas.analytics import (
    AnalyticsSummaryResponse,
    CategoryAverages,
    ClassificationDistributionItem,
    ClassificationStats,
    FunnelStats,
    LegacyAnalyticsSummaryResponse,
    SimulateResponse,
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
        count = int(row.count) if row is not None and row.count is not None else 0
        percentage = (
            float(row.percentage)
            if row is not None and row.percentage is not None
            else 0.0
        )
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
        total_assessments=int(summary.total_assessments or 0),
        completed_assessments=int(summary.completed_assessments or 0),
        in_progress_assessments=int(summary.in_progress_assessments or 0),
        abandoned_assessments=int(summary.abandoned_assessments or 0),
        assessments_without_answers=int(summary.assessments_without_answers or 0),
        sessions_with_answers=int(summary.sessions_with_answers or 0),
        total_answers=int(summary.total_answers or 0),
        total_submissions=int(summary.total_submissions or 0),
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


def _ensure_reference_catalog(db: Session) -> None:
    if not db.get(Zone, "DECLINED"):
        db.add(Zone(code="DECLINED", name="Location declined"))
    for z_code, z_name in ZONES:
        if not db.get(Zone, z_code):
            db.add(Zone(code=z_code, name=z_name))
    for k_code, k_name, k_zone in KIOSKS:
        if not db.get(Kiosk, k_code):
            db.add(Kiosk(code=k_code, name=k_name, zone_code=k_zone))
        if not db.get(AccessPoint, k_code):
            ap_type = (
                AccessPointType.WEB
                if k_code == "DIRECT_WEB"
                else AccessPointType.KIOSK
            )
            db.add(AccessPoint(code=k_code, name=k_name, type=ap_type))
    db.flush()


SIMULATED_SCORE_PROFILES: list[tuple[int, int, int, int, str, str, int, bool]] = [
    # RED (11 completed sessions: total <= 3)
    (1, 1, 0, 0, "Z001", "PTYK001", 118, True),
    (1, 0, 1, 0, "Z001", "PTYK001", 132, True),
    (0, 1, 1, 0, "Z001", "PTYK001", 140, True),
    (1, 1, 1, 0, "Z001", "PTYK001", 125, False),
    (1, 1, 0, 1, "Z003", "PTYK003", 110, True),
    (1, 0, 1, 1, "Z003", "PTYK003", 115, True),
    (0, 1, 1, 1, "Z003", "PTYK003", 128, False),
    (1, 1, 0, 0, "Z014", "DIRECT_WEB", 95, False),
    (1, 1, 1, 0, "Z014", "DIRECT_WEB", 104, False),
    (1, 0, 1, 0, "Z006", "DIRECT_WEB", 98, False),
    (1, 1, 0, 1, "Z002", "PTYK002", 88, False),
    # YELLOW (19 completed sessions: total 4..6)
    (2, 2, 1, 1, "Z001", "PTYK001", 96, True),
    (2, 1, 1, 1, "Z001", "PTYK001", 102, False),
    (1, 2, 1, 1, "Z001", "PTYK001", 108, True),
    (2, 2, 1, 0, "Z001", "PTYK001", 114, False),
    (2, 2, 1, 1, "Z002", "PTYK002", 78, False),
    (2, 1, 2, 1, "Z002", "PTYK002", 74, False),
    (1, 2, 1, 2, "Z002", "PTYK002", 82, False),
    (2, 2, 1, 1, "Z002", "PTYK002", 76, False),
    (2, 1, 1, 2, "Z002", "PTYK002", 79, False),
    (2, 2, 1, 1, "Z003", "PTYK003", 92, False),
    (1, 2, 2, 1, "Z003", "PTYK003", 89, True),
    (2, 1, 1, 1, "Z003", "PTYK003", 94, False),
    (2, 2, 1, 0, "Z003", "PTYK003", 101, False),
    (2, 2, 1, 1, "Z004", "DIRECT_WEB", 84, False),
    (2, 1, 2, 1, "Z004", "DIRECT_WEB", 80, False),
    (1, 2, 1, 2, "Z005", "DIRECT_WEB", 86, False),
    (2, 2, 1, 1, "Z005", "DIRECT_WEB", 82, False),
    (2, 1, 1, 1, "Z014", "DIRECT_WEB", 90, False),
    (2, 2, 1, 1, "Z006", "DIRECT_WEB", 87, False),
    # GREEN (12 completed sessions: total 7..9)
    (2, 2, 2, 3, "Z001", "PTYK001", 68, False),
    (2, 2, 2, 3, "Z001", "PTYK001", 72, False),
    (2, 2, 2, 2, "Z002", "PTYK002", 65, False),
    (2, 2, 2, 2, "Z002", "PTYK002", 70, False),
    (2, 2, 1, 3, "Z002", "PTYK002", 66, False),
    (2, 2, 2, 2, "Z003", "PTYK003", 74, False),
    (2, 2, 2, 3, "Z004", "DIRECT_WEB", 62, False),
    (2, 2, 2, 2, "Z004", "DIRECT_WEB", 64, False),
    (2, 2, 2, 3, "Z005", "DIRECT_WEB", 60, False),
    (2, 2, 1, 2, "Z005", "DIRECT_WEB", 69, False),
    (2, 2, 2, 2, "Z014", "DIRECT_WEB", 71, False),
    (2, 2, 2, 3, "Z006", "DIRECT_WEB", 67, False),
]

ABANDONED_PROFILES: list[tuple[str, str, int, bool]] = [
    ("Z001", "PTYK001", 34, True),
    ("Z001", "PTYK001", 41, False),
    ("Z002", "PTYK002", 28, False),
    ("Z003", "PTYK003", 39, True),
    ("Z003", "PTYK003", 45, False),
    ("Z004", "DIRECT_WEB", 22, False),
    ("Z005", "DIRECT_WEB", 31, False),
    ("DECLINED", "DIRECT_WEB", 19, False),
]


def seed_simulated_sessions(db: Session, count: int = 50) -> SimulateResponse:
    """Genera e inserta sesiones simuladas en assessment_sessions, assessment_results y rewards."""
    _ensure_reference_catalog(db)

    # Limpiamos sesiones simuladas previas para que la operación sea idempotente
    sim_ids_subq = select(AssessmentSession.session_id).where(
        AssessmentSession.session_id.between(900001, 999999)
    )
    db.query(Reward).filter(Reward.session_id.in_(sim_ids_subq)).delete(
        synchronize_session=False
    )
    db.query(AssessmentResult).filter(
        AssessmentResult.session_id.in_(sim_ids_subq)
    ).delete(synchronize_session=False)
    db.query(AssessmentSession).filter(
        AssessmentSession.session_id.between(900001, 999999)
    ).delete(synchronize_session=False)
    db.flush()

    ages = list(AgeRange)
    works = list(WorkStatus)
    schools = list(SchoolingLevel)
    triggers = [
        TriggerType.WIFI_CREDENTIAL,
        TriggerType.BEVERAGE_DISPENSER,
        TriggerType.POWER_STATION,
    ]

    total_to_insert = max(1, min(count, 500))
    completed_target = round(total_to_insert * 42 / 50)
    abandoned_target = total_to_insert - completed_target

    base_id = 900001
    inserted = 0

    for idx in range(completed_target):
        c1, c2, c3, c4, zone_code, kiosk_id, duration, assisted = (
            SIMULATED_SCORE_PROFILES[idx % len(SIMULATED_SCORE_PROFILES)]
        )
        sid = base_id + inserted
        inserted += 1
        total_score = c1 + c2 + c3 + c4
        classification = classify(total_score)

        session_row = AssessmentSession(
            session_id=sid,
            access_point_code=kiosk_id,
            assisted_mode=assisted,
            age_range=ages[idx % len(ages)],
            work_status=works[idx % len(works)],
            schooling_level=schools[idx % len(schools)],
            zone_code=zone_code,
            location_declined=(zone_code == "DECLINED"),
            completion_status=CompletionStatus.COMPLETED,
            duration_seconds=duration,
        )
        db.add(session_row)
        db.flush()

        db.add(
            AssessmentResult(
                session_id=sid,
                c1_visual_signs_score=c1,
                c2_sentence_comprehension_score=c2,
                c3_mobile_icons_score=c3,
                c4_cybersecurity_score=c4,
                total_literacy_score=total_score,
                literacy_classification=classification,
            )
        )
        db.add(
            Reward(
                session_id=sid,
                issued=True,
                trigger_type=triggers[idx % len(triggers)],
            )
        )

    for idx in range(abandoned_target):
        zone_code, kiosk_id, duration, assisted = ABANDONED_PROFILES[
            idx % len(ABANDONED_PROFILES)
        ]
        sid = base_id + inserted
        inserted += 1

        session_row = AssessmentSession(
            session_id=sid,
            access_point_code=kiosk_id,
            assisted_mode=assisted,
            age_range=ages[(idx + 2) % len(ages)],
            work_status=works[(idx + 1) % len(works)],
            schooling_level=schools[(idx + 3) % len(schools)],
            zone_code=zone_code,
            location_declined=(zone_code == "DECLINED"),
            completion_status=CompletionStatus.ABANDONED,
            duration_seconds=duration,
        )
        db.add(session_row)
        db.flush()

        db.add(
            Reward(
                session_id=sid,
                issued=False,
                trigger_type=TriggerType.NONE,
            )
        )

    db.commit()
    summary = get_analytics_summary(db)
    return SimulateResponse(
        inserted_sessions=inserted,
        completed_sessions=completed_target,
        abandoned_sessions=abandoned_target,
        summary=summary,
    )


def restore_live_sessions(db: Session) -> LegacyAnalyticsSummaryResponse:
    """Elimina únicamente las sesiones simuladas y retorna el resumen real."""
    sim_ids_subq = select(AssessmentSession.session_id).where(
        AssessmentSession.session_id.between(900001, 999999)
    )
    db.query(Reward).filter(Reward.session_id.in_(sim_ids_subq)).delete(
        synchronize_session=False
    )
    db.query(AssessmentResult).filter(
        AssessmentResult.session_id.in_(sim_ids_subq)
    ).delete(synchronize_session=False)
    db.query(AssessmentSession).filter(
        AssessmentSession.session_id.between(900001, 999999)
    ).delete(synchronize_session=False)
    db.commit()
    return get_analytics_summary(db)


