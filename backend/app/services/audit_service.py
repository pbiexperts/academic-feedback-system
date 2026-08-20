from sqlalchemy.orm import Session
from app.models.audit import AuditLog
from typing import Optional, Dict, Any
import json

def log_action(
    db: Session,
    action: str,
    user_id: Optional[int] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None
) -> AuditLog:
    """
    Logs an action to the audit_logs table.
    Ensures no passwords or secrets are logged.
    """
    if details:
        # Sanitize details
        details_copy = details.copy()
        if "password" in details_copy:
            details_copy["password"] = "***"
        if "password_hash" in details_copy:
            details_copy["password_hash"] = "***"
        details_str = json.dumps(details_copy)
    else:
        details_str = None

    audit_entry = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details_str,
        ip_address=ip_address
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(audit_entry)
    return audit_entry
