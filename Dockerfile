# -----------------------------------------------------------------------------
# Stage 1: Build the React Frontend
# -----------------------------------------------------------------------------
FROM node:20-bullseye-slim AS frontend-builder
WORKDIR /app/frontend

ENV GENERATE_SOURCEMAP=false

COPY pramaan/package*.json ./
RUN npm install --legacy-peer-deps

COPY pramaan/ ./
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Python + Playwright Backend Runtime & Web Server
# -----------------------------------------------------------------------------
FROM mcr.microsoft.com/playwright/python:v1.40.0-jammy

ENV PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    DOCKER_CONTAINER=true \
    PORT=7860

WORKDIR /app

# Install system dependencies: Nginx and Supervisor
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    supervisor \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY appraisal_review/requirements.txt /app/backend/
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Ensure Playwright browser dependencies are installed
RUN playwright install --with-deps chromium

# Copy Django backend
COPY appraisal_review/ /app/backend/

# Copy built React frontend from Stage 1
COPY --from=frontend-builder /app/frontend/build /app/frontend_build

# Copy server configurations
COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Ensure proper permissions for temp and log paths
RUN mkdir -p /app/backend/staticfiles /app/backend/Downloads/logfiles /app/backend/media \
    && chmod -R 777 /app/backend/staticfiles /app/backend/Downloads /app/backend/media /tmp

# Hugging Face Spaces default port
EXPOSE 7860

CMD ["/app/start.sh"]

