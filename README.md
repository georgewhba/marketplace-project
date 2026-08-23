# Marketplace V2

Production-ready multi-vendor marketplace platform.

## Features
- Multi-vendor system with atomic transactions for orders and stock.
- Full testing suite (Unit, Integration, E2E).
- Secure authentication (JWT with robust rotation).
- Robust file uploads processing with Sharp (WebP, Exif stripping).
- CI/CD with GitHub Actions.
- Production observability with Sentry and Pino.

## Setup Development

1. **Clone and Install**
   ```bash
   npm ci
   cd client && npm ci
   cd ..
   ```

2. **Environment Setup**
   Copy `.env.example` to `.env` and fill the variables.
   ```bash
   cp .env.example .env
   ```

3. **Database Setup**
   ```bash
   # Ensure Postgres is running on localhost:5432
   npm run db:migrate
   npm run db:seed
   ```

4. **Start Development Servers**
   ```bash
   npm run dev              # Backend
   cd client && npm run dev # Frontend
   ```

## Production Deployment & CI/CD

### Branch Protection
It is strongly recommended to enable **Branch Protection** on the `main` branch in GitHub:
- Require a pull request before merging.
- Require status checks to pass before merging (specifically the `CI Pipeline` workflow).

### CI/CD Pipeline
The `.github/workflows/ci.yml` runs on every PR and push to `main`. It runs:
- Type checking (`tsc`)
- Linting
- Database migrations against a test container
- Full Unit & Integration test suite
- NPM Audit for High/Critical vulnerabilities

### Server Deployment

1. **Build the Application**
   ```bash
   npm run build
   ```

2. **Setup PM2 (Process Manager)**
   ```bash
   npm install -g pm2
   pm2 start scripts/ecosystem.config.cjs
   pm2 save
   pm2 startup
   ```

3. **Setup Nginx (Reverse Proxy)**
   Copy `scripts/nginx.conf` to your Nginx sites-available directory, update the paths, and enable it.
   ```bash
   sudo cp scripts/nginx.conf /etc/nginx/sites-available/marketplace.conf
   sudo ln -s /etc/nginx/sites-available/marketplace.conf /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### Monitoring & Uptime
- **Error Tracking**: `SENTRY_DSN` must be configured in `.env` to capture unhandled backend exceptions.
- **Uptime Monitoring**: Connect a free service like UptimeRobot or BetterStack to the `/api/health` endpoint. Configure it to check every 5 minutes. The endpoint checks both database connectivity and `/uploads` disk space.
- **Metrics**: A Prometheus-compatible endpoint is available at `/api/metrics` for basic memory profiling.
