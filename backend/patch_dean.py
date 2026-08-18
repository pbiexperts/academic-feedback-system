import re

content = open('app/api/analytics.py', 'r').read()

old_code = """    department_performance = []
    for dept_id, data in dept_map.items():
        if data["count"] > 0:
            department_performance.append(DepartmentPerformanceBase(
                department_id=dept_id,
                overall_rating=data["total_rating"] / data["count"],
                total_responses=data["count"],
                faculty_count=len(faculty_by_dept[dept_id])
            ))"""

new_code = """    department_performance = []
    for dept_id, data in dept_map.items():
        if data["count"] > 0:
            dept = db.query(Department).filter(Department.id == dept_id).first()
            department_performance.append(DepartmentPerformanceBase(
                department_id=dept_id,
                department_name=dept.name if dept else f"Dept {dept_id}",
                overall_rating=data["total_rating"] / data["count"],
                total_responses=data["count"],
                faculty_count=len(faculty_by_dept[dept_id])
            ))"""

if old_code in content:
    content = content.replace(old_code, new_code)
    open('app/api/analytics.py', 'w').write(content)
    print("Patched get_dean_dashboard")
else:
    print("Could not find old code block in get_dean_dashboard")
