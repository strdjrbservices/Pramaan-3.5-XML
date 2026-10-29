#!/bin/bash
set -e

echo "=========================================="
echo " Starting Pramaan & Appraisal Review App  "
echo "=========================================="

cd /app/backend

# Run Django database migrations
echo "==> Running database migrations..."
python manage.py migrate --noinput

# Collect Django static files
echo "==> Collecting Django static files..."
python manage.py collectstatic --noinput

# Merge frontend static files into Django staticfiles directory
if [ -d "/app/frontend_build/static" ]; then
    echo "==> Merging frontend static files into staticfiles..."
    cp -rn /app/frontend_build/static/* /app/backend/staticfiles/ 2>/dev/null || cp -r /app/frontend_build/static/* /app/backend/staticfiles/
fi

# Ensure Downloads and media directories exist with write permissions
mkdir -p /app/backend/Downloads/logfiles /app/backend/media

echo "==> Launching Gunicorn and Nginx via Supervisord..."
exec /usr/bin/supervisord -n -c /etc/supervisor/conf.d/supervisord.conf

