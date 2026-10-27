from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.analytics import LegacyAnalyticsSummaryResponse
from app.services.analytics import get_analytics_summary


router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary", response_model=LegacyAnalyticsSummaryResponse)
def read_analytics_summary(
    db: Session = Depends(get_db),
) -> LegacyAnalyticsSummaryResponse:
    return get_analytics_summary(db)
