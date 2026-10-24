from sqlalchemy import Column, Integer, ForeignKeyConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base


class SessionAnswer(Base):
    __tablename__ = "session_answers"

    session_id = Column(
        Integer,
        primary_key=True
    )
    question_id = Column(
        Integer,
        primary_key=True
    )
    option_id = Column(
        Integer,
        nullable=False
    )
    __table_args__ = (
        ForeignKeyConstraint(
            ["session_id", "question_id"],
            [
                "session_questions.session_id",
                "session_questions.question_id"
            ],
            name="fk_session_answer_question"
        ),
        ForeignKeyConstraint(
            ["question_id", "option_id"],
            [
                "question_options.question_id",
                "question_options.id"
            ],
            name="fk_session_answer_option"
        ),
    )
    session_question = relationship("SessionQuestion", back_populates="answer")
    selected_option = relationship("QuestionOption", viewonly=True)
