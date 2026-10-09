from sqlalchemy import Column, Integer, ForeignKey, DateTime, Boolean
from app.core.database import Base
from sqlalchemy.orm import relationship


class AssessmentSubmission(Base):
    __tablename__ = "assessment_submissions"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id"))
    demographic_profile_id = Column(Integer, ForeignKey("demographic_profiles.id"))
    location_id = Column(Integer, ForeignKey("locations.id"))
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    consent_given = Column(Boolean)

    assessment = relationship("Assessment", back_populates="submissions")
    demographic_profile = relationship("DemographicProfile", back_populates="submissions")
    location = relationship("Location", back_populates="submissions")
    answers = relationship("Answer", back_populates="submissions", cascade="all, delete-orphan")
    result= relationship("AssessmentResult", back_populates="submissions", uselist=False, cascade="all, delete-orphan")