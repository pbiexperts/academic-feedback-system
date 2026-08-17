from pydantic import BaseModel
from typing import Optional, List

class FacultyPerformanceBase(BaseModel):
    faculty_id: int
    subject_id: int
    subject_name: Optional[str] = None
    overall_rating: float
    response_count: int
    response_rate: float
    
class FacultyDashboardResponse(BaseModel):
    overall_rating: float
    total_responses: int
    subjects_evaluated: int
    performance: List[FacultyPerformanceBase]
    
class SuggestionItem(BaseModel):
    subject_name: str
    suggestion_type: str
    text: str
    sentiment: Optional[str] = None

class FacultySuggestionsResponse(BaseModel):
    is_masked: bool
    suggestions: List[SuggestionItem]

class DepartmentPerformanceBase(BaseModel):
    department_id: int
    overall_rating: float
    total_responses: int
    faculty_count: int

class HODDashboardResponse(BaseModel):
    department_id: int
    overall_rating: float
    total_responses: int
    faculty_performance: List[FacultyPerformanceBase]

class DeanDashboardResponse(BaseModel):
    college_rating: float
    total_responses: int
    department_performance: List[DepartmentPerformanceBase]
