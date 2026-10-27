from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class DemographicProfiles(Base):
    __tablename__ = "demographic_profiles"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    age_group = Column(String(50), nullable=False)
    education_level = Column(String(50), nullable=False)
    employment_status = Column(String(50), nullable=False)

    submissions= relationship("AssessmentSubmission", back_populates="demographic_profile")


