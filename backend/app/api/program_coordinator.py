import re
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import List, Optional
import pandas as pd
from app.api.dependencies import get_db
from app.core.permissions import require_program_coordinator, verify_pc_dept
from app.core.security import get_password_hash
from app.models.user import User, Faculty, Student, ProgramCoordinator, Role
from app.models.academic import Subject, Department, FacultySubject, AcademicYear, Semester, Division
from app.models.attendance import Attendance
from app.models.evaluation import EvaluationCycle
from app.models.feedback import FeedbackSubmission
from app.services.audit_service import log_action
from app.schemas.user import StudentResponse
from pydantic import BaseModel, ConfigDict

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

class AssignmentCreate(BaseModel):
    faculty_id: int
    subject_id: int
    academic_year_id: int
    division_id: Optional[int] = None

class AssignmentResponse(BaseModel):
    id: int
    faculty_id: int
    subject_id: int
    academic_year_id: int
    division_id: Optional[int] = None
    faculty_email: str
    faculty_name: str
    subject_name: str
    subject_code: str
    academic_year_name: str
    semester_name: Optional[str] = None
    division_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

@router.get("/dashboard")
def get_pc_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_program_coordinator)
):
    if current_user.role.name.upper() == "ADMIN":
        pc_profile = db.query(ProgramCoordinator).first()
        if not pc_profile:
            raise HTTPException(status_code=400, detail="No Program Coordinator profile seeded to use as Admin default")
    else:
        pc_profile = current_user.program_coordinator_profile
        if not pc_profile:
            raise HTTPException(status_code=400, detail="Program Coordinator profile not found")

    dept_id = pc_profile.department_id
    dept = db.query(Department).filter(Department.id == dept_id).first()

    ay = db.query(AcademicYear).filter(AcademicYear.is_active == 1).first()
    ay_id = ay.id if ay else None
    ay_name = ay.name if ay else "N/A"

    active_cycle = db.query(EvaluationCycle).filter(EvaluationCycle.status == "ACTIVE").first()
    sem_id = active_cycle.semester_id if active_cycle else None
    sem_name = active_cycle.semester.name if active_cycle and active_cycle.semester else "N/A"

    total_faculty = db.query(Faculty).filter(Faculty.department_id == dept_id).count()
    total_students = db.query(Student).filter(Student.department_id == dept_id).count()
    
    subjects_query = db.query(Subject).filter(Subject.department_id == dept_id)
    if sem_id:
        subjects_query = subjects_query.filter(Subject.semester_id == sem_id)
    subjects = subjects_query.all()
    total_subjects = len(subjects)

    allocated_count = 0
    for sub in subjects:
        alloc = db.query(FacultySubject).filter(
            FacultySubject.subject_id == sub.id,
            FacultySubject.academic_year_id == ay_id
        ).first()
        if alloc:
            allocated_count += 1

    subject_allocation_status = f"{allocated_count}/{total_subjects} allocated"

    feedback_submissions_count = 0
    feedback_average_rating = 0.0

    if active_cycle:
        feedback_submissions_count = db.query(FeedbackSubmission).filter(
            FeedbackSubmission.department_id == dept_id,
            FeedbackSubmission.evaluation_cycle_id == active_cycle.id
        ).count()

        submissions = db.query(FeedbackSubmission).filter(
            FeedbackSubmission.department_id == dept_id,
            FeedbackSubmission.evaluation_cycle_id == active_cycle.id,
            FeedbackSubmission.overall_faculty_rating.isnot(None)
        ).all()
        if submissions:
            feedback_average_rating = sum(s.overall_faculty_rating for s in submissions) / len(submissions)

    attendance_records = db.query(Attendance).filter(Attendance.department_id == dept_id).all()
    avg_attendance = sum(a.attendance_percentage for a in attendance_records) / len(attendance_records) if attendance_records else 0.0

    return {
        "department_name": dept.name if dept else "Unknown",
        "department_code": dept.code if dept else "Unknown",
        "total_faculty": total_faculty,
        "total_students": total_students,
        "total_subjects": total_subjects,
        "current_academic_year": ay_name,
        "current_semester": sem_name,
        "subject_allocation_status": subject_allocation_status,
        "attendance_summary": f"{avg_attendance:.2f}% Avg",
        "feedback_completion_status": f"{feedback_submissions_count} responses",
        "feedback_performance_summary": f"{feedback_average_rating:.2f} / 5.00"
    }

