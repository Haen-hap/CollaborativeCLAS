import enum

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Enum,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.orm import Relationship, validates

from app.core.database import Base


class AgeRange(str, enum.Enum):
    AGE_18_24 = "18_24"
    AGE_25_34 = "25_34"
    AGE_35_49 = "35_49"
    AGE_50_59 = "50_59"
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
    __table_args__ = (
        CheckConstraint(
            "duration_seconds >= 0",
            name="ck_assessment_sessions_duration_seconds",
        ),
        CheckConstraint(
            "(zone_code = 'DECLINED' AND location_declined = true) OR "
            "(zone_code != 'DECLINED' AND location_declined = false)",
            name="ck_assessment_sessions_zone_location_declined",
        ),
    )

    session_id = Column(Integer, primary_key=True, nullable=False)
    access_point_code = Column(
        String,
        ForeignKey("access_points.code"),
        nullable=False

    )
    assisted_mode = Column(Boolean, nullable=False)
    age_range = Column(
        Enum(
            AgeRange,
            values_callable=lambda values: [member.value for member in values],
        ),
        nullable=False,
    )
    work_status = Column(
        Enum(
            WorkStatus,
            values_callable=lambda values: [member.value for member in values],
        ),
        nullable=False,
    )
    schooling_level = Column(
        Enum(
            SchoolingLevel,
            values_callable=lambda values: [member.value for member in values],
        ),
        nullable=False,
    )
    zone_code = Column(
        String,
        ForeignKey("zones.code"),
        nullable=False
    )
    location_declined = Column(Boolean, nullable=False)
    completion_status = Column(
        Enum(
            CompletionStatus,
            values_callable=lambda values: [member.value for member in values],
        ),
        nullable=False,
    )
    duration_seconds = Column(Integer, nullable=False)

    access_point = Relationship("AccessPoint", back_populates="sessions", uselist=False)
    zone = Relationship("Zone", back_populates="sessions", uselist=False)
    result = Relationship("AssessmentResult", back_populates="result", uselist=False)
    reward = Relationship("Reward", back_populates="session", uselist=False)

    @staticmethod
    def _coerce_enum(value, enum_type, field_name):
        if isinstance(value, enum_type):
            return value
        try:
            return enum_type(value)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"Invalid {field_name}: {value}") from exc

    @validates("age_range")
    def validate_age_range(self, key, value):
        return self._coerce_enum(value, AgeRange, "age range")

    @validates("work_status")
    def validate_work_status(self, key, value):
        return self._coerce_enum(value, WorkStatus, "work status")

    @validates("schooling_level")
    def validate_schooling_level(self, key, value):
        return self._coerce_enum(value, SchoolingLevel, "schooling level")

    @validates("completion_status")
    def validate_completion_status(self, key, value):
        return self._coerce_enum(value, CompletionStatus, "completion status")

    @validates("duration_seconds")
    def validate_duration_seconds(self, key, value):
        if not isinstance(value, int) or isinstance(value, bool) or value < 0:
            raise ValueError("Duration must be a non-negative integer")
        return value

    @validates("access_point_code")
    def validate_access_point_code(self, key, value):
        valid_codes = {"PTYK001", "PTYK002", "PTYK003", "DIRECT_WEB"}
        if value not in valid_codes:
            raise ValueError(f"Invalid access point code: {value}")
        return value

    @validates("zone_code")
    def validate_zone_code(self, key, value):
        valid_codes = {f"Z{number:03d}" for number in range(1, 37)}
        valid_codes.add("DECLINED")
        if value not in valid_codes:
            raise ValueError(f"Invalid zone code: {value}")
        location_declined = self.__dict__.get("location_declined")
        if location_declined is not None:
            expected_declined = value == "DECLINED"
            if location_declined != expected_declined:
                raise ValueError(
                    "zone_code and location_declined must agree"
                )
        return value

    @validates("location_declined")
    def validate_location_declined(self, key, value):
        if not isinstance(value, bool):
            raise ValueError("location_declined must be a boolean")
        zone_code = self.__dict__.get("zone_code")
        if zone_code is not None and value != (zone_code == "DECLINED"):
            raise ValueError("zone_code and location_declined must agree")
        return value
