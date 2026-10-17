import enum
from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, Enum
from sqlalchemy.orm import Relationship

from app.core.database import Base


class AgeRange(str, enum.Enum):
    AGE_18_24 = "AGE_18_24"
    AGE_25_34 = "AGE_25_34"
    AGE_35_49 = "AGE_35_49"
    AGE_50_59 = "AGE_50_59"
    AGE_60_PLUS = "60_PLUS"


class WorkStatus(str, enum.Enum):
    FORMAL = "FORMAL"
    INFORMAL = "INFORMAL"
    HOME = "HOME"
    STUDENT = "STUDENT"
    UNEMPLOYED = "UNEMPLOYED"


class SchoolingLevel(str, enum.Enum):
    PRIMARY_INCOMPLETE = "PRIMARY_INCOMPLETE"
    PRIMARY_COMPLETE = "PRIMARY_COMPLETE"
    SECONDARY_INCOMPLETE = "SECONDARY_INCOMPLETE"
    SECONDARY_COMPLETE = "SECONDARY_COMPLETE"
    TERTIARY = "TERTIARY"


class CompletionStatus(str, enum.Enum):
    ABANDONED = "ABANDONED"
    COMPLETED = "COMPLETED"


class AssessmentSession(Base):
    __tablename__ = "assessment_sessions"
    session_id = Column(Integer, primary_key=True, nullable=False)
    access_point_code = Column(
        String,
        ForeignKey("access_points.code"),
        nullable=False

    )
    assisted_mode = Column(Boolean, nullable=False)
    age_range = Column(Enum(AgeRange), nullable=False)
    work_status = Column(Enum(WorkStatus), nullable=False)
    schooling_level = Column(Enum(SchoolingLevel), nullable=False)
    zone_code = Column(
        String,
        ForeignKey("zones.code"),
        nullable=False
    )
    location_declined = Column(Boolean, nullable=False)
    completion_status = Column(Enum(CompletionStatus), nullable=False)
    duration_seconds = Column(Integer, nullable=False)

    access_point = Relationship("Access_Points", back_populates="sessions",uselist=False)
    zone = Relationship("Zones", back_populates="sessions",uselist=False)
    result = Relationship("assessment_results", back_populates="sessions",uselist=False)
    reward = Relationship("Rewards", back_populates="sessions",uselist=False)
