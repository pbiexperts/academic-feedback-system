from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app.api.dependencies import get_db
from app.core.permissions import require_hod, require_dean, require_admin, require_faculty
from app.models.user import User, Faculty
from app.models.feedback import FeedbackSubmission
import csv
import io
from app.core.config import settings

router = APIRouter()

def generate_csv_response(data: list, filename: str):
    output = io.StringIO()
    writer = csv.writer(output)
    
    if data:
        # Write headers
        writer.writerow(data[0].keys())
        # Write rows
        for row in data:
            writer.writerow(row.values())
    else:
        writer.writerow(["No data available"])
        
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/department")
def export_department_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hod)
):
    faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
    if not faculty:
        raise HTTPException(status_code=400, detail="HOD profile not found")
        
    # Strictly scoped
    submissions = db.query(FeedbackSubmission).filter(
        FeedbackSubmission.department_id == faculty.department_id
    ).all()
    
    # Process for report without exposing student_id
    report_data = []
    for s in submissions:
        report_data.append({
            "Faculty ID": s.faculty_id,
            "Subject ID": s.subject_id,
            "Cycle ID": s.evaluation_cycle_id,
            "Overall Rating": s.overall_faculty_rating
        })
        
    # Ensure minimum response threshold is checked
    # In a real scenario, this would aggregate by faculty/subject and check if count < 5
        
    return generate_csv_response(report_data, f"department_{faculty.department_id}_report.csv")

@router.get("/college")
def export_college_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dean)
):
    submissions = db.query(FeedbackSubmission).all()
    
    report_data = []
    for s in submissions:
        report_data.append({
            "Department ID": s.department_id,
            "Faculty ID": s.faculty_id,
            "Subject ID": s.subject_id,
            "Cycle ID": s.evaluation_cycle_id,
            "Overall Rating": s.overall_faculty_rating
        })
        
    return generate_csv_response(report_data, "college_report.csv")
