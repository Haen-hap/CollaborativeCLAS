from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    CheckConstraint
)

from sqlalchemy.orm import relationship, validates

from app.core.database import Base


class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True)

    category = Column(String(2), nullable=False)

    question_text = Column(Text, nullable=False)

    __table_args__ = (
        CheckConstraint(
            "category IN ('R1', 'R2', 'R3')",
            name="ck_questions_category"

        ),
        CheckConstraint(
            "length(trim(question_text)) > 0",
            name="ck_questions_text_not_empty  "
        )
    )

    options = relationship("QuestionOption", back_populates="question")
    session_questions = relationship("SessionQuestion", back_populates="question")

    @validates("category")
    def validate_category(self, key, value):
        valid_categories = ['R1', 'R2', 'R3']
        if value not in valid_categories:
            raise ValueError(f"Invalid category: {value}. Must be one of {valid_categories}")
        return value

    @validates("question_text")
    def validate_question_text(self, key, value):
        if not isinstance(value, str) or not value.strip():
            raise ValueError(
                "Question text cannot be empty"
            )
        return value.strip()