@router.get("/dashboard-stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_program_coordinator)
):
    """
    Returns live dashboard statistics for the program coordinator's department.
    """
    if current_user.role.name.upper() == "ADMIN":
        pc_profile = db.query(ProgramCoordinator).first()
        if not pc_profile:
            raise HTTPException(status_code=400, detail="No Program Coordinator profile found")
    else:
        pc_profile = current_user.program_coordinator_profile
        if not pc_profile:
            raise HTTPException(status_code=400, detail="Program Coordinator profile not found")
    
    dept_id = pc_profile.department_id
    
    # Get enrolled students count
    enrolled_students = db.query(Student).filter(Student.department_id == dept_id).count()
    
    # Get faculty count
    faculty_count = db.query(Faculty).filter(Faculty.department_id == dept_id).count()
    
    # Get subject count
    subject_count = db.query(Subject).filter(Subject.department_id == dept_id).count()
    
    # Get evaluation metrics
    active_cycle = db.query(EvaluationCycle).filter(EvaluationCycle.status == "ACTIVE").first()
    evaluation_metrics = {
        "total_submissions": 0,
        "average_rating": 0.0,
        "active_cycle_name": None
    }
    
    if active_cycle:
        evaluation_metrics["active_cycle_name"] = active_cycle.name
        submissions = db.query(FeedbackSubmission).filter(
            FeedbackSubmission.department_id == dept_id,
            FeedbackSubmission.evaluation_cycle_id == active_cycle.id
        ).all()
        evaluation_metrics["total_submissions"] = len(submissions)
        
        if submissions:
            valid_ratings = [s.overall_faculty_rating for s in submissions if s.overall_faculty_rating is not None]
            if valid_ratings:
                evaluation_metrics["average_rating"] = sum(valid_ratings) / len(valid_ratings)
    
    return {
        "enrolled_students": enrolled_students,
        "faculty_count": faculty_count,
        "subject_count": subject_count,
        "evaluation_metrics": evaluation_metrics
    }

@router.get("/students", response_model=List[StudentResponse])
def get_coordinator_students(
    division_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_program_coordinator)
):
    """
    Retrieve students in the coordinator's department with optional division and search filters.
    """
    if current_user.role.name.upper() == "ADMIN":
        pc_profile = db.query(ProgramCoordinator).first()
    else:
        pc_profile = current_user.program_coordinator_profile
    
    if not pc_profile:
        raise HTTPException(status_code=400, detail="Program Coordinator profile not found")
    
    query = db.query(Student).filter(Student.department_id == pc_profile.department_id)
    
    if division_id is not None:
        query = query.filter(Student.division_id == division_id)
    
    if search:
        search_term = f"%{search.lower()}%"
        query = query.filter(
            (Student.name.ilike(search_term)) |
            (Student.enrollment_no.ilike(search_term)) |
            (Student.phone_no.ilike(search_term)) |
            (Student.user.has(User.email.ilike(search_term)))
        )
    
    students = query.all()
    
    result = []
    for student in students:
        user = db.query(User).filter(User.id == student.user_id).first()
        department = db.query(Department).filter(Department.id == student.department_id).first()
        division = db.query(Division).filter(Division.id == student.division_id).first()
        
        result.append(StudentResponse(
            id=student.id,
            user_id=student.user_id,
            enrollment_no=student.enrollment_no,
            name=student.name,
            phone_no=student.phone_no,
            email=user.email if user else None,
            department_id=student.department_id,
            department_name=department.name if department else None,
            division_id=student.division_id,
            division_name=division.name if division else None
        ))
    
    return result

