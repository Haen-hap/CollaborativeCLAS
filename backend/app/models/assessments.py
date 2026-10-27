from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.core.database import Base

class Assessment(Base):
    __tablename__ = "assessments"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String, index=True)
    description = Column(String)
    assessment_type = Column(String)

    questions = relationship("Question", back_populates="assessment", cascade="all, delete-orphan")
    submissions = relationship("AssessmentSubmission", back_populates="assessment")
