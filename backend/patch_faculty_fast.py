import re

with open('app/api/analytics.py', 'r') as f:
    content = f.read()

faculty_old = r"""    submissions = db\.query\(FeedbackSubmission\)\.filter\(
        FeedbackSubmission\.faculty_id == faculty\.id
    \)\.all\(\)
    
    total_responses = len\(submissions\)
    if total_responses < settings\.MINIMUM_RESPONSES_FOR_ANALYTICS:
        return FacultyDashboardResponse\(
            overall_rating=0\.0,
            total_responses=total_responses,
            subjects_evaluated=0,
            performance=\[\]
        \) # Mask details if threshold not met

    overall_rating = sum\(s\.overall_faculty_rating for s in submissions if s\.overall_faculty_rating\) / total_responses if total_responses else 0\.0
    
    # Compute performance per subject
    subject_map = \{\}
    for s in submissions:
        if s\.subject_id not in subject_map:
            subject_map\[s\.subject_id\] = \{"total_rating": 0, "count": 0\}
        if s\.overall_faculty_rating:
            subject_map\[s\.subject_id\]\["total_rating"\] \+= s\.overall_faculty_rating
            subject_map\[s\.subject_id\]\["count"\] \+= 1
            
    performance = \[\]
    for subject_id, data in subject_map\.items\(\):
        if data\["count"\] > 0:
            subject = db\.query\(Subject\)\.filter\(Subject\.id == subject_id\)\.first\(\)
            subject_name = subject\.name if subject else f"Subject \{subject_id\}"
            performance\.append\(FacultyPerformanceBase\(
                faculty_id=faculty\.id,
                subject_id=subject_id,
                subject_name=subject_name,
                overall_rating=data\["total_rating"\] / data\["count"\],
                response_count=data\["count"\],
                response_rate=80\.0 # Mock response rate
            \)\)"""

faculty_new = """    # Query summary tables
    summaries = db.query(FacultySubjectSummary).filter(
        FacultySubjectSummary.faculty_id == faculty.id
    ).all()

    total_responses = sum(s.response_count for s in summaries)
    
    if total_responses < settings.MINIMUM_RESPONSES_FOR_ANALYTICS:
        return FacultyDashboardResponse(
            overall_rating=0.0,
            total_responses=total_responses,
            subjects_evaluated=0,
            performance=[]
        ) # Mask details if threshold not met

    total_rating = sum(s.average_rating * s.response_count for s in summaries)
    overall_rating = total_rating / total_responses if total_responses else 0.0

    performance = []
    for summary in summaries:
        if summary.response_count > 0:
            subject = db.query(Subject).filter(Subject.id == summary.subject_id).first()
            subject_name = subject.name if subject else f"Subject {summary.subject_id}"
            performance.append(FacultyPerformanceBase(
                faculty_id=faculty.id,
                subject_id=summary.subject_id,
                subject_name=subject_name,
                overall_rating=summary.average_rating,
                response_count=summary.response_count,
                response_rate=80.0 # Mock response rate
            ))"""

content = re.sub(faculty_old, faculty_new, content)

with open('app/api/analytics.py', 'w') as f:
    f.write(content)

print("Patched get_faculty_dashboard")
