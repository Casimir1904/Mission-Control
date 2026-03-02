"""ASGI middleware for limiting request payload sizes."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:  # pragma: no cover
    from starlette.types import ASGIApp, Message, Receive, Scope, Send


class RequestSizeLimitMiddleware:
    """Enforce maximum request body size to prevent memory exhaustion attacks.

    This middleware intercepts incoming request body chunks and accumulates
    the total size. If the limit is exceeded, it returns a 413 Payload Too
    Large response and stops processing the request.
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

        body_size = 0
        limit_exceeded = False

        async def receive_with_size_limit() -> Message:
            nonlocal body_size, limit_exceeded

            message = await receive()

            if message["type"] == "http.request":
                chunk = message.get("body", b"")
                body_size += len(chunk)

                if body_size > self._max_payload_size_bytes and not limit_exceeded:
                    limit_exceeded = True

            return message

        async def send_with_limit_check(message: Message) -> None:
            # If limit was exceeded during body receive, intercept the
            # response start and send a 413 instead of letting the app
            # process the oversized request.
            if message["type"] == "http.response.start" and limit_exceeded:
                # Send 413 Payload Too Large response directly via ASGI
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

            await send(message)

        await self._app(scope, receive_with_size_limit, send_with_limit_check)
