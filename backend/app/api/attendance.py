from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.api.dependencies import get_db, get_current_active_user
from app.core.permissions import require_hod, require_program_coordinator, require_faculty, RoleChecker
from app.models.user import User, Student, Faculty, ProgramCoordinator
from app.models.academic import Subject, Department, FacultySubject, Division, AcademicYear, Semester
from app.models.attendance import Attendance
from app.services.audit_service import log_action
from pydantic import BaseModel, ConfigDict

router = APIRouter()

class AttendanceCreate(BaseModel):
    student_id: int
    subject_id: int
    faculty_id: int
    department_id: int
    academic_year_id: int
    semester_id: int
    division_id: int
    total_classes: int
    classes_attended: int

class AttendanceUpdate(BaseModel):
    total_classes: int
    classes_attended: int

class AttendanceResponse(BaseModel):
    id: int
    student_id: int
    student_email: str
    enrollment_no: str
    subject_id: int
    subject_name: str
    subject_code: str
    faculty_id: int
    faculty_email: str
    department_id: int
    department_name: str
    academic_year_id: int
    academic_year_name: str
    semester_id: int
    semester_name: str
    division_id: int
    division_name: str
    total_classes: int
    classes_attended: int
    attendance_percentage: float

    model_config = ConfigDict(from_attributes=True)

# Custom permission check: Allow Admin, PC, HOD, or Faculty
require_attendance_manager = RoleChecker(["Admin", "Program Coordinator", "HOD", "Faculty"])

