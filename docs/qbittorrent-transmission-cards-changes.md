# qBittorrent + Transmission 卡片分支改动说明

## 分支信息
- 分支名：`codex/feature/qbittorrent-transmission-cards`
- 目标：新增 qBittorrent 与 Transmission 卡片，提供只读统计与细分状态能力，并支持前端直连优先、后端代理兜底。

## 后端改动

### 数据库迁移
- 新增迁移脚本：`backend/src/main/resources/db/migration/V9__torrent_card_fields.sql`
- 在 `cards` 表新增字段：
  - `qbittorrent_username`
  - `qbittorrent_password`
  - `transmission_username`
  - `transmission_password`

### 类型与模型
- 扩展卡片类型：`generic | ssh | emby | qbittorrent | transmission`
- 同步更新以下对象的字段与序列化：
  - `ConfigModel`
  - `CardEntity`
  - `CardDTO`
  - `CreateCardRequest`
  - `UpdateCardRequest`
  - `ImportNavConfigRequest`
  - `NavConfigService`

### 校验与写入逻辑
- `CardService`、`ConfigImportService` 增加新类型校验：
  - `qbittorrent/transmission` 至少需要一个 URL（`url/lanUrl/wanUrl`）且用户名/密码必填。
- 非对应类型会清理无关字段，保持与既有类型处理一致。
- `healthCheckEnabled` 仍仅对 `generic` 类型生效。

### 新增统计接口
- `GET /api/v1/qbittorrent/cards/{cardId}/stats`
- `GET /api/v1/transmission/cards/{cardId}/stats`

新增实现：
- DTO：
  - `TorrentStatsDTO`
  - `TorrentStatusBreakdownDTO`
- Service：
  - `QbittorrentService`
  - `TransmissionService`
- Controller：
  - `QbittorrentController`
  - `TransmissionController`

Transmission 兼容逻辑：
- 默认尝试 `/transmission/rpc`，失败后尝试 `/rpc`。
- 处理 `409` 会话挑战并重试 `X-Transmission-Session-Id`。

## 细分状态口径

统一字段：
- `downloading`
- `seeding`
- `paused`
- `queued`
- `checking`
- `stalled`
- `error`
- `unknown`

qBittorrent 映射（`state`）：
- downloading: `downloading`, `forcedDL`, `metaDL`
- seeding: `uploading`, `forcedUP`
- paused: `pausedDL`, `pausedUP`
- queued: `queuedDL`, `queuedUP`
- checking: `checkingUP`, `checkingDL`, `checkingResumeData`
- stalled: `stalledDL`, `stalledUP`
- error: `error`, `missingFiles`
- unknown: 其余状态

Transmission 映射（`status` + `error`）：
- paused: `0`
- checking: `1`, `2`
- queued: `3`, `5`
- downloading: `4`
- seeding: `6`
- error: `error > 0`
- stalled: 首版固定 `0`
- unknown: 未识别状态

## 前端改动

### 类型与 API
- `frontend/src/types/index.ts` 扩展新卡片类型、凭据字段与统计类型。
- `frontend/src/services/api.ts` 新增两类代理统计 API 调用。
- `frontend/src/services/torrent.ts` 新增统一加载逻辑：
  - 先直连请求 downloader Web API
  - 失败自动回退后端代理
  - 返回 `source: direct | proxy`

### 交互与组件
- 新增组件：`frontend/src/components/TorrentStatsWindow.tsx`
  - 展示下载/上传速率、活跃任务、总任务、细分状态
  - 支持 30 秒自动刷新 + 手动刷新
- `frontend/src/pages/HomePage.tsx`
  - qBittorrent/Transmission 卡片点击打开统计窗口
  - 首页缓存并轮询两类卡片统计数据
- `frontend/src/components/ServiceCard.tsx`
  - 新类型卡片摘要展示与标识（QBT/TR）
- `frontend/src/pages/SettingsPage.tsx`
  - 支持选择 `qbittorrent`、`transmission` 类型
  - 增加用户名/密码字段与前端校验

## 文档改动
- 更新：
  - `README.md`
  - `README.zh-CN.md`
  - `README.en.md`
- 内容包含：
  - 新卡片类型配置说明
  - 直连优先 + 代理兜底说明
  - 统计接口与细分状态说明

## 非目标与当前边界
- 本次仅实现只读统计，不包含暂停/恢复/删除等控制动作。
- 未进行凭据加密重构，沿用现有配置存储方式。
- 历史卡片类型与已有能力保持兼容。
