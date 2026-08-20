from pydantic import BaseModel, ConfigDict
from typing import Optional, List

class DepartmentBase(BaseModel):
    name: str
    code: str

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentResponse(DepartmentBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

class DivisionBase(BaseModel):
    name: str
    department_id: int

class DivisionCreate(DivisionBase):
    pass

class DivisionResponse(DivisionBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

class SubjectBase(BaseModel):
    name: str
    code: str
    department_id: int
    semester_id: int

class SubjectCreate(SubjectBase):
    pass

class SubjectResponse(SubjectBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

class AcademicYearBase(BaseModel):
    name: str
    is_active: int = 1

class AcademicYearCreate(AcademicYearBase):
    pass

class AcademicYearResponse(AcademicYearBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

class SemesterBase(BaseModel):
    name: str
    academic_year_id: int

class SemesterCreate(SemesterBase):
    pass

class SemesterResponse(SemesterBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

class FacultySubjectBase(BaseModel):
    faculty_id: int
    subject_id: int
    academic_year_id: int

class FacultySubjectCreate(FacultySubjectBase):
    pass

class FacultySubjectResponse(FacultySubjectBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
