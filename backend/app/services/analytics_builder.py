from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.feedback import FeedbackSubmission
from app.models.analytics_summary import FacultySubjectSummary, DepartmentSummary, CollegeSummary
from app.models.academic import FacultySubject, Department

def refresh_faculty_subject_summary(db: Session, faculty_id: int, subject_id: int, department_id: int):
    # Calculate aggregation
    result = db.query(
        func.avg(FeedbackSubmission.overall_faculty_rating).label("avg_rating"),
        func.count(FeedbackSubmission.id).label("total_responses")
    ).filter(
        FeedbackSubmission.faculty_id == faculty_id,
        FeedbackSubmission.subject_id == subject_id
    ).first()

    avg_rating = result.avg_rating or 0.0
    total_responses = result.total_responses or 0

    # Upsert the summary table
    summary = db.query(FacultySubjectSummary).filter(
        FacultySubjectSummary.faculty_id == faculty_id,
        FacultySubjectSummary.subject_id == subject_id
    ).first()

    if not summary:
        summary = FacultySubjectSummary(
            faculty_id=faculty_id,
            subject_id=subject_id,
            department_id=department_id,
            average_rating=avg_rating,
            response_count=total_responses
        )
        db.add(summary)
    else:
        summary.average_rating = avg_rating
        summary.response_count = total_responses

    db.commit()


def refresh_department_summary(db: Session, department_id: int):
    # Aggregate over faculty summaries for this department
    result = db.query(
        func.avg(FacultySubjectSummary.average_rating).label("avg_rating"),
        func.sum(FacultySubjectSummary.response_count).label("total_responses"),
        func.count(func.distinct(FacultySubjectSummary.faculty_id)).label("faculty_count")
    ).filter(
        FacultySubjectSummary.department_id == department_id,
        FacultySubjectSummary.response_count > 0
    ).first()

    avg_rating = result.avg_rating or 0.0
    total_responses = result.total_responses or 0
    faculty_count = result.faculty_count or 0

    summary = db.query(DepartmentSummary).filter(
        DepartmentSummary.department_id == department_id
    ).first()

    if not summary:
        summary = DepartmentSummary(
            department_id=department_id,
            average_rating=avg_rating,
            total_responses=total_responses,
            faculty_count=faculty_count
        )
        db.add(summary)
    else:
        summary.average_rating = avg_rating
        summary.total_responses = total_responses
        summary.faculty_count = faculty_count

    db.commit()


def refresh_college_summary(db: Session):
    result = db.query(
        func.avg(DepartmentSummary.average_rating).label("avg_rating"),
        func.sum(DepartmentSummary.total_responses).label("total_responses")
    ).filter(
        DepartmentSummary.total_responses > 0
    ).first()

    avg_rating = result.avg_rating or 0.0
    total_responses = result.total_responses or 0

    summary = db.query(CollegeSummary).first()
    if not summary:
        summary = CollegeSummary(
            average_rating=avg_rating,
            total_responses=total_responses
        )
        db.add(summary)
    else:
        summary.average_rating = avg_rating
        summary.total_responses = total_responses

    db.commit()


def rebuild_all_summaries(db: Session):
    """
    Utility function to rebuild all tables from scratch (useful for existing data).
    """
    # Find all unique combinations of faculty and subject
    combos = db.query(
        FeedbackSubmission.faculty_id,
        FeedbackSubmission.subject_id,
        FeedbackSubmission.department_id
    ).distinct().all()

    for combo in combos:
        refresh_faculty_subject_summary(db, combo.faculty_id, combo.subject_id, combo.department_id)

    # Find all departments
    depts = db.query(Department.id).all()
    for dept in depts:
        refresh_department_summary(db, dept.id)
        
    refresh_college_summary(db)
