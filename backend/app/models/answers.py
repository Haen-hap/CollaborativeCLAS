from sqlalchemy import Column, Integer, ForeignKey, Boolean, String
from sqlalchemy.orm import relationship
from app.core.database import Base

class Answer(Base):
    __tablename__ = "answers"
    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"))
    submission_id = Column(Integer, ForeignKey("assessment_submissions.id"))
    is_correct = Column(Boolean)
    answer_value = Column(String)
    points_awarded = Column(Integer)
    question = relationship("Questions", back_populates="answers")
    submission = relationship("AssessmentSubmission", back_populates="answers")