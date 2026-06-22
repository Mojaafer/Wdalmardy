#!/bin/sh

# Create MariaDB socket directory
mkdir -p /run/mysqld && chown mysql:mysql /run/mysqld

# Ensure mysql user owns the data directory (volume may have uid mismatch)
chown -R mysql:mysql /var/lib/mysql

# Initialize MariaDB data directory if empty (first run or empty volume)
if [ ! -d "/var/lib/mysql/mysql" ]; then
    echo "Initializing MariaDB data directory..."
    mysql_install_db --user=mysql --datadir=/var/lib/mysql
fi

# Start MariaDB
echo "Starting MariaDB..."
mysqld --user=mysql --datadir=/var/lib/mysql --skip-performance-schema &
MARIADB_PID=$!

# Wait for MariaDB to be ready
echo "Waiting for MariaDB..."
for i in $(seq 30); do
    if mysqladmin ping --silent 2>/dev/null; then
        break
    fi
    sleep 1
done

if ! kill -0 $MARIADB_PID 2>/dev/null; then
    echo "ERROR: MariaDB failed to start"
    exit 1
fi
echo "MariaDB is ready"

# Build and execute SQL setup - handle both fresh and existing volume
SQL_SETUP="/tmp/setup.sql"

# Drop and recreate user to ensure fresh password (DROP IF EXISTS won't fail if missing)
printf "DROP USER IF EXISTS '%s'@'%s';\n" "$MYSQL_USER" "%" > "$SQL_SETUP"
printf "DROP USER IF EXISTS '%s'@'localhost';\n" "$MYSQL_USER" >> "$SQL_SETUP"
printf "DROP USER IF EXISTS ''@'localhost';\n" >> "$SQL_SETUP"
printf "CREATE DATABASE IF NOT EXISTS \`%s\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n" "$MYSQL_DATABASE" >> "$SQL_SETUP"
printf "CREATE USER '%s'@'%s' IDENTIFIED BY '%s';\n" "$MYSQL_USER" "%" "$MYSQL_PASSWORD" >> "$SQL_SETUP"
printf "GRANT ALL PRIVILEGES ON \`%s\`.* TO '%s'@'%s';\n" "$MYSQL_DATABASE" "$MYSQL_USER" "%" >> "$SQL_SETUP"
printf "FLUSH PRIVILEGES;\n" >> "$SQL_SETUP"

if mysql -u root -p"$MYSQL_ROOT_PASSWORD" < "$SQL_SETUP"; then
    echo "DB setup OK (authenticated with root password)"
elif mysql -u root < "$SQL_SETUP"; then
    echo "DB setup OK (authenticated without password)"
    [ -n "$MYSQL_ROOT_PASSWORD" ] && mysql -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '$MYSQL_ROOT_PASSWORD';"
else
    echo "Cannot connect as root - DB/user may already exist"
fi
rm -f "$SQL_SETUP"

# Ensure app storage subdirectories on the persistent volume (MySQL volume)
# We share the single volume by storing app uploads under /var/lib/mysql/_storage/
mkdir -p /var/lib/mysql/_storage/app/public/products
mkdir -p /var/lib/mysql/_storage/app/public/offers
mkdir -p /var/lib/mysql/_storage/app/public/categories
mkdir -p /var/lib/mysql/_storage/app/public/suppliers
mkdir -p /var/lib/mysql/_storage/app/public/hero
mkdir -p /var/lib/mysql/_storage/app/public/logo
mkdir -p /var/lib/mysql/_storage/framework/sessions /var/lib/mysql/_storage/framework/views /var/lib/mysql/_storage/framework/cache/data
mkdir -p /var/lib/mysql/_storage/framework/testing
mkdir -p /var/lib/mysql/_storage/logs

# Symlink /app/storage -> volume-backed directory
rm -rf /app/storage
ln -sf /var/lib/mysql/_storage /app/storage
chmod -R 775 /var/lib/mysql/_storage
chown -R www-data:www-data /var/lib/mysql/_storage 2>/dev/null || true

# Create storage symlink
php artisan storage:link --force 2>/dev/null || true

# Clear stale caches (may create root-owned dirs)
php artisan optimize:clear 2>/dev/null || true

# Ensure storage is writable by www-data (fixes root-owned cache dirs)
chmod -R 775 /app/storage /app/bootstrap/cache
chown -R www-data:www-data /app/storage /app/bootstrap/cache 2>/dev/null || true

# Run migrations only (do NOT seed — seeding wipes production data)
php artisan migrate --force

# Migrate and seed may create new cache dirs as root (Spatie permission cache etc.)
chmod -R 775 /app/storage /app/bootstrap/cache
chown -R www-data:www-data /app/storage /app/bootstrap/cache 2>/dev/null || true

# Start supervisord (php-fpm + nginx)
# MariaDB continues running in background via its own PID
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
