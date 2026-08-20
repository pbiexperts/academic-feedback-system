from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import csv
from io import StringIO
from fastapi.responses import StreamingResponse

from app.api.dependencies import get_db
from app.core.permissions import require_faculty, require_hod, require_dean, require_admin, require_program_coordinator
from app.models.user import User, Faculty, Student, ProgramCoordinator
from app.models.academic import Subject, Department, FacultySubject, AcademicYear, Semester, Division
from app.models.feedback import FeedbackSubmission, FeedbackAnswer, FeedbackComment
from app.models.attendance import Attendance
from app.models.analytics_summary import FacultySubjectSummary, DepartmentSummary, CollegeSummary
from app.core.config import settings
from app.schemas.analytics import (
    FacultyDashboardResponse, HODDashboardResponse, DeanDashboardResponse,
    FacultyPerformanceBase, DepartmentPerformanceBase, FacultySuggestionsResponse
)

import re
from app.models.evaluation import EvaluationCycle

router = APIRouter()

def get_faculty_name(user: Optional[User], faculty: Optional[Faculty] = None) -> str:
    if not user:
        return "Faculty Member"
    if hasattr(user, 'name') and getattr(user, 'name'):
        return getattr(user, 'name')
    if hasattr(user, 'first_name') and getattr(user, 'first_name'):
        fn = getattr(user, 'first_name')
        ln = getattr(user, 'last_name', '') or ''
        return f"{fn} {ln}".strip()
    
    email = user.email if user.email else ""
    if "@" in email:
        username = email.split("@")[0]
        parts = username.split(".")
        if len(parts) >= 2:
            fac_part = parts[0].capitalize()
            dept_part = parts[1].upper()
            fac_formatted = re.sub(r'(\d+)', r' \1', fac_part)
            return f"Prof. {fac_formatted} ({dept_part})"
        elif username.startswith("faculty"):
            fac_formatted = re.sub(r'(\d+)', r' \1', username.capitalize())
            return f"Prof. {fac_formatted}"
        elif username.startswith("hod"):
            return f"Dr. HOD ({username.split('_')[-1].upper() if '_' in username else 'Dept'})"
        return username.capitalize()
    return email or "Faculty Member"

def apply_attendance_filter(query, attendance_band: Optional[str]):
    if not attendance_band:
        return query
    if attendance_band in ["60-69", "60–69"]:
        return query.filter(Attendance.attendance_percentage >= 60.0, Attendance.attendance_percentage < 70.0)
    elif attendance_band in ["70-79", "70–79"]:
        return query.filter(Attendance.attendance_percentage >= 70.0, Attendance.attendance_percentage < 80.0)
    elif attendance_band in ["80-89", "80–89"]:
        return query.filter(Attendance.attendance_percentage >= 80.0, Attendance.attendance_percentage < 90.0)
    elif attendance_band in ["90-100", "90–100"]:
        return query.filter(Attendance.attendance_percentage >= 90.0, Attendance.attendance_percentage <= 100.0)
    return query

