from fastapi import APIRouter
from app.api import auth, admin, student, analytics, reports, program_coordinator, attendance

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(student.router, prefix="/student", tags=["student"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(program_coordinator.router, prefix="/program-coordinator", tags=["program-coordinator"])
api_router.include_router(attendance.router, prefix="/attendance", tags=["attendance"])
