import enum

from sqlalchemy import CheckConstraint, Column, Enum, String
from sqlalchemy.orm import relationship, validates

from app.core.database import Base


class AccessPointType(str, enum.Enum):
    KIOSK = "KIOSK"
    WEB = "WEB"


class AccessPoint(Base):
    __tablename__ = "access_points"
    __table_args__ = (
        CheckConstraint(
            "code IN ('PTYK001', 'PTYK002', 'PTYK003', 'DIRECT_WEB')",
            name="ck_access_points_code",
        ),
        CheckConstraint("trim(name) != ''", name="ck_access_points_name"),
        CheckConstraint(
            "(code = 'DIRECT_WEB' AND type = 'WEB') OR "
            "(code IN ('PTYK001', 'PTYK002', 'PTYK003') AND type = 'KIOSK')",
            name="ck_access_points_code_type",
        ),
    )

    code = Column(String, primary_key=True, nullable=False)
    name = Column(String, nullable=False)
    type = Column(
        Enum(
            AccessPointType,
            values_callable=lambda values: [member.value for member in values],
        ),
        nullable=False,
    )
    sessions = relationship("AssessmentSession", back_populates="access_point")

    @validates("code")
    def validate_code(self, key, value):
        valid_codes = {"PTYK001", "PTYK002", "PTYK003", "DIRECT_WEB"}
        if value not in valid_codes:
            raise ValueError(f"Invalid access point code: {value}")
        access_point_type = self.__dict__.get("type")
        if access_point_type is not None:
            expected_type = (
                AccessPointType.WEB if value == "DIRECT_WEB" else AccessPointType.KIOSK
            )
            if access_point_type is not expected_type:
                raise ValueError(
                    f"Access point code {value} requires type {expected_type.value}"
                )
        return value

    @validates("name")
    def validate_name(self, key, value):
        if not isinstance(value, str) or not value.strip():
            raise ValueError("Access point name cannot be empty")
        return value

    @validates("type")
    def validate_type(self, key, value):
        if isinstance(value, AccessPointType):
            validated_value = value
        else:
            try:
                validated_value = AccessPointType(value)
            except (TypeError, ValueError) as exc:
                raise ValueError(f"Invalid access point type: {value}") from exc

        code = self.__dict__.get("code")
        if code is not None:
            expected_type = (
                AccessPointType.WEB if code == "DIRECT_WEB" else AccessPointType.KIOSK
            )
            if validated_value is not expected_type:
                raise ValueError(
                    f"Access point code {code} requires type {expected_type.value}"
                )
        return validated_value
