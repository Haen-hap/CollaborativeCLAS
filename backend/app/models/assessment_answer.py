from sqlalchemy import CheckConstraint, Column, ForeignKey, Integer
from sqlalchemy.orm import relationship

from app.core.database import Base


class AssessmentQuestion(Base):
    """Question identifiers and accepted answer bounds for the deployed assessment."""

    __tablename__ = "assessment_questions"

    question_id = Column(Integer, primary_key=True, nullable=False)
    choice_count = Column(Integer, nullable=False)

    answers = relationship("AssessmentAnswer", back_populates="question")

    __table_args__ = (CheckConstraint("choice_count > 0", name="ck_question_choice_count_positive"),)


class AssessmentAnswer(Base):
    """An anonymous answer, unique per session and question."""

    __tablename__ = "assessment_answers"

    session_id = Column(
        Integer,
        ForeignKey("assessment_sessions.session_id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    )
    question_id = Column(
        Integer,
        ForeignKey("assessment_questions.question_id"),
        primary_key=True,
        nullable=False,
    )
    answer_value = Column(Integer, nullable=False)

    session = relationship("AssessmentSession", back_populates="answers")
    question = relationship("AssessmentQuestion", back_populates="answers")

    __table_args__ = (CheckConstraint("answer_value >= 0", name="ck_answer_value_nonnegative"),)
