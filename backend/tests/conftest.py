import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.api.dependencies import get_db

from unittest.mock import MagicMock

# Mock DB dependency
def override_get_db():
    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.first.return_value = None
    try:
        yield mock_db
    finally:
        pass

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c
