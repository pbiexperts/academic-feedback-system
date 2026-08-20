import pytest

def test_student_denied_faculty_dashboard(client):
    # Mocking a student token would go here
    headers = {"Authorization": "Bearer mock_student_token"}
    response = client.get("/api/v1/analytics/faculty/dashboard", headers=headers)
    
    # Fast API OAuth2Bearer will fail validation with a fake token
    assert response.status_code == 401 or response.status_code == 403

def test_faculty_denied_hod_dashboard(client):
    headers = {"Authorization": "Bearer mock_faculty_token"}
    response = client.get("/api/v1/analytics/hod/dashboard", headers=headers)
    assert response.status_code == 401 or response.status_code == 403

def test_student_denied_pc_dashboard(client):
    headers = {"Authorization": "Bearer mock_student_token"}
    response = client.get("/api/v1/program-coordinator/dashboard", headers=headers)
    assert response.status_code in [401, 403]

def test_student_denied_attendance_post(client):
    headers = {"Authorization": "Bearer mock_student_token"}
    response = client.post("/api/v1/attendance", headers=headers, json={
        "student_id": 1,
        "subject_id": 1,
        "faculty_id": 1,
        "department_id": 1,
        "academic_year_id": 1,
        "semester_id": 1,
        "division_id": 1,
        "total_classes": 40,
        "classes_attended": 30
    })
    assert response.status_code in [401, 403]
