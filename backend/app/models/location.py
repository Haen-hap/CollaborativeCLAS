from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.core.database import Base

class Location(Base):
    __tablename__ = "locations"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    country = Column(String(50),nullable=False)
    city = Column(String(50),nullable=False)
    zone_name = Column(String(50),nullable=False)
    submissions= relationship("AssessmentSubmission", back_populates="location")

