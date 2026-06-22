FROM php:8.2-fpm-alpine

# Install MariaDB (drop-in MySQL replacement)
RUN apk add --no-cache mariadb mariadb-client

# Install system dependencies
RUN apk add --no-cache \
    nginx \
    supervisor \
    curl \
    unzip \
    git \
    libpng-dev \
    libxml2-dev \
    oniguruma-dev \
    netcat-openbsd \
    && docker-php-ext-install \
    bcmath \
    ctype \
    fileinfo \
    gd \
    mbstring \
    pdo \
    pdo_mysql \
    xml

# Install Composer manually
# Increase PHP upload limits
RUN echo "upload_max_filesize = 20M" > /usr/local/etc/php/conf.d/uploads.ini \
    && echo "post_max_size = 20M" >> /usr/local/etc/php/conf.d/uploads.ini

# Install Composer manually
RUN php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');" \
    && php composer-setup.php --install-dir=/usr/local/bin --filename=composer \
    && php -r "unlink('composer-setup.php');"

WORKDIR /app

# Copy composer files and install dependencies (skip scripts, artisan not yet present)
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-interaction --optimize-autoloader --no-dev --no-scripts

# Copy application code
COPY backend/ .

# Run post-install scripts
RUN composer dump-autoload && php artisan package:discover --ansi

# Create storage bootstrap + public upload directories
RUN mkdir -p storage/framework/sessions storage/framework/views storage/framework/cache \
    && mkdir -p storage/logs bootstrap/cache \
    && mkdir -p storage/app/public/products \
    && mkdir -p storage/app/public/offers \
    && mkdir -p storage/app/public/categories \
    && mkdir -p storage/app/public/suppliers \
    && mkdir -p storage/app/public/hero \
    && mkdir -p storage/app/public/logo \
    && chmod -R 775 storage bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

# Nginx config
COPY backend/nginx.conf /etc/nginx/http.d/default.conf

# Combined supervisor config
COPY fly/combined/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# MariaDB config (enable TCP on port 3306)
COPY fly/combined/my.cnf /etc/my.cnf

# Combined startup script
COPY fly/combined/startup.sh /startup.sh
RUN chmod +x /startup.sh

# MariaDB data mount
VOLUME ["/var/lib/mysql"]

EXPOSE 80

CMD ["/startup.sh"]
