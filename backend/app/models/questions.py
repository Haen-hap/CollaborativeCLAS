from sqlalchemy import Column, Integer, String, ForeignKey
from app.core.database import Base
from sqlalchemy.orm import relationship

class Questions(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id"))
    question_text = Column(String)
    question_type = Column(String)
    correct_answer = Column(String)
    points = Column(Integer)

    assessment = relationship("Assessment", back_populates="questions")
    answers = relationship("Answer", back_populates="question")