def calculate_feedback_summary(
    db: Session,
    department_id: Optional[int] = None,
    academic_year_id: Optional[int] = None,
    semester_id: Optional[int] = None,
    division_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    faculty_id: Optional[int] = None,
    attendance_band: Optional[str] = None
) -> dict:
    query = db.query(FeedbackSubmission)
    if department_id:
        query = query.filter(FeedbackSubmission.department_id == department_id)

    if academic_year_id:
        query = query.join(EvaluationCycle, FeedbackSubmission.evaluation_cycle_id == EvaluationCycle.id)\
                     .filter(EvaluationCycle.academic_year_id == academic_year_id)
    if semester_id:
        query = query.join(Subject, FeedbackSubmission.subject_id == Subject.id)\
                     .filter(Subject.semester_id == semester_id)
    if subject_id:
        query = query.filter(FeedbackSubmission.subject_id == subject_id)
    if faculty_id:
        query = query.filter(FeedbackSubmission.faculty_id == faculty_id)

    if attendance_band:
        query = query.join(
            Attendance,
            (Attendance.student_id == FeedbackSubmission.student_id) &
            (Attendance.subject_id == FeedbackSubmission.subject_id)
        )
        query = apply_attendance_filter(query, attendance_band)

    submissions = query.all()

    att_query = db.query(Attendance.student_id).filter(
        Attendance.attendance_percentage >= 60.0
    )
    if department_id:
        att_query = att_query.filter(Attendance.department_id == department_id)
    if subject_id:
        att_query = att_query.filter(Attendance.subject_id == subject_id)
    if division_id:
        att_query = att_query.filter(Attendance.division_id == division_id)

    eligible_rows = att_query.distinct().all()
    eligible_student_ids = [r[0] for r in eligible_rows]
    total_eligible = len(eligible_student_ids)

    eligible_responses = 0
    if eligible_student_ids:
        subm_q = db.query(func.count(func.distinct(FeedbackSubmission.student_id))).filter(
            FeedbackSubmission.student_id.in_(eligible_student_ids)
        )
        if department_id:
            subm_q = subm_q.filter(FeedbackSubmission.department_id == department_id)
        if subject_id:
            subm_q = subm_q.filter(FeedbackSubmission.subject_id == subject_id)
        if faculty_id:
            subm_q = subm_q.filter(FeedbackSubmission.faculty_id == faculty_id)
        eligible_responses = subm_q.scalar() or 0

    total_responses = eligible_responses
    calculated_rate = (total_responses / total_eligible) * 100.0 if total_eligible > 0 else 0.0
    capped_rate = min(max(calculated_rate, 0.0), 100.0)
    response_rate = f"{round(capped_rate)}%"
    avg_rating = sum(s.overall_faculty_rating for s in submissions if s.overall_faculty_rating) / len(submissions) if submissions else 0.0

    analyzer = SentimentIntensityAnalyzer()
    pos_count, neu_count, neg_count, crit_count = 0, 0, 0, 0
    total_comments = 0

    for s in submissions:
        for c in s.comments:
            if c.comment_text and c.comment_text.strip():
                total_comments += 1
                score = analyzer.polarity_scores(c.comment_text)['compound']
                if score >= 0.05:
                    pos_count += 1
                elif score <= -0.05:
                    neg_count += 1
                    crit_count += 1
                else:
                    neu_count += 1

    pos_pct = f"{round((pos_count / total_comments) * 100)}%" if total_comments > 0 else "0%"
    neu_pct = f"{round((neu_count / total_comments) * 100)}%" if total_comments > 0 else "0%"
    neg_pct = f"{round((neg_count / total_comments) * 100)}%" if total_comments > 0 else "0%"

    fac_q = db.query(Faculty)
    if department_id:
        fac_q = fac_q.filter(Faculty.department_id == department_id)
    faculties = fac_q.all()

    faculty_ratings = []
    for f in faculties:
        f_subms = [s for s in submissions if s.faculty_id == f.id]
        f_avg = sum(s.overall_faculty_rating for s in f_subms if s.overall_faculty_rating) / len(f_subms) if f_subms else 0.0
        faculty_ratings.append({
            "faculty_id": f.id,
            "faculty_name": get_faculty_name(f.user, f),
            "faculty_email": f.user.email if f.user else f"Faculty {f.id}",
            "overall_rating": round(f_avg, 2),
            "response_count": len(f_subms)
        })

    sub_q = db.query(Subject)
    if department_id:
        sub_q = sub_q.filter(Subject.department_id == department_id)
    subjects = sub_q.all()

    subject_ratings = []
    for sub in subjects:
        s_subms = [s for s in submissions if s.subject_id == sub.id]
        s_avg = sum(s.overall_faculty_rating for s in s_subms if s.overall_faculty_rating) / len(s_subms) if s_subms else 0.0
        subject_ratings.append({
            "subject_id": sub.id,
            "subject_name": sub.name,
            "overall_rating": round(s_avg, 2),
            "response_count": len(s_subms)
        })

    departments = db.query(Department).all()
    department_ratings = []
    for dept in departments:
        if department_id and dept.id != department_id:
            continue
        d_subms = [s for s in submissions if s.department_id == dept.id]
        d_avg = sum(s.overall_faculty_rating for s in d_subms if s.overall_faculty_rating) / len(d_subms) if d_subms else 0.0
        department_ratings.append({
            "department_id": dept.id,
            "department_name": dept.name,
            "overall_rating": round(d_avg, 2),
            "response_count": len(d_subms)
        })

    bands = ["60-69", "70-79", "80-89", "90-100"]
    attendance_band_ratings = []
    for band in bands:
        b_query = db.query(FeedbackSubmission)
        if department_id:
            b_query = b_query.filter(FeedbackSubmission.department_id == department_id)
        b_query = b_query.join(
            Attendance,
            (Attendance.student_id == FeedbackSubmission.student_id) &
            (Attendance.subject_id == FeedbackSubmission.subject_id)
        )
        b_query = apply_attendance_filter(b_query, band)
        b_subms = b_query.all()
        b_avg = sum(s.overall_faculty_rating for s in b_subms if s.overall_faculty_rating) / len(b_subms) if b_subms else 0.0
        attendance_band_ratings.append({
            "band": f"{band}%",
            "average_rating": round(b_avg, 2),
            "count": len(b_subms)
        })

    return {
        "department_id": department_id,
        "total_eligible_students": total_eligible,
        "total_responses": total_responses,
        "response_rate": response_rate,
        "average_rating": round(avg_rating, 2),
        "positive_sentiment": pos_pct,
        "neutral_sentiment": neu_pct,
        "negative_sentiment": neg_pct,
        "critical_feedback": crit_count,
        "faculty_ratings": faculty_ratings,
        "subject_ratings": subject_ratings,
        "department_ratings": department_ratings,
        "sentiment_distribution": {
            "positive": pos_count,
            "neutral": neu_count,
            "negative": neg_count
        },
        "attendance_band_ratings": attendance_band_ratings,
        "trend": [{"cycle": "Current Cycle", "rating": round(avg_rating, 2)}],
        "response_rate_data": {
            "eligible_students": total_eligible,
            "submitted_responses": total_responses
        }
    }

# --- Program Coordinator Analytics ---
@router.get("/program-coordinator/feedback-summary")
def get_pc_feedback_summary(
    academic_year_id: Optional[int] = None,
    semester_id: Optional[int] = None,
    division_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    faculty_id: Optional[int] = None,
    attendance_band: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_program_coordinator)
):
    if current_user.role.name.upper() == "ADMIN":
        pc_profile = db.query(ProgramCoordinator).first()
    else:
        pc_profile = current_user.program_coordinator_profile

    if not pc_profile:
        raise HTTPException(status_code=400, detail="Program Coordinator profile not found")

    return calculate_feedback_summary(
        db=db, department_id=pc_profile.department_id,
        academic_year_id=academic_year_id, semester_id=semester_id,
        division_id=division_id, subject_id=subject_id,
        faculty_id=faculty_id, attendance_band=attendance_band
    )

# --- HOD Feedback Summary ---
@router.get("/hod/feedback-summary")
def get_hod_feedback_summary(
    academic_year_id: Optional[int] = None,
    semester_id: Optional[int] = None,
    division_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    faculty_id: Optional[int] = None,
    attendance_band: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hod)
):
    faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
    if not faculty:
        raise HTTPException(status_code=400, detail="HOD profile not found")
    return calculate_feedback_summary(
        db=db, department_id=faculty.department_id,
        academic_year_id=academic_year_id, semester_id=semester_id,
        division_id=division_id, subject_id=subject_id,
        faculty_id=faculty_id, attendance_band=attendance_band
    )

