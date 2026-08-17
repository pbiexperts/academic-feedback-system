from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import csv
from io import StringIO
from fastapi.responses import StreamingResponse
from fastapi_cache.decorator import cache
from app.api.dependencies import get_db
from app.core.permissions import require_faculty, require_hod, require_dean, require_admin
from app.models.user import User, Faculty, Student
from app.models.academic import Subject, Department
from app.models.feedback import FeedbackSubmission
from app.core.config import settings
from app.schemas.analytics import FacultyDashboardResponse, HODDashboardResponse, DeanDashboardResponse, FacultyPerformanceBase, DepartmentPerformanceBase, FacultySuggestionsResponse

router = APIRouter()

# --- Faculty Analytics ---
@router.get("/faculty/dashboard", response_model=FacultyDashboardResponse)
def get_faculty_dashboard(
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
        return FacultyDashboardResponse(
            overall_rating=0.0,
            total_responses=total_responses,
            subjects_evaluated=0,
            performance=[]
        ) # Mask details if threshold not met

    overall_rating = sum(s.overall_faculty_rating for s in submissions if s.overall_faculty_rating) / total_responses if total_responses else 0.0
    
    # Compute performance per subject
    subject_map = {}
    for s in submissions:
        if s.subject_id not in subject_map:
            subject_map[s.subject_id] = {"total_rating": 0, "count": 0}
        if s.overall_faculty_rating:
            subject_map[s.subject_id]["total_rating"] += s.overall_faculty_rating
            subject_map[s.subject_id]["count"] += 1
            
    performance = []
    for subject_id, data in subject_map.items():
        if data["count"] > 0:
            subject = db.query(Subject).filter(Subject.id == subject_id).first()
            subject_name = subject.name if subject else f"Subject {subject_id}"
            performance.append(FacultyPerformanceBase(
                faculty_id=faculty.id,
                subject_id=subject_id,
                subject_name=subject_name,
                overall_rating=data["total_rating"] / data["count"],
                response_count=data["count"],
                response_rate=80.0 # Mock response rate
            ))

    return FacultyDashboardResponse(
        overall_rating=overall_rating,
        total_responses=total_responses,
        subjects_evaluated=len(subject_map),
        performance=performance
    )

@router.get("/faculty/suggestions", response_model=FacultySuggestionsResponse)
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
        return FacultySuggestionsResponse(is_masked=True, suggestions=[])
        
    suggestions = []
    analyzer = SentimentIntensityAnalyzer()
    
    def get_sentiment(text: str) -> str:
        score = analyzer.polarity_scores(text)['compound']
        if score >= 0.05:
            return "Positive"
        elif score <= -0.05:
            return "Negative"
        else:
            return "Neutral"
    
    for s in submissions:
        subject = db.query(Subject).filter(Subject.id == s.subject_id).first()
        subject_name = subject.name if subject else "Unknown Subject"
        
        # Add text answers
        for answer in s.answers:
            if answer.text_answer and answer.text_answer.strip():
                text = answer.text_answer.strip()
                suggestions.append({
                    "subject_name": subject_name,
                    "suggestion_type": "text_answer",
                    "text": text,
                    "sentiment": get_sentiment(text)
                })
                
        # Add comments
        for comment in s.comments:
            if comment.comment_text and comment.comment_text.strip():
                text = comment.comment_text.strip()
                suggestions.append({
                    "subject_name": subject_name,
                    "suggestion_type": comment.comment_type,
                    "text": text,
                    "sentiment": get_sentiment(text)
                })
                
    return FacultySuggestionsResponse(is_masked=False, suggestions=suggestions)

# --- HOD Analytics ---
@router.get("/hod/dashboard", response_model=HODDashboardResponse)
@cache(expire=3600)
async def get_hod_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hod)
):
    faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
    if not faculty:
        raise HTTPException(status_code=400, detail="HOD profile not found")
        
    department_id = faculty.department_id

    # Strictly scope to department_id
    submissions = db.query(FeedbackSubmission).filter(
        FeedbackSubmission.department_id == department_id
    ).all()

    total_responses = len(submissions)
    overall_rating = sum(s.overall_faculty_rating for s in submissions if s.overall_faculty_rating) / total_responses if total_responses else 0.0

    # Compute faculty performance in the department
    faculty_map = {}
    for s in submissions:
        if s.faculty_id not in faculty_map:
            faculty_map[s.faculty_id] = {"total_rating": 0, "count": 0}
        if s.overall_faculty_rating:
            faculty_map[s.faculty_id]["total_rating"] += s.overall_faculty_rating
            faculty_map[s.faculty_id]["count"] += 1
            
    faculty_performance = []
    for faculty_id, data in faculty_map.items():
        if data["count"] >= settings.MINIMUM_RESPONSES_FOR_ANALYTICS:
            faculty_performance.append(FacultyPerformanceBase(
                faculty_id=faculty_id,
                subject_id=0, # Aggregate across subjects
                overall_rating=data["total_rating"] / data["count"],
                response_count=data["count"],
                response_rate=80.0
            ))

    return HODDashboardResponse(
        department_id=department_id,
        overall_rating=overall_rating,
        total_responses=total_responses,
        faculty_performance=faculty_performance
    )

# --- Dean Analytics ---
@router.get("/dean/dashboard", response_model=DeanDashboardResponse)
@cache(expire=3600)
async def get_dean_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dean)
):
    submissions = db.query(FeedbackSubmission).all()
    
    total_responses = len(submissions)
    college_rating = sum(s.overall_faculty_rating for s in submissions if s.overall_faculty_rating) / total_responses if total_responses else 0.0

    # Compute department performance
    dept_map = {}
    faculty_by_dept = {}
    for s in submissions:
        dept_id = s.department_id
        if dept_id not in dept_map:
            dept_map[dept_id] = {"total_rating": 0, "count": 0}
            faculty_by_dept[dept_id] = set()
            
        if s.overall_faculty_rating:
            dept_map[dept_id]["total_rating"] += s.overall_faculty_rating
            dept_map[dept_id]["count"] += 1
        faculty_by_dept[dept_id].add(s.faculty_id)

    department_performance = []
    for dept_id, data in dept_map.items():
        if data["count"] > 0:
            department_performance.append(DepartmentPerformanceBase(
                department_id=dept_id,
                overall_rating=data["total_rating"] / data["count"],
                total_responses=data["count"],
                faculty_count=len(faculty_by_dept[dept_id])
            ))

    return DeanDashboardResponse(
        college_rating=college_rating,
        total_responses=total_responses,
        department_performance=department_performance
    )

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