@router.post("/students/bulk-upload")
def bulk_upload_students(
    file: UploadFile = File(...),
    department_id: Optional[int] = Form(None),
    division_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_program_coordinator)
):
    if current_user.role is None or current_user.role.name.upper() != "PROGRAM COORDINATOR":
        raise HTTPException(status_code=403, detail="Student bulk upload is available only to the Program Coordinator")

    if not file.filename or file.filename.lower().rsplit('.', 1)[-1] not in {"xlsx", "xls"}:
        raise HTTPException(status_code=400, detail="Only .xlsx and .xls files are supported")
    try:
        dataframe = pd.read_excel(file.file)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not read Excel file: {exc}")

    column_aliases = {
        "student id": "enrollment_no", "enrollment no": "enrollment_no",
        "name": "name", "email": "email", "phone no": "phone_no",
        "phone number": "phone_no", "department id": "department_id",
        "division id": "division_id"
    }
    normalized_columns = {str(column).strip().lower(): column for column in dataframe.columns}
    required = {"enrollment_no", "name", "email", "phone_no"}
    mapped = {column_aliases[key]: source for key, source in normalized_columns.items() if key in column_aliases}
    missing = required - set(mapped)
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing required columns: {', '.join(sorted(missing))}")

    coordinator = current_user.program_coordinator_profile
    if not coordinator:
        raise HTTPException(status_code=400, detail="Program Coordinator profile not found")
    if department_id and department_id != coordinator.department_id:
        raise HTTPException(status_code=403, detail="Cannot upload students for another department")
    department_id = coordinator.department_id

    if division_id is None:
        first_division = db.query(Division).filter(Division.department_id == department_id).order_by(Division.id).first()
        division_id = first_division.id if first_division else None
    if division_id is None or not db.query(Division).filter(Division.id == division_id, Division.department_id == department_id).first():
        raise HTTPException(status_code=400, detail="A valid division is required for the department")

    student_role = db.query(Role).filter(Role.name.ilike("Student")).first()
    if not student_role:
        raise HTTPException(status_code=500, detail="Student role is not configured")

    created = updated = 0
    try:
        for row_number, (_, row) in enumerate(dataframe.iterrows(), start=2):
            def cell(field: str) -> str:
                value = row[mapped[field]]
                return "" if pd.isna(value) else str(value).strip()

            email = cell("email").lower()
            phone_no = cell("phone_no")
            enrollment_no = cell("enrollment_no")
            name = cell("name") or None
            if not email or not phone_no or not enrollment_no:
                raise HTTPException(status_code=400, detail=f"Row {row_number} must include email, phone number, and enrollment number")

            row_department_id = int(cell("department_id")) if "department_id" in mapped and cell("department_id") else department_id
            row_division_id = int(cell("division_id")) if "division_id" in mapped and cell("division_id") else division_id
            if row_department_id != department_id:
                raise HTTPException(status_code=403, detail=f"Row {row_number} targets another department")
            if not db.query(Division).filter(Division.id == row_division_id, Division.department_id == row_department_id).first():
                raise HTTPException(status_code=400, detail=f"Row {row_number} has an invalid division")

            user = db.query(User).filter(User.email == email).first()
            student = db.query(Student).filter(Student.user_id == user.id).first() if user else None
            if not user:
                user = User(email=email, password_hash=get_password_hash(phone_no), role_id=student_role.id, is_active=True)
                db.add(user)
                db.flush()
                db.add(Student(user_id=user.id, enrollment_no=enrollment_no, name=name, phone_no=phone_no,
                               department_id=row_department_id, division_id=row_division_id))
                created += 1
            elif student:
                student.name = name
                student.phone_no = phone_no
                updated += 1
            else:
                raise HTTPException(status_code=400, detail=f"Row {row_number} belongs to a user without a student profile")
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Bulk upload failed: {exc}")

    log_action(db, "STUDENTS_BULK_UPLOADED", current_user.id, "student", None, {"created": created, "updated": updated})
    return {"created": created, "updated": updated}

@router.get("/faculty")
def get_pc_faculty(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_program_coordinator)
):
    if current_user.role.name.upper() == "ADMIN":
        pc_profile = db.query(ProgramCoordinator).first()
    else:
        pc_profile = current_user.program_coordinator_profile
    
    if not pc_profile:
        raise HTTPException(status_code=400, detail="Program Coordinator profile not found")

    faculty_list = db.query(Faculty).filter(Faculty.department_id == pc_profile.department_id).all()
    return [{
        "id": f.id,
        "employee_id": f.employee_id,
        "email": f.user.email,
        "faculty_name": get_faculty_name(f.user, f)
    } for f in faculty_list]

@router.get("/subjects")
def get_pc_subjects(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_program_coordinator)
):
    if current_user.role.name.upper() == "ADMIN":
        pc_profile = db.query(ProgramCoordinator).first()
    else:
        pc_profile = current_user.program_coordinator_profile
    
    if not pc_profile:
        raise HTTPException(status_code=400, detail="Program Coordinator profile not found")

    subjects = db.query(Subject).filter(Subject.department_id == pc_profile.department_id).all()
    return [{
        "id": s.id,
        "code": s.code,
        "name": s.name,
        "semester_id": s.semester_id,
        "semester": s.semester.name if s.semester else "N/A"
    } for s in subjects]

