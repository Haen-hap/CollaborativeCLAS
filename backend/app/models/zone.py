from sqlalchemy import CheckConstraint, Column, String
from sqlalchemy.orm import Relationship, validates

from app.core.database import Base


class Zone(Base):
    __tablename__ = "zones"
    __table_args__ = (
        CheckConstraint(
            "(code = 'DECLINED' OR "
            "(code LIKE 'Z___' AND "
            "substr(code, 2, 3) BETWEEN '001' AND '036'))",
            name="ck_zones_code",
        ),
        CheckConstraint("trim(name) != ''", name="ck_zones_name"),
    )

    code = Column(String, primary_key=True, nullable=False)
    name = Column(String, nullable=False)
    sessions = Relationship("AssessmentSession", back_populates="zone")

    @validates("code")
    def validate_code(self, key, value):
        valid_codes = {f"Z{number:03d}" for number in range(1, 37)}
        valid_codes.add("DECLINED")
        if value not in valid_codes:
            raise ValueError(f"Invalid zone code: {value}")
        return value

    @validates("name")
    def validate_name(self, key, value):
        if not isinstance(value, str) or not value.strip():
            raise ValueError("Zone name cannot be empty")
        return value
