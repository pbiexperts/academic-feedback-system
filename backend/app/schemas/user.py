from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class RoleBase(BaseModel):
    name: str

class Role(RoleBase):
    id: int
    class Config:
        from_attributes = True

class UserBase(BaseModel):
    email: EmailStr
    role_id: int
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    role_id: Optional[int] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class User(UserBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

class StudentBase(BaseModel):
    department_id: int
    division_id: int
    enrollment_no: str

class StudentCreate(StudentBase):
    user_id: int

class Student(StudentBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

class FacultyBase(BaseModel):
    department_id: int
    employee_id: str

class FacultyCreate(FacultyBase):
    user_id: int

class Faculty(FacultyBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True
