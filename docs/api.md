# SAFAS API Reference

## Authentication
- `POST /api/v1/auth/login`: Authenticate and receive JWT
- `GET /api/v1/auth/me`: Get current authenticated user details

## Admin
- `POST /api/v1/admin/departments`: Create department
- `GET /api/v1/admin/departments`: List departments
- `POST /api/v1/admin/evaluation-cycles`: Create eval cycle
- `POST /api/v1/admin/questionnaires`: Create questionnaire with questions

## Student
- `POST /api/v1/student/feedback`: Submit feedback

## Analytics
- `GET /api/v1/analytics/faculty/dashboard`: Get faculty stats
- `GET /api/v1/analytics/hod/dashboard`: Get HOD stats
- `GET /api/v1/analytics/dean/dashboard`: Get Dean stats

## Reports
- `GET /api/v1/reports/department`: Export CSV for department
- `GET /api/v1/reports/college`: Export CSV for college
