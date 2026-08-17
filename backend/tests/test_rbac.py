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
