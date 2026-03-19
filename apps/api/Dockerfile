# Stage 1: Build the Go binary.
FROM golang:1.23-alpine AS builder

RUN apk add --no-cache ca-certificates git

WORKDIR /build

# Copy all source (including schemas needed for code generation).
COPY . .

# 1. Download declared dependencies (doesn't verify imports).
RUN go mod download 2>/dev/null; true

# 2. Generate Ent ORM code from schemas (creates internal/ent/generated/).
RUN go generate ./internal/ent/...

# 3. Now tidy with all generated code present.
RUN go mod tidy

# Build a statically linked binary.
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-s -w" \
    -o /build/api-server \
    ./cmd/server

# Stage 2: Minimal runtime image.
# Use alpine instead of distroless so we can mkdir for device identity.
FROM alpine:3.21

RUN adduser -D -u 65532 nonroot && \
    mkdir -p /data/device-identity && \
    chown -R nonroot:nonroot /data

COPY --from=builder /build/api-server /api-server

EXPOSE 8000

USER nonroot

ENTRYPOINT ["/api-server"]