@router.get("/hod/subjects")
def get_hod_subjects(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hod)
):
    faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
    if not faculty:
        raise HTTPException(status_code=400, detail="HOD profile not found")
    subjects = db.query(Subject).filter(Subject.department_id == faculty.department_id).all()
    return [{"id": s.id, "code": s.code, "name": s.name} for s in subjects]

@router.get("/hod/faculty")
def get_hod_faculty(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hod)
):
    faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
    if not faculty:
        raise HTTPException(status_code=400, detail="HOD profile not found")
    faculties = db.query(Faculty).filter(Faculty.department_id == faculty.department_id).all()
    return [{"id": f.id, "email": f.user.email, "faculty_name": get_faculty_name(f.user, f)} for f in faculties]

# --- Dean Feedback Summary ---
@router.get("/dean/feedback-summary")
def get_dean_feedback_summary(
    department_id: Optional[int] = None,
    academic_year_id: Optional[int] = None,
    semester_id: Optional[int] = None,
    division_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    faculty_id: Optional[int] = None,
    attendance_band: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dean)
):
    return calculate_feedback_summary(
        db=db, department_id=department_id,
        academic_year_id=academic_year_id, semester_id=semester_id,
        division_id=division_id, subject_id=subject_id,
        faculty_id=faculty_id, attendance_band=attendance_band
    )

@router.get("/dean/subjects")
def get_dean_subjects(
    department_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dean)
):
    q = db.query(Subject)
    if department_id:
        q = q.filter(Subject.department_id == department_id)
    return [{"id": s.id, "code": s.code, "name": s.name} for s in q.all()]

@router.get("/dean/faculty")
def get_dean_faculty(
    department_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dean)
):
    q = db.query(Faculty)
    if department_id:
        q = q.filter(Faculty.department_id == department_id)
    return [{"id": f.id, "email": f.user.email, "faculty_name": get_faculty_name(f.user, f)} for f in q.all()]

# --- Faculty Analytics ---
@router.get("/faculty/dashboard")
def get_faculty_dashboard(
    attendance_band: Optional[str] = None,
    cycle_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_faculty)
):
    faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
    if not faculty:
        raise HTTPException(status_code=400, detail="Faculty profile not found")

    # Assigned subjects count
    assignments = db.query(FacultySubject).filter(FacultySubject.faculty_id == faculty.id).all()
    assigned_subject_ids = [a.subject_id for a in assignments]
    assigned_subjects_count = len(assigned_subject_ids)

    # Submissions query
    query = db.query(FeedbackSubmission).filter(FeedbackSubmission.faculty_id == faculty.id)
    if cycle_id:
        query = query.filter(FeedbackSubmission.evaluation_cycle_id == cycle_id)
    if attendance_band:
        query = query.join(
            Attendance,
            (Attendance.student_id == FeedbackSubmission.student_id) &
            (Attendance.subject_id == FeedbackSubmission.subject_id)
        )
        query = apply_attendance_filter(query, attendance_band)

    submissions = query.all()

    # Eligible students in assigned subjects (attendance >= 60%)
    eligible_student_ids = []
    if assigned_subject_ids:
        eligible_rows = db.query(Attendance.student_id).filter(
            Attendance.subject_id.in_(assigned_subject_ids),
            Attendance.attendance_percentage >= 60.0
        ).distinct().all()
        eligible_student_ids = [r[0] for r in eligible_rows]

    eligible_students = len(eligible_student_ids)

    # Count unique ELIGIBLE student submissions
    eligible_subms_count = 0
    if eligible_student_ids:
        subm_q = db.query(func.count(func.distinct(FeedbackSubmission.student_id))).filter(
            FeedbackSubmission.faculty_id == faculty.id,
            FeedbackSubmission.student_id.in_(eligible_student_ids)
        )
        if cycle_id:
            subm_q = subm_q.filter(FeedbackSubmission.evaluation_cycle_id == cycle_id)
        eligible_subms_count = subm_q.scalar() or 0

    total_responses = eligible_subms_count
    calculated_rate = (total_responses / eligible_students) * 100.0 if eligible_students > 0 else 0.0
    capped_rate = min(max(calculated_rate, 0.0), 100.0)
    response_rate = f"{round(capped_rate)}%"

    overall_rating = sum(s.overall_faculty_rating for s in submissions if s.overall_faculty_rating) / len(submissions) if submissions else 0.0

    analyzer = SentimentIntensityAnalyzer()
    pos_count, neg_count, crit_count = 0, 0, 0
    total_comments = 0
    for s in submissions:
        for c in s.comments:
            if c.comment_text and c.comment_text.strip():
                total_comments += 1
                score = analyzer.polarity_scores(c.comment_text)['compound']
                if score >= 0.05:
                    pos_count += 1
                elif score <= -0.05:
                    neg_count += 1
                    crit_count += 1

    pos_pct = f"{round((pos_count / total_comments) * 100)}%" if total_comments > 0 else "0%"
    neg_pct = f"{round((neg_count / total_comments) * 100)}%" if total_comments > 0 else "0%"

    # Group by subject performance
    subject_map = {}
    for s in submissions:
        if s.subject_id not in subject_map:
            subject_map[s.subject_id] = []
        if s.overall_faculty_rating:
            subject_map[s.subject_id].append(s.overall_faculty_rating)

    performance = []
    for sub_id, ratings in subject_map.items():
        sub = db.query(Subject).filter(Subject.id == sub_id).first()
        performance.append({
            "faculty_id": faculty.id,
            "subject_id": sub_id,
            "subject_name": sub.name if sub else f"Subject {sub_id}",
            "overall_rating": round(sum(ratings) / len(ratings), 2) if ratings else 0.0,
            "response_count": len(ratings),
            "response_rate": 100.0
        })

    return {
        "assigned_subjects_count": assigned_subjects_count,
        "eligible_students": eligible_students,
        "overall_rating": round(overall_rating, 2),
        "total_responses": total_responses,
        "response_rate": response_rate,
        "positive_sentiment_pct": pos_pct,
        "negative_sentiment_pct": neg_pct,
        "critical_feedback_count": crit_count,
        "subjects_evaluated": len(subject_map),
        "performance": performance
    }

