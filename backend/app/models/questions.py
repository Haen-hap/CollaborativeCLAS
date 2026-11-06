from sqlalchemy import CheckConstraint, Column, Integer, String
from app.core.database import Base
from sqlalchemy.orm import relationship


class Question(Base):
    __tablename__ = "questions"
    __table_args__ = (
        CheckConstraint(
            "category IN ('R1', 'R2', 'R3', 'R4', 'test')",
            name="ck_questions_category",
        ),
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    category = Column(String(2), nullable=False)
    question_text = Column(String, nullable=False)

    options = relationship("QuestionOption", back_populates="question")
    session_questions = relationship("SessionQuestion", back_populates="question")
    answers = relationship("Answer", back_populates="question")


Questions = Question
