import math
from sqlalchemy import Numeric, case, cast, func, select
from sqlalchemy.orm import Session

from app.models.game_session import GameSession
from app.models.zone import Kiosk, Zone
from app.schemas.analytics import (
    KioskC4DispersalItem,
    KioskC4DispersalResponse,
    ZoneVulnerabilityItem,
    ZoneVulnerabilityRankingResponse,
)


def _discrete_percentile(counts: list[tuple[int, int]], total: int, q: float) -> float:
    """Calcula el percentil exacto q (0..1) sobre la distribución discreta de puntajes C4 (0..3)."""
    if total <= 0:
        return 0.0
    threshold = q * total
    cumulative = 0
    for score, count in counts:
        cumulative += count
        if cumulative >= threshold:
            return float(score)
    return float(counts[-1][0])


def get_zone_vulnerability_ranking(db: Session) -> ZoneVulnerabilityRankingResponse:
    """Query 1 (Vulnerability Ranking):
    Agrega sesiones por zona y utiliza funciones de ventana (RANK, DENSE_RANK y AVG OVER)
    para clasificar las zonas según su índice de literacidad crítica (% en categoría RED).
    """
    total_sessions_expr = func.count(GameSession.session_id)
    red_sessions_expr = func.count(
        case((GameSession.internal_zone_classification == "RED", 1))
    )
    yellow_sessions_expr = func.count(
        case((GameSession.internal_zone_classification == "YELLOW", 1))
    )
    green_sessions_expr = func.count(
        case((GameSession.internal_zone_classification == "GREEN", 1))
    )
    critical_index_expr = func.round(
        cast(
            red_sessions_expr * 100.0 / func.nullif(total_sessions_expr, 0),
            Numeric,
        ),
        2,
    )

    zone_stats = (
        select(
            GameSession.zone_code.label("zone_code"),
            func.coalesce(Zone.name, GameSession.zone_code).label("zone_name"),
            total_sessions_expr.label("total_sessions"),
            red_sessions_expr.label("red_sessions"),
            yellow_sessions_expr.label("yellow_sessions"),
            green_sessions_expr.label("green_sessions"),
            func.round(
                cast(func.avg(GameSession.total_literacy_score), Numeric), 2
            ).label("avg_total_score"),
            critical_index_expr.label("critical_literacy_index"),
        )
        .outerjoin(Zone, Zone.code == GameSession.zone_code)
        .where(GameSession.zone_code.is_not(None))
        .group_by(GameSession.zone_code, Zone.name)
        .cte("zone_stats")
    )

    ranking_query = select(
        zone_stats.c.zone_code,
        zone_stats.c.zone_name,
        zone_stats.c.total_sessions,
        zone_stats.c.red_sessions,
        zone_stats.c.yellow_sessions,
        zone_stats.c.green_sessions,
        zone_stats.c.avg_total_score,
        zone_stats.c.critical_literacy_index,
        func.rank()
        .over(order_by=zone_stats.c.critical_literacy_index.desc())
        .label("vulnerability_rank"),
        func.dense_rank()
        .over(order_by=zone_stats.c.critical_literacy_index.desc())
        .label("dense_vulnerability_rank"),
        func.round(
            cast(func.avg(zone_stats.c.critical_literacy_index).over(), Numeric),
            2,
        ).label("global_avg_critical_index"),
    ).order_by(
        zone_stats.c.critical_literacy_index.desc(),
        zone_stats.c.total_sessions.desc(),
        zone_stats.c.zone_code.asc(),
    )

    rows = db.execute(ranking_query).all()
    global_avg = (
        float(rows[0].global_avg_critical_index)
        if rows and rows[0].global_avg_critical_index is not None
        else 0.0
    )

    items = [
        ZoneVulnerabilityItem(
            zone_code=row.zone_code,
            zone_name=row.zone_name,
            total_sessions=row.total_sessions,
            red_sessions=row.red_sessions,
            yellow_sessions=row.yellow_sessions,
            green_sessions=row.green_sessions,
            avg_total_score=float(row.avg_total_score or 0.0),
            critical_literacy_index=float(row.critical_literacy_index or 0.0),
            vulnerability_rank=int(row.vulnerability_rank),
            dense_vulnerability_rank=int(row.dense_vulnerability_rank),
        )
        for row in rows
    ]

    return ZoneVulnerabilityRankingResponse(
        global_avg_critical_index=global_avg,
        zones=items,
    )


