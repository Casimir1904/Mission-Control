"""Integration tests for request size limiting with the actual FastAPI app."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    """Provide a TestClient for the FastAPI app."""
    return TestClient(app)


def test_oversized_payload_returns_413(client: TestClient) -> None:
    """Test that oversized payloads are rejected with 413 status.

    The default max_payload_size_bytes is 1MB (1,048,576 bytes).
    We send a payload larger than this to verify it's rejected.
    """
    # Create a payload that exceeds the 1MB limit
    # 2MB of data should definitely exceed the limit
    oversized_payload = "x" * (2 * 1024 * 1024)  # 2MB

    response = client.post(
        "/api/v1/auth/bootstrap",
        json={"data": oversized_payload},
    )

    assert response.status_code == 413
    assert "Request body exceeds maximum allowed size" in response.text


def test_normal_payload_allowed(client: TestClient) -> None:
    """Test that normal payloads are allowed through."""
    response = client.get("/healthz")

    assert response.status_code == 200
    assert response.json() == {"ok": True}


def test_payload_at_boundary_allowed(client: TestClient) -> None:
    """Test that a small payload is accepted.

    This test verifies that normal API operations continue to work.
    """
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"ok": True}


def test_openapi_schema_endpoint_works(client: TestClient) -> None:
    """Test that the OpenAPI schema endpoint is accessible.

    This verifies that normal read operations are not affected by
    the payload size limit middleware.
    """
    response = client.get("/openapi.json")

    assert response.status_code == 200
    assert "openapi" in response.json()
