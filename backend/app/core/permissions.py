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
require_faculty = RoleChecker(["Faculty"])
require_student = RoleChecker(["Student"])