def get_kiosk_c4_dispersal(db: Session) -> KioskC4DispersalResponse:
    """Query 2 (Time-based Anomaly / Dispersal):
    Calcula la desviación estándar, varianza, distribución percentil (P25, P50, P75, IQR)
    de c4_cybersecurity_score y dispersión temporal de duración por Kiosco para identificar ubicaciones atípicas (outliers).
    """
    c4_col = GameSession.c4_cybersecurity_score
    dur_col = GameSession.duration_seconds

    avg_c4_expr = func.avg(c4_col)
    var_c4_expr = func.avg(c4_col * c4_col) - (avg_c4_expr * avg_c4_expr)

    avg_dur_expr = func.avg(dur_col)
    var_dur_expr = func.avg(dur_col * dur_col) - (avg_dur_expr * avg_dur_expr)

    kiosk_stats = (
        select(
            GameSession.kiosk_id.label("kiosk_id"),
            func.coalesce(Kiosk.name, GameSession.kiosk_id).label("kiosk_name"),
            Kiosk.zone_code.label("zone_code"),
            func.count(GameSession.session_id).label("total_sessions"),
            avg_c4_expr.label("avg_c4_score"),
            var_c4_expr.label("var_c4_score"),
            func.min(c4_col).label("min_c4_score"),
            func.max(c4_col).label("max_c4_score"),
            func.count(case((c4_col == 0, 1))).label("c4_score_0"),
            func.count(case((c4_col == 1, 1))).label("c4_score_1"),
            func.count(case((c4_col == 2, 1))).label("c4_score_2"),
            func.count(case((c4_col == 3, 1))).label("c4_score_3"),
            avg_dur_expr.label("avg_duration_seconds"),
            var_dur_expr.label("var_duration_seconds"),
        )
        .outerjoin(Kiosk, Kiosk.code == GameSession.kiosk_id)
        .group_by(GameSession.kiosk_id, Kiosk.name, Kiosk.zone_code)
        .cte("kiosk_stats")
    )

    dispersal_query = select(
        kiosk_stats.c.kiosk_id,
        kiosk_stats.c.kiosk_name,
        kiosk_stats.c.zone_code,
        kiosk_stats.c.total_sessions,
        func.round(cast(kiosk_stats.c.avg_c4_score, Numeric), 2).label("avg_c4_score"),
        kiosk_stats.c.var_c4_score,
        kiosk_stats.c.min_c4_score,
        kiosk_stats.c.max_c4_score,
        kiosk_stats.c.c4_score_0,
        kiosk_stats.c.c4_score_1,
        kiosk_stats.c.c4_score_2,
        kiosk_stats.c.c4_score_3,
        func.round(cast(kiosk_stats.c.avg_duration_seconds, Numeric), 2).label(
            "avg_duration_seconds"
        ),
        kiosk_stats.c.var_duration_seconds,
        func.round(
            cast(func.avg(kiosk_stats.c.avg_c4_score).over(), Numeric), 2
        ).label("global_avg_c4_score"),
        func.rank()
        .over(order_by=kiosk_stats.c.var_c4_score.desc())
        .label("dispersal_rank"),
    ).order_by(
        kiosk_stats.c.var_c4_score.desc(),
        kiosk_stats.c.kiosk_id.asc(),
    )

    rows = db.execute(dispersal_query).all()
    global_avg_c4 = (
        float(rows[0].global_avg_c4_score)
        if rows and rows[0].global_avg_c4_score is not None
        else 0.0
    )

    items: list[KioskC4DispersalItem] = []
    for row in rows:
        variance_c4 = max(0.0, float(row.var_c4_score or 0.0))
        stddev_c4 = round(math.sqrt(variance_c4), 2)

        variance_dur = max(0.0, float(row.var_duration_seconds or 0.0))
        stddev_dur = round(math.sqrt(variance_dur), 2)

        dist = [
            (0, int(row.c4_score_0 or 0)),
            (1, int(row.c4_score_1 or 0)),
            (2, int(row.c4_score_2 or 0)),
            (3, int(row.c4_score_3 or 0)),
        ]
        total = int(row.total_sessions or 0)
        p25 = _discrete_percentile(dist, total, 0.25)
        p50 = _discrete_percentile(dist, total, 0.50)
        p75 = _discrete_percentile(dist, total, 0.75)
        iqr = round(p75 - p25, 2)

        mean_c4 = float(row.avg_c4_score or 0.0)
        is_outlier = stddev_c4 >= 1.0 or abs(mean_c4 - global_avg_c4) >= 0.75

        items.append(
            KioskC4DispersalItem(
                kiosk_id=row.kiosk_id,
                kiosk_name=row.kiosk_name,
                zone_code=row.zone_code,
                total_sessions=total,
                avg_c4_score=mean_c4,
                stddev_c4_score=stddev_c4,
                min_c4_score=int(row.min_c4_score or 0),
                max_c4_score=int(row.max_c4_score or 0),
                p25_c4_score=p25,
                p50_c4_score=p50,
                p75_c4_score=p75,
                iqr_c4_score=iqr,
                avg_duration_seconds=float(row.avg_duration_seconds or 0.0),
                stddev_duration_seconds=stddev_dur,
                dispersal_rank=int(row.dispersal_rank),
                is_outlier=is_outlier,
            )
        )

    return KioskC4DispersalResponse(
        global_avg_c4_score=global_avg_c4,
        kiosks=items,
    )
