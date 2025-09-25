# Backend Dockerfile for Python WebSocket Server using uv
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies and uv
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && pip install uv

# Copy uv configuration files first (for better caching)
COPY pyproject.toml uv.lock ./

# Install dependencies using uv (much faster than pip)
RUN uv sync --frozen --no-dev

# Copy application code
COPY . .

# Create non-root user for security
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port 5999 for WebSocket server
EXPOSE 5999

# Set up uv environment
ENV PATH="/app/.venv/bin:$PATH"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import socket; socket.create_connection(('localhost', 5999), timeout=5).close()" || exit 1

# Run the WebSocket server on port 5999
CMD ["python", "main_websocket.py"]