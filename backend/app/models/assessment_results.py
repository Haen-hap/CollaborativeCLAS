import enum

from sqlalchemy import Column, Enum, ForeignKey, Integer, SmallInteger, String
from sqlalchemy.orm import relationship
from app.core.database import Base


class LiteracyClassification(str, enum.Enum):
    RED = "RED"
    YELLOW = "YELLOW"
    GREEN = "GREEN"


class AssessmentResult(Base):
    __tablename__ = "assessment_results"
    session_id = Column(
        Integer,
        ForeignKey("assessment_sessions.session_id"),
        primary_key=True,
        nullable=False,
    )
    c1_visual_signs_score = Column(SmallInteger, nullable=False, default=0)
    c2_sentence_comprehension_score = Column(SmallInteger, nullable=False, default=0)
    c3_mobile_icons_score = Column(SmallInteger, nullable=False, default=0)
    c4_cybersecurity_score = Column(SmallInteger, nullable=False, default=0)
    total_literacy_score = Column(SmallInteger, nullable=False, default=0)
    literacy_classification = Column(
        Enum(
            LiteracyClassification,
            values_callable=lambda values: [member.value for member in values],
        ),
        nullable=False,
        default=LiteracyClassification.RED,
    )
    session = relationship("AssessmentSession", back_populates="result", uselist=False)
