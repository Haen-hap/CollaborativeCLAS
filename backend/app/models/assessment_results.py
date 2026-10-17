from sqlalchemy import Column, Integer, ForeignKey, String
from sqlalchemy.orm import Relationship
from app.core.database import Base


class AssessmentResult(Base):
    __tablename__ = "assessment_results"
    session_id = Column(
        Integer,
        ForeignKey("assessment_sessions.session_id"),
        primary_key=True,
        nullable=False)
    c1_visual_signs_score = Column(Integer, nullable=False)
    c2_sentence_comprehension_score = Column(Integer, nullable=False)
    c3_mobile_icons_score = Column(Integer, nullable=False)
    c4_cybersecurity_score = Column(Integer, nullable=False)
    total_literacy_score = Column(Integer, nullable=False)
    literacy_classification = Column(String, nullable=False)
    session = Relationship("assessment_sessions", back_populates="results",uselist=False)
