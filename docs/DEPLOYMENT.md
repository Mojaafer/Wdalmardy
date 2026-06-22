# Wad Almardi Market — Deployment Guide

Last updated: 2026-06-22. Production-leaning guide for self-hosted PHP +
Next.js + MySQL. Adjust as needed for your platform (Forge, Ploi, Kamal,
custom systemd, etc.).

## 1. Server requirements

| Component | Minimum | Recommended |
| --- | --- | --- |
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| Storage | 40 GB SSD | 80 GB SSD |
| PHP | 8.2 + extensions: mbstring, pdo_mysql, bcmath, gd, intl, zip, opcache | |
| Node.js | 20 LTS | 20 LTS |
| MySQL | 8.0 | 8.0 (or MariaDB 10.6+) |
| Web server | Nginx 1.24 | Nginx 1.24 |
| Process manager | systemd or supervisord | |

## 2. Clone & configure

```bash
git clone <repo> /var/www/wadalmardy
cd /var/www/wadalmardy

# Backend
cp backend/.env.example backend/.env
# Edit backend/.env — see "Required env vars" below.

# Frontend
cp frontend/.env.example frontend/.env.local
# Edit frontend/.env.local.
```

### Required `backend/.env` for production

```ini
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.your-domain.com

# Database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=wadalmardy
DB_USERNAME=wdalmardy
DB_PASSWORD=<strong-random-password>

# Use Redis in production for cache, sessions, and queue
CACHE_STORE=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

# Mail (use a real provider, not log)
MAIL_MAILER=smtp
MAIL_HOST=...
MAIL_PORT=587
MAIL_USERNAME=...
MAIL_PASSWORD=...
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="noreply@your-domain.com"

# WhatsApp — phone that receives orders (international format, no +)
WA_PHONE_NUMBER=249123456789

# CORS — comma-separated list of storefront origins
FRONTEND_URL=https://your-domain.com,https://www.your-domain.com

# Sanctum SPA stateful domains
SANCTUM_STATEFUL_DOMAINS=your-domain.com,www.your-domain.com

# Rate limits (per minute per IP)
RATE_LIMIT_ORDERS=20
RATE_LIMIT_LOGIN=10
RATE_LIMIT_OTP=5
```

### Required `frontend/.env.local`

```ini
NEXT_PUBLIC_API_URL=https://api.your-domain.com/api
NEXT_PUBLIC_WA_PHONE=249123456789
NEXT_PUBLIC_CURRENCY=ج.س
```

## 3. First-run install

```bash
# Backend
cd backend
composer install --no-dev --optimize-autoloader
php artisan key:generate
php artisan migrate --force
php artisan db:seed --class=AdminSeeder   # only if seeding admin users
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Frontend
cd ../frontend
npm ci --no-audit --no-fund
npm run build
```

## 4. Nginx + PHP-FPM

### `backend` API (e.g. `api.your-domain.com`)

```nginx
server {
    listen 443 ssl http2;
    server_name api.your-domain.com;

    ssl_certificate     /etc/letsencrypt/live/api.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.your-domain.com/privkey.pem;

    root /var/www/wadalmardy/backend/public;
    index index.php;

    client_max_body_size 20M;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        fastcgi_read_timeout 60s;
    }

    # Block direct access to dotfiles
    location ~ /\.(?!well-known).* { deny all; }
}
```

### Frontend (`your-domain.com`)

Two options:

**Option A — Next.js standalone server (recommended):**

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Run Next.js with:

```bash
cd /var/www/wadalmardy/frontend
PORT=3000 HOST=127.0.0.1 NODE_ENV=production \
  node node_modules/next/dist/bin/next start
```

Wrap in a systemd unit:

```ini
# /etc/systemd/system/wadalmardy-frontend.service
[Unit]
Description=Wad Almardi storefront (Next.js)
After=network.target

[Service]
WorkingDirectory=/var/www/wadalmardy/frontend
EnvironmentFile=/var/www/wadalmardy/frontend/.env.local
ExecStart=/usr/bin/node node_modules/next/dist/bin/next start
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```

**Option B — `next export` + static hosting:** only if you can do without the dynamic `[orderId]` route (which uses `useEffect`). Not recommended.

## 5. Process / queue workers

`QUEUE_CONNECTION=redis` means we need a worker:

```ini
# /etc/systemd/system/wadalmardy-queue.service
[Unit]
Description=Wad Almardi queue worker
After=network.target redis-server.service

[Service]
WorkingDirectory=/var/www/wadalmardy/backend
ExecStart=/usr/bin/php artisan queue:work --sleep=3 --tries=3 --max-time=3600
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```

A scheduler (`schedule:run`) is also needed for any cron-style tasks:

```ini
# /etc/systemd/system/wadalmardy-scheduler.service
[Service]
WorkingDirectory=/var/www/wadalmardy/backend
ExecStart=/usr/bin/php artisan schedule:run --no-interaction
```

```ini
# /etc/systemd/system/wadalmardy-scheduler.timer
[Unit]
Description=Run Laravel scheduler every minute
[Timer]
OnCalendar=*:*:00
[Install]
WantedBy=timers.target
```

## 6. Backups

- **MySQL:** `mysqldump` cron nightly, offsite copy (S3, Backblaze).
- **User uploads:** `storage/app/public/*` is the only upload directory; rsync to S3 nightly.
- **`Setting::backup` endpoint** exists for in-app DB-dump backups; run via:

  ```bash
  curl -X GET -H "Authorization: Bearer $ADMIN_TOKEN" \
    https://api.your-domain.com/api/admin/settings/backup > backups/wad-$(date +%F).sql
  ```

## 7. Health checks

```bash
curl https://api.your-domain.com/up   # Laravel health
curl https://api.your-domain.com/api/health   # JSON {status:ok}
```

Wire both into your uptime monitor (UptimeRobot / BetterStack / Healthchecks.io).

## 8. Pre-deploy checklist

- [ ] `APP_DEBUG=false`, `APP_ENV=production`
- [ ] All secrets set via env, none committed
- [ ] `php artisan config:cache route:cache view:cache`
- [ ] `npm run build` succeeded; `.next/` is fresh
- [ ] MySQL migrations applied (`migrate --force`)
- [ ] Storage symlink exists (`storage:link`)
- [ ] SSL certs valid and auto-renewing
- [ ] Backup ran successfully in last 24h
- [ ] Health check endpoint returns 200
- [ ] `.env`, `.env.local`, `node_modules/`, `vendor/` NOT deployed (rsync excludes them)

## 9. Rollback

Keep last 3 builds:

```bash
ls /var/www/wadalmardy-frontend-releases/
# Current symlink:
ln -sfn /var/www/wadalmardy-frontend-releases/$TIMESTAMP /var/www/wadalmardy/frontend/.next
```

For backend, keep `composer.lock` and prior `.env`; re-running `composer install` is idempotent.