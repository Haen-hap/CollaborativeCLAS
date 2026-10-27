from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

AgeRange = Literal["18_24", "25_34", "35_49", "50_59", "60_PLUS"]
WorkStatus = Literal["FORMAL", "INFORMAL", "HOME", "STUDENT", "UNEMPLOYED"]
Schooling = Literal["PRIMARY_INCOMPLETE", "PRIMARY_COMPLETE", "SECONDARY_INCOMPLETE", "SECONDARY_COMPLETE", "TERTIARY"]
RewardType = Literal["NONE", "BEVERAGE_DISPENSER", "POWER_STATION", "WIFI_CREDENTIAL"]

KIOSK_PATTERN = r"^(PTYK\d{3}|DIRECT_WEB)$"
ZONE_PATTERN = r"^(Z0(0[1-9]|[12][0-9]|3[0-6])|DECLINED)$"


class SessionIn(BaseModel):
    """Lo que envía la PWA. total y clasificación se IGNORAN y se recalculan en el servidor."""
    model_config = ConfigDict(extra="ignore")

    session_id: str = Field(pattern=r"^[A-Za-z0-9_-]{3,40}$")
    kiosk_id: str = Field(pattern=KIOSK_PATTERN)
    origin: Literal["KIOSK", "UNKNOWN", "MOCK"] = "UNKNOWN"
    assisted_mode: bool = False
    age_range: Optional[AgeRange] = None
    work_status: Optional[WorkStatus] = None
    schooling_level: Optional[Schooling] = None
    zone_code: Optional[str] = Field(default=None, pattern=ZONE_PATTERN)
    c1_visual_signs_score: int = Field(0, ge=0, le=2)
    c2_sentence_comprehension_score: int = Field(0, ge=0, le=2)
    c3_mobile_icons_score: int = Field(0, ge=0, le=2)
    c4_cybersecurity_score: int = Field(0, ge=0, le=3)
    completion_status: Literal["COMPLETED", "ABANDONED"]
    last_step: Optional[str] = Field(default=None, max_length=15)
    duration_seconds: int = Field(0, ge=0, le=7200)
    reward_issued: bool = False
    iot_trigger_type: RewardType = "NONE"
    repeat_device: bool = False


class SessionOut(SessionIn):
    model_config = ConfigDict(from_attributes=True)
    total_literacy_score: int
    internal_zone_classification: Literal["RED", "YELLOW", "GREEN"]
