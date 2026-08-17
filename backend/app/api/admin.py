from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from app.api.dependencies import get_db
from app.core.permissions import require_admin
from app.core.security import get_password_hash
from app.models.user import User, Student, Faculty, Role
from app.models.academic import Department, Subject, AcademicYear, Semester, Division, FacultySubject
from app.models.evaluation import Questionnaire, Question, EvaluationCycle
from app.models.feedback import FeedbackSubmission
from app.core.email import send_email_async
from app.schemas.academic import (
    DepartmentCreate, DepartmentResponse,
    SubjectCreate, SubjectResponse,
    AcademicYearCreate, AcademicYearResponse,
    SemesterCreate, SemesterResponse,
    DivisionCreate, DivisionResponse,
    FacultySubjectCreate, FacultySubjectResponse
)
from app.schemas.user import (
    UserCreate, UserUpdate, User as UserSchema,
    StudentCreate, Student as StudentSchema,
    FacultyCreate, Faculty as FacultySchema
)
from app.schemas.evaluation import QuestionnaireCreate, QuestionnaireResponse, EvaluationCycleCreate, EvaluationCycleResponse, EvaluationCycleUpdate
from app.models.audit import AuditLog
from app.services.audit_service import log_action

router = APIRouter()

# --- Users ---
@router.post("/users", response_model=UserSchema)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    new_user = User(
        email=user.email,
        password_hash=hashed_password,
        role_id=user.role_id,
        is_active=user.is_active
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    log_action(db, "USER_CREATED", current_user.id, "user", str(new_user.id), {"email": new_user.email})
    return new_user

@router.get("/users", response_model=List[UserSchema])
def get_users(
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return db.query(User).offset(skip).limit(limit).all()

@router.put("/users/{user_id}", response_model=UserSchema)
def update_user(
    user_id: int,
    user: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user.model_dump(exclude_unset=True)
    if "password" in update_data:
        db_user.password_hash = get_password_hash(update_data.pop("password"))
        
    for key, value in update_data.items():
        setattr(db_user, key, value)
        
    db.commit()
    db.refresh(db_user)
    log_action(db, "USER_UPDATED", current_user.id, "user", str(db_user.id))
    return db_user

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(db_user)
    db.commit()
    log_action(db, "USER_DELETED", current_user.id, "user", str(user_id))
    return {"message": "User deleted successfully"}

# --- Students ---
@router.post("/students", response_model=StudentSchema)
def create_student(
    student: StudentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    db_student = Student(**student.model_dump())
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    log_action(db, "STUDENT_CREATED", current_user.id, "student", str(db_student.id))
    return db_student

@router.get("/students", response_model=List[StudentSchema])
def get_students(
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return db.query(Student).offset(skip).limit(limit).all()

# --- Faculty ---
@router.post("/faculty", response_model=FacultySchema)
def create_faculty(
    faculty: FacultyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    db_faculty = Faculty(**faculty.model_dump())
    db.add(db_faculty)
    db.commit()
    db.refresh(db_faculty)
    log_action(db, "FACULTY_CREATED", current_user.id, "faculty", str(db_faculty.id))
    return db_faculty

@router.get("/faculty", response_model=List[FacultySchema])
def get_faculty(
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return db.query(Faculty).offset(skip).limit(limit).all()

# --- Departments ---
@router.post("/departments", response_model=DepartmentResponse)
def create_department(
    department: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    db_dept = Department(**department.model_dump())
    db.add(db_dept)
    db.commit()
    db.refresh(db_dept)
    log_action(db, "DEPARTMENT_CREATED", current_user.id, "department", str(db_dept.id))
    return db_dept

@router.get("/departments", response_model=List[DepartmentResponse])
def get_departments(
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return db.query(Department).offset(skip).limit(limit).all()

# --- Divisions ---
@router.post("/divisions", response_model=DivisionResponse)
def create_division(
    division: DivisionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    db_div = Division(**division.model_dump())
    db.add(db_div)
    db.commit()
    db.refresh(db_div)
    log_action(db, "DIVISION_CREATED", current_user.id, "division", str(db_div.id))
    return db_div

@router.get("/divisions", response_model=List[DivisionResponse])
def get_divisions(
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return db.query(Division).offset(skip).limit(limit).all()

# --- Academic Years ---
@router.post("/academic-years", response_model=AcademicYearResponse)
def create_academic_year(
    year: AcademicYearCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    db_year = AcademicYear(**year.model_dump())
    db.add(db_year)
    db.commit()
    db.refresh(db_year)
    log_action(db, "ACADEMIC_YEAR_CREATED", current_user.id, "academic_year", str(db_year.id))
    return db_year

@router.get("/academic-years", response_model=List[AcademicYearResponse])
def get_academic_years(
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return db.query(AcademicYear).offset(skip).limit(limit).all()

# --- Semesters ---
@router.post("/semesters", response_model=SemesterResponse)
def create_semester(
    semester: SemesterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    db_sem = Semester(**semester.model_dump())
    db.add(db_sem)
    db.commit()
    db.refresh(db_sem)
    log_action(db, "SEMESTER_CREATED", current_user.id, "semester", str(db_sem.id))
    return db_sem

@router.get("/semesters", response_model=List[SemesterResponse])
def get_semesters(
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return db.query(Semester).offset(skip).limit(limit).all()

# --- Subjects ---
@router.post("/subjects", response_model=SubjectResponse)
def create_subject(
    subject: SubjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    db_sub = Subject(**subject.model_dump())
    db.add(db_sub)
    db.commit()
    db.refresh(db_sub)
    log_action(db, "SUBJECT_CREATED", current_user.id, "subject", str(db_sub.id))
    return db_sub

@router.get("/subjects", response_model=List[SubjectResponse])
def get_subjects(
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return db.query(Subject).offset(skip).limit(limit).all()

# --- Faculty-Subject Assignments ---
@router.post("/faculty-subjects", response_model=FacultySubjectResponse)
def create_faculty_subject(
    assignment: FacultySubjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    db_assignment = FacultySubject(**assignment.model_dump())
    db.add(db_assignment)
    db.commit()
    db.refresh(db_assignment)
    log_action(db, "FACULTY_SUBJECT_CREATED", current_user.id, "faculty_subject", str(db_assignment.id))
    return db_assignment

@router.get("/faculty-subjects", response_model=List[FacultySubjectResponse])
def get_faculty_subjects(
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return db.query(FacultySubject).offset(skip).limit(limit).all()

# --- Questionnaires ---
@router.post("/questionnaires", response_model=QuestionnaireResponse)
def create_questionnaire(
    q: QuestionnaireCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    db_q = Questionnaire(name=q.name, is_active=q.is_active)
    db.add(db_q)
    db.commit()
    db.refresh(db_q)
    
    for question_data in q.questions:
        db_question = Question(**question_data.model_dump(), questionnaire_id=db_q.id)
        db.add(db_question)
        
    db.commit()
    db.refresh(db_q)
    log_action(db, "QUESTIONNAIRE_CREATED", current_user.id, "questionnaire", str(db_q.id))
    return db_q

@router.get("/questionnaires", response_model=List[QuestionnaireResponse])
def get_questionnaires(
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return db.query(Questionnaire).offset(skip).limit(limit).all()

# --- Evaluation Cycles ---
@router.post("/evaluation-cycles", response_model=EvaluationCycleResponse)
def create_evaluation_cycle(
    cycle: EvaluationCycleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    db_cycle = EvaluationCycle(**cycle.model_dump())
    db.add(db_cycle)
    db.commit()
    db.refresh(db_cycle)
    log_action(db, "EVALUATION_CYCLE_CREATED", current_user.id, "evaluation_cycle", str(db_cycle.id))
    return db_cycle

@router.get("/evaluation-cycles", response_model=List[EvaluationCycleResponse])
def get_evaluation_cycles(
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return db.query(EvaluationCycle).offset(skip).limit(limit).all()

@router.patch("/evaluation-cycles/{cycle_id}", response_model=EvaluationCycleResponse)
def update_evaluation_cycle(
    cycle_id: int,
    cycle_update: EvaluationCycleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    db_cycle = db.query(EvaluationCycle).filter(EvaluationCycle.id == cycle_id).first()
    if not db_cycle:
        raise HTTPException(status_code=404, detail="Evaluation cycle not found")

    update_data = cycle_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_cycle, key, value)

    db.commit()
    db.refresh(db_cycle)
    log_action(db, "EVALUATION_CYCLE_UPDATED", current_user.id, "evaluation_cycle", str(db_cycle.id))
    return db_cycle

@router.delete("/evaluation-cycles/{cycle_id}")
def delete_evaluation_cycle(
    cycle_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    db_cycle = db.query(EvaluationCycle).filter(EvaluationCycle.id == cycle_id).first()
    if not db_cycle:
        raise HTTPException(status_code=404, detail="Evaluation Cycle not found")
        
    db.delete(db_cycle)
    db.commit()
    log_action(db, "EVALUATION_CYCLE_DELETED", current_user.id, "evaluation_cycle", str(cycle_id))
    return {"message": "Evaluation Cycle deleted successfully"}

@router.post("/reminders/trigger")
def trigger_reminders(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    active_cycles = db.query(EvaluationCycle).filter(EvaluationCycle.status == "ACTIVE").all()
    if not active_cycles:
        raise HTTPException(status_code=400, detail="No active evaluation cycles found.")
        
    students = db.query(Student).all()
    emails_sent = 0
    
    for student in students:
        user = db.query(User).filter(User.id == student.user_id).first()
        if not user:
            continue
            
        # Simplistic check: If they haven't submitted anything at all (in a real system, we'd check per active cycle/subject)
        has_submissions = db.query(FeedbackSubmission).filter(
            FeedbackSubmission.student_id == student.id
        ).first() is not None
        
        if not has_submissions:
            background_tasks.add_task(
                send_email_async,
                user.email,
                "Reminder: Pending Academic Feedback",
                "You have pending feedback forms in an active evaluation cycle. Please log in and submit them before the deadline."
            )
            emails_sent += 1
            
    return {"message": f"Reminders queued for {emails_sent} students."}

# --- Audit Logs ---
@router.get("/audit-logs")
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(100).all()
    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "details": log.details,
            "ip_address": log.ip_address,
            "created_at": log.created_at.isoformat() if log.created_at else None
        }
        for log in logs
    ]
