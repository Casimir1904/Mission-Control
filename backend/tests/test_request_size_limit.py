"""Unit tests for RequestSizeLimitMiddleware."""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.request_size_limit import RequestSizeLimitMiddleware


@pytest.mark.asyncio
async def test_request_size_limit_middleware_passes_through_non_http_scope() -> None:
    """Non-HTTP scopes should pass through without processing."""
    called = False

    async def app(scope, receive, send):  # type: ignore[no-untyped-def]
        _ = receive
        _ = send
        nonlocal called
        called = scope["type"] == "websocket"

    middleware = RequestSizeLimitMiddleware(app, max_payload_size_bytes=100)
    await middleware({"type": "websocket", "headers": []}, lambda: None, lambda _: None)

    assert called is True


@pytest.mark.asyncio
async def test_request_size_limit_middleware_disables_when_limit_is_zero() -> None:
    """When max_payload_size_bytes is 0, limit is disabled and all requests pass."""
    called = False

    async def app(scope, receive, send):  # type: ignore[no-untyped-def]
        _ = receive
        _ = send
        nonlocal called
        called = True

    middleware = RequestSizeLimitMiddleware(app, max_payload_size_bytes=0)
    await middleware(
        {
            "type": "http",
            "method": "POST",
            "path": "/",
            "headers": [(b"content-length", b"1000000")],
        },
        lambda: None,
        lambda _: None,
    )

    assert called is True


@pytest.mark.asyncio
async def test_request_size_limit_middleware_allows_request_without_content_length() -> None:
    """Requests without Content-Length header should pass through."""
    called = False

    async def app(scope, receive, send):  # type: ignore[no-untyped-def]
        _ = receive
        _ = send
        nonlocal called
        called = True

    middleware = RequestSizeLimitMiddleware(app, max_payload_size_bytes=100)
    await middleware(
        {"type": "http", "method": "GET", "path": "/", "headers": []},
        lambda: None,
        lambda _: None,
    )

    assert called is True


@pytest.mark.asyncio
async def test_request_size_limit_middleware_allows_request_within_limit() -> None:
    """Requests with Content-Length within limit should pass to the app."""
    called = False

    async def app(scope, receive, send):  # type: ignore[no-untyped-def]
        _ = receive
        _ = send
        nonlocal called
        called = True

    middleware = RequestSizeLimitMiddleware(app, max_payload_size_bytes=100)
    await middleware(
        {
            "type": "http",
            "method": "POST",
            "path": "/",
            "headers": [(b"content-length", b"50")],
        },
        lambda: None,
        lambda _: None,
    )

    assert called is True


@pytest.mark.asyncio
async def test_request_size_limit_middleware_rejects_request_exceeding_limit() -> None:
    """Requests with Content-Length exceeding limit should return 413."""
    sent_messages: list[dict[str, object]] = []

    async def app(scope, receive, send):  # type: ignore[no-untyped-def]
        _ = scope
        # App should not be called when limit is exceeded
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b"OK", "more_body": False})

    async def capture(message):  # type: ignore[no-untyped-def]
        sent_messages.append(message)

    middleware = RequestSizeLimitMiddleware(app, max_payload_size_bytes=100)
    await middleware(
        {
            "type": "http",
            "method": "POST",
            "path": "/",
            "headers": [(b"content-length", b"200")],
        },
        lambda: None,
        capture,
    )

    response_start = next(
        message for message in sent_messages if message.get("type") == "http.response.start"
    )
    assert response_start.get("status") == 413

    response_body = next(
        message for message in sent_messages if message.get("type") == "http.response.body"
    )
    assert b"Request body exceeds maximum allowed size" in response_body.get("body", b"")


@pytest.mark.asyncio
async def test_request_size_limit_middleware_exact_boundary() -> None:
    """Request with Content-Length exactly at limit should pass."""
    called = False

    async def app(scope, receive, send):  # type: ignore[no-untyped-def]
        _ = receive
        _ = send
        nonlocal called
        called = True

    middleware = RequestSizeLimitMiddleware(app, max_payload_size_bytes=100)
    await middleware(
        {
            "type": "http",
            "method": "POST",
            "path": "/",
            "headers": [(b"content-length", b"100")],
        },
        lambda: None,
        lambda _: None,
    )

    # Content-Length exactly at limit should pass
    assert called is True


