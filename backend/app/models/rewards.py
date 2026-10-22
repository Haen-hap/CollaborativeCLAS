import enum

from sqlalchemy import Boolean, CheckConstraint, Column, Enum, ForeignKey, Integer
from sqlalchemy.orm import Relationship, validates

from app.core.database import Base


class TriggerType(str, enum.Enum):
    BEVERAGE_DISPENSER = "BEVERAGE_DISPENSER"
    WIFI_CREDENTIAL = "WIFI_CREDENTIAL"
    POWER_STATION = "POWER_STATION"
    NONE = "NONE"


class Reward(Base):
    __tablename__ = "rewards"
    __table_args__ = (
        CheckConstraint(
            "(issued = false AND trigger_type = 'NONE') OR "
            "(issued = true AND trigger_type != 'NONE')",
            name="ck_rewards_issued_trigger_type",
        ),
    )
    id = Column(Integer, primary_key=True, nullable=False)
    session_id = Column(
        Integer,
        ForeignKey("assessment_sessions.session_id"),
        nullable=False,
        unique=True)
    trigger_type = Column(
        Enum(
            TriggerType,
            values_callable=lambda values: [member.value for member in values],
        ),
        nullable=False,
    )
    issued = Column(Boolean, nullable=False)
    session = Relationship("AssessmentSession", back_populates="reward", uselist=False)

    @validates("trigger_type")
    def validate_trigger_type(self, key, value):
        if isinstance(value, TriggerType):
            validated_value = value
        else:
            try:
                validated_value = TriggerType(value)
            except (TypeError, ValueError) as exc:
                raise ValueError(f"Invalid trigger type: {value}") from exc
        self._validate_issued_trigger_type(validated_value=validated_value)
        return validated_value

    @validates("issued")
    def validate_issued(self, key, value):
        if not isinstance(value, bool):
            raise ValueError("issued must be a boolean")
        self._validate_issued_trigger_type(issued=value)
        return value

    def _validate_issued_trigger_type(
        self,
        issued=None,
        validated_value=None,
    ):
        current_issued = (
            issued if issued is not None else self.__dict__.get("issued")
        )
        current_trigger = (
            validated_value
            if validated_value is not None
            else self.__dict__.get("trigger_type")
        )
        if current_issued is None or current_trigger is None:
            return
        if (not current_issued and current_trigger is not TriggerType.NONE) or (
            current_issued and current_trigger is TriggerType.NONE
        ):
            raise ValueError("issued and trigger_type must agree")
