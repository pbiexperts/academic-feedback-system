import pytest
from app.core.security import get_password_hash

def test_login_invalid_credentials(client):
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "wrong@example.com", "password": "wrongpassword"}
    )
    # Expecting failure because DB mock returns None
    assert response.status_code == 400
    assert response.json()["detail"] == "Incorrect email or password"

# Additional tests would require inserting test users into a real test DB
# - test_valid_login
# - test_inactive_user
# - test_expired_jwt
