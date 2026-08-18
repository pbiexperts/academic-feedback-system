from pydantic import BaseModel, ConfigDict, EmailStr
from typing import Optional

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None

class Login(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    role_id: int
    role_name: str = ""
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
