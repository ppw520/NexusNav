# NexusNav MVP

NexusNav is a self-hosted console portal for NAS/Homelab services.

## Stack

- Frontend: React + TypeScript + Vite + Tailwind + Zustand + lucide-react + sonner + react-rnd
- Backend: Spring Boot 3 + SQLite + Flyway
- Deploy: Docker + docker-compose

## Repository Layout

- `frontend/`: Vite app
- `backend/`: Spring Boot REST API
- `docker-compose.yml`: two-container deployment
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

- Frontend: `http://localhost`
- Backend: `http://localhost:8080`

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
