from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
from app.services.analytics_builder import refresh_faculty_subject_summary, refresh_department_summary, refresh_college_summary
from datetime import date, datetime, timezone
import datetime as dt
from typing import List, Dict, Any, Optional
from app.api.dependencies import get_db
from app.core.permissions import require_student
from app.models.user import User, Student
from app.models.academic import Subject, FacultySubject, Semester, Department, Division
from app.models.feedback import FeedbackSubmission, FeedbackAnswer, FeedbackComment
from app.models.evaluation import EvaluationCycle
from app.models.attendance import Attendance
from app.schemas.feedback import FeedbackSubmissionCreate, FeedbackSubmissionResponse
from app.schemas.user import StudentResponse

router = APIRouter()

@router.get("/me", response_model=StudentResponse)
def get_student_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    """
    Retrieve the current authenticated student's full profile including name, enrollment number, 
    email, phone number, department, and division.
    """
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    department = db.query(Department).filter(Department.id == student.department_id).first()
    division = db.query(Division).filter(Division.id == student.division_id).first()
    
    return StudentResponse(
        id=student.id,
        user_id=student.user_id,
        enrollment_no=student.enrollment_no,
        name=student.name,
        phone_no=student.phone_no,
        email=current_user.email,
        department_id=student.department_id,
        department_name=department.name if department else None,
        division_id=student.division_id,
        division_name=division.name if division else None
    )

