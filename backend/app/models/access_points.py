from sqlalchemy import Column, String, Enum
from sqlalchemy.orm import Relationship
from app.core.database import Base
import enum


class AccessPointType(str, enum.Enum):
    KIOSK = "KIOSK"
    WEB = "WEB"


class AccessPoint(Base):
    __tablename__ = "access_points"
    code = Column(String, primary_key=True, nullable=False)
    name = Column(String, nullable=False)
    type = Column(Enum(AccessPointType), nullable=False)
    sessions=Relationship("assessment_session",back_populates="access_point")
