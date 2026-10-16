from sqlalchemy import Column, String
from sqlalchemy.orm import Relationship
from app.core.database import Base


class Zone(Base):
    __tablename__ = "zones"
    code = Column(String, primary_key=True, nullable=False)
    name = Column(String, nullable=False)
    sessions=Relationship("assessment_session",back_populates="zone")