@router.get("/faculty/subject-performance")
def get_faculty_subject_performance(
    subject_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_faculty)
):
    faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
    if not faculty:
        raise HTTPException(status_code=400, detail="Faculty profile not found")

    assignments = db.query(FacultySubject).filter(FacultySubject.faculty_id == faculty.id).all()
    assigned_subject_ids = [a.subject_id for a in assignments]

    if not assigned_subject_ids:
        return {
            "subjects": [],
            "selected_subject": None,
            "question_ratings": [],
            "attendance_ratings": [],
            "sentiment_distribution": {"positive": 0, "neutral": 0, "negative": 0},
            "rating_trend": [],
            "response_rate_data": {"eligible": 0, "responses": 0}
        }

    subjects = db.query(Subject).filter(Subject.id.in_(assigned_subject_ids)).all()
    subjects_list = [{"id": s.id, "name": s.name, "code": s.code} for s in subjects]

    target_subject_id = subject_id if (subject_id and subject_id in assigned_subject_ids) else assigned_subject_ids[0]
    target_subject = db.query(Subject).filter(Subject.id == target_subject_id).first()

    submissions = db.query(FeedbackSubmission).filter(
        FeedbackSubmission.faculty_id == faculty.id,
        FeedbackSubmission.subject_id == target_subject_id
    ).all()

    # Question-wise ratings
    question_map = {}
    for s in submissions:
        for ans in s.answers:
            if ans.question and ans.question.question_type == "rating" and ans.rating:
                q_text = ans.question.text
                if q_text not in question_map:
                    question_map[q_text] = []
                question_map[q_text].append(ans.rating)

    question_ratings = [
        {"question": q, "rating": round(sum(r) / len(r), 2)}
        for q, r in question_map.items()
    ]

    bands = ["60-69", "70-79", "80-89", "90-100"]
    attendance_ratings = []
    for band in bands:
        b_query = db.query(FeedbackSubmission).filter(
            FeedbackSubmission.faculty_id == faculty.id,
            FeedbackSubmission.subject_id == target_subject_id
        ).join(
            Attendance,
            (Attendance.student_id == FeedbackSubmission.student_id) &
            (Attendance.subject_id == FeedbackSubmission.subject_id)
        )
        b_query = apply_attendance_filter(b_query, band)
        b_subms = b_query.all()
        b_avg = sum(s.overall_faculty_rating for s in b_subms if s.overall_faculty_rating) / len(b_subms) if b_subms else 0.0
        attendance_ratings.append({"band": f"{band}%", "rating": round(b_avg, 2)})

    analyzer = SentimentIntensityAnalyzer()
    pos_c, neu_c, neg_c = 0, 0, 0
    for s in submissions:
        for c in s.comments:
            if c.comment_text:
                sc = analyzer.polarity_scores(c.comment_text)['compound']
                if sc >= 0.05: pos_c += 1
                elif sc <= -0.05: neg_c += 1
                else: neu_c += 1

    eligible_rows = db.query(Attendance.student_id).filter(
        Attendance.subject_id == target_subject_id,
        Attendance.attendance_percentage >= 60.0
    ).distinct().all()
    eligible_student_ids = [r[0] for r in eligible_rows]
    eligible_students = len(eligible_student_ids)

    eligible_subms_count = 0
    if eligible_student_ids:
        eligible_subms_count = db.query(func.count(func.distinct(FeedbackSubmission.student_id))).filter(
            FeedbackSubmission.faculty_id == faculty.id,
            FeedbackSubmission.subject_id == target_subject_id,
            FeedbackSubmission.student_id.in_(eligible_student_ids)
        ).scalar() or 0

    total_responses = eligible_subms_count
    calculated_rate = (total_responses / eligible_students) * 100.0 if eligible_students > 0 else 0.0
    capped_rate = min(max(calculated_rate, 0.0), 100.0)
    response_rate = f"{round(capped_rate)}%"
    avg_rating = sum(s.overall_faculty_rating for s in submissions if s.overall_faculty_rating) / len(submissions) if submissions else 0.0

    ay_obj = db.query(AcademicYear).filter(AcademicYear.id == target_subject.semester.academic_year_id).first() if (target_subject and target_subject.semester) else None

    return {
        "subjects": subjects_list,
        "selected_subject": {
            "id": target_subject.id,
            "name": target_subject.name,
            "code": target_subject.code,
            "semester": target_subject.semester.name if target_subject.semester else "N/A",
            "academic_year": ay_obj.name if ay_obj else "N/A",
            "faculty": current_user.email,
            "eligible_students": eligible_students,
            "responses": total_responses,
            "response_rate": response_rate,
            "average_rating": round(avg_rating, 2)
        },
        "question_ratings": question_ratings,
        "attendance_ratings": attendance_ratings,
        "sentiment_distribution": {"positive": pos_c, "neutral": neu_c, "negative": neg_c},
        "rating_trend": [{"cycle": "Current Cycle", "rating": round(avg_rating, 2)}],
        "response_rate_data": {"eligible": eligible_students, "responses": total_responses}
    }