@router.get("/", response_model=List[AttendanceResponse])
def get_attendance(
    department_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    semester_id: Optional[int] = None,
    academic_year_id: Optional[int] = None,
    division_id: Optional[int] = None,
    student_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    role = current_user.role.name.upper()
    query = db.query(Attendance)

    # Apply strict scoping based on user role
    if role == "STUDENT":
        # Student can only view their own attendance
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student:
            raise HTTPException(status_code=400, detail="Student profile not found")
        query = query.filter(Attendance.student_id == student.id)
    elif role == "FACULTY":
        # Faculty can only view subjects they teach
        faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
        if not faculty:
            raise HTTPException(status_code=400, detail="Faculty profile not found")
        query = query.filter(Attendance.faculty_id == faculty.id)
    elif role == "HOD":
        # HOD can only view their own department
        faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
        if not faculty:
            raise HTTPException(status_code=400, detail="HOD faculty profile not found")
        query = query.filter(Attendance.department_id == faculty.department_id)
    elif role == "PROGRAM COORDINATOR":
        # Program Coordinator can only view their own department
        pc = db.query(ProgramCoordinator).filter(ProgramCoordinator.user_id == current_user.id).first()
        if not pc:
            raise HTTPException(status_code=400, detail="Program Coordinator profile not found")
        query = query.filter(Attendance.department_id == pc.department_id)
    elif role in ["ADMIN", "DEAN"]:
        # Admin and Dean can view college-wide
        pass
    else:
        raise HTTPException(status_code=403, detail="Not authorized to access attendance records")

    # Apply filters
    if department_id:
        # Check permissions for dept filter
        if role == "HOD":
            faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
            if faculty.department_id != department_id:
                raise HTTPException(status_code=403, detail="Cannot filter by other departments")
        elif role == "PROGRAM COORDINATOR":
            pc = db.query(ProgramCoordinator).filter(ProgramCoordinator.user_id == current_user.id).first()
            if pc.department_id != department_id:
                raise HTTPException(status_code=403, detail="Cannot filter by other departments")
        query = query.filter(Attendance.department_id == department_id)
        
    if subject_id:
        query = query.filter(Attendance.subject_id == subject_id)
    if semester_id:
        query = query.filter(Attendance.semester_id == semester_id)
    if academic_year_id:
        query = query.filter(Attendance.academic_year_id == academic_year_id)
    if division_id:
        query = query.filter(Attendance.division_id == division_id)
    if student_id:
        query = query.filter(Attendance.student_id == student_id)

    records = query.all()
    res = []
    for r in records:
        res.append(AttendanceResponse(
            id=r.id,
            student_id=r.student_id,
            student_email=r.student.user.email,
            enrollment_no=r.student.enrollment_no,
            subject_id=r.subject_id,
            subject_name=r.subject.name,
            subject_code=r.subject.code,
            faculty_id=r.faculty_id,
            faculty_email=r.faculty.user.email,
            department_id=r.department_id,
            department_name=r.department.name,
            academic_year_id=r.academic_year_id,
            academic_year_name=r.academic_year.name,
            semester_id=r.semester_id,
            semester_name=r.semester.name,
            division_id=r.division_id,
            division_name=r.division.name,
            total_classes=r.total_classes,
            classes_attended=r.classes_attended,
            attendance_percentage=r.attendance_percentage
        ))
    return res

@router.post("/", response_model=AttendanceResponse)
def create_attendance(
    data: AttendanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_attendance_manager)
):
    # Role checks
    role = current_user.role.name.upper()
    if role == "FACULTY":
        faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
        if not faculty or faculty.id != data.faculty_id:
            raise HTTPException(status_code=403, detail="Cannot add attendance for other faculty")
    elif role == "HOD":
        faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
        if not faculty or faculty.department_id != data.department_id:
            raise HTTPException(status_code=403, detail="Cannot add attendance for other departments")
    elif role == "PROGRAM COORDINATOR":
        pc = db.query(ProgramCoordinator).filter(ProgramCoordinator.user_id == current_user.id).first()
        if not pc or pc.department_id != data.department_id:
            raise HTTPException(status_code=403, detail="Cannot add attendance for other departments")

    # Prevent negative classes and attended > total classes
    if data.classes_attended < 0 or data.total_classes <= 0:
        raise HTTPException(status_code=400, detail="Classes cannot be negative or total classes zero")
    if data.classes_attended > data.total_classes:
        raise HTTPException(status_code=400, detail="Attended classes cannot exceed total classes")

    # Validate student/subject relationships
    student = db.query(Student).filter(Student.id == data.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    subject = db.query(Subject).filter(Subject.id == data.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    if student.department_id != data.department_id:
        raise HTTPException(status_code=400, detail="Student does not belong to the specified department")
    if subject.department_id != data.department_id:
        raise HTTPException(status_code=400, detail="Subject does not belong to the specified department")

    # Safe percentage calculation
    if data.total_classes > 0:
        percentage = (data.classes_attended / data.total_classes) * 100
    else:
        percentage = 0.0

    # Prevent duplicate
    existing = db.query(Attendance).filter(
        Attendance.student_id == data.student_id,
        Attendance.subject_id == data.subject_id,
        Attendance.academic_year_id == data.academic_year_id,
        Attendance.semester_id == data.semester_id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Attendance record already exists for this student, subject, academic year, and semester")

    new_record = Attendance(
        student_id=data.student_id,
        subject_id=data.subject_id,
        faculty_id=data.faculty_id,
        department_id=data.department_id,
        academic_year_id=data.academic_year_id,
        semester_id=data.semester_id,
        division_id=data.division_id,
        total_classes=data.total_classes,
        classes_attended=data.classes_attended,
        attendance_percentage=percentage
    )
    db.add(new_record)
    db.commit()
    db.refresh(new_record)

    log_action(db, "ATTENDANCE_CREATED", current_user.id, "attendance", str(new_record.id))
    return AttendanceResponse(
        id=new_record.id,
        student_id=new_record.student_id,
        student_email=new_record.student.user.email,
        enrollment_no=new_record.student.enrollment_no,
        subject_id=new_record.subject_id,
        subject_name=new_record.subject.name,
        subject_code=new_record.subject.code,
        faculty_id=new_record.faculty_id,
        faculty_email=new_record.faculty.user.email,
        department_id=new_record.department_id,
        department_name=new_record.department.name,
        academic_year_id=new_record.academic_year_id,
        academic_year_name=new_record.academic_year.name,
        semester_id=new_record.semester_id,
        semester_name=new_record.semester.name,
        division_id=new_record.division_id,
        division_name=new_record.division.name,
        total_classes=new_record.total_classes,
        classes_attended=new_record.classes_attended,
        attendance_percentage=new_record.attendance_percentage
    )

@router.put("/{id}", response_model=AttendanceResponse)
def update_attendance(
    id: int,
    data: AttendanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_attendance_manager)
):
    record = db.query(Attendance).filter(Attendance.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    # Role checks
    role = current_user.role.name.upper()
    if role == "FACULTY":
        faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
        if not faculty or faculty.id != record.faculty_id:
            raise HTTPException(status_code=403, detail="Cannot edit attendance for other faculty")
    elif role in ["HOD", "PROGRAM COORDINATOR"]:
        user_dept = None
        if role == "HOD":
            fac = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
            user_dept = fac.department_id if fac else None
        else:
            pc = db.query(ProgramCoordinator).filter(ProgramCoordinator.user_id == current_user.id).first()
            user_dept = pc.department_id if pc else None
        
        if user_dept != record.department_id:
            raise HTTPException(status_code=403, detail="Cannot edit attendance for other departments")

    # Prevent negative classes and attended > total classes
    if data.classes_attended < 0 or data.total_classes <= 0:
        raise HTTPException(status_code=400, detail="Classes cannot be negative or total classes zero")
    if data.classes_attended > data.total_classes:
        raise HTTPException(status_code=400, detail="Attended classes cannot exceed total classes")

    # Safe percentage calculation
    if data.total_classes > 0:
        percentage = (data.classes_attended / data.total_classes) * 100
    else:
        percentage = 0.0

    record.total_classes = data.total_classes
    record.classes_attended = data.classes_attended
    record.attendance_percentage = percentage
    db.commit()
    db.refresh(record)

    log_action(db, "ATTENDANCE_UPDATED", current_user.id, "attendance", str(record.id))
    return AttendanceResponse(
        id=record.id,
        student_id=record.student_id,
        student_email=record.student.user.email,
        enrollment_no=record.student.enrollment_no,
        subject_id=record.subject_id,
        subject_name=record.subject.name,
        subject_code=record.subject.code,
        faculty_id=record.faculty_id,
        faculty_email=record.faculty.user.email,
        department_id=record.department_id,
        department_name=record.department.name,
        academic_year_id=record.academic_year_id,
        academic_year_name=record.academic_year.name,
        semester_id=record.semester_id,
        semester_name=record.semester.name,
        division_id=record.division_id,
        division_name=record.division.name,
        total_classes=record.total_classes,
        classes_attended=record.classes_attended,
        attendance_percentage=record.attendance_percentage
    )

@router.get("/student/{student_id}", response_model=List[AttendanceResponse])
def get_student_attendance(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    role = current_user.role.name.upper()
    if role == "STUDENT":
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student or student.id != student_id:
            raise HTTPException(status_code=403, detail="Cannot access other student attendance")
    elif role in ["HOD", "PROGRAM COORDINATOR"]:
        user_dept = None
        if role == "HOD":
            fac = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
            user_dept = fac.department_id if fac else None
        else:
            pc = db.query(ProgramCoordinator).filter(ProgramCoordinator.user_id == current_user.id).first()
            user_dept = pc.department_id if pc else None

        student = db.query(Student).filter(Student.id == student_id).first()
        if not student or student.department_id != user_dept:
            raise HTTPException(status_code=403, detail="Cannot access students from other departments")

    records = db.query(Attendance).filter(Attendance.student_id == student_id).all()
    res = []
    for r in records:
        res.append(AttendanceResponse(
            id=r.id,
            student_id=r.student_id,
            student_email=r.student.user.email,
            enrollment_no=r.student.enrollment_no,
            subject_id=r.subject_id,
            subject_name=r.subject.name,
            subject_code=r.subject.code,
            faculty_id=r.faculty_id,
            faculty_email=r.faculty.user.email,
            department_id=r.department_id,
            department_name=r.department.name,
            academic_year_id=r.academic_year_id,
            academic_year_name=r.academic_year.name,
            semester_id=r.semester_id,
            semester_name=r.semester.name,
            division_id=r.division_id,
            division_name=r.division.name,
            total_classes=r.total_classes,
            classes_attended=r.classes_attended,
            attendance_percentage=r.attendance_percentage
        ))
    return res

@router.get("/subject/{subject_id}", response_model=List[AttendanceResponse])
def get_subject_attendance(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    role = current_user.role.name.upper()
    if role == "FACULTY":
        faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
        if not faculty:
            raise HTTPException(status_code=403, detail="Faculty profile not found")
        # Ensure faculty teaches this subject
        assignment = db.query(FacultySubject).filter(
            FacultySubject.faculty_id == faculty.id,
            FacultySubject.subject_id == subject_id
        ).first()
        if not assignment:
            raise HTTPException(status_code=403, detail="Not assigned to this subject")

    records = db.query(Attendance).filter(Attendance.subject_id == subject_id).all()
    res = []
    for r in records:
        res.append(AttendanceResponse(
            id=r.id,
            student_id=r.student_id,
            student_email=r.student.user.email,
            enrollment_no=r.student.enrollment_no,
            subject_id=r.subject_id,
            subject_name=r.subject.name,
            subject_code=r.subject.code,
            faculty_id=r.faculty_id,
            faculty_email=r.faculty.user.email,
            department_id=r.department_id,
            department_name=r.department.name,
            academic_year_id=r.academic_year_id,
            academic_year_name=r.academic_year.name,
            semester_id=r.semester_id,
            semester_name=r.semester.name,
            division_id=r.division_id,
            division_name=r.division.name,
            total_classes=r.total_classes,
            classes_attended=r.classes_attended,
            attendance_percentage=r.attendance_percentage
        ))
    return res
