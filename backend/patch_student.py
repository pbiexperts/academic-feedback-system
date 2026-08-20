import re

with open('app/api/student.py', 'r') as f:
    content = f.read()

# Add BackgroundTasks to import if missing
if "BackgroundTasks" not in content:
    content = content.replace(
        "from fastapi import APIRouter, Depends, HTTPException",
        "from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks"
    )

# Add imports for analytics builder
if "from app.services.analytics_builder" not in content:
    content = content.replace(
        "from sqlalchemy.orm import Session",
        "from sqlalchemy.orm import Session\nfrom app.services.analytics_builder import refresh_faculty_subject_summary, refresh_department_summary, refresh_college_summary"
    )

# Update submit_feedback signature
signature_old = """@router.post("/feedback", response_model=FeedbackSubmissionResponse)
def submit_feedback(
    submission_data: FeedbackSubmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):"""
signature_new = """@router.post("/feedback", response_model=FeedbackSubmissionResponse)
def submit_feedback(
    submission_data: FeedbackSubmissionCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):"""
content = content.replace(signature_old, signature_new)

# Update end of submit_feedback
end_old = """    db.commit()
    db.refresh(submission)
    
    return submission"""
end_new = """    db.commit()
    db.refresh(submission)
    
    # Trigger background tasks to update analytics summaries
    background_tasks.add_task(refresh_faculty_subject_summary, db, submission_data.faculty_id, submission_data.subject_id, submission_data.department_id)
    background_tasks.add_task(refresh_department_summary, db, submission_data.department_id)
    background_tasks.add_task(refresh_college_summary, db)
    
    return submission"""
content = content.replace(end_old, end_new)

with open('app/api/student.py', 'w') as f:
    f.write(content)

print("Patched student.py")