@router.get("/faculty/suggestions")
def get_faculty_suggestions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_faculty)
):
    faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
    if not faculty:
        raise HTTPException(status_code=400, detail="Faculty profile not found")

    submissions = db.query(FeedbackSubmission).filter(
        FeedbackSubmission.faculty_id == faculty.id
    ).all()

    total_responses = len(submissions)
    if total_responses < settings.MINIMUM_RESPONSES_FOR_ANALYTICS:
        return {"is_masked": True, "suggestions": []}

    suggestions = []
    analyzer = SentimentIntensityAnalyzer()

    def get_sentiment_and_cat(score: float):
        if score >= 0.05:
            return "Positive", "Positive"
        elif score <= -0.5:
            return "Negative", "Critical"
        elif score <= -0.05:
            return "Negative", "Needs Improvement"
        else:
            return "Neutral", "General Suggestion"

    for s in submissions:
        subject = db.query(Subject).filter(Subject.id == s.subject_id).first()
        subject_name = subject.name if subject else "Unknown Subject"
        cycle_name = s.evaluation_cycle.name if s.evaluation_cycle else "Current Cycle"
        submitted_date = s.submitted_at.isoformat() if s.submitted_at else "N/A"

        for answer in s.answers:
            if answer.text_answer and answer.text_answer.strip():
                text = answer.text_answer.strip()
                score = analyzer.polarity_scores(text)['compound']
                sentiment, category = get_sentiment_and_cat(score)
                suggestions.append({
                    "subject_name": subject_name,
                    "suggestion_type": "text_answer",
                    "comment_text": text,
                    "text": text,
                    "sentiment": sentiment,
                    "category": category,
                    "cycle_name": cycle_name,
                    "date": submitted_date
                })

        for comment in s.comments:
            if comment.comment_text and comment.comment_text.strip():
                text = comment.comment_text.strip()
                score = analyzer.polarity_scores(text)['compound']
                sentiment, category = get_sentiment_and_cat(score)
                suggestions.append({
                    "subject_name": subject_name,
                    "suggestion_type": comment.comment_type,
                    "comment_text": text,
                    "text": text,
                    "sentiment": sentiment,
                    "category": category,
                    "cycle_name": cycle_name,
                    "date": submitted_date
                })

    return {"is_masked": False, "suggestions": suggestions}

# --- HOD Analytics ---
@router.get("/hod/dashboard")
def get_hod_dashboard(
    attendance_band: Optional[str] = None,
    cycle_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hod)
):
    faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
    if not faculty:
        raise HTTPException(status_code=400, detail="HOD profile not found")

    department_id = faculty.department_id
    dept = db.query(Department).filter(Department.id == department_id).first()
    department_name = dept.name if dept else f"Department {department_id}"
    total_students = db.query(Student).filter(Student.department_id == department_id).count()

    eligible_rows = db.query(Attendance.student_id).filter(
        Attendance.department_id == department_id,
        Attendance.attendance_percentage >= 60.0
    ).distinct().all()
    eligible_student_ids = [r[0] for r in eligible_rows]
    eligible_students = len(eligible_student_ids)

    query = db.query(FeedbackSubmission).filter(FeedbackSubmission.department_id == department_id)
    if cycle_id:
        query = query.filter(FeedbackSubmission.evaluation_cycle_id == cycle_id)

    if attendance_band:
        query = query.join(
            Attendance,
            (Attendance.student_id == FeedbackSubmission.student_id) &
            (Attendance.subject_id == FeedbackSubmission.subject_id)
        )
        query = apply_attendance_filter(query, attendance_band)

    submissions = query.all()

    # Calculate total_responses as unique eligible student submissions in department
    eligible_responses = 0
    if eligible_student_ids:
        subm_q = db.query(func.count(func.distinct(FeedbackSubmission.student_id))).filter(
            FeedbackSubmission.department_id == department_id,
            FeedbackSubmission.student_id.in_(eligible_student_ids)
        )
        if cycle_id:
            subm_q = subm_q.filter(FeedbackSubmission.evaluation_cycle_id == cycle_id)
        eligible_responses = subm_q.scalar() or 0

    total_responses = eligible_responses if eligible_responses > 0 else len(submissions)
    overall_rating = sum(s.overall_faculty_rating for s in submissions if s.overall_faculty_rating) / len(submissions) if submissions else 0.0

    combos = {}
    for s in submissions:
        key = (s.faculty_id, s.subject_id)
        if key not in combos:
            combos[key] = []
        if s.overall_faculty_rating:
            combos[key].append(s.overall_faculty_rating)

    faculty_performance = []
    for (fac_id, sub_id), ratings in combos.items():
        fac = db.query(Faculty).filter(Faculty.id == fac_id).first()
        usr = db.query(User).filter(User.id == fac.user_id).first() if fac else None
        sub = db.query(Subject).filter(Subject.id == sub_id).first()

        faculty_performance.append({
            "faculty_id": fac_id,
            "faculty_name": get_faculty_name(usr, fac),
            "subject_id": sub_id,
            "subject_name": sub.name if sub else f"Subject {sub_id}",
            "overall_rating": round(sum(ratings) / len(ratings), 2) if ratings else 0.0,
            "response_count": len(ratings),
            "response_rate": 100.0
        })

    return {
        "department_id": department_id,
        "department_name": department_name,
        "total_students": total_students,
        "eligible_students": eligible_students,
        "overall_rating": round(overall_rating, 2),
        "total_responses": total_responses,
        "faculty_performance": faculty_performance
    }

