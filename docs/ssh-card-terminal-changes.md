# SSH 卡片类型与终端弹窗改动说明

## 目标
- 在服务卡片配置中引入默认类型能力。
- 新增 `ssh` 类型卡片，用户点击后打开可交互终端小窗执行命令。
- 不考虑旧版本兼容迁移逻辑。

## 后端改动

### 依赖
- `spring-boot-starter-websocket`
- `com.github.mwiede:jsch:0.2.27`

### 数据模型与字段
- 新增卡片类型字段：`card_type`
- 新增 SSH 字段：
  - `ssh_host`
  - `ssh_port`
  - `ssh_username`
  - `ssh_auth_mode`

### 类型常量
- 卡片类型：`generic`、`ssh`
- SSH 鉴权：`password`、`privatekey`

### 主要逻辑
- 新增 WebSocket 配置与处理器：
  - `SshWebSocketConfig`
  - `SshWebSocketHandler`
- 卡片创建/更新时增加 `cardType` 与 SSH 字段的校验、标准化处理。
- `ssh` 类型卡片在 URL 解析中支持 `ssh://host:port` 形式。
- 导入配置流程同步支持 `cardType` 与 SSH 字段。

## 前端改动

### 类型定义
- 新增 `CardType`：`"generic" | "ssh"`
- 新增 `SshAuthMode`：`"password" | "privatekey"`
- 扩展卡片 DTO 与提交 payload，包含 SSH 相关字段。

### 交互与组件
- 新增 `SshTerminalWindow` 组件：
  - 通过 WebSocket `/ws/ssh?cardId=...` 建立连接
  - 支持终端输入、窗口大小变化、断开连接
- 首页卡片点击逻辑：
  - `ssh` 卡片打开终端小窗
  - 非 `ssh` 卡片保持原有 iframe/new tab 行为
- 卡片 UI 增加 SSH 类型视觉标识。

### 设置页
- 新增 SSH 模板入口，支持快速创建 `ssh` 类型卡片。
- 表单新增 `cardType` 和 SSH 相关字段。
- 根据 `cardType` 条件渲染 SSH 配置项。

## 数据库脚本
- 新增：`V7__card_type_and_ssh_fields.sql`

## 影响范围
- 变更覆盖后端 DTO/实体/服务/导入流程与前端类型、设置页、首页卡片行为。
- 现有通用卡片能力保持可用，新增 `ssh` 作为可选默认类型能力。
