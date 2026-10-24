from sqlalchemy import (
    Column,
    Integer,
    ForeignKey,
    UniqueConstraint,
    CheckConstraint
)
from sqlalchemy.orm import validates
from sqlalchemy.orm import relationship
from app.core.database import Base


class SessionQuestion(Base):
    __tablename__ = "session_questions"
    session_id = Column(Integer, ForeignKey("assessment_sessions.session_id"), primary_key=True)
    question_id = Column(Integer, ForeignKey("questions.id"), primary_key=True)
    position = Column(Integer, nullable=False)
    __table_args__ = (
        UniqueConstraint(
            "session_id",
            "position",
            name="uq_session_question_position"

        ),
        CheckConstraint(
            "position BETWEEN 1 AND 6",
            name="ck_session_question_position"
        )
    )
    session = relationship("AssessmentSession", back_populates="session_questions")
    question = relationship("Question", back_populates="session_questions")
    answer = relationship("SessionAnswer", back_populates="session_question", uselist=False)

    @validates("position")
    def validate_position(self, key, value):
        if type(value) is not int or not 1 <= value <= 6:
            raise ValueError("Position must be an integer between 1 and 6")
        return value
