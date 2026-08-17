import datetime
from sqlalchemy.orm import Session
from app.database.session import SessionLocal, engine
from app.database.base_class import Base
from app.models.user import Role, User, Student, Faculty
from app.models.academic import Department, Division, Subject, AcademicYear, Semester, FacultySubject
from app.models.evaluation import Questionnaire, Question, EvaluationCycle
from app.models.feedback import FeedbackSubmission, FeedbackAnswer, FeedbackComment
from app.core.security import get_password_hash

def seed_data(db: Session):
    # Base.metadata.create_all(bind=engine) # Assume tables are created via alembic or main

    # 1. Roles
    roles = ["Admin", "Dean", "HOD", "Faculty", "Student"]
    role_objs = {}
    for r in roles:
        role = db.query(Role).filter(Role.name == r).first()
        if not role:
            role = Role(name=r)
            db.add(role)
            db.commit()
            db.refresh(role)
        role_objs[r] = role

    # 2. Departments
    depts = [("Computer Science", "CS"), ("Electronics", "EC"), ("Mechanical", "ME")]
    dept_objs = {}
    for name, code in depts:
        dept = db.query(Department).filter(Department.code == code).first()
        if not dept:
            dept = Department(name=name, code=code)
            db.add(dept)
            db.commit()
            db.refresh(dept)
        dept_objs[code] = dept

    # 3. Divisions
    divisions = {}
    for code, dept in dept_objs.items():
        div = db.query(Division).filter(Division.department_id == dept.id, Division.name == "A").first()
        if not div:
            div = Division(name="A", department_id=dept.id)
            db.add(div)
            db.commit()
            db.refresh(div)
        divisions[code] = div

    # 4. Academic Year & Semester
    ay = db.query(AcademicYear).filter(AcademicYear.name == "2025-2026").first()
    if not ay:
        ay = AcademicYear(name="2025-2026", is_active=1)
        db.add(ay)
        db.commit()
        db.refresh(ay)
    
    semesters = {}
    for s in ["Semester 1", "Semester 2"]:
        sem = db.query(Semester).filter(Semester.name == s).first()
        if not sem:
            sem = Semester(name=s, academic_year_id=ay.id)
            db.add(sem)
            db.commit()
            db.refresh(sem)
        semesters[s] = sem
    
    active_sem = semesters["Semester 1"]

    # 5. Subjects
    subjects_data = {
        "CS": [("Data Structures", "CS101"), ("Algorithms", "CS102")],
        "EC": [("Digital Electronics", "EC101"), ("Signals", "EC102")],
        "ME": [("Thermodynamics", "ME101"), ("Fluid Mechanics", "ME102")]
    }
    subject_objs = {}
    for dept_code, subs in subjects_data.items():
        dept = dept_objs[dept_code]
        for name, code in subs:
            sub = db.query(Subject).filter(Subject.code == code).first()
            if not sub:
                sub = Subject(name=name, code=code, department_id=dept.id, semester_id=active_sem.id)
                db.add(sub)
                db.commit()
                db.refresh(sub)
            subject_objs[code] = sub

    # 6. Users (Admin, Dean, HODs, Faculty, Students)
    def create_user(email, password, role_name):
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                email=email,
                password_hash=get_password_hash(password),
                role_id=role_objs[role_name].id,
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        return user

    create_user("admin@safas.edu", "admin123", "Admin")
    create_user("dean@safas.edu", "dean123", "Dean")

    faculty_users = {}
    for code in ["CS", "EC", "ME"]:
        hod_email = f"hod.{code.lower()}@safas.edu"
        hod_user = create_user(hod_email, "hod123", "HOD")
        hod_fac = db.query(Faculty).filter(Faculty.user_id == hod_user.id).first()
        if not hod_fac:
            hod_fac = Faculty(user_id=hod_user.id, department_id=dept_objs[code].id, employee_id=f"HOD_{code}")
            db.add(hod_fac)
            db.commit()
            db.refresh(hod_fac)

        for i in range(1, 3):
            email = f"faculty{i}.{code.lower()}@safas.edu"
            fac_user = create_user(email, "faculty123", "Faculty")
            fac = db.query(Faculty).filter(Faculty.user_id == fac_user.id).first()
            if not fac:
                fac = Faculty(user_id=fac_user.id, department_id=dept_objs[code].id, employee_id=f"EMP_{code}_{i}")
                db.add(fac)
                db.commit()
                db.refresh(fac)
            faculty_users[email] = fac

    student_users = []
    student_count = 1
    for code in ["CS", "EC", "ME"]:
        for i in range(1, 4): # Total 9 students
            email = f"student{student_count}@safas.edu"
            stu_user = create_user(email, "student123", "Student")
            stu = db.query(Student).filter(Student.user_id == stu_user.id).first()
            if not stu:
                stu = Student(
                    user_id=stu_user.id,
                    department_id=dept_objs[code].id,
                    division_id=divisions[code].id,
                    enrollment_no=f"ENR_{student_count}"
                )
                db.add(stu)
                db.commit()
                db.refresh(stu)
            student_users.append(stu)
            student_count += 1
            
    # Add one more to make it 10
    stu_user = create_user("student10@safas.edu", "student123", "Student")
    stu = db.query(Student).filter(Student.user_id == stu_user.id).first()
    if not stu:
        stu = Student(
            user_id=stu_user.id,
            department_id=dept_objs["CS"].id,
            division_id=divisions["CS"].id,
            enrollment_no="ENR_10"
        )
        db.add(stu)
        db.commit()
        db.refresh(stu)
    student_users.append(stu)

    # 7. Faculty-Subject assignments
    fac_assignments = {
        "faculty1.cs@safas.edu": "CS101",
        "faculty2.cs@safas.edu": "CS102",
        "faculty1.ec@safas.edu": "EC101",
        "faculty2.ec@safas.edu": "EC102",
        "faculty1.me@safas.edu": "ME101",
        "faculty2.me@safas.edu": "ME102"
    }
    for email, sub_code in fac_assignments.items():
        fac = faculty_users[email]
        sub = subject_objs[sub_code]
        assign = db.query(FacultySubject).filter(FacultySubject.faculty_id == fac.id, FacultySubject.subject_id == sub.id).first()
        if not assign:
            assign = FacultySubject(faculty_id=fac.id, subject_id=sub.id, academic_year_id=ay.id)
            db.add(assign)
            db.commit()

    # 8. Questionnaire & Questions
    qnaire = db.query(Questionnaire).filter(Questionnaire.name == "Standard Feedback").first()
    if not qnaire:
        qnaire = Questionnaire(name="Standard Feedback", is_active=True)
        db.add(qnaire)
        db.commit()
        db.refresh(qnaire)
        
        questions = [
            ("The teacher covers the syllabus completely.", "Teaching", "rating", True, 1),
            ("The teacher communicates clearly.", "Communication", "rating", True, 2),
            ("The teacher is approachable.", "Behavior", "rating", True, 3),
            ("The classes are interactive.", "Teaching", "rating", True, 4),
            ("The evaluation is fair.", "Evaluation", "rating", True, 5),
            ("The teacher uses modern tools.", "Teaching", "rating", True, 6),
            ("Assignments are helpful.", "Evaluation", "rating", True, 7),
            ("What did you like best?", "General", "long_text", False, 8),
            ("What needs improvement?", "General", "long_text", False, 9),
            ("Any other comments?", "General", "long_text", False, 10),
        ]
        for text, cat, qtype, req, order in questions:
            q = Question(questionnaire_id=qnaire.id, text=text, category=cat, question_type=qtype, is_required=req, order_index=order)
            db.add(q)
        db.commit()

    # 9. Evaluation Cycle
    cycle = db.query(EvaluationCycle).filter(EvaluationCycle.name == "Mid-Sem Feedback 2025").first()
    if not cycle:
        cycle = EvaluationCycle(
            name="Mid-Sem Feedback 2025",
            academic_year_id=ay.id,
            semester_id=active_sem.id,
            questionnaire_id=qnaire.id,
            start_date=datetime.date.today() - datetime.timedelta(days=7),
            end_date=datetime.date.today() + datetime.timedelta(days=7),
            status="ACTIVE",
            minimum_response_threshold=5
        )
        db.add(cycle)
        db.commit()
        db.refresh(cycle)

    # 10. Sample Feedback (Exceeding privacy threshold of 5 for ALL assignments)
    import random
    random.seed(42)  # For reproducibility
    
    rating_qs = db.query(Question).filter(Question.questionnaire_id == qnaire.id, Question.question_type == "rating").all()
    
    # Submit feedback from all students to their department's faculty
    for fac_email, sub_code in fac_assignments.items():
        fac = faculty_users[fac_email]
        sub = subject_objs[sub_code]
        dept_students = [s for s in student_users if s.department_id == sub.department_id]
        
        for student in dept_students:
            subm = db.query(FeedbackSubmission).filter(
                FeedbackSubmission.student_id == student.id,
                FeedbackSubmission.evaluation_cycle_id == cycle.id,
                FeedbackSubmission.subject_id == sub.id
            ).first()
            
            if not subm:
                # Generate varied, realistic ratings (weighted towards 3-5)
                ratings = [random.choices([1, 2, 3, 4, 5], weights=[2, 5, 20, 40, 33], k=1)[0] for _ in rating_qs]
                overall = round(sum(ratings) / len(ratings), 2)
                
                subm = FeedbackSubmission(
                    student_id=student.id,
                    faculty_id=fac.id,
                    subject_id=sub.id,
                    department_id=student.department_id,
                    evaluation_cycle_id=cycle.id,
                    overall_faculty_rating=overall,
                    overall_subject_rating=overall,
                    status="SUBMITTED"
                )
                db.add(subm)
                db.commit()
                db.refresh(subm)
                
                for j, q in enumerate(rating_qs):
                    ans = FeedbackAnswer(submission_id=subm.id, question_id=q.id, rating=ratings[j])
                    db.add(ans)
                
                # Add sample comments
                comment_pool = [
                    ("what_liked", "Great teaching methodology with practical examples."),
                    ("what_liked", "Very engaging lectures and clear explanations."),
                    ("what_improved", "More hands-on lab sessions would be helpful."),
                    ("what_improved", "Pace could be adjusted for complex topics."),
                    ("additional", "Overall a valuable learning experience."),
                ]
                chosen = random.choice(comment_pool)
                db.add(FeedbackComment(submission_id=subm.id, comment_type=chosen[0], comment_text=chosen[1]))
                db.commit()

    print("Database seeded successfully!")
    print("\nDemo Credentials (all use the listed passwords):")
    print("  Admin:    admin@safas.edu / admin123")
    print("  Dean:     dean@safas.edu / dean123")
    print("  HOD CS:   hod.cs@safas.edu / hod123")
    print("  HOD EC:   hod.ec@safas.edu / hod123")
    print("  HOD ME:   hod.me@safas.edu / hod123")
    print("  Faculty:  faculty1.cs@safas.edu / faculty123")
    print("  Student:  student1@safas.edu / student123")

if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_data(db)
    finally:
        db.close()