@router.get("/dashboard")
def get_student_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    """
    Retrieve authenticated student dashboard with profile, subjects, attendance, and active feedback cycles.
    """
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    department = db.query(Department).filter(Department.id == student.department_id).first()
    division = db.query(Division).filter(Division.id == student.division_id).first()
    
    # Get subjects with attendance and faculty info
    active_cycle = db.query(EvaluationCycle).filter(EvaluationCycle.status == "ACTIVE").first()
    subjects_data = []
    
    if active_cycle:
        subjects = db.query(Subject).filter(
            Subject.department_id == student.department_id,
            Subject.semester_id == active_cycle.semester_id
        ).all()
        
        for sub in subjects:
            fac_assignment = db.query(FacultySubject).filter(FacultySubject.subject_id == sub.id).first()
            
            att = db.query(Attendance).filter(
                Attendance.student_id == student.id,
                Attendance.subject_id == sub.id,
                Attendance.academic_year_id == active_cycle.academic_year_id,
                Attendance.semester_id == active_cycle.semester_id
            ).first()
            
            attendance_percentage = att.attendance_percentage if att else 0.0
            is_eligible = attendance_percentage >= 75.0
            
            subjects_data.append({
                "subject_id": sub.id,
                "subject_name": sub.name,
                "subject_code": sub.code,
                "faculty_name": fac_assignment.faculty.user.email if fac_assignment else "TBA",
                "attendance_percentage": attendance_percentage,
                "is_eligible": is_eligible,
                "eligibility_badge": "Eligible" if is_eligible else "Not Eligible"
            })
    
    # Get active feedback cycles
    from app.api.admin import update_all_cycles_status
    update_all_cycles_status(db)
    active_cycles = db.query(EvaluationCycle).filter(EvaluationCycle.status == "ACTIVE").all()
    feedback_cycles = []
    
    for cycle in active_cycles:
        feedback_cycles.append({
            "cycle_id": cycle.id,
            "cycle_name": cycle.name,
            "end_date": cycle.end_date.isoformat() if cycle.end_date else None
        })
    
    return {
        "profile": {
            "id": student.id,
            "user_id": student.user_id,
            "name": student.name,
            "enrollment_no": student.enrollment_no,
            "email": current_user.email,
            "phone_no": student.phone_no,
            "department_name": department.name if department else None,
            "division_name": division.name if division else None
        },
        "subjects": subjects_data,
        "active_feedback_cycles": feedback_cycles
    }

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

    active_cycle = db.query(EvaluationCycle).filter(EvaluationCycle.status == "ACTIVE").first()
    if not active_cycle:
        return []

    subjects = db.query(Subject).filter(
        Subject.department_id == student.department_id,
        Subject.semester_id == active_cycle.semester_id
    ).all()
    
    result = []
    for sub in subjects:
        fac_assignment = db.query(FacultySubject).filter(FacultySubject.subject_id == sub.id).first()
        
        # Get attendance percentage
        att = db.query(Attendance).filter(
            Attendance.student_id == student.id,
            Attendance.subject_id == sub.id,
            Attendance.academic_year_id == active_cycle.academic_year_id,
            Attendance.semester_id == active_cycle.semester_id
        ).first()
        
        attendance_percentage = att.attendance_percentage if att else 0.0
        is_eligible = attendance_percentage >= 60.0

        result.append({
            "subject_id": sub.id,
            "subject_code": sub.code,
            "subject_name": sub.name,
            "faculty_id": fac_assignment.faculty.id if fac_assignment else None,
            "faculty_name": fac_assignment.faculty.user.email if fac_assignment else "TBA",
            "attendance_percentage": attendance_percentage,
            "is_eligible": is_eligible,
            "eligibility_message": "Eligible" if is_eligible else "Not Eligible — Minimum required attendance is 60%"
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

    # Retrieve all active cycles (and trigger status refresh)
    from app.api.admin import update_all_cycles_status
    update_all_cycles_status(db)
    active_cycles = db.query(EvaluationCycle).filter(EvaluationCycle.status == "ACTIVE").all()
    
    result = []
    for cycle in active_cycles:
        subjects = db.query(Subject).filter(
            Subject.department_id == student.department_id,
            Subject.semester_id == cycle.semester_id
        ).all()
        
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
            
            # Check submission
            submission = db.query(FeedbackSubmission).filter(
                FeedbackSubmission.student_id == student.id,
                FeedbackSubmission.subject_id == sub.id,
                FeedbackSubmission.faculty_id == fac_id,
                FeedbackSubmission.evaluation_cycle_id == cycle.id
            ).first()

            # Get attendance percentage
            att = db.query(Attendance).filter(
                Attendance.student_id == student.id,
                Attendance.subject_id == sub.id,
                Attendance.academic_year_id == cycle.academic_year_id,
                Attendance.semester_id == cycle.semester_id
            ).first()
            
            attendance_percentage = att.attendance_percentage if att else 0.0
            is_eligible = attendance_percentage >= 60.0
            
            cycle_status["subjects"].append({
                "subject_id": sub.id,
                "subject_name": sub.name,
                "faculty_id": fac_id,
                "is_submitted": submission is not None,
                "attendance_percentage": attendance_percentage,
                "is_eligible": is_eligible,
                "eligibility_message": "Eligible" if is_eligible else "Not Eligible — Minimum required attendance is 60%"
            })
            
        result.append(cycle_status)
        
    return result

@router.post("/feedback", response_model=FeedbackSubmissionResponse)
def submit_feedback(
    submission_data: FeedbackSubmissionCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=400, detail="Student profile not found")

    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Student user is inactive")

    # Refresh statuses
    from app.api.admin import update_all_cycles_status
    update_all_cycles_status(db)

    cycle = db.query(EvaluationCycle).filter(
        EvaluationCycle.id == submission_data.evaluation_cycle_id
    ).first()
    
    if not cycle:
        raise HTTPException(status_code=404, detail="Evaluation cycle not found")
        
    if cycle.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Evaluation cycle is not active")

    # Timing check
    now = datetime.now(timezone.utc)
    start_dt = cycle.start_datetime
    if not start_dt:
        start_dt = dt.datetime.combine(cycle.start_date, dt.time.min).replace(tzinfo=timezone.utc)
    elif start_dt.tzinfo is None:
        start_dt = start_dt.replace(tzinfo=timezone.utc)

    end_dt = cycle.end_datetime
    if not end_dt:
        end_dt = dt.datetime.combine(cycle.end_date, dt.time.max).replace(tzinfo=timezone.utc)
    elif end_dt.tzinfo is None:
        end_dt = end_dt.replace(tzinfo=timezone.utc)

    if now < start_dt or now > end_dt:
        raise HTTPException(status_code=400, detail="Evaluation cycle is outside of active date range")

    # Verify student department matches subject department
    subject = db.query(Subject).filter(Subject.id == submission_data.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    if subject.department_id != student.department_id:
        raise HTTPException(status_code=400, detail="Student does not belong to the subject department")

    # Verify subject is assigned to the faculty
    fac_assignment = db.query(FacultySubject).filter(
        FacultySubject.subject_id == submission_data.subject_id,
        FacultySubject.faculty_id == submission_data.faculty_id
    ).first()

    if not fac_assignment:
        raise HTTPException(status_code=400, detail="Selected faculty is not assigned to this subject")

    # Verify attendance >= 60%
    attendance = db.query(Attendance).filter(
        Attendance.student_id == student.id,
        Attendance.subject_id == submission_data.subject_id,
        Attendance.academic_year_id == cycle.academic_year_id,
        Attendance.semester_id == cycle.semester_id
    ).first()

    attendance_pct = attendance.attendance_percentage if attendance else 0.0
    if attendance_pct < 60.0:
        raise HTTPException(
            status_code=400,
            detail="You are not eligible to submit feedback because your attendance is below the required 60%."
        )

    # Required questions answered check
    if not cycle.questionnaire:
        raise HTTPException(status_code=400, detail="Questionnaire not associated with this cycle")

    required_ids = {q.id for q in cycle.questionnaire.questions if q.is_required}
    answered_ids = {ans.question_id for ans in submission_data.answers if ans.rating is not None or ans.text_answer}

    if not required_ids.issubset(answered_ids):
        raise HTTPException(status_code=400, detail="All required questions must be answered")

    # Check for duplicate submission
    existing = db.query(FeedbackSubmission).filter(
        FeedbackSubmission.student_id == student.id,
        FeedbackSubmission.faculty_id == submission_data.faculty_id,
        FeedbackSubmission.subject_id == submission_data.subject_id,
        FeedbackSubmission.evaluation_cycle_id == submission_data.evaluation_cycle_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Feedback already submitted for this faculty and subject in this cycle")

    # Calculate overall rating
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
        overall_subject_rating=overall_rating,
        status="SUBMITTED"
    )
    db.add(submission)
    db.flush()

    for ans_data in submission_data.answers:
        answer = FeedbackAnswer(
            submission_id=submission.id,
            **ans_data.model_dump()
        )
        db.add(answer)

    for cmd_data in submission_data.comments:
        comment = FeedbackComment(
            submission_id=submission.id,
            **cmd_data.model_dump()
        )
        db.add(comment)

    db.commit()
    db.refresh(submission)
    
    background_tasks.add_task(refresh_faculty_subject_summary, db, submission_data.faculty_id, submission_data.subject_id, submission_data.department_id)
    background_tasks.add_task(refresh_department_summary, db, submission_data.department_id)
    background_tasks.add_task(refresh_college_summary, db)
    
    return submission
