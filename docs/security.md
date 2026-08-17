# Security Audit Report

## 1. Authentication & Authorization
- **JWT**: JSON Web Tokens are used for session management. Tokens expire after `JWT_EXPIRATION` minutes.
- **Password Hashing**: Passwords are hashed using bcrypt via Passlib.
- **RBAC**: FastAPI Dependencies (`RequireRole` via `RoleChecker`) explicitly enforce role-based access to API endpoints.

## 2. Privacy & Confidentiality
- **Student Identity**: `student_id` is stored in the database but NEVER serialized in any analytical response or report.
- **Minimum Threshold**: In `analytics.py`, if a faculty member has fewer than `MINIMUM_RESPONSES_FOR_ANALYTICS` (default 5), granular metrics are suppressed to prevent deductive identification.
- **HOD Scoping**: HOD dashboards and reports forcefully inject the HOD's `department_id` into queries, preventing them from accessing other departments via URL/parameter manipulation (IDOR protection).

## 3. Database Security
- **Duplicate Prevention**: A unique constraint on `(student_id, faculty_id, subject_id, evaluation_cycle_id)` exists at the database level to prevent multiple submissions.
- **SQL Injection**: SQLAlchemy ORM is used exclusively. No raw string interpolation is used for queries.

## 4. Operational Security
- **Secrets Management**: Configured via `.env` files (e.g., `JWT_SECRET`, database passwords). Never hardcoded.
- **Error Handling**: Generic HTTP exceptions are raised without exposing stack traces.

**Audit Status**: Passed Phase 18 successfully.
