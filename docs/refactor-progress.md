# NexusNav 重构说明与进展

更新时间：2026-03-01
分支：`refactor/schema-driven-config`

## 1. 重构目标

1. 放弃数据库依赖，改为纯配置文件驱动。
2. 卡片数据改为动态结构（`config + secretRefs`），新增卡片类型不再改表结构。
3. 后端提供卡片类型 schema，前端按 schema 动态渲染配置表单。
4. 兼容并保留 SSH、qBittorrent、Transmission、Emby 等专属展示能力。
5. 统一 API 到 `/api/v2`，错误信息优先中文化。

## 2. 已完成项

### 2.1 后端

1. 配置读写切换为文件模型（`nav.json`、`config.json`、`secrets.json`）。
2. 卡片模型完成动态化：`config: Map<String,Object>` + `secretRefs: Map<String,String>`。
3. 引入密文能力：`NEXUSNAV_MASTER_KEY` + AES-256-GCM。
4. 提供卡片 schema 能力与接口：`GET /api/v2/cards/types`。
5. 业务接口升级到 `/api/v2/*`，并完善中文异常提示。

### 2.2 前端

1. 类型与 API 调整到 `/v2`。
2. 首页接入动态渲染注册表，支持按卡片类型分发展示行为。
3. 设置页接入 schema 动态表单（卡片/分组管理）。

## 3. 今日最新更新（配置页缺失修复）

问题：用户反馈配置页面功能缺失，只显示“卡片与分组管理”。

处理结果：

1. `frontend/src/pages/SettingsPage.tsx` 已补回“系统配置管理”完整区块。
2. 已恢复以下系统配置项：
   - 网络模式偏好
   - 默认搜索引擎 ID
   - 搜索引擎 JSON 配置
   - 每日一句开关
   - 背景类型/背景图上传
   - 登录鉴权开关
   - 配置二次验证开关
   - 会话超时
   - 新管理员密码
3. 已恢复配置二次验证流程：`verifyConfig` + 本地 token 缓存。
4. 修复一个前端语法问题（文案中的 `<=` 导致 JSX 解析报错）。
5. 按“旧版样式与布局”要求完成设置页视觉回归：
   - 恢复旧版 Tabs 分区布局（服务/分组/搜索/安全/网络/每日一句/背景）
   - 保留 `schema` 驱动的动态卡片字段渲染，不回退为硬编码字段
   - 保留卡片扩展能力（新增类型可通过 schema 自动进入编辑表单）

## 4. 验证记录

截至 2026-03-01，本地验证如下：

1. 前端构建通过：
   - `npm --prefix frontend run build`
2. 构建链路通过：
   - `tsc -b`
   - `vite build`

## 5. 当前待办

1. 进行 `/settings` 页面手工联调（保存配置、二次验证、背景图上传）。
2. 启动前后端联调确认运行态表现（不仅是编译通过）。
3. 根据联调结果补充端到端验证记录。

## 6. 运行注意事项

1. 后端启动建议显式设置：
   - `NEXUSNAV_NAV_PATH`
   - `NEXUSNAV_CONFIG_PATH`
   - `NEXUSNAV_MASTER_KEY`
2. 本轮为完整重构，不保留旧版结构兼容层。
