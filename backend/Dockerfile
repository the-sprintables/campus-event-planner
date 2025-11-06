# Build stage
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Install build dependencies for CGO (required for SQLite)
RUN apk add --no-cache git gcc musl-dev sqlite-dev pkgconfig

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code (only necessary files)
COPY main.go ./
COPY models/ ./models/
COPY routes/ ./routes/
COPY middlewares/ ./middlewares/
COPY utils/ ./utils/
COPY db/ ./db/

# Verify CGO environment and dependencies
RUN echo "CGO_ENABLED=$(go env CGO_ENABLED)" && \
    gcc --version && \
    pkg-config --exists sqlite3 && echo "SQLite3 found" || echo "SQLite3 not found via pkg-config"

# Build the application
# Use -v flag for verbose output to see build errors
RUN CGO_ENABLED=1 go build -v -o event-planner-server ./main.go

# Production stage
FROM alpine:latest

# Install runtime dependencies (SQLite libraries for CGO binary)
RUN apk --no-cache add ca-certificates sqlite-libs

# Create a non-root user
RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser

WORKDIR /home/appuser

# Copy binary from builder
COPY --from=builder /app/event-planner-server .

# Change ownership to non-root user
RUN chown appuser:appuser event-planner-server

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Run the application
CMD ["./event-planner-server"]

