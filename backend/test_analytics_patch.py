import re

content = open('app/api/analytics.py', 'r').read()

old_code = """    faculty_map = {}
    for s in submissions:
        if s.faculty_id not in faculty_map:
            faculty_map[s.faculty_id] = {"total_rating": 0, "count": 0}
        if s.overall_faculty_rating:
            faculty_map[s.faculty_id]["total_rating"] += s.overall_faculty_rating
            faculty_map[s.faculty_id]["count"] += 1
            
    faculty_performance = []
    for faculty_id, data in faculty_map.items():
        if data["count"] >= settings.MINIMUM_RESPONSES_FOR_ANALYTICS:
            faculty_performance.append(FacultyPerformanceBase(
                faculty_id=faculty_id,
                subject_id=0, # Aggregate across subjects
                overall_rating=data["total_rating"] / data["count"],
                response_count=data["count"],
                response_rate=80.0
            ))"""

new_code = """    faculty_map = {}
    for s in submissions:
        key = (s.faculty_id, s.subject_id)
        if key not in faculty_map:
            faculty_map[key] = {"total_rating": 0, "count": 0}
        if s.overall_faculty_rating:
            faculty_map[key]["total_rating"] += s.overall_faculty_rating
            faculty_map[key]["count"] += 1
            
    faculty_performance = []
    for (faculty_id, subject_id), data in faculty_map.items():
        if data["count"] >= settings.MINIMUM_RESPONSES_FOR_ANALYTICS:
            fac = db.query(Faculty).filter(Faculty.id == faculty_id).first()
            usr = db.query(User).filter(User.id == fac.user_id).first() if fac else None
            sub = db.query(Subject).filter(Subject.id == subject_id).first()
            
            faculty_performance.append(FacultyPerformanceBase(
                faculty_id=faculty_id,
                faculty_name=usr.email if usr else f"Faculty {faculty_id}",
                subject_id=subject_id, 
                subject_name=sub.name if sub else f"Subject {subject_id}",
                overall_rating=data["total_rating"] / data["count"],
                response_count=data["count"],
                response_rate=80.0
            ))"""

if old_code in content:
    content = content.replace(old_code, new_code)
    open('app/api/analytics.py', 'w').write(content)
    print("Patched app/api/analytics.py")
else:
    print("Could not find old code block in app/api/analytics.py")
