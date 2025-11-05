# Build stage
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git

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

# Build the application
RUN CGO_ENABLED=1 go build -o event-planner-server ./main.go

# Production stage
FROM alpine:latest

# Install runtime dependencies
RUN apk --no-cache add ca-certificates sqlite

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

