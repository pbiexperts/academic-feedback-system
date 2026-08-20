from app.database.base_class import Base
from app.models.user import User, Role, Student, Faculty, ProgramCoordinator
from app.models.academic import Department, Division, Subject, AcademicYear, Semester, FacultySubject
from app.models.evaluation import EvaluationCycle, Questionnaire, Question
from app.models.feedback import FeedbackSubmission, FeedbackAnswer, FeedbackComment
from app.models.audit import AuditLog
from app.models.attendance import Attendance

# For Alembic to find all models
__all__ = [
    "Base",
    "User", "Role", "Student", "Faculty", "ProgramCoordinator",
    "Department", "Division", "Subject", "AcademicYear", "Semester", "FacultySubject",
    "EvaluationCycle", "Questionnaire", "Question",
    "FeedbackSubmission", "FeedbackAnswer", "FeedbackComment",
    "AuditLog",
    "Attendance"
]

from .analytics_summary import FacultySubjectSummary, DepartmentSummary, CollegeSummary
