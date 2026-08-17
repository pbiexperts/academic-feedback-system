from fastapi import APIRouter
from app.api import auth, admin, student, analytics, reports

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(student.router, prefix="/student", tags=["student"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
