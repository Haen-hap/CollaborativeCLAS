from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.admin_user import AdminUser
from app.routers.auth import get_current_admin
from app.schemas.analytics import (
    KioskC4DispersalResponse,
    LegacyAnalyticsSummaryResponse,
    SimulateResponse,
    ZoneVulnerabilityRankingResponse,
)
from app.services.advanced_analytics import (
    get_kiosk_c4_dispersal,
    get_zone_vulnerability_ranking,
)
from app.services.analytics import (
    get_analytics_summary,
    restore_live_sessions,
    seed_simulated_sessions,
)

router = APIRouter(
    prefix="/analytics",
    tags=["analytics"],
    dependencies=[Depends(get_current_admin)],
)


@router.get("/summary", response_model=LegacyAnalyticsSummaryResponse)
def read_analytics_summary(
    db: Session = Depends(get_db),
    _admin: AdminUser = Depends(get_current_admin),
) -> LegacyAnalyticsSummaryResponse:
    return get_analytics_summary(db)


@router.post("/simulate", response_model=SimulateResponse, status_code=201)
def run_analytics_simulation(
    count: int = 50,
    db: Session = Depends(get_db),
    _admin: AdminUser = Depends(get_current_admin),
) -> SimulateResponse:
    return seed_simulated_sessions(db, count=count)


@router.post("/restore", response_model=LegacyAnalyticsSummaryResponse)
def run_analytics_restore(
    db: Session = Depends(get_db),
    _admin: AdminUser = Depends(get_current_admin),
) -> LegacyAnalyticsSummaryResponse:
    return restore_live_sessions(db)


@router.get(
    "/vulnerability-ranking",
    response_model=ZoneVulnerabilityRankingResponse,
)
def read_zone_vulnerability_ranking(
    db: Session = Depends(get_db),
    _admin: AdminUser = Depends(get_current_admin),
) -> ZoneVulnerabilityRankingResponse:
    return get_zone_vulnerability_ranking(db)


@router.get(
    "/kiosk-c4-dispersal",
    response_model=KioskC4DispersalResponse,
)
def read_kiosk_c4_dispersal(
    db: Session = Depends(get_db),
    _admin: AdminUser = Depends(get_current_admin),
) -> KioskC4DispersalResponse:
    return get_kiosk_c4_dispersal(db)