@router.get("/assignments", response_model=List[AssignmentResponse])
def get_pc_assignments(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_program_coordinator)
):
    if current_user.role.name.upper() == "ADMIN":
        pc_profile = db.query(ProgramCoordinator).first()
    else:
        pc_profile = current_user.program_coordinator_profile
    
    if not pc_profile:
        raise HTTPException(status_code=400, detail="Program Coordinator profile not found")

    assignments = db.query(FacultySubject).join(Subject).filter(Subject.department_id == pc_profile.department_id).all()
    
    res = []
    for a in assignments:
        res.append(AssignmentResponse(
            id=a.id,
            faculty_id=a.faculty_id,
            subject_id=a.subject_id,
            academic_year_id=a.academic_year_id,
            division_id=a.division_id,
            faculty_email=a.faculty.user.email,
            faculty_name=get_faculty_name(a.faculty.user, a.faculty),
            subject_name=a.subject.name,
            subject_code=a.subject.code,
            academic_year_name=a.academic_year.name,
            semester_name=a.subject.semester.name if a.subject.semester else "N/A",
            division_name=a.division.name if a.division else None
        ))
    return res

@router.post("/assignments", response_model=AssignmentResponse)
def create_pc_assignment(
    data: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_program_coordinator)
):
    if current_user.role.name.upper() == "ADMIN":
        pc_profile = db.query(ProgramCoordinator).first()
    else:
        pc_profile = current_user.program_coordinator_profile
    
    if not pc_profile:
        raise HTTPException(status_code=400, detail="Program Coordinator profile not found")

    faculty = db.query(Faculty).filter(Faculty.id == data.faculty_id).first()
    subject = db.query(Subject).filter(Subject.id == data.subject_id).first()

    if not faculty or not subject:
        raise HTTPException(status_code=404, detail="Faculty or Subject not found")

    if faculty.department_id != pc_profile.department_id or subject.department_id != pc_profile.department_id:
        raise HTTPException(status_code=403, detail="Cross-department subject allocation is not allowed")

    existing = db.query(FacultySubject).filter(
        FacultySubject.faculty_id == data.faculty_id,
        FacultySubject.subject_id == data.subject_id,
        FacultySubject.academic_year_id == data.academic_year_id,
        FacultySubject.division_id == data.division_id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="This subject is already allocated to this faculty for the selected semester and division.")

    new_assignment = FacultySubject(
        faculty_id=data.faculty_id,
        subject_id=data.subject_id,
        academic_year_id=data.academic_year_id,
        division_id=data.division_id
    )
    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)

    log_action(db, "FACULTY_ALLOCATION_CREATED", current_user.id, "faculty_subject", str(new_assignment.id), {
        "faculty_id": data.faculty_id,
        "subject_id": data.subject_id,
        "academic_year_id": data.academic_year_id
    })

    return AssignmentResponse(
        id=new_assignment.id,
        faculty_id=new_assignment.faculty_id,
        subject_id=new_assignment.subject_id,
        academic_year_id=new_assignment.academic_year_id,
        division_id=new_assignment.division_id,
        faculty_email=new_assignment.faculty.user.email,
        faculty_name=get_faculty_name(new_assignment.faculty.user, new_assignment.faculty),
        subject_name=new_assignment.subject.name,
        subject_code=new_assignment.subject.code,
        academic_year_name=new_assignment.academic_year.name,
        semester_name=new_assignment.subject.semester.name if new_assignment.subject.semester else "N/A",
        division_name=new_assignment.division.name if new_assignment.division else None
    )

@router.delete("/assignments/{id}")
def delete_pc_assignment(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_program_coordinator)
):
    if current_user.role.name.upper() == "ADMIN":
        pc_profile = db.query(ProgramCoordinator).first()
    else:
        pc_profile = current_user.program_coordinator_profile
    
    if not pc_profile:
        raise HTTPException(status_code=400, detail="Program Coordinator profile not found")

    assignment = db.query(FacultySubject).filter(FacultySubject.id == id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if assignment.subject.department_id != pc_profile.department_id:
        raise HTTPException(status_code=403, detail="Cannot delete assignment from another department")

    db.delete(assignment)
    db.commit()

    log_action(db, "FACULTY_ALLOCATION_DELETED", current_user.id, "faculty_subject", str(id))
    return {"message": "Assignment deleted successfully"}

