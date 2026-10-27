from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.session import KIOSK_PATTERN

VISIT_ID_PATTERN = r"^[A-Za-z0-9_-]{8,40}$"


class VisitIn(BaseModel):
    """Lo único que la PWA envía de una visita. Cualquier otro campo se ignora."""
    model_config = ConfigDict(extra="ignore")

    kiosk_id: str = Field(pattern=KIOSK_PATTERN)
    origin: Literal["KIOSK", "UNKNOWN"] = "UNKNOWN"
    assisted_mode: bool = False
    outcome: Literal["ENTERED", "CONSENTED", "ABANDONED", "COMPLETED", "DECLINED_PRIVACY", "UNDER_18"]
    session_id: Optional[str] = Field(default=None, pattern=r"^[A-Za-z0-9_-]{3,40}$")


class VisitOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    visit_id: str
    kiosk_id: str
    origin: str
    assisted_mode: bool
    outcome: str
    session_id: Optional[str] = None
    first_seen_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
