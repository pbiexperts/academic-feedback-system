from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.schemas.auth import Token, UserResponse
from app.core.security import create_access_token, verify_password
from app.api.dependencies import get_db, get_current_active_user
from app.models.user import User

router = APIRouter()

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
