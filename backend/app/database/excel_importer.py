import pandas as pd
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from datetime import datetime

from app.database.session import SessionLocal, engine
from app.database.base_class import Base
from app.models.user import User, Faculty, Student, Role
from app.models.academic import Department, Subject, Division, AcademicYear, Semester, FacultySubject
from app.models.feedback import FeedbackSubmission, FeedbackAnswer, FeedbackComment
from app.models.evaluation import EvaluationCycle, Questionnaire, Question

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def clean_email(name: str, id_str: str, role: str) -> str:
    # Generates a standard email, e.g. prof.varshayadav@safas.edu or che-fac01@safas.edu
    clean_id = id_str.lower().replace(" ", "").replace("-", "")
    return f"{clean_id}@safas.edu"

def clear_existing_data(db: Session):
    print("Clearing existing data...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db.commit()

def import_excel_data(file_path: str):
    db = SessionLocal()
    try:
        clear_existing_data(db)

        xl = pd.ExcelFile(file_path)

        # 1. Base Setup (Academic Year, Semester, Divisions, Roles)
        ay = AcademicYear(name="2025-2026", is_active=True)
        sem1 = Semester(name="Semester 1")
        sem2 = Semester(name="Semester 2")
        db.add_all([ay, sem1, sem2])
        db.commit()

        roles = {}
        for r_name in ["ADMIN", "HOD", "FACULTY", "STUDENT"]:
            r = Role(name=r_name)
            db.add(r)
            db.commit()
            db.refresh(r)
            roles[r_name] = r

        # 2. Departments
        print("Importing Departments...")
        df_dept = pd.read_excel(xl, sheet_name='Departments')
        dept_map = {}
        for _, row in df_dept.iterrows():
            code = str(row['Department Code']).strip()
            name = str(row['Department Name']).strip()
            if pd.isna(code) or code == 'nan': continue
            
            dept = Department(name=name, code=code)
            db.add(dept)
            db.commit()
            db.refresh(dept)
            dept_map[code] = dept

            # Add default Division A for each dept
            div = Division(name="A", department_id=dept.id)
            db.add(div)
            db.commit()

        # 3. Admin and HODs
        print("Importing Admin & HODs...")
        df_admin = pd.read_excel(xl, sheet_name='Admin_HOD_Users', skiprows=3)
        for _, row in df_admin.iterrows():
            role_name = str(row['Role']).strip().upper()
            if pd.isna(role_name) or role_name == 'NAN': continue
            
            email = str(row['Email']).strip()
            name = str(row['Name']).strip()
            pwd = str(row['Password (demo only)']).strip()
            
            user = User(email=email, password_hash=get_password_hash(pwd), role_id=roles[role_name].id, is_active=True)
            db.add(user)
            db.commit()
            db.refresh(user)

            if role_name == "HOD":
                dept_code = str(row['Department Code']).strip()
                if dept_code in dept_map:
                    fac = Faculty(user_id=user.id, department_id=dept_map[dept_code].id, employee_id=f"HOD_{dept_code}")
                    db.add(fac)
                    db.commit()

        # 4. Faculty
        print("Importing Faculty...")
        df_fac = pd.read_excel(xl, sheet_name='Faculty')
        fac_map = {}
        for _, row in df_fac.iterrows():
            fac_id = str(row['Faculty ID']).strip()
            name = str(row['Faculty Name']).strip()
            dept_code = str(row['Department Code']).strip()
            if pd.isna(fac_id) or fac_id == 'nan': continue
            
            email = clean_email(name, fac_id, "faculty")
            user = User(email=email, password_hash=get_password_hash("Safas@123"), role_id=roles["FACULTY"].id, is_active=True)
            db.add(user)
            db.commit()
            db.refresh(user)

            fac = Faculty(user_id=user.id, department_id=dept_map[dept_code].id, employee_id=fac_id)
            db.add(fac)
            db.commit()
            db.refresh(fac)
            fac_map[fac_id] = fac

        # 5. Subjects
        print("Importing Subjects...")
        df_sub = pd.read_excel(xl, sheet_name='Subjects')
        sub_map = {}
        for _, row in df_sub.iterrows():
            sub_code = str(row['Subject Code']).strip()
            name = str(row['Subject Name']).strip()
            dept_code = str(row['Department Code']).strip()
            if pd.isna(sub_code) or sub_code == 'nan': continue
            
            sub = Subject(name=name, code=sub_code, department_id=dept_map[dept_code].id, semester_id=sem1.id)
            db.add(sub)
            db.commit()
            db.refresh(sub)
            sub_map[sub_code] = sub

            # Link Subject to Faculty
            fac_id = str(row['Faculty ID']).strip()
            if fac_id in fac_map:
                fac = fac_map[fac_id]
                fs = FacultySubject(faculty_id=fac.id, subject_id=sub.id, academic_year_id=ay.id)
                db.add(fs)
                db.commit()

        # 6. Students
        print("Importing Students...")
        df_stu = pd.read_excel(xl, sheet_name='Students')
        stu_map = {}
        for _, row in df_stu.iterrows():
            stu_id = str(row['Student ID']).strip()
            name = str(row['Student Name']).strip()
            dept_code = str(row['Department Code']).strip()
            if pd.isna(stu_id) or stu_id == 'nan': continue
            
            email = clean_email(name, stu_id, "student")
            user = User(email=email, password_hash=get_password_hash("Safas@123"), role_id=roles["STUDENT"].id, is_active=True)
            db.add(user)
            db.commit()
            db.refresh(user)

            div = db.query(Division).filter(Division.department_id == dept_map[dept_code].id).first()
            stu = Student(user_id=user.id, department_id=dept_map[dept_code].id, division_id=div.id, enrollment_no=stu_id)
            db.add(stu)
            db.commit()
            db.refresh(stu)
            stu_map[stu_id] = stu

        # 7. Feedback Schema (Questionnaire)
        print("Building Feedback Schema...")
        questionnaire = Questionnaire(name="Standard Theory Evaluation", is_active=True)
        db.add(questionnaire)
        db.commit()
        db.refresh(questionnaire)

        df_schema = pd.read_excel(xl, sheet_name='Feedback_Schema', header=None).fillna('')
        q_map = {}
        order_index = 1
        for idx in range(3, len(df_schema)):
            q_text = str(df_schema.iloc[idx, 0]).strip()
            if not q_text: continue
            q = Question(questionnaire_id=questionnaire.id, text=q_text, question_type="rating", category="teaching_learning", order_index=order_index)
            db.add(q)
            db.commit()
            db.refresh(q)
            # Find a short key to map questions to columns in responses
            # e.g., "Communication Skills" -> Match with column header
            q_map[q_text] = q
            order_index += 1

        cycle = EvaluationCycle(name="Mid-Term Eval 2026", academic_year_id=ay.id, semester_id=sem1.id, questionnaire_id=questionnaire.id, start_date=datetime(2026,3,1), end_date=datetime(2026,5,1), status="ACTIVE")
        db.add(cycle)
        db.commit()
        db.refresh(cycle)

        # 8. Feedback Responses
        print("Importing Feedback Responses...")
        df_resp = pd.read_excel(xl, sheet_name='Feedback_Responses', skiprows=3)
        for _, row in df_resp.iterrows():
            resp_id = str(row.iloc[0]).strip()
            if pd.isna(resp_id) or resp_id == 'nan' or not resp_id.startswith('RESP'): continue
            
            fac_id = str(row['Faculty ID']).strip()
            sub_code = str(row['Subject Code']).strip()
            stu_id = str(row['Student ID']).strip()
            
            if fac_id not in fac_map or sub_code not in sub_map or stu_id not in stu_map:
                continue
                
            stu = stu_map[stu_id]
            fac = fac_map[fac_id]
            sub = sub_map[sub_code]
            
            overall_rating = float(row['Overall Rating']) if not pd.isna(row['Overall Rating']) else 0.0

            subm = FeedbackSubmission(
                student_id=stu.id,
                faculty_id=fac.id,
                subject_id=sub.id,
                department_id=stu.department_id,
                evaluation_cycle_id=cycle.id,
                overall_faculty_rating=overall_rating,
                status="SUBMITTED"
            )
            db.add(subm)
            db.commit()
            db.refresh(subm)

            # Map Answers
            # Columns 8 through 15 are ratings
            col_idx = 8
            for q_text, q_obj in q_map.items():
                if col_idx < 16:
                    rating = int(row.iloc[col_idx]) if not pd.isna(row.iloc[col_idx]) else 3
                    ans = FeedbackAnswer(submission_id=subm.id, question_id=q_obj.id, rating=rating)
                    db.add(ans)
                    col_idx += 1
            
            # Map Comments
            comment_text = str(row['Student Comment']).strip()
            if comment_text and comment_text != 'nan':
                c = FeedbackComment(submission_id=subm.id, comment_type="text_answer", comment_text=comment_text)
                db.add(c)
                ans_text = FeedbackAnswer(submission_id=subm.id, question_id=q_obj.id, text_answer=comment_text)
                db.add(ans_text)
            
            db.commit()

        print("ETL Import Complete! Database is populated with Excel Data.")

    except Exception as e:
        print("Error during import:", str(e))
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    import sys
    import os
    # Add project root to sys.path
    sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    import_excel_data("../College_Feedback_Master_Data.xlsx")
