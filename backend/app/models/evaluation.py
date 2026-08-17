from sqlalchemy import Column, Integer, String, ForeignKey, Date, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.base_class import Base

class Questionnaire(Base):
    __tablename__ = "questionnaires"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    questions = relationship("Question", back_populates="questionnaire")
    evaluation_cycles = relationship("EvaluationCycle", back_populates="questionnaire")

class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True)
    questionnaire_id = Column(Integer, ForeignKey("questionnaires.id"), nullable=False)
    text = Column(Text, nullable=False)
    category = Column(String(100), nullable=False)
    question_type = Column(String(20), nullable=False) # e.g., "rating", "short_text", "long_text"
    is_required = Column(Boolean, default=True)
    order_index = Column(Integer, default=0)

    questionnaire = relationship("Questionnaire", back_populates="questions")

class EvaluationCycle(Base):
    __tablename__ = "evaluation_cycles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"), nullable=False)
    semester_id = Column(Integer, ForeignKey("semesters.id"), nullable=False)
    questionnaire_id = Column(Integer, ForeignKey("questionnaires.id"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(String(20), default="UPCOMING") # UPCOMING, ACTIVE, CLOSED, ARCHIVED
    minimum_response_threshold = Column(Integer, default=5)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    academic_year = relationship("AcademicYear")
    semester = relationship("Semester")
    questionnaire = relationship("Questionnaire", back_populates="evaluation_cycles")
    submissions = relationship("FeedbackSubmission", back_populates="evaluation_cycle")
