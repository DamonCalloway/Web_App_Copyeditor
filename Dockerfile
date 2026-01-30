# Multi-stage Dockerfile for Clod Sarnit (Claude.ai clone)
# Builds both frontend and backend for production deployment

# ==================== Frontend Build Stage ====================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files first for better caching
COPY frontend/package.json frontend/yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY frontend/ ./

# Build the React app
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL:-/api}

RUN yarn build

# ==================== Backend Stage ====================
FROM python:3.11-slim AS backend

# Install system dependencies
RUN apt-get update && apt-get install -y \
    nginx \
    supervisor \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Python requirements and install
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Install emergentintegrations for GPT-5 and Gemini support
RUN pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/

# Copy backend source
COPY backend/ ./backend/

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Create directories for uploads and logs
RUN mkdir -p /app/uploads /var/log/supervisor

# Copy nginx configuration
COPY deployment/nginx.conf /etc/nginx/nginx.conf

# Copy supervisor configuration
COPY deployment/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose port 80 (nginx will handle routing)
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost/api/config/features || exit 1

# Start supervisor (manages nginx and backend)
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