@pytest.mark.asyncio
async def test_request_size_limit_middleware_one_byte_over_limit() -> None:
    """Request with Content-Length one byte over limit should be rejected."""
    sent_messages: list[dict[str, object]] = []

    async def app(scope, receive, send):  # type: ignore[no-untyped-def]
        _ = scope
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b"OK", "more_body": False})

    async def capture(message):  # type: ignore[no-untyped-def]
        sent_messages.append(message)

    middleware = RequestSizeLimitMiddleware(app, max_payload_size_bytes=100)
    await middleware(
        {
            "type": "http",
            "method": "POST",
            "path": "/",
            "headers": [(b"content-length", b"101")],
        },
        lambda: None,
        capture,
    )

    response_start = next(
        message for message in sent_messages if message.get("type") == "http.response.start"
    )
    assert response_start.get("status") == 413


@pytest.mark.asyncio
async def test_request_size_limit_middleware_negative_limit_treated_as_zero() -> None:
    """Negative max_payload_size_bytes should be treated as 0 (disabled)."""
    called = False

    async def app(scope, receive, send):  # type: ignore[no-untyped-def]
        _ = receive
        _ = send
        nonlocal called
        called = True

    # Negative values should be clamped to 0 (disabled)
    middleware = RequestSizeLimitMiddleware(app, max_payload_size_bytes=-100)
    await middleware(
        {
            "type": "http",
            "method": "POST",
            "path": "/",
            "headers": [(b"content-length", b"1000000")],
        },
        lambda: None,
        lambda _: None,
    )

    assert called is True


@pytest.mark.asyncio
async def test_request_size_limit_middleware_invalid_content_length() -> None:
    """Invalid Content-Length values should pass through to the app."""
    called = False

    async def app(scope, receive, send):  # type: ignore[no-untyped-def]
        _ = receive
        _ = send
        nonlocal called
        called = True

    middleware = RequestSizeLimitMiddleware(app, max_payload_size_bytes=100)
    # Invalid Content-Length value
    await middleware(
        {
            "type": "http",
            "method": "POST",
            "path": "/",
            "headers": [(b"content-length", b"not-a-number")],
        },
        lambda: None,
        lambda _: None,
    )

    assert called is True


@pytest.mark.asyncio
async def test_request_size_limit_middleware_case_insensitive_header() -> None:
    """Content-Length header matching should be case-insensitive."""
    called = False

    async def app(scope, receive, send):  # type: ignore[no-untyped-def]
        _ = receive
        _ = send
        nonlocal called
        called = True

    middleware = RequestSizeLimitMiddleware(app, max_payload_size_bytes=100)
    # Uppercase header name
    await middleware(
        {
            "type": "http",
            "method": "POST",
            "path": "/",
            "headers": [(b"Content-Length", b"50")],
        },
        lambda: None,
        lambda _: None,
    )

    assert called is True


# FastAPI integration tests


def test_request_size_limit_middleware_integration_allows_small_request() -> None:
    """Integration test: small POST request should succeed."""
    app = FastAPI()
    app.add_middleware(RequestSizeLimitMiddleware, max_payload_size_bytes=1024)

    @app.post("/upload")
    def upload(data: dict[str, str]) -> dict[str, str]:
        return {"received": data.get("key", "")}

    response = TestClient(app).post("/upload", json={"key": "value"})

    assert response.status_code == 200
    assert response.json() == {"received": "value"}


def test_request_size_limit_middleware_integration_rejects_large_request() -> None:
    """Integration test: large POST request should be rejected with 413."""
    app = FastAPI()
    app.add_middleware(RequestSizeLimitMiddleware, max_payload_size_bytes=10)

    @app.post("/upload")
    def upload(data: dict[str, str]) -> dict[str, str]:
        return {"received": data.get("key", "")}

    response = TestClient(app).post("/upload", json={"key": "value that exceeds limit"})

    assert response.status_code == 413
    assert "Request body exceeds maximum allowed size" in response.text


def test_request_size_limit_middleware_integration_empty_body() -> None:
    """Integration test: GET request without body should succeed."""
    app = FastAPI()
    app.add_middleware(RequestSizeLimitMiddleware, max_payload_size_bytes=100)

    @app.get("/ping")
    def ping() -> dict[str, str]:
        return {"status": "pong"}

    response = TestClient(app).get("/ping")

    assert response.status_code == 200
    assert response.json() == {"status": "pong"}
