from fastapi import Depends, HTTPException, status
from app.models.user import User
from app.api.dependencies import get_current_active_user

class RoleChecker:
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_active_user)):
        user_role = current_user.role.name.upper() if current_user.role else ""
        allowed_roles_upper = [r.upper() for r in self.allowed_roles]
        if user_role not in allowed_roles_upper:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted"
            )
        return current_user

# Pre-configured dependencies
require_admin = RoleChecker(["Admin"])
require_dean = RoleChecker(["Admin", "Dean"])
require_hod = RoleChecker(["Admin", "Dean", "HOD"])
require_program_coordinator = RoleChecker(["Admin", "Program Coordinator"])
require_faculty = RoleChecker(["Faculty"])
require_student = RoleChecker(["Student"])

def verify_pc_dept(current_user: User, department_id: int, db = None):
    """
    Ensures Program Coordinator only accesses their own department.
    """
    if current_user.role.name.upper() == "ADMIN":
        return
    if current_user.role.name.upper() == "PROGRAM COORDINATOR":
        if not current_user.program_coordinator_profile or current_user.program_coordinator_profile.department_id != department_id:
            raise HTTPException(status_code=403, detail="Access denied to this department")
    else:
        raise HTTPException(status_code=403, detail="Operation not permitted")

def verify_hod_dept(current_user: User, department_id: int, db = None):
    """
    Ensures HOD only accesses their own department.
    """
    if current_user.role.name.upper() in ["ADMIN", "DEAN"]:
        return
    if current_user.role.name.upper() == "HOD":
        if not current_user.faculty_profile or current_user.faculty_profile.department_id != department_id:
            raise HTTPException(status_code=403, detail="Access denied to this department")
    else:
        raise HTTPException(status_code=403, detail="Operation not permitted")
