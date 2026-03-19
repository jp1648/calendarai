FROM python:3.11-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:0.6 /uv /uvx /bin/

WORKDIR /app

# Copy dependency files first for layer caching
COPY pyproject.toml uv.lock ./

# Install dependencies (no dev deps in production)
RUN uv sync --frozen --no-dev

# Install playwright browsers for BrowserBase
RUN uv run playwright install chromium --with-deps

# Copy application code
COPY app/ app/

# Create non-root user for security
RUN addgroup --system app && adduser --system --ingroup app app
USER app

EXPOSE ${PORT:-8000}

CMD ["sh", "-c", "uv run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
