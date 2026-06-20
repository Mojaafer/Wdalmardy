#!/bin/sh

# Wait for MySQL to be ready
echo "Waiting for MySQL..."
while ! nc -z "${DB_HOST:-mysql}" "${DB_PORT:-3306}"; do
  sleep 1
done
echo "MySQL is ready"

# Create storage symlink
php artisan storage:link --force 2>/dev/null || true

# Run migrations and seeders
php artisan migrate --seed --force

# Start supervisord
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
