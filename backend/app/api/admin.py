from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File, Form, Query
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import List,Optional
import pandas as pd
from app.api.dependencies import get_db, get_current_active_user
from app.core.permissions import require_admin
from app.core.security import get_password_hash
from app.models.user import User, Student, Faculty, Role, ProgramCoordinator
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
    StudentCreate, Student as StudentSchema, StudentResponse,
    FacultyCreate, Faculty as FacultySchema
)
from app.schemas.evaluation import QuestionnaireCreate, QuestionnaireResponse, EvaluationCycleCreate, EvaluationCycleResponse, EvaluationCycleUpdate
from app.models.audit import AuditLog
from app.services.audit_service import log_action

from pydantic import BaseModel

class HODAssignmentCreate(BaseModel):
    user_id: int
    department_id: int

class PCAssignmentCreate(BaseModel):
    user_id: int
    department_id: int
    employee_id: str

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

@router.get("/students", response_model=List[StudentResponse])
def get_students(
    skip: int = 0,
    limit: int = 100,
    department_id: Optional[int] = Query(None),
    division_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Retrieve students with optional filtering by department, division, and search.
    Search filters across name, enrollment_no, email, and phone_no.
    """
    query = db.query(Student).join(User, Student.user_id == User.id)
    
    if department_id is not None:
        query = query.filter(Student.department_id == department_id)
    
    if division_id is not None:
        query = query.filter(Student.division_id == division_id)
    
    if search:
        search_term = f"%{search.lower()}%"
        query = query.filter(
            (Student.name.ilike(search_term)) |
            (Student.enrollment_no.ilike(search_term)) |
            (Student.phone_no.ilike(search_term)) |
            (User.email.ilike(search_term))
        )
    
    students = query.offset(skip).limit(limit).all()
    
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
    current_user: User = Depends(get_current_active_user)
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
    current_user: User = Depends(get_current_active_user)
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
    current_user: User = Depends(get_current_active_user)
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
    result = []
    for log in logs:
        user = db.query(User).filter(User.id == log.user_id).first()
        result.append({
            "id": log.id,
            "user_id": log.user_id,
            "user_email": user.email if user else f"User {log.user_id}",
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "details": log.details,
            "ip_address": log.ip_address,
            "created_at": log.created_at.isoformat() if log.created_at else None
        })
    return result

@router.post("/upload-master-data")
async def upload_master_data(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    import pandas as pd
    import io
    from app.models.feedback import FeedbackComment, FeedbackAnswer, FeedbackSubmission
    
    contents = await file.read()
    xl = pd.ExcelFile(io.BytesIO(contents))
    
    try:
        # Delete dependencies with FK checks disabled to avoid MySQL parent/child constraint failures.
        db.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
        db.query(FeedbackComment).delete()
        db.query(FeedbackAnswer).delete()
        db.query(FeedbackSubmission).delete()
        db.query(FacultySubject).delete()
        db.query(Student).delete()
        db.query(Faculty).delete()
        db.query(Subject).delete()
        db.query(Division).delete()
        db.query(Department).delete()
        admin_role = db.query(Role).filter(Role.name == "Admin").first()
        db.query(User).filter(User.role_id != admin_role.id).delete()
        db.commit()
        db.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
        db.commit()

        # Insert Departments
        dept_df = pd.read_excel(xl, sheet_name='Departments', skiprows=0)
        dept_objs = {}
        for _, row in dept_df.iterrows():
            dept = Department(code=row['Department Code'], name=row['Department Name'])
            db.add(dept)
            db.commit()
            db.refresh(dept)
            dept_objs[dept.code] = dept
            
            # create default division A
            div = Division(name="A", department_id=dept.id)
            db.add(div)
            db.commit()
            db.refresh(div)

        # Get roles (MySQL might have them in caps)
        roles = {r.name.upper(): r.id for r in db.query(Role).all()}
        
        # Insert HOD Users
        hod_df = pd.read_excel(xl, sheet_name='Admin_HOD_Users', skiprows=3)
        for _, row in hod_df.iterrows():
            if pd.isna(row['Email']) or str(row['Role']).upper() == 'ADMIN':
                continue
            dept_code = row['Department Code']
            user = User(
                email=row['Email'],
                password_hash=get_password_hash(str(row['Password (demo only)'])),
                role_id=roles.get('HOD'),
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            # Add to Faculty table as HOD
            dept = dept_objs.get(dept_code)
            if dept:
                fac = Faculty(user_id=user.id, department_id=dept.id, employee_id=f"HOD_{dept_code}")
                db.add(fac)
                db.commit()
        
        # Insert Faculty
        fac_df = pd.read_excel(xl, sheet_name='Faculty', skiprows=0)
        fac_objs = {}
        for _, row in fac_df.iterrows():
            email = row['Faculty ID'].lower() + "@safas.edu"
            user = User(
                email=email,
                password_hash=get_password_hash("faculty123"),
                role_id=roles.get('FACULTY'),
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
            dept = dept_objs.get(row['Department Code'])
            fac = Faculty(user_id=user.id, department_id=dept.id, employee_id=row['Faculty ID'])
            db.add(fac)
            db.commit()
            db.refresh(fac)
            fac_objs[row['Faculty ID']] = fac
            
        # Insert Subjects and FacultySubject
        sub_df = pd.read_excel(xl, sheet_name='Subjects', skiprows=0)
        ay = db.query(AcademicYear).filter(AcademicYear.is_active == True).first()
        sem = db.query(Semester).filter(Semester.academic_year_id == ay.id).first() if ay else None
        
        sub_objs = {}
        for _, row in sub_df.iterrows():
            code = row['Subject Code']
            dept = dept_objs.get(row['Department Code'])
            if code not in sub_objs:
                sub = Subject(code=code, name=row['Subject Name'], department_id=dept.id, semester_id=sem.id if sem else 1)
                db.add(sub)
                db.commit()
                db.refresh(sub)
                sub_objs[code] = sub
            
            fac = fac_objs.get(row['Faculty ID'])
            if fac:
                fs = FacultySubject(faculty_id=fac.id, subject_id=sub_objs[code].id, academic_year_id=ay.id if ay else 1)
                db.add(fs)
                db.commit()
                
        # Insert Students
        stu_df = pd.read_excel(xl, sheet_name='Students', skiprows=0)
        for _, row in stu_df.iterrows():
            email = row['Student ID'].lower() + "@safas.edu"
            if db.query(User).filter(User.email == email).first():
                continue
            user = User(
                email=email,
                password_hash=get_password_hash("student123"),
                role_id=roles.get('STUDENT'),
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
            dept = dept_objs.get(row['Department Code'])
            div = db.query(Division).filter(Division.department_id == dept.id).first()
            stu = Student(user_id=user.id, department_id=dept.id, division_id=div.id, enrollment_no=row['Student ID'])
            db.add(stu)
            db.commit()
            
        # Simulate Feedback Responses
        try:
            from app.models.evaluation import EvaluationCycle, Questionnaire, Question
            import datetime
            cycle = db.query(EvaluationCycle).first()
            if not cycle:
                qnaire = db.query(Questionnaire).first()
                if not qnaire:
                    qnaire = Questionnaire(name="Standard", is_active=True)
                    db.add(qnaire)
                    db.commit()
                    db.refresh(qnaire)
                    for idx, qtext in enumerate(["Communication", "Punctuality", "Knowledge", "Beyond Curriculum", "ICT", "Coverage", "Interactive", "Accessibility"]):
                        db.add(Question(questionnaire_id=qnaire.id, text=qtext, category="Teaching", question_type="rating", order_index=idx))
                    db.commit()
                cycle = EvaluationCycle(name="Imported Cycle", academic_year_id=ay.id if ay else 1, semester_id=sem.id if sem else 1, questionnaire_id=qnaire.id, start_date=datetime.date.today(), end_date=datetime.date.today(), status="ACTIVE", minimum_response_threshold=5)
                db.add(cycle)
                db.commit()
                db.refresh(cycle)
                
            feed_df = pd.read_excel(xl, sheet_name='Feedback_Responses', skiprows=3)
            qs = db.query(Question).filter(Question.questionnaire_id == cycle.questionnaire_id, Question.question_type == 'rating').all()
            for _, row in feed_df.iterrows():
                student_id = row['Student ID']
                fac_id = row['Faculty ID']
                sub_code = row['Subject Code']
                
                fac_obj = fac_objs.get(fac_id)
                sub_obj = sub_objs.get(sub_code)
                
                stu_email = student_id.lower() + "@safas.edu"
                stu_user = db.query(User).filter(User.email == stu_email).first()
                stu_obj = db.query(Student).filter(Student.user_id == stu_user.id).first() if stu_user else None
                
                if fac_obj and sub_obj and stu_obj:
                    subm = FeedbackSubmission(
                        student_id=stu_obj.id,
                        faculty_id=fac_obj.id,
                        subject_id=sub_obj.id,
                        department_id=stu_obj.department_id,
                        evaluation_cycle_id=cycle.id,
                        overall_faculty_rating=float(row['Overall Rating']) if not pd.isna(row['Overall Rating']) else 4.0,
                        overall_subject_rating=float(row['Overall Rating']) if not pd.isna(row['Overall Rating']) else 4.0,
                        status="SUBMITTED"
                    )
                    db.add(subm)
                    db.commit()
                    db.refresh(subm)
                    
                    if not pd.isna(row['Student Comment']):
                        db.add(FeedbackComment(submission_id=subm.id, comment_type="additional", comment_text=str(row['Student Comment'])))
                    
                    for q in qs:
                        db.add(FeedbackAnswer(submission_id=subm.id, question_id=q.id, rating=int(row['Overall Rating']) if not pd.isna(row['Overall Rating']) else 4))
                    db.commit()
        except Exception as ex:
            print("Could not import feedback:", ex)
            
        log_action(db, "MASTER_DATA_UPLOAD", current_user.id, "system", "all")
        return {"message": "Master data uploaded successfully."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

def update_all_cycles_status(db: Session):
    from datetime import datetime, timezone
    import datetime as dt
    now = datetime.now(timezone.utc)
    cycles = db.query(EvaluationCycle).all()
    for cycle in cycles:
        if cycle.status == "ARCHIVED":
            continue
        
        # Check start_datetime
        start = cycle.start_datetime
        if not start:
            start = dt.datetime.combine(cycle.start_date, dt.time.min).replace(tzinfo=timezone.utc)
        elif start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)

        end = cycle.end_datetime
        if not end:
            end = dt.datetime.combine(cycle.end_date, dt.time.max).replace(tzinfo=timezone.utc)
        elif end.tzinfo is None:
            end = end.replace(tzinfo=timezone.utc)

        if now < start:
            new_status = "SCHEDULED"
        elif start <= now <= end:
            new_status = "ACTIVE"
        else:
            new_status = "CLOSED"

        if cycle.status != new_status:
            cycle.status = new_status
            db.add(cycle)
    db.commit()

@router.get("/feedback-calendar", response_model=List[EvaluationCycleResponse])
def get_feedback_calendar(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    update_all_cycles_status(db)
    return db.query(EvaluationCycle).all()

@router.post("/feedback-calendar", response_model=EvaluationCycleResponse)
def create_feedback_calendar_event(
    cycle: EvaluationCycleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    # Convert dates to datetimes if they aren't explicitly provided
    c_data = cycle.model_dump()
    if not c_data.get("start_datetime"):
        import datetime as dt
        c_data["start_datetime"] = dt.datetime.combine(c_data["start_date"], dt.time.min)
    if not c_data.get("end_datetime"):
        import datetime as dt
        c_data["end_datetime"] = dt.datetime.combine(c_data["end_date"], dt.time.max)

    db_cycle = EvaluationCycle(**c_data)
    db_cycle.created_by = current_user.id
    db.add(db_cycle)
    db.commit()
    db.refresh(db_cycle)
    update_all_cycles_status(db)
    log_action(db, "FEEDBACK_EVENT_CREATED", current_user.id, "evaluation_cycle", str(db_cycle.id))
    return db_cycle

@router.put("/feedback-calendar/{id}", response_model=EvaluationCycleResponse)
def update_feedback_calendar_event(
    id: int,
    cycle_update: EvaluationCycleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    db_cycle = db.query(EvaluationCycle).filter(EvaluationCycle.id == id).first()
    if not db_cycle:
        raise HTTPException(status_code=404, detail="Feedback event not found")

    update_data = cycle_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_cycle, key, value)

    db.commit()
    db.refresh(db_cycle)
    update_all_cycles_status(db)
    log_action(db, "FEEDBACK_EVENT_UPDATED", current_user.id, "evaluation_cycle", str(db_cycle.id))
    return db_cycle

@router.delete("/feedback-calendar/{id}")
def delete_feedback_calendar_event(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    db_cycle = db.query(EvaluationCycle).filter(EvaluationCycle.id == id).first()
    if not db_cycle:
        raise HTTPException(status_code=404, detail="Feedback event not found")
        
    db.delete(db_cycle)
    db.commit()
    log_action(db, "FEEDBACK_EVENT_DELETED", current_user.id, "evaluation_cycle", str(id))
    return {"message": "Feedback event deleted successfully"}

@router.post("/feedback-calendar/{id}/activate")
def activate_feedback_calendar_event(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    db_cycle = db.query(EvaluationCycle).filter(EvaluationCycle.id == id).first()
    if not db_cycle:
        raise HTTPException(status_code=404, detail="Feedback event not found")

    # Set start_datetime to now to activate immediately
    from datetime import datetime, timezone
    db_cycle.start_datetime = datetime.now(timezone.utc)
    db_cycle.status = "ACTIVE"
    db.commit()
    log_action(db, "FEEDBACK_EVENT_ACTIVATED", current_user.id, "evaluation_cycle", str(id))
    return {"message": "Feedback cycle activated successfully"}

@router.post("/feedback-calendar/{id}/close")
def close_feedback_calendar_event(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    db_cycle = db.query(EvaluationCycle).filter(EvaluationCycle.id == id).first()
    if not db_cycle:
        raise HTTPException(status_code=404, detail="Feedback event not found")

    # Set end_datetime to now to close immediately
    from datetime import datetime, timezone
    db_cycle.end_datetime = datetime.now(timezone.utc)
    db_cycle.status = "CLOSED"
    db.commit()
    log_action(db, "FEEDBACK_EVENT_CLOSED", current_user.id, "evaluation_cycle", str(id))
    return {"message": "Feedback cycle closed successfully"}

@router.get("/detailed-feedback")
def get_detailed_feedback(
    academic_year_id: Optional[int] = None,
    semester_id: Optional[int] = None,
    department_id: Optional[int] = None,
    division_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    faculty_id: Optional[int] = None,
    student_id: Optional[int] = None,
    cycle_id: Optional[int] = None,
    sentiment: Optional[str] = None,
    rating: Optional[float] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    # Log sensitive action
    log_action(db, "ADMIN_ACCESS_IDENTIFIABLE_FEEDBACK", current_user.id, "feedback", "all")

    query = db.query(FeedbackSubmission)
    if academic_year_id or semester_id:
        query = query.join(EvaluationCycle)
        if academic_year_id:
            query = query.filter(EvaluationCycle.academic_year_id == academic_year_id)
        if semester_id:
            query = query.filter(EvaluationCycle.semester_id == semester_id)

    if department_id:
        query = query.filter(FeedbackSubmission.department_id == department_id)
    if subject_id:
        query = query.filter(FeedbackSubmission.subject_id == subject_id)
    if faculty_id:
        query = query.filter(FeedbackSubmission.faculty_id == faculty_id)
    if student_id:
        query = query.filter(FeedbackSubmission.student_id == student_id)
    if cycle_id:
        query = query.filter(FeedbackSubmission.evaluation_cycle_id == cycle_id)
    if rating:
        query = query.filter(FeedbackSubmission.overall_faculty_rating == rating)

    submissions = query.all()
    result = []
    
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
    analyzer = SentimentIntensityAnalyzer()
    
    for s in submissions:
        # Check student division
        if division_id and s.student.division_id != division_id:
            continue
            
        comments = []
        for c in s.comments:
            score = analyzer.polarity_scores(c.comment_text)['compound']
            sent = "Neutral"
            if score >= 0.05:
                sent = "Positive"
            elif score <= -0.05:
                sent = "Negative"
                
            comments.append({
                "comment_type": c.comment_type,
                "comment_text": c.comment_text,
                "sentiment": sent
            })
            
        # Filter comments by sentiment if provided
        if sentiment:
            comments = [c for c in comments if c["sentiment"].upper() == sentiment.upper()]
            if not comments:
                continue

        result.append({
            "id": s.id,
            "student": {
                "id": s.student.id,
                "email": s.student.user.email,
                "enrollment_no": s.student.enrollment_no
            },
            "faculty": {
                "id": s.faculty.id,
                "email": s.faculty.user.email
            },
            "subject": {
                "id": s.subject.id,
                "name": s.subject.name,
                "code": s.subject.code
            },
            "department": s.department.name,
            "overall_rating": s.overall_faculty_rating,
            "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
            "comments": comments
        })
        
    return result

@router.get("/dashboard-stats")
def get_admin_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    from sqlalchemy import func
    from app.models.user import Role, ProgramCoordinator
    
    total_depts = db.query(Department).count()
    total_students = db.query(Student).count()
    total_faculty = db.query(Faculty).count()
    
    hod_role = db.query(Role).filter(Role.name == "HOD").first()
    total_hods = db.query(User).filter(User.role_id == hod_role.id).count() if hod_role else 0
    
    total_pcs = db.query(ProgramCoordinator).count()
    
    update_all_cycles_status(db)
    active_cycles = db.query(EvaluationCycle).filter(EvaluationCycle.status == "ACTIVE").count()
    
    submissions = db.query(FeedbackSubmission).all()
    total_responses = len(submissions)
    avg_rating = sum(s.overall_faculty_rating for s in submissions if s.overall_faculty_rating) / total_responses if total_responses > 0 else 0.0

    distinct_students_submitted = db.query(func.count(func.distinct(FeedbackSubmission.student_id))).scalar() or 0
    response_rate = (distinct_students_submitted / total_students * 100) if total_students > 0 else 0.0

    return {
        "total_departments": total_depts,
        "total_students": total_students,
        "total_faculty": total_faculty,
        "total_hods": total_hods,
        "total_pcs": total_pcs,
        "active_cycles": active_cycles,
        "response_rate": f"{round(response_rate)}%",
        "avg_rating": round(avg_rating, 2)
    }

@router.get("/hods")
def get_hods(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    hod_role = db.query(Role).filter(Role.name == "HOD").first()
    if not hod_role:
        return []
    users = db.query(User).filter(User.role_id == hod_role.id).all()
    res = []
    for u in users:
        fac = db.query(Faculty).filter(Faculty.user_id == u.id).first()
        res.append({
            "id": u.id,
            "email": u.email,
            "department_id": fac.department_id if fac else None,
            "department_name": fac.department.name if fac and fac.department else "N/A",
            "employee_id": fac.employee_id if fac else "N/A"
        })
    return res

@router.post("/hods")
def create_hod(
    assignment: HODAssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == assignment.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    hod_role = db.query(Role).filter(Role.name == "HOD").first()
    if not hod_role:
        raise HTTPException(status_code=500, detail="HOD role not configured")
        
    user.role_id = hod_role.id
    db.add(user)
    
    fac = db.query(Faculty).filter(Faculty.user_id == user.id).first()
    if fac:
        fac.department_id = assignment.department_id
        db.add(fac)
    else:
        new_fac = Faculty(
            user_id=user.id,
            department_id=assignment.department_id,
            employee_id=f"HOD_{assignment.department_id}_{user.id}"
        )
        db.add(new_fac)
        
    db.commit()
    log_action(db, "HOD_ASSIGNED", current_user.id, "user", str(user.id))
    return {"message": "HOD assigned successfully"}

@router.delete("/hods/{id}")
def delete_hod(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    faculty_role = db.query(Role).filter(Role.name == "Faculty").first()
    if not faculty_role:
        raise HTTPException(status_code=500, detail="Faculty role not configured")
        
    user.role_id = faculty_role.id
    db.add(user)
    db.commit()
    log_action(db, "HOD_UNASSIGNED", current_user.id, "user", str(id))
    return {"message": "HOD unassigned successfully"}

@router.get("/program-coordinators")
def get_program_coordinators(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    from app.models.user import ProgramCoordinator
    pcs = db.query(ProgramCoordinator).all()
    res = []
    for pc in pcs:
        res.append({
            "id": pc.id,
            "user_id": pc.user_id,
            "email": pc.user.email if pc.user else "N/A",
            "department_id": pc.department_id,
            "department_name": pc.department.name if pc.department else "N/A",
            "employee_id": pc.employee_id
        })
    return res

@router.post("/program-coordinators")
def create_program_coordinator(
    assignment: PCAssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    from app.models.user import ProgramCoordinator
    user = db.query(User).filter(User.id == assignment.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    pc_role = db.query(Role).filter(Role.name == "Program Coordinator").first()
    if not pc_role:
        raise HTTPException(status_code=500, detail="Program Coordinator role not configured")
        
    user.role_id = pc_role.id
    db.add(user)
    
    existing = db.query(ProgramCoordinator).filter(ProgramCoordinator.department_id == assignment.department_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="A program coordinator is already assigned to this department")
        
    new_pc = ProgramCoordinator(
        user_id=assignment.user_id,
        department_id=assignment.department_id,
        employee_id=assignment.employee_id
    )
    db.add(new_pc)
    db.commit()
    log_action(db, "PROGRAM_COORDINATOR_ASSIGNED", current_user.id, "program_coordinator", str(new_pc.id))
    return {"message": "Program coordinator assigned successfully"}

@router.delete("/program-coordinators/{id}")
def delete_program_coordinator(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    from app.models.user import ProgramCoordinator
    pc = db.query(ProgramCoordinator).filter(ProgramCoordinator.id == id).first()
    if not pc:
        raise HTTPException(status_code=404, detail="Program coordinator not found")
        
    user = pc.user
    if user:
        faculty_role = db.query(Role).filter(Role.name == "Faculty").first()
        if faculty_role:
            user.role_id = faculty_role.id
            db.add(user)
            
    db.delete(pc)
    db.commit()
    log_action(db, "PROGRAM_COORDINATOR_DELETED", current_user.id, "program_coordinator", str(id))
    return {"message": "Program coordinator unassigned successfully"}
