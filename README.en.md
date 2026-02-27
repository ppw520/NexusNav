# NexusNav MVP

Language: [English](README.en.md) | [简体中文](README.md)

NexusNav is a self-hosted console portal for NAS/Homelab services.

## Stack

- Frontend: React + TypeScript + Vite + Tailwind + Zustand + lucide-react + sonner + react-rnd
- Backend: Spring Boot 3 + SQLite + Flyway
- Deploy: Single Docker image + docker-compose

## Repository Layout

- `frontend/`: Vite app
- `backend/`: Spring Boot REST API
- `Dockerfile`: unified single-image build (frontend + backend)
- `docker-compose.yml`: single-container deployment
- `config/nav.json`: navigation cards and groups (Config-as-Code)
- `config/config.json`: system config (admin password, search engines, security settings)
- `data/`: SQLite database volume

## Quick Start (Local)

### Backend

```bash
cd backend
./mvnw spring-boot:run
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend dev URL: `http://localhost:5173`
Backend API URL: `http://localhost:8080/api/v1`

Default login password from config: `admin123456`

## Quick Start (Docker)

```bash
docker compose up -d --build
```

- App: `http://localhost`
- API: `http://localhost/api/v1`

## Release (Single Image)

Default release target:
- Image: `ghcr.io/ppw520/nexusnav`
- Tags: semantic version (`0.1.0`) and `latest`
- Platforms: `linux/amd64,linux/arm64`

Quality gates:

```bash
npm --prefix frontend ci --no-audit --no-fund
npm --prefix frontend run build
./backend/mvnw -f backend/pom.xml test
```

Build and push multi-arch image:

```bash
export IMAGE=ghcr.io/ppw520/nexusnav
export TAG=1.0.0

docker login
docker buildx create --name nexusnav-builder --use --bootstrap || docker buildx use nexusnav-builder
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t ${IMAGE}:${TAG} \
  -t ${IMAGE}:latest \
  --push .
```

Release tag:

```bash
git tag -a v1.0.0 -m "release 1.0.0"
git push origin v1.0.0
```

Verify published image:

```bash
docker pull ghcr.io/ppw520/nexusnav:1.0.0
docker buildx imagetools inspect ghcr.io/ppw520/nexusnav:1.0.0
```

## Production Rollout (Short Downtime)

1. Backup host `data/` and `config/`.
2. Use image mode in production compose:

```yaml
services:
  nexusnav:
    image: ghcr.io/ppw520/nexusnav:1.0.0
    container_name: nexusnav
    environment:
      SPRING_DATASOURCE_URL: jdbc:sqlite:/app/data/nexusnav.db
      NEXUSNAV_CONFIG_PATH: /app/config/config.json
      NEXUSNAV_NAV_PATH: /app/config/nav.json
      NEXUSNAV_HEALTH_INTERVAL: "60"
    volumes:
      - ./data:/app/data
      - ./config:/app/config
    ports:
      - "80:8080"
```

3. Roll out:

```bash
docker compose pull
docker compose up -d --force-recreate
```

4. Post-check:
- `GET /`
- `GET /settings`
- `GET /api/v1/auth/session`

## Rollback

Switch image tag to the previous stable release (example `ghcr.io/ppw520/nexusnav:0.9.2`) and redeploy:

```bash
docker compose pull
docker compose up -d --force-recreate
```

## CI/CD (GitHub Actions)

- `CI`: `.github/workflows/ci.yml`
  - Trigger: push/pull_request to `main`
  - Backend: Maven build
  - Frontend: npm build
  - Single image: `docker build -f Dockerfile`
- `Release`: `.github/workflows/release.yml`
  - Trigger: git tag push (`v*`, e.g. `v1.0.0`)
  - Publish image to GHCR:
    - `ghcr.io/ppw520/nexusnav`

Tag and release example:

```bash
git tag -a v1.0.0 -m "release 1.0.0"
git push origin v1.0.0
```

Deploy with production compose:

```bash
IMAGE_TAG=1.0.0 docker compose -f docker-compose.prod.yml up -d
```

## Downloader Cards (qBittorrent / Transmission)

- New card types: `qbittorrent`, `transmission`.
- Home page cards open a read-only stats window with:
  - download/upload speed
  - active/total torrent count
  - status breakdown (`downloading`/`seeding`/`paused`/`queued`/`checking`/`stalled`/`error`/`unknown`)
- Frontend strategy: direct API calls first, then automatic backend proxy fallback (`source: direct|proxy`).
- These card types require at least one URL (`url`/`lanUrl`/`wanUrl`) and matching username/password.

## GitHub Flow Governance

- Long-lived branch: `main` only.
- Working branch naming:
  - `feature/<short-description>`
  - `fix/<short-description>`
  - `chore/<short-description>`
- Pull requests to `main` must satisfy:
  - 1 approval minimum
  - all CI checks from `.github/workflows/ci.yml` pass
  - branch is up to date with `main` before merge
- Merge strategy for `main`: squash only (disable merge commit and rebase merge).
- Hotfix still uses `fix/*` + PR flow. Direct push to `main` is not allowed.
- Release trigger: maintainers create SemVer tag `vMAJOR.MINOR.PATCH` on `main` after merge.
- Date-style tags remain only as legacy history; new releases must use SemVer.

### GitHub Repository Settings (manual)

In GitHub repository settings, apply these rules to `main`:

- Enable branch protection / ruleset for `main`
- Require a pull request before merging
- Require approvals: 1
- Require status checks to pass before merging
- Require branches to be up to date before merging
- Block direct pushes to `main`
- Allow only squash merge

## Core API

Public auth endpoints:
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/session`
- `POST /api/v1/auth/logout`

Protected endpoints:
- `POST /api/v1/auth/verify-config`
- `GET /api/v1/system/config`
- `GET /api/v1/system/admin-config`
- `POST /api/v1/system/admin-config`
- `GET /api/v1/groups`
- `POST /api/v1/groups`
- `POST /api/v1/groups/{id}/update`
- `POST /api/v1/groups/{id}/delete`
- `GET /api/v1/cards?groupId=&q=&enabled=`
- `GET /api/v1/cards/{id}`
- `POST /api/v1/cards`
- `POST /api/v1/cards/{id}/update`
- `POST /api/v1/cards/{id}/delete`
- `POST /api/v1/cards/order`
- `POST /api/v1/config/reload?prune=false`
- `POST /api/v1/config/import-nav`
- `GET /api/v1/qbittorrent/cards/{cardId}/stats`
- `GET /api/v1/transmission/cards/{cardId}/stats`

Response shape:

```json
{ "code": 0, "message": "ok", "data": {} }
```

## Config-as-Code

On startup, backend imports:
- nav data from `NEXUSNAV_NAV_PATH` (fallback: sibling `nav.json` near `NEXUSNAV_CONFIG_PATH`, then classpath `seed/nav.json`)
- system data from `NEXUSNAV_CONFIG_PATH` (fallback: classpath `seed/config.json`)

Rules:
- Upsert by `id`
- Default non-destructive for missing records
- Optional prune mode: `POST /api/v1/config/reload?prune=true&verifyToken=...`
- Skip import when config hash is unchanged

## Notes

- MVP is single-user and session-cookie based auth.
- 设置页新增：
  - `每日一句` 开关（首页顶部文案是否调用第三方接口）
  - `背景设置`（`gradient` 或 `image`）
  - `搜索引擎 icon`（支持 Iconify/Emoji/URL/data URL）
  - `requireAuthForConfig`（进入配置页二次验证）
- 背景图采用 `data:image/*;base64,` 存储，服务端限制解码后大小不超过 `512KB`。
