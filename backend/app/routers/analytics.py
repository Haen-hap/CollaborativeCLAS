from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.analytics import (
    KioskC4DispersalResponse,
    LegacyAnalyticsSummaryResponse,
    ZoneVulnerabilityRankingResponse,
)
from app.services.advanced_analytics import (
    get_kiosk_c4_dispersal,
    get_zone_vulnerability_ranking,
)
from app.services.analytics import get_analytics_summary


router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary", response_model=LegacyAnalyticsSummaryResponse)
def read_analytics_summary(
    db: Session = Depends(get_db),
) -> LegacyAnalyticsSummaryResponse:
    return get_analytics_summary(db)


@router.get(
    "/vulnerability-ranking",
    response_model=ZoneVulnerabilityRankingResponse,
)
def read_zone_vulnerability_ranking(
    db: Session = Depends(get_db),
) -> ZoneVulnerabilityRankingResponse:
    return get_zone_vulnerability_ranking(db)


@router.get(
    "/kiosk-c4-dispersal",
    response_model=KioskC4DispersalResponse,
)
def read_kiosk_c4_dispersal(
    db: Session = Depends(get_db),
) -> KioskC4DispersalResponse:
    return get_kiosk_c4_dispersal(db)
