from sqlalchemy import Column, Integer, ForeignKey, DateTime, Float, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.base_class import Base

class Attendance(Base):
    __tablename__ = "attendance"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    faculty_id = Column(Integer, ForeignKey("faculty.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"), nullable=False)
    semester_id = Column(Integer, ForeignKey("semesters.id"), nullable=False)
    division_id = Column(Integer, ForeignKey("divisions.id"), nullable=False)
    total_classes = Column(Integer, default=0)
    classes_attended = Column(Integer, default=0)
    attendance_percentage = Column(Float, default=0.0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    student = relationship("Student")
    subject = relationship("Subject")
    faculty = relationship("Faculty")
    department = relationship("Department")
    academic_year = relationship("AcademicYear")
    semester = relationship("Semester")
    division = relationship("Division")

    __table_args__ = (
        UniqueConstraint('student_id', 'subject_id', 'academic_year_id', 'semester_id', name='uq_student_attendance_cycle'),
    )