@router.get("/hod/critical-comments")
def get_hod_critical_comments(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hod)
):
    faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
    if not faculty:
        raise HTTPException(status_code=400, detail="HOD profile not found")

    dept_id = faculty.department_id
    submissions = db.query(FeedbackSubmission).filter(FeedbackSubmission.department_id == dept_id).all()

    total_responses = len(submissions)
    if total_responses < settings.MINIMUM_RESPONSES_FOR_ANALYTICS:
        return []

    analyzer = SentimentIntensityAnalyzer()
    critical_comments = []

    for s in submissions:
        fac_user = s.faculty.user if s.faculty else None
        fac_email = fac_user.email if fac_user else "Faculty"
        subject_name = s.subject.name if s.subject else "Subject"

        for comment in s.comments:
            if comment.comment_text and comment.comment_text.strip():
                text = comment.comment_text.strip()
                score = analyzer.polarity_scores(text)['compound']

                if score <= -0.05:
                    cat = "Needs Improvement"
                    if score <= -0.5:
                        cat = "Serious Concern"
                    elif score <= -0.3:
                        cat = "Critical"

                    critical_comments.append({
                        "faculty": fac_email,
                        "subject": subject_name,
                        "comment_category": cat,
                        "comment_text": text,
                        "sentiment": score,
                        "date": s.submitted_at.isoformat() if s.submitted_at else "N/A"
                    })

    return critical_comments


# --- Dean Analytics ---
@router.get("/dean/dashboard")
def get_dean_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dean)
):
    submissions = db.query(FeedbackSubmission).all()
    total_responses = len(submissions)
    college_rating = sum(s.overall_faculty_rating for s in submissions if s.overall_faculty_rating) / total_responses if total_responses > 0 else 0.0

    departments = db.query(Department).all()
    departments_count = len(departments)

    analyzer = SentimentIntensityAnalyzer()
    pos_count, crit_count, total_comments = 0, 0, 0
    for s in submissions:
        for c in s.comments:
            if c.comment_text:
                total_comments += 1
                score = analyzer.polarity_scores(c.comment_text)['compound']
                if score >= 0.05: pos_count += 1
                elif score <= -0.05: crit_count += 1

    pos_pct = f"{round((pos_count / total_comments) * 100)}%" if total_comments > 0 else "0%"
    crit_pct = f"{round((crit_count / total_comments) * 100)}%" if total_comments > 0 else "0%"

    total_students = db.query(Student).count()
    distinct_submitted = db.query(func.count(func.distinct(FeedbackSubmission.student_id))).scalar() or 0
    response_rate = f"{round((distinct_submitted / total_students) * 100)}%" if total_students > 0 else "0%"

    department_performance = []
    performance_summary = []

    for rank, dept in enumerate(departments, start=1):
        d_subms = [s for s in submissions if s.department_id == dept.id]
        d_count = len(d_subms)
        d_avg = sum(s.overall_faculty_rating for s in d_subms if s.overall_faculty_rating) / d_count if d_count > 0 else 0.0
        f_count = db.query(Faculty).filter(Faculty.department_id == dept.id).count()
        d_students = db.query(Student).filter(Student.department_id == dept.id).count()
        d_distinct = db.query(func.count(func.distinct(FeedbackSubmission.student_id))).filter(FeedbackSubmission.department_id == dept.id).scalar() or 0
        d_rate = f"{round((d_distinct / d_students) * 100)}%" if d_students > 0 else "0%"

        if d_avg >= 4.0: status = "Excellent"
        elif d_avg >= 3.5: status = "Good"
        elif d_avg >= 3.0: status = "Monitor"
        else: status = "Needs Improvement"

        dept_perf = {
            "department_id": dept.id,
            "department_name": dept.name,
            "overall_rating": round(d_avg, 2),
            "total_responses": d_count,
            "faculty_count": f_count,
            "response_rate": d_rate,
            "positive_sentiment": pos_pct,
            "critical_feedback": crit_pct,
            "status": status
        }
        department_performance.append(dept_perf)

        performance_summary.append({
            "rank": rank,
            "department": dept.name,
            "department_name": dept.name,
            "rating": round(d_avg, 2),
            "response_rate": d_rate,
            "performance": status,
            "status": status
        })

    return {
        "college_rating": round(college_rating, 2),
        "total_responses": total_responses,
        "departments_count": departments_count,
        "departments": departments_count,
        "response_rate": response_rate,
        "positive_sentiment": pos_pct,
        "critical_feedback": crit_pct,
        "department_performance": department_performance,
        "performance_summary": performance_summary
    }

@router.get("/dean/departments")
def get_dean_departments(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dean)
):
    departments = db.query(Department).all()
    analyzer = SentimentIntensityAnalyzer()
    res = []

    for dept in departments:
        hod_fac = db.query(Faculty).filter(Faculty.department_id == dept.id, Faculty.employee_id.like("HOD%")).first()
        hod_name = hod_fac.user.email if hod_fac and hod_fac.user else "N/A"

        pc = db.query(ProgramCoordinator).filter(ProgramCoordinator.department_id == dept.id).first()
        pc_name = pc.user.email if pc and pc.user else "N/A"

        fac_count = db.query(Faculty).filter(Faculty.department_id == dept.id).count()
        stu_count = db.query(Student).filter(Student.department_id == dept.id).count()
        sub_count = db.query(Subject).filter(Subject.department_id == dept.id).count()

        submissions = db.query(FeedbackSubmission).filter(FeedbackSubmission.department_id == dept.id).all()
        total_responses = len(submissions)
        avg_rating = sum(s.overall_faculty_rating for s in submissions if s.overall_faculty_rating) / total_responses if total_responses > 0 else 0.0

        pos_count, crit_count, total_comments = 0, 0, 0
        for s in submissions:
            for c in s.comments:
                if c.comment_text:
                    total_comments += 1
                    score = analyzer.polarity_scores(c.comment_text)['compound']
                    if score >= 0.05: pos_count += 1
                    elif score <= -0.05: crit_count += 1

        pos_pct = f"{round((pos_count / total_comments) * 100)}%" if total_comments > 0 else "0%"
        crit_pct = f"{round((crit_count / total_comments) * 100)}%" if total_comments > 0 else "0%"

        distinct_submitted = db.query(func.count(func.distinct(FeedbackSubmission.student_id))).filter(
            FeedbackSubmission.department_id == dept.id
        ).scalar() or 0
        response_rate = f"{round((distinct_submitted / stu_count) * 100)}%" if stu_count > 0 else "0%"

        res.append({
            "id": dept.id,
            "name": dept.name,
            "code": dept.code,
            "hod": hod_name,
            "program_coordinator": pc_name,
            "faculty_count": fac_count,
            "student_count": stu_count,
            "subject_count": sub_count,
            "average_rating": round(avg_rating, 2),
            "response_rate": response_rate,
            "positive_sentiment": pos_pct,
            "critical_feedback": crit_pct
        })

    return res

