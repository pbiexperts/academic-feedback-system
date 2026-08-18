from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import date, datetime

class QuestionBase(BaseModel):
    text: str
    category: str
    question_type: str
    is_required: bool = True
    order_index: int = 0

class QuestionCreate(QuestionBase):
    pass

class QuestionResponse(QuestionBase):
    id: int
    questionnaire_id: int

    model_config = ConfigDict(from_attributes=True)

class QuestionnaireBase(BaseModel):
    name: str
    is_active: bool = True

class QuestionnaireCreate(QuestionnaireBase):
    questions: List[QuestionCreate] = []

class QuestionnaireResponse(QuestionnaireBase):
    id: int
    created_at: datetime
    questions: List[QuestionResponse] = []

    model_config = ConfigDict(from_attributes=True)

class EvaluationCycleBase(BaseModel):
    name: str
    academic_year_id: int
    semester_id: int
    questionnaire_id: int
    start_date: date
    end_date: date
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    scope: Optional[str] = "COLLEGE"
    created_by: Optional[int] = None
    timezone: Optional[str] = "UTC"
    status: str = "UPCOMING"
    minimum_response_threshold: int = 5

class EvaluationCycleCreate(EvaluationCycleBase):
    pass

class EvaluationCycleUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    scope: Optional[str] = None
    created_by: Optional[int] = None
    timezone: Optional[str] = None
    status: Optional[str] = None
    minimum_response_threshold: Optional[int] = None

class EvaluationCycleResponse(EvaluationCycleBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
