from sqlalchemy import Column, Integer, String, ForeignKey, Date, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database.base_class import Base

class AcademicYear(Base):
    __tablename__ = "academic_years"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(20), unique=True, nullable=False) # e.g., "2025-2026"
    is_active = Column(Integer, default=1)

class Semester(Base):
    __tablename__ = "semesters"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(20), unique=True, nullable=False) # e.g., "Semester 1"
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"))

class Department(Base):
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(20), unique=True, nullable=False)

    subjects = relationship("Subject", back_populates="department")

class Division(Base):
    __tablename__ = "divisions"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)

class Subject(Base):
    __tablename__ = "subjects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    semester_id = Column(Integer, ForeignKey("semesters.id"), nullable=False)

    department = relationship("Department", back_populates="subjects")
    semester = relationship("Semester")
    faculty_assignments = relationship("FacultySubject", back_populates="subject")

class FacultySubject(Base):
    __tablename__ = "faculty_subjects"
    id = Column(Integer, primary_key=True, index=True)
    faculty_id = Column(Integer, ForeignKey("faculty.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"), nullable=False)
    division_id = Column(Integer, ForeignKey("divisions.id"), nullable=True)
    
    faculty = relationship("Faculty", back_populates="subjects")
    subject = relationship("Subject", back_populates="faculty_assignments")
    academic_year = relationship("AcademicYear")
    division = relationship("Division")

    __table_args__ = (
        UniqueConstraint('faculty_id', 'subject_id', 'academic_year_id', 'division_id', name='uq_faculty_subject_assignment'),
    )
