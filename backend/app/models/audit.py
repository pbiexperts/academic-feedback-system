from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database.base_class import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Nullable for unauthenticated actions if any
    action = Column(String(100), nullable=False) # e.g., LOGIN, FEEDBACK_SUBMITTED, REPORT_GENERATED
    resource_type = Column(String(100), nullable=True) # e.g., "feedback_submission", "user"
    resource_id = Column(String(100), nullable=True)
    details = Column(Text, nullable=True) # JSON string of changes or details
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
