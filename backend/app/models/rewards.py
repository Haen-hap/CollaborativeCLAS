from sqlalchemy import Column, Integer, ForeignKey, String, Enum, Boolean, true
from app.core.database import Base
from sqlalchemy.orm import Relationship
import enum


class TriggerType(enum.Enum):
    BEVERAGE_DISPENSER = "BEVERAGE_DISPENSER"
    WIFI_CREDENTIALS = "WIFI_CREDENTIALS"
    POWER_STATION = "POWER_STATION"
    NONE = "NONE"


class Reward(Base):
    __tablename__ = "rewards"
    id = Column(Integer, primary_key=True, nullable=False)
    session_id = Column(
        Integer,
        ForeignKey("assessment_sessions.session_id"),
        nullable=False,
        unique=True)
    trigger_type = Column(Enum(TriggerType), nullable=False)
    issued = Column(Boolean, nullable=False)
    session = Relationship("AssessmentSessions", back_populates="rewards", uselist=False)
