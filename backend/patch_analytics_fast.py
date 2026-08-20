import re

with open('app/api/analytics.py', 'r') as f:
    content = f.read()

# Make sure imports are present
if "from app.models.analytics_summary" not in content:
    content = content.replace(
        "from app.models.feedback import FeedbackSubmission, FeedbackAnswer, FeedbackComment",
        "from app.models.feedback import FeedbackSubmission, FeedbackAnswer, FeedbackComment\nfrom app.models.analytics_summary import FacultySubjectSummary, DepartmentSummary, CollegeSummary"
    )

# Replace get_hod_dashboard
hod_old = r"""    # Compute faculty performance in the department
    faculty_map = \{\}
    for s in submissions:
        key = \(s\.faculty_id, s\.subject_id\)
        if key not in faculty_map:
            faculty_map\[key\] = \{"total_rating": 0, "count": 0\}
        if s\.overall_faculty_rating:
            faculty_map\[key\]\["total_rating"\] \+= s\.overall_faculty_rating
            faculty_map\[key\]\["count"\] \+= 1
            
    faculty_performance = \[\]
    for \(faculty_id, subject_id\), data in faculty_map\.items\(\):
        if data\["count"\] >= settings\.MINIMUM_RESPONSES_FOR_ANALYTICS:
            fac = db\.query\(Faculty\)\.filter\(Faculty\.id == faculty_id\)\.first\(\)
            usr = db\.query\(User\)\.filter\(User\.id == fac\.user_id\)\.first\(\) if fac else None
            sub = db\.query\(Subject\)\.filter\(Subject\.id == subject_id\)\.first\(\)
            
            faculty_performance\.append\(FacultyPerformanceBase\(
                faculty_id=faculty_id,
                faculty_name=usr\.email if usr else f"Faculty \{faculty_id\}",
                subject_id=subject_id, 
                subject_name=sub\.name if sub else f"Subject \{subject_id\}",
                overall_rating=data\["total_rating"\] / data\["count"\],
                response_count=data\["count"\],
                response_rate=80\.0
            \)\)"""

hod_new = """    # Query summary tables instead of iterating submissions
    summaries = db.query(FacultySubjectSummary).filter(
        FacultySubjectSummary.department_id == department_id,
        FacultySubjectSummary.response_count >= settings.MINIMUM_RESPONSES_FOR_ANALYTICS
    ).all()

    faculty_performance = []
    for summary in summaries:
        fac = db.query(Faculty).filter(Faculty.id == summary.faculty_id).first()
        usr = db.query(User).filter(User.id == fac.user_id).first() if fac else None
        sub = db.query(Subject).filter(Subject.id == summary.subject_id).first()
        
        faculty_performance.append(FacultyPerformanceBase(
            faculty_id=summary.faculty_id,
            faculty_name=usr.email if usr else f"Faculty {summary.faculty_id}",
            subject_id=summary.subject_id, 
            subject_name=sub.name if sub else f"Subject {summary.subject_id}",
            overall_rating=summary.average_rating,
            response_count=summary.response_count,
            response_rate=80.0
        ))"""

content = re.sub(hod_old, hod_new, content)

# Replace get_dean_dashboard
dean_old = r"""    # Compute department performance
    dept_map = \{\}
    faculty_by_dept = \{\}
    for s in submissions:
        dept_id = s\.department_id
        if dept_id not in dept_map:
            dept_map\[dept_id\] = \{"total_rating": 0, "count": 0\}
            faculty_by_dept\[dept_id\] = set\(\)
            
        if s\.overall_faculty_rating:
            dept_map\[dept_id\]\["total_rating"\] \+= s\.overall_faculty_rating
            dept_map\[dept_id\]\["count"\] \+= 1
        faculty_by_dept\[dept_id\]\.add\(s\.faculty_id\)

    department_performance = \[\]
    for dept_id, data in dept_map\.items\(\):
        if data\["count"\] > 0:
            dept = db\.query\(Department\)\.filter\(Department\.id == dept_id\)\.first\(\)
            department_performance\.append\(DepartmentPerformanceBase\(
                department_id=dept_id,
                department_name=dept\.name if dept else f"Dept \{dept_id\}",
                overall_rating=data\["total_rating"\] / data\["count"\],
                total_responses=data\["count"\],
                faculty_count=len\(faculty_by_dept\[dept_id\]\)
            \)\)"""

dean_new = """    # Query summary tables
    summaries = db.query(DepartmentSummary).all()

    department_performance = []
    for summary in summaries:
        dept = db.query(Department).filter(Department.id == summary.department_id).first()
        department_performance.append(DepartmentPerformanceBase(
            department_id=summary.department_id,
            department_name=dept.name if dept else f"Dept {summary.department_id}",
            overall_rating=summary.average_rating,
            total_responses=summary.total_responses,
            faculty_count=summary.faculty_count
        ))"""

content = re.sub(dean_old, dean_new, content)

with open('app/api/analytics.py', 'w') as f:
    f.write(content)

print("Patched analytics.py")
