from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.database.base_class import Base

class FacultySubjectSummary(Base):
    __tablename__ = "faculty_subject_summaries"

    id = Column(Integer, primary_key=True, index=True)
    faculty_id = Column(Integer, ForeignKey("faculty.id", ondelete="CASCADE"), index=True, nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), index=True, nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), index=True, nullable=False)
    
    average_rating = Column(Float, default=0.0)
    response_count = Column(Integer, default=0)
    
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class DepartmentSummary(Base):
    __tablename__ = "department_summaries"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    
    average_rating = Column(Float, default=0.0)
    total_responses = Column(Integer, default=0)
    faculty_count = Column(Integer, default=0)
    
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class CollegeSummary(Base):
    __tablename__ = "college_summaries"

    id = Column(Integer, primary_key=True, index=True)
    
    average_rating = Column(Float, default=0.0)
    total_responses = Column(Integer, default=0)
    
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
