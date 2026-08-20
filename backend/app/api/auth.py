from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.schemas.auth import Token, UserResponse, ForgotPasswordRequest, ChangePasswordRequest
from app.core.security import create_access_token, verify_password, get_password_hash
from app.api.dependencies import get_db, get_current_active_user
from app.models.user import User, Student

router = APIRouter()

def validate_new_password(password: str) -> None:
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters long")

@router.post("/login", response_model=Token)
def login(
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    role_name = user.role.name if user.role else "Unknown"
    access_token = create_access_token(subject=user.id, role=role_name)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
    }

@router.get("/me")
def get_me(current_user: User = Depends(get_current_active_user)):
    """
    Get current user details with role name
    """
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role_id": current_user.role_id,
        "role_name": current_user.role.name if current_user.role else "Unknown",
        "is_active": current_user.is_active
    }

@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    validate_new_password(request.new_password)
    user = db.query(User).filter(User.email == request.email).first()
    student = db.query(Student).filter(Student.user_id == user.id).first() if user else None
    if not user or not student or student.phone_no != request.phone_no:
        raise HTTPException(status_code=400, detail="Email and registered phone number do not match")
    user.password_hash = get_password_hash(request.new_password)
    db.commit()
    return {"message": "Password reset successfully"}

@router.post("/change-password")
def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if not verify_password(request.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    validate_new_password(request.new_password)
    current_user.password_hash = get_password_hash(request.new_password)
    db.commit()
    return {"message": "Password changed successfully"}
