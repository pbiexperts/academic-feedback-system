# SAFAS Architecture

## High-Level Architecture
SAFAS uses a Modular Monolith architecture.

### Components
1. **Frontend**: Static HTML/CSS/JS served via Nginx in Docker.
2. **Backend API**: Python FastAPI application exposing RESTful JSON endpoints.
3. **Database**: MySQL 8.0 relational database for transactional integrity.
4. **Analytics Layer**: SQL Views constructed on top of MySQL data for direct consumption by Power BI.
5. **Reporting**: Power BI for role-restricted visual dashboards.

### Data Flow
- Client -> HTTPS -> FastAPI (Uvicorn)
- FastAPI -> SQLAlchemy ORM -> MySQL
- MySQL -> Power BI (Via DirectQuery or Import with RLS)

## Security boundaries
- All backend routes require JWT validation.
- Endpoints are grouped by role (e.g. `/api/v1/student`, `/api/v1/faculty`).
- Access violations throw `403 Forbidden`.