@router.get("/dean/department-details/{dept_id}")
def get_dean_department_details(
    dept_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dean)
):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    submissions = db.query(FeedbackSubmission).filter(FeedbackSubmission.department_id == dept_id).all()
    total_responses = len(submissions)
    avg_rating = sum(s.overall_faculty_rating for s in submissions if s.overall_faculty_rating) / total_responses if total_responses > 0 else 0.0

    fac_count = db.query(Faculty).filter(Faculty.department_id == dept_id).count()
    stu_count = db.query(Student).filter(Student.department_id == dept_id).count()
    sub_count = db.query(Subject).filter(Subject.department_id == dept_id).count()

    faculties = db.query(Faculty).filter(Faculty.department_id == dept_id).all()
    faculty_performance = []
    for f in faculties:
        f_subms = [s for s in submissions if s.faculty_id == f.id]
        f_avg = sum(s.overall_faculty_rating for s in f_subms if s.overall_faculty_rating) / len(f_subms) if f_subms else 0.0
        faculty_performance.append({
            "faculty_name": f.user.email if f.user else f"Faculty {f.id}",
            "average_rating": round(f_avg, 2)
        })

    subjects = db.query(Subject).filter(Subject.department_id == dept_id).all()
    subject_performance = []
    for sub in subjects:
        s_subms = [s for s in submissions if s.subject_id == sub.id]
        s_avg = sum(s.overall_faculty_rating for s in s_subms if s.overall_faculty_rating) / len(s_subms) if s_subms else 0.0
        subject_performance.append({
            "subject_name": sub.name,
            "average_rating": round(s_avg, 2)
        })

    analyzer = SentimentIntensityAnalyzer()
    pos_c, neu_c, neg_c = 0, 0, 0
    for s in submissions:
        for c in s.comments:
            if c.comment_text:
                score = analyzer.polarity_scores(c.comment_text)['compound']
                if score >= 0.05: pos_c += 1
                elif score <= -0.05: neg_c += 1
                else: neu_c += 1

    bands = ["60-69", "70-79", "80-89", "90-100"]
    attendance_ratings = []
    for band in bands:
        b_query = db.query(FeedbackSubmission).filter(FeedbackSubmission.department_id == dept_id).join(
            Attendance,
            (Attendance.student_id == FeedbackSubmission.student_id) &
            (Attendance.subject_id == FeedbackSubmission.subject_id)
        )
        b_query = apply_attendance_filter(b_query, band)
        b_subms = b_query.all()
        b_avg = sum(s.overall_faculty_rating for s in b_subms if s.overall_faculty_rating) / len(b_subms) if b_subms else 0.0
        attendance_ratings.append({"band": f"{band}%", "rating": round(b_avg, 2)})

    distinct_submitted = db.query(func.count(func.distinct(FeedbackSubmission.student_id))).filter(
        FeedbackSubmission.department_id == dept_id
    ).scalar() or 0
    response_rate = f"{round((distinct_submitted / stu_count) * 100)}%" if stu_count > 0 else "0%"

    return {
        "department_name": dept.name,
        "average_rating": round(avg_rating, 2),
        "response_rate": response_rate,
        "faculty_count": fac_count,
        "student_count": stu_count,
        "subject_count": sub_count,
        "critical_feedback": neg_c,
        "faculty_performance": faculty_performance,
        "subject_performance": subject_performance,
        "sentiment_distribution": {"positive": pos_c, "neutral": neu_c, "negative": neg_c},
        "attendance_ratings": attendance_ratings,
        "trend": [{"cycle": "Current Cycle", "rating": round(avg_rating, 2)}]
    }

@router.get("/dean/department-comparison")
def get_dean_department_comparison(
    cycle_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dean)
):
    departments = db.query(Department).all()
    analyzer = SentimentIntensityAnalyzer()
    comparison = []

    for dept in departments:
        query = db.query(FeedbackSubmission).filter(FeedbackSubmission.department_id == dept.id)
        if cycle_id:
            query = query.filter(FeedbackSubmission.evaluation_cycle_id == cycle_id)

        submissions = query.all()
        total_responses = len(submissions)

        if total_responses == 0:
            comparison.append({
                "department_id": dept.id,
                "department_name": dept.name,
                "average_rating": 0.0,
                "response_rate": "0%",
                "positive_sentiment": "0%",
                "critical_feedback": "0%"
            })
            continue

        avg_rating = sum(s.overall_faculty_rating for s in submissions if s.overall_faculty_rating) / total_responses

        pos_count, crit_count, total_comments = 0, 0, 0
        for s in submissions:
            for c in s.comments:
                if c.comment_text:
                    total_comments += 1
                    score = analyzer.polarity_scores(c.comment_text)['compound']
                    if score >= 0.05: pos_count += 1
                    elif score <= -0.05: crit_count += 1

        pos_pct = f"{round((pos_count / total_comments) * 100)}%" if total_comments > 0 else "0%"
        crit_pct = f"{round((crit_count / total_comments) * 100)}%" if total_comments > 0 else "0%"

        distinct_students_submitted = db.query(func.count(func.distinct(FeedbackSubmission.student_id))).filter(
            FeedbackSubmission.department_id == dept.id
        ).scalar() or 0

        total_students_dept = db.query(Student).filter(Student.department_id == dept.id).count()
        response_rate = f"{round((distinct_students_submitted / total_students_dept) * 100)}%" if total_students_dept > 0 else "0%"

        comparison.append({
            "department_id": dept.id,
            "department_name": dept.name,
            "average_rating": round(avg_rating, 2),
            "response_rate": response_rate,
            "positive_sentiment": pos_pct,
            "critical_feedback": crit_pct
        })

    return comparison

