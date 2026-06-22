FROM php:8.2-fpm-alpine AS backend

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
RUN php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');" \
    && php composer-setup.php --install-dir=/usr/local/bin --filename=composer \
    && php -r "unlink('composer-setup.php');"

WORKDIR /app

# Copy composer files and install dependencies (skip scripts, artisan not yet present)
COPY composer.json composer.lock ./
RUN composer install --no-interaction --optimize-autoloader --no-dev --no-scripts

# Copy application code
COPY . .

# Run post-install scripts
RUN composer dump-autoload && php artisan package:discover --ansi

# Create storage bootstrap directories (use mkdir -p for each to avoid brace expansion issues on Alpine sh)
RUN mkdir -p storage/framework/sessions storage/framework/views storage/framework/cache \
    && mkdir -p storage/logs bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

# Nginx config
COPY nginx.conf /etc/nginx/http.d/default.conf

# Supervisor config
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY startup.sh /startup.sh
RUN chmod +x /startup.sh

EXPOSE 80

CMD ["/startup.sh"]
