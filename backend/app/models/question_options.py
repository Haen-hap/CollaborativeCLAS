from sqlalchemy import (
    Column, Integer, Text, Boolean, ForeignKey, UniqueConstraint, CheckConstraint, Index, text
)
from sqlalchemy.orm import relationship, validates
from app.core.database import Base


class QuestionOption(Base):
    __tablename__ = "question_options"
    id = Column(Integer, primary_key=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    option_text = Column(Text, nullable=False)
    is_correct = Column(Boolean, nullable=False, default=False, server_default=text("false"))
    __table_args__ = (
        UniqueConstraint(
            "question_id",
            "id",
            name="uq_question_options_question_id_id"
        ),
        CheckConstraint(
            "length(trim(option_text)) > 0",
            name="ck_question_options_text_not_empty"
        ),
        Index(
            "uq_one_correct_option_per_question",
            "question_id",
            unique=True,
            postgresql_where=text("is_correct = true"),
            sqlite_where=text("is_correct = 1")
        ),
    )
    question = relationship("Question", back_populates="options")


@validates("option_text")
def validate_option_text(self, key, value):
    if not isinstance(value, str) or not value.strip():
        raise ValueError(
            "Option text cannot be empty"
        )
    return value.strip()
