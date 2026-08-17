from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import date
from typing import List, Dict, Any
from app.api.dependencies import get_db
from app.core.permissions import require_student
from app.models.user import User, Student
from app.models.academic import Subject, FacultySubject, Semester
from app.models.feedback import FeedbackSubmission, FeedbackAnswer, FeedbackComment
from app.models.evaluation import EvaluationCycle
from app.schemas.feedback import FeedbackSubmissionCreate, FeedbackSubmissionResponse

router = APIRouter()

@router.get("/profile")
def get_student_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    return {
        "id": student.id,
        "email": current_user.email,
        "enrollment_no": student.enrollment_no,
        "department": student.department.name,
        "department_id": student.department_id,
        "division": student.division.name
    }

@router.get("/subjects")
def get_student_subjects(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Assuming student takes subjects of their department for active semester
    # Simplified logic: find active evaluation cycle, get its semester, get subjects for that dept & sem
    active_cycle = db.query(EvaluationCycle).filter(EvaluationCycle.status == "ACTIVE").first()
    if not active_cycle:
        return []

    subjects = db.query(Subject).filter(
        Subject.department_id == student.department_id,
        Subject.semester_id == active_cycle.semester_id
    ).all()
    
    result = []
    for sub in subjects:
        # Find faculty teaching this subject
        fac_assignment = db.query(FacultySubject).filter(FacultySubject.subject_id == sub.id).first()
        result.append({
            "subject_id": sub.id,
            "subject_code": sub.code,
            "subject_name": sub.name,
            "faculty_id": fac_assignment.faculty.id if fac_assignment else None,
            "faculty_name": fac_assignment.faculty.user.email if fac_assignment else "TBA"
        })
        
    return result

@router.get("/feedback/status")
def get_feedback_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    active_cycles = db.query(EvaluationCycle).filter(EvaluationCycle.status == "ACTIVE").all()
    
    result = []
    for cycle in active_cycles:
        # Get subjects for student in this cycle's semester
        subjects = db.query(Subject).filter(
            Subject.department_id == student.department_id,
            Subject.semester_id == cycle.semester_id
        ).all()
        
        # Get questionnaire for the cycle
        questionnaire = cycle.questionnaire
        questions_data = []
        if questionnaire and questionnaire.questions:
            for q in questionnaire.questions:
                questions_data.append({
                    "id": q.id,
                    "text": q.text,
                    "question_type": q.question_type,
                    "category": q.category,
                    "is_required": q.is_required,
                    "order_index": q.order_index
                })
        # Sort by order_index
        questions_data.sort(key=lambda x: x["order_index"])
        
        cycle_status = {
            "cycle_id": cycle.id,
            "cycle_name": cycle.name,
            "end_date": cycle.end_date,
            "questions": questions_data,
            "subjects": []
        }
        
        for sub in subjects:
            fac_assignment = db.query(FacultySubject).filter(FacultySubject.subject_id == sub.id).first()
            if not fac_assignment:
                continue
                
            fac_id = fac_assignment.faculty.id
            
            # Check if submitted
            submission = db.query(FeedbackSubmission).filter(
                FeedbackSubmission.student_id == student.id,
                FeedbackSubmission.subject_id == sub.id,
                FeedbackSubmission.faculty_id == fac_id,
                FeedbackSubmission.evaluation_cycle_id == cycle.id
            ).first()
            
            cycle_status["subjects"].append({
                "subject_id": sub.id,
                "subject_name": sub.name,
                "faculty_id": fac_id,
                "is_submitted": submission is not None
            })
            
        result.append(cycle_status)
        
    return result

@router.post("/feedback", response_model=FeedbackSubmissionResponse)
def submit_feedback(
    submission_data: FeedbackSubmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=400, detail="Student profile not found")

    # Check active evaluation cycle
    cycle = db.query(EvaluationCycle).filter(
        EvaluationCycle.id == submission_data.evaluation_cycle_id
    ).first()
    
    if not cycle:
        raise HTTPException(status_code=404, detail="Evaluation cycle not found")
        
    if cycle.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Evaluation cycle is not active")

    today = date.today()
    if not (cycle.start_date <= today <= cycle.end_date):
        raise HTTPException(status_code=400, detail="Evaluation cycle is outside of active date range")

    # Check for duplicate submission
    existing = db.query(FeedbackSubmission).filter(
        FeedbackSubmission.student_id == student.id,
        FeedbackSubmission.faculty_id == submission_data.faculty_id,
        FeedbackSubmission.subject_id == submission_data.subject_id,
        FeedbackSubmission.evaluation_cycle_id == submission_data.evaluation_cycle_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Feedback already submitted for this faculty and subject in this cycle")

    # Calculate overall rating from answers
    ratings = [ans.rating for ans in submission_data.answers if ans.rating is not None]
    overall_rating = sum(ratings) / len(ratings) if ratings else None

    # Create submission
    submission = FeedbackSubmission(
        student_id=student.id,
        faculty_id=submission_data.faculty_id,
        subject_id=submission_data.subject_id,
        department_id=submission_data.department_id,
        evaluation_cycle_id=submission_data.evaluation_cycle_id,
        overall_faculty_rating=overall_rating,
        overall_subject_rating=overall_rating, # Simplified for now
        status="SUBMITTED"
    )
    db.add(submission)
    db.flush() # To get the submission.id

    # Create answers
    for ans_data in submission_data.answers:
        answer = FeedbackAnswer(
            submission_id=submission.id,
            **ans_data.model_dump()
        )
        db.add(answer)

    # Create comments
    for cmd_data in submission_data.comments:
        comment = FeedbackComment(
            submission_id=submission.id,
            **cmd_data.model_dump()
        )
        db.add(comment)

    db.commit()
    db.refresh(submission)
    
    return submission
