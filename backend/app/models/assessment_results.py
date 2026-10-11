from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class AssessmentResult(Base):
    __tablename__ = "assessment_results"
    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("assessment_submissions.id"))
    literacy_score = Column(Integer)
    total_score = Column(Integer)
    digital_score = Column(Integer)
    priority_level = Column(Integer)
    submission = relationship("AssessmentSubmission", back_populates="results")