@router.get("/dean/hod-performance")
def get_dean_hod_performance(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dean)
):
    from app.models.user import Role
    hod_role = db.query(Role).filter(Role.name == "HOD").first()
    if not hod_role:
        return []

    hod_users = db.query(User).filter(User.role_id == hod_role.id).all()
    res = []
    analyzer = SentimentIntensityAnalyzer()

    for user in hod_users:
        fac = db.query(Faculty).filter(Faculty.user_id == user.id).first()
        if not fac or not fac.department:
            continue
        dept = fac.department

        submissions = db.query(FeedbackSubmission).filter(FeedbackSubmission.department_id == dept.id).all()
        total_responses = len(submissions)
        avg_rating = sum(s.overall_faculty_rating for s in submissions if s.overall_faculty_rating) / total_responses if total_responses > 0 else 0.0

        total_subjects = db.query(Subject).filter(Subject.department_id == dept.id).count()
        allocated_subjects = db.query(func.count(func.distinct(FacultySubject.subject_id))).join(Subject).filter(
            Subject.department_id == dept.id
        ).scalar() or 0
        coverage = f"{round((allocated_subjects / total_subjects) * 100)}%" if total_subjects > 0 else "0%"

        pos_count, crit_count, total_comments = 0, 0, 0
        for s in submissions:
            for c in s.comments:
                if c.comment_text:
                    total_comments += 1
                    score = analyzer.polarity_scores(c.comment_text)['compound']
                    if score >= 0.05: pos_count += 1
                    elif score <= -0.05: crit_count += 1

        crit_pct = f"{round((crit_count / total_comments) * 100)}%" if total_comments > 0 else "0%"
        pos_pct = f"{round((pos_count / total_comments) * 100)}%" if total_comments > 0 else "0%"

        distinct_submitted = db.query(func.count(func.distinct(FeedbackSubmission.student_id))).filter(
            FeedbackSubmission.department_id == dept.id
        ).scalar() or 0
        total_students_dept = db.query(Student).filter(Student.department_id == dept.id).count()
        response_rate = f"{round((distinct_submitted / total_students_dept) * 100)}%" if total_students_dept > 0 else "0%"

        res.append({
            "hod_name": user.email,
            "department_name": dept.name,
            "average_rating": round(avg_rating, 2),
            "response_rate": response_rate,
            "critical_feedback": crit_pct,
            "positive_sentiment": pos_pct,
            "faculty_coverage": coverage
        })

    return res

@router.get("/dean/faculty-summary")
def get_dean_faculty_summary(
    department_id: Optional[int] = None,
    academic_year_id: Optional[int] = None,
    semester_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dean)
):
    query = db.query(Department)
    if department_id:
        query = query.filter(Department.id == department_id)
    departments = query.all()

    res = []
    for dept in departments:
        sub_query = db.query(FeedbackSubmission).filter(FeedbackSubmission.department_id == dept.id)
        if academic_year_id or semester_id:
            sub_query = sub_query.join(Subject, Subject.id == FeedbackSubmission.subject_id)
            if semester_id:
                sub_query = sub_query.filter(Subject.semester_id == semester_id)

        submissions = sub_query.all()
        d_responses = len(submissions)
        avg_rating = sum(s.overall_faculty_rating for s in submissions if s.overall_faculty_rating) / d_responses if d_responses > 0 else 0.0
        f_count = db.query(Faculty).filter(Faculty.department_id == dept.id).count()

        if avg_rating >= 4.0: status = "Excellent"
        elif avg_rating >= 3.5: status = "Good"
        elif avg_rating >= 3.0: status = "Monitor"
        else: status = "Needs Improvement"

        res.append({
            "department_id": dept.id,
            "department_name": dept.name,
            "overall_rating": round(avg_rating, 2),
            "total_responses": d_responses,
            "faculty_count": f_count,
            "performance": status
        })

    return res

@router.get("/dean/export")
def export_dean_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dean)
):
    submissions = db.query(FeedbackSubmission).all()
    total_responses = len(submissions)
    if total_responses < settings.MINIMUM_RESPONSES_FOR_ANALYTICS:
        raise HTTPException(status_code=400, detail="Insufficient responses to generate report")

    dept_map = {}
    for s in submissions:
        if s.department_id not in dept_map:
            dept_map[s.department_id] = {"total_rating": 0, "count": 0, "faculty": set()}
        if s.overall_faculty_rating:
            dept_map[s.department_id]["total_rating"] += s.overall_faculty_rating
            dept_map[s.department_id]["count"] += 1
            dept_map[s.department_id]["faculty"].add(s.faculty_id)

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["Department ID", "Department Name", "Overall Rating", "Total Responses", "Faculty Count"])

    for dept_id, data in dept_map.items():
        if data["count"] > 0:
            dept = db.query(Department).filter(Department.id == dept_id).first()
            dept_name = dept.name if dept else f"Dept {dept_id}"
            avg_rating = round(data["total_rating"] / data["count"], 2)
            writer.writerow([dept_id, dept_name, avg_rating, data["count"], len(data["faculty"])])

    output.seek(0)
    response = StreamingResponse(iter([output.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=college_analytics_report.csv"
    return response
