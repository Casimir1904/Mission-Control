"""ASGI middleware for limiting request payload sizes."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:  # pragma: no cover
    from starlette.types import ASGIApp, Message, Receive, Scope, Send


class RequestSizeLimitMiddleware:
    """Enforce maximum request body size to prevent memory exhaustion attacks.

    This middleware checks the Content-Length header before the request body
    is read. If the declared size exceeds the limit, it returns a 413 Payload
    Too Large response immediately without processing the request.
    """

    def __init__(self, app: ASGIApp, *, max_payload_size_bytes: int = 0) -> None:
        """Initialize middleware with app instance and size limit.

        Args:
            app: The ASGI application to wrap.
            max_payload_size_bytes: Maximum allowed request body size in bytes.
                A value of 0 disables the size limit.
        """
        self._app = app
        self._max_payload_size_bytes = max(max_payload_size_bytes, 0)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        """Enforce size limits on request bodies."""
        if scope["type"] != "http" or self._max_payload_size_bytes == 0:
            await self._app(scope, receive, send)
            return

        # Check Content-Length header to reject oversized requests early
        # without consuming the request body
        headers = scope.get("headers", [])
        content_length = None
        for header_name, header_value in headers:
            if header_name.lower() == b"content-length":
                try:
                    content_length = int(header_value.decode("ascii"))
                except (ValueError, UnicodeDecodeError):
                    # Invalid Content-Length, let the app handle it
                    pass
                break

        # If Content-Length is present and exceeds limit, reject immediately
        if content_length is not None and content_length > self._max_payload_size_bytes:
            body = b'{"detail":"Request body exceeds maximum allowed size"}'
            await send({
                "type": "http.response.start",
                "status": 413,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"content-length", str(len(body)).encode("ascii")),
                ],
            })
            await send({
                "type": "http.response.body",
                "body": body,
            })
            return

        await self._app(scope, receive, send)
