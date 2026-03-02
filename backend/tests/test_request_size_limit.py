from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.request_size_limit import RequestSizeLimitMiddleware


@pytest.mark.asyncio
async def test_request_size_limit_middleware_passes_through_non_http_scope() -> None:
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
    called = False

    async def app(scope, receive, send):  # type: ignore[no-untyped-def]
        _ = receive
        _ = send
        nonlocal called
        called = True

    middleware = RequestSizeLimitMiddleware(app, max_payload_size_bytes=0)
    await middleware(
        {"type": "http", "method": "POST", "path": "/", "headers": []},
        lambda: None,
        lambda _: None,
    )

    assert called is True


@pytest.mark.asyncio
async def test_request_size_limit_middleware_allows_request_within_limit() -> None:
    sent_messages: list[dict[str, object]] = []

    async def app(scope, receive, send):  # type: ignore[no-untyped-def]
        _ = scope
        message = await receive()
        assert message["type"] == "http.request"
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b"OK", "more_body": False})

    async def capture(message):  # type: ignore[no-untyped-def]
        sent_messages.append(message)

    async def receive() -> dict[str, object]:
        return {"type": "http.request", "body": b"small", "more_body": False}

    middleware = RequestSizeLimitMiddleware(app, max_payload_size_bytes=100)
    await middleware(
        {"type": "http", "method": "POST", "path": "/", "headers": []}, receive, capture
    )

    response_start = next(
        message for message in sent_messages if message.get("type") == "http.response.start"
    )
    assert response_start.get("status") == 200


@pytest.mark.asyncio
async def test_request_size_limit_middleware_rejects_request_exceeding_limit() -> None:
    sent_messages: list[dict[str, object]] = []

    async def app(scope, receive, send):  # type: ignore[no-untyped-def]
        _ = scope
        # App should not be called when limit is exceeded
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b"OK", "more_body": False})

    async def capture(message):  # type: ignore[no-untyped-def]
        sent_messages.append(message)

    async def receive() -> dict[str, object]:
        return {"type": "http.request", "body": b"this is a large payload", "more_body": False}

    middleware = RequestSizeLimitMiddleware(app, max_payload_size_bytes=10)
    await middleware(
        {"type": "http", "method": "POST", "path": "/", "headers": []}, receive, capture
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
async def test_request_size_limit_middleware_accumulates_multiple_chunks() -> None:
    sent_messages: list[dict[str, object]] = []
    chunk_count = 0

    async def app(scope, receive, send):  # type: ignore[no-untyped-def]
        _ = scope
        # Consume all messages
        while True:
            message = await receive()
            if not message.get("more_body", False):
                break
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b"OK", "more_body": False})

    async def capture(message):  # type: ignore[no-untyped-def]
        sent_messages.append(message)

    async def receive() -> dict[str, object]:
        nonlocal chunk_count
        chunk_count += 1
        if chunk_count == 1:
            return {"type": "http.request", "body": b"12345", "more_body": True}
        if chunk_count == 2:
            return {"type": "http.request", "body": b"67890", "more_body": True}
        return {"type": "http.request", "body": b"", "more_body": False}

    # Limit is 12, chunks are 5+5=10 (within limit), but we continue and
    # the middleware tracks cumulative size. Actually let's set limit to 8
    # so first chunk (5) is OK but total (10) exceeds.
    middleware = RequestSizeLimitMiddleware(app, max_payload_size_bytes=8)
    await middleware(
        {"type": "http", "method": "POST", "path": "/", "headers": []}, receive, capture
    )

    response_start = next(
        message for message in sent_messages if message.get("type") == "http.response.start"
    )
    assert response_start.get("status") == 413


@pytest.mark.asyncio
async def test_request_size_limit_middleware_exact_boundary() -> None:
    sent_messages: list[dict[str, object]] = []

    async def app(scope, receive, send):  # type: ignore[no-untyped-def]
        _ = scope
        await receive()
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b"OK", "more_body": False})

    async def capture(message):  # type: ignore[no-untyped-def]
        sent_messages.append(message)

    async def receive() -> dict[str, object]:
        return {"type": "http.request", "body": b"exactly10!!", "more_body": False}

    # Body is exactly 11 bytes, limit is 10
    middleware = RequestSizeLimitMiddleware(app, max_payload_size_bytes=10)
    await middleware(
        {"type": "http", "method": "POST", "path": "/", "headers": []}, receive, capture
    )

    response_start = next(
        message for message in sent_messages if message.get("type") == "http.response.start"
    )
    assert response_start.get("status") == 413


@pytest.mark.asyncio
async def test_request_size_limit_middleware_allows_exact_limit() -> None:
    sent_messages: list[dict[str, object]] = []

    async def app(scope, receive, send):  # type: ignore[no-untyped-def]
        _ = scope
        await receive()
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b"OK", "more_body": False})

    async def capture(message):  # type: ignore[no-untyped-def]
        sent_messages.append(message)

    async def receive() -> dict[str, object]:
        return {"type": "http.request", "body": b"exactly10!!", "more_body": False}

    # Body is exactly 11 bytes, limit is 11 - should be allowed
    middleware = RequestSizeLimitMiddleware(app, max_payload_size_bytes=11)
    await middleware(
        {"type": "http", "method": "POST", "path": "/", "headers": []}, receive, capture
    )

    response_start = next(
        message for message in sent_messages if message.get("type") == "http.response.start"
    )
    assert response_start.get("status") == 200


@pytest.mark.asyncio
async def test_request_size_limit_middleware_negative_limit_treated_as_zero() -> None:
    called = False

    async def app(scope, receive, send):  # type: ignore[no-untyped-def]
        _ = receive
        _ = send
        nonlocal called
        called = True

    # Negative values should be clamped to 0 (disabled)
    middleware = RequestSizeLimitMiddleware(app, max_payload_size_bytes=-100)
    await middleware(
        {"type": "http", "method": "POST", "path": "/", "headers": []},
        lambda: None,
        lambda _: None,
    )

    assert called is True


def test_request_size_limit_middleware_integration_allows_small_request() -> None:
    app = FastAPI()
    app.add_middleware(RequestSizeLimitMiddleware, max_payload_size_bytes=1024)

    @app.post("/upload")
    def upload(data: dict[str, str]) -> dict[str, str]:
        return {"received": data.get("key", "")}

    response = TestClient(app).post("/upload", json={"key": "value"})

    assert response.status_code == 200
    assert response.json() == {"received": "value"}


def test_request_size_limit_middleware_integration_rejects_large_request() -> None:
    app = FastAPI()
    app.add_middleware(RequestSizeLimitMiddleware, max_payload_size_bytes=10)

    @app.post("/upload")
    def upload(data: dict[str, str]) -> dict[str, str]:
        return {"received": data.get("key", "")}

    response = TestClient(app).post("/upload", json={"key": "value that exceeds limit"})

    assert response.status_code == 413
    assert "Request body exceeds maximum allowed size" in response.text


def test_request_size_limit_middleware_integration_empty_body() -> None:
    app = FastAPI()
    app.add_middleware(RequestSizeLimitMiddleware, max_payload_size_bytes=100)

    @app.get("/ping")
    def ping() -> dict[str, str]:
        return {"status": "pong"}

    response = TestClient(app).get("/ping")

    assert response.status_code == 200
    assert response.json() == {"status": "pong"}
