from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.base_class import Base

class FeedbackSubmission(Base):
    __tablename__ = "feedback_submissions"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    faculty_id = Column(Integer, ForeignKey("faculty.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    evaluation_cycle_id = Column(Integer, ForeignKey("evaluation_cycles.id"), nullable=False)
    
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    overall_faculty_rating = Column(Float, nullable=True)
    overall_subject_rating = Column(Float, nullable=True)
    status = Column(String(20), default="SUBMITTED")

    student = relationship("Student", back_populates="submissions")
    faculty = relationship("Faculty", back_populates="received_feedback")
    subject = relationship("Subject")
    department = relationship("Department")
    evaluation_cycle = relationship("EvaluationCycle", back_populates="submissions")
    answers = relationship("FeedbackAnswer", back_populates="submission")
    comments = relationship("FeedbackComment", back_populates="submission")

    __table_args__ = (
        UniqueConstraint('student_id', 'faculty_id', 'subject_id', 'evaluation_cycle_id', name='uq_feedback_submission'),
    )

class FeedbackAnswer(Base):
    __tablename__ = "feedback_answers"
    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("feedback_submissions.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    rating = Column(Integer, nullable=True)
    text_answer = Column(Text, nullable=True)

    submission = relationship("FeedbackSubmission", back_populates="answers")
    question = relationship("Question")

class FeedbackComment(Base):
    __tablename__ = "feedback_comments"
    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("feedback_submissions.id"), nullable=False)
    comment_type = Column(String(50), nullable=False) # e.g., "what_liked", "what_improved", "additional"
    comment_text = Column(Text, nullable=False)

    submission = relationship("FeedbackSubmission", back_populates="comments")
