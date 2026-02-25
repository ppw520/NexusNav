# NexusNav MVP

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

## Release (Docker Hub, Manual)

Default release target:
- Image: `ppw111/nexusnav`
- Tags: `2026.02.25` and `latest`
- Platforms: `linux/amd64,linux/arm64`

Quality gates:

```bash
npm --prefix frontend ci --no-audit --no-fund
npm --prefix frontend run build
./backend/mvnw -f backend/pom.xml test
```

Build and push multi-arch image:

```bash
export IMAGE=ppw111/nexusnav
export TAG=2026.02.25

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
git tag -a v2026.02.25 -m "release 2026.02.25"
git push origin codex/release/2026-02-25 --tags
```

Verify published image:

```bash
docker pull ppw111/nexusnav:2026.02.25
docker buildx imagetools inspect ppw111/nexusnav:2026.02.25
```

## Production Rollout (Short Downtime)

1. Backup host `data/` and `config/`.
2. Use image mode in production compose:

```yaml
services:
  nexusnav:
    image: ppw111/nexusnav:2026.02.25
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

Switch image tag to the previous stable release (example `ppw111/nexusnav:2026.02.24`) and redeploy:

```bash
docker compose pull
docker compose up -d --force-recreate
```

## CI/CD (GitHub Actions)

- `CI`: `.github/workflows/ci.yml`
  - Trigger: push/pull_request to `main`
  - Backend: Maven build
  - Frontend: npm build
- `Release`: `.github/workflows/release.yml`
  - Trigger: git tag push (`v*`, e.g. `v1.0.0`)
  - Publish images to GHCR:
    - `ghcr.io/ppw520/nexusnav-backend`
    - `ghcr.io/ppw520/nexusnav-frontend`

Tag and release example:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Deploy with production compose:

```bash
IMAGE_TAG=1.0.0 docker compose -f docker-compose.prod.yml up -d
```

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
