from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional

class AnswerCreate(BaseModel):
    question_id: int
    rating: Optional[int] = Field(None, ge=1, le=5)
    text_answer: Optional[str] = None

class CommentCreate(BaseModel):
    comment_type: str
    comment_text: str

class FeedbackSubmissionCreate(BaseModel):
    faculty_id: int
    subject_id: int
    department_id: int
    evaluation_cycle_id: int
    
    answers: List[AnswerCreate]
    comments: List[CommentCreate] = []

class FeedbackSubmissionResponse(BaseModel):
    id: int
    status: str

    model_config = ConfigDict(from_attributes=True)
