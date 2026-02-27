# NexusNav MVP

Language: [简体中文](README.md) | [English](README.en.md)

NexusNav 是一个面向 NAS/Homelab 服务的自托管控制台门户。

## 技术栈

- 前端：React + TypeScript + Vite + Tailwind + Zustand + lucide-react + sonner + react-rnd
- 后端：Spring Boot 3 + SQLite + Flyway
- 部署：单 Docker 镜像 + docker-compose

## 仓库结构

- `frontend/`：Vite 应用
- `backend/`：Spring Boot REST API
- `Dockerfile`：统一单镜像构建（frontend + backend）
- `docker-compose.yml`：单容器部署
- `config/nav.json`：导航卡片与分组（Config-as-Code）
- `config/config.json`：系统配置（管理员密码、搜索引擎、安全设置）
- `data/`：SQLite 数据库卷

## 快速开始（本地）

### 后端

```bash
cd backend
./mvnw spring-boot:run
```

### 前端

```bash
cd frontend
npm install
npm run dev
```

前端开发地址：`http://localhost:5173`  
后端 API 地址：`http://localhost:8080/api/v1`

默认登录密码（来自配置）：`admin123456`

## 快速开始（Docker）

```bash
docker compose up -d --build
```

- 应用：`http://localhost`
- API：`http://localhost/api/v1`

## 发布（单镜像）

默认发布目标：
- 镜像：`ghcr.io/ppw520/nexusnav`
- 标签：语义化版本（`0.1.0`）与 `latest`
- 平台：`linux/amd64,linux/arm64`

质量门禁：

```bash
npm --prefix frontend ci --no-audit --no-fund
npm --prefix frontend run build
./backend/mvnw -f backend/pom.xml test
```

构建并推送多架构镜像：

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

打发布标签：

```bash
git tag -a v1.0.0 -m "release 1.0.0"
git push origin v1.0.0
```

验证已发布镜像：

```bash
docker pull ghcr.io/ppw520/nexusnav:1.0.0
docker buildx imagetools inspect ghcr.io/ppw520/nexusnav:1.0.0
```

## 生产发布（短停机）

1. 备份主机 `data/` 与 `config/`。
2. 在生产 compose 中使用镜像模式：

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

3. 发布：

```bash
docker compose pull
docker compose up -d --force-recreate
```

4. 发布后检查：
- `GET /`
- `GET /settings`
- `GET /api/v1/auth/session`

## 回滚

将镜像标签切换为上一个稳定版本（例如 `ghcr.io/ppw520/nexusnav:0.9.2`）并重新部署：

```bash
docker compose pull
docker compose up -d --force-recreate
```

## CI/CD（GitHub Actions）

- `CI`：`.github/workflows/ci.yml`
  - 触发：推送/PR 到 `main`
  - 后端：Maven 构建
  - 前端：npm 构建
  - 单镜像：`docker build -f Dockerfile`
- `Release`：`.github/workflows/release.yml`
  - 触发：推送 git tag（`v*`，例如 `v1.0.0`）
  - 发布镜像到 GHCR：
    - `ghcr.io/ppw520/nexusnav`

Tag 发布示例：

```bash
git tag -a v1.0.0 -m "release 1.0.0"
git push origin v1.0.0
```

使用生产 compose 部署：

```bash
IMAGE_TAG=1.0.0 docker compose -f docker-compose.prod.yml up -d
```

## GitHub Flow 分支治理

- 长期分支：仅 `main`。
- 开发分支命名：
  - `feature/<短描述>`
  - `fix/<短描述>`
  - `chore/<短描述>`
- 合并到 `main` 的 PR 必须满足：
  - 至少 1 个 Approve
  - `.github/workflows/ci.yml` 的全部检查通过
  - 合并前分支已同步到最新 `main`
- `main` 只允许 Squash 合并（禁用 merge commit 与 rebase merge）。
- Hotfix 仍走 `fix/*` + PR 流程，不允许直接推送 `main`。
- 发布触发：PR 合并到 `main` 后，由维护者打 `vMAJOR.MINOR.PATCH` 语义化标签。
- 日期型标签仅作为历史遗留，后续版本统一使用 SemVer。

### GitHub 仓库设置（手动配置）

在 GitHub 仓库设置中对 `main` 启用以下规则：

- 启用分支保护/Ruleset
- 强制通过 Pull Request 合并
- 最低审批人数：1
- 强制状态检查通过后才可合并
- 强制分支合并前与 `main` 保持最新
- 禁止直接 push 到 `main`
- 合并方式仅保留 Squash

## 核心 API

公开认证接口：
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/session`
- `POST /api/v1/auth/logout`

受保护接口：
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

响应结构：

```json
{ "code": 0, "message": "ok", "data": {} }
```

## Config-as-Code

启动时，后端会导入：
- 导航数据来自 `NEXUSNAV_NAV_PATH`（回退顺序：`NEXUSNAV_CONFIG_PATH` 同级 `nav.json`，再到 classpath `seed/nav.json`）
- 系统数据来自 `NEXUSNAV_CONFIG_PATH`（回退到 classpath `seed/config.json`）

规则：
- 按 `id` 执行 upsert
- 默认对缺失记录非破坏性处理
- 可选 prune 模式：`POST /api/v1/config/reload?prune=true&verifyToken=...`
- 配置 hash 不变时跳过导入

## 备注

- MVP 为单用户、基于 Session Cookie 的认证方式。
- 设置页新增：
  - 每日一句开关（首页顶部文案是否调用第三方接口）
  - 背景设置（`gradient` 或 `image`）
  - 搜索引擎图标（支持 Iconify/Emoji/URL/data URL）
  - `requireAuthForConfig`（进入配置页二次验证）
- 背景图采用 `data:image/*;base64,` 存储，服务端限制解码后大小不超过 `512KB`。
