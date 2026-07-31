# AGENTS.md

## 项目画像

- 项目类型：frontend。
- 技术栈：Vue 3、Vite、TypeScript、Naive UI、Pinia、Vue Router、Axios。
- 包管理器：npm；依赖锁文件为 `package-lock.json`，依赖变更时应同步提交。
- 源码目录：`src/`。
- 路径别名：`@` 指向 `src`。
- 开发端口默认 `3000`，由 `VITE_DEV_SERVER_PORT` 覆盖。
- Vite 构建输出目录为相邻后端静态目录：`../bugc-manage/bugc-starter/src/main/resources/static`。

## 重要入口

- 通用前端配置集中在 `src/config/app.ts`。
- 环境变量模板为 `.env.example`，本地实际环境文件不提交。
- Vite 代理和构建配置在 `vite.config.ts`。
- Axios 请求封装在 `src/utils/request.ts`。
- WebSocket 封装在 `src/utils/websocket.ts`。
- 站点配置 Store 在 `src/stores/site.ts`。
- 主题和本地布局偏好 Store 在 `src/stores/theme.ts`。
- 路由配置和动态路由逻辑在 `src/router/index.ts`。
- 系统配置页面在 `src/views/system/config/index.vue`。

## 配置约定

- 后端地址优先通过 `.env` / `.env.*` 配置，不要在业务代码里新增硬编码地址。
- 开发环境后端基础地址使用 `VITE_DEV_BACKEND_URL`。
- Axios 基础路径使用 `VITE_API_BASE_URL`，默认 `/api`。
- WebSocket 基础地址使用 `VITE_WS_BASE_URL`；留空时使用当前页面域名。
- SSH 终端开发环境 WebSocket 地址使用 `VITE_DEV_SSH_WS_BASE_URL`；留空时由 `VITE_DEV_BACKEND_URL` 自动转换。
- 上传、下载、预览等非 Axios 直连地址应使用 `buildApiUrl()` 拼接。
- WebSocket 地址应使用 `buildWebSocketUrl()` 拼接。
- 站点默认值、系统配置默认结构、本地存储 key 应优先放在 `src/config/app.ts`。
- `.env.example` 只能放无密钥示例值；真实域名、账号、Token、密钥不得提交。

## 代码约定

- 新增工具前，优先沿用项目已有约定。
- 新增或修改代码注释时，统一使用中文。
- 保持现有 Vue SFC 风格和 Naive UI 用法，不为局部改动引入新的 UI 框架或状态库。
- API 方法优先集中在 `src/api/`，页面组件不要直接散落后端 URL。
- 业务请求路径不要重复写 `/api` 前缀；Axios 已通过 `VITE_API_BASE_URL` 统一处理。
- 组件内默认文案、配置默认值、localStorage key 不要重复硬编码，优先复用 `src/config/app.ts`。
- 不提交 `node_modules/`、构建产物、本地日志、缓存或敏感信息。

## 必要检查

- 相关改动完成后，如存在 `scripts/check-all.sh`，应优先运行。

## 构建输出风险

- 本项目 Vite 构建会写入相邻后端静态目录。
- 提交前必须检查当前前端仓库状态。
- 当前仓库的 `.gitignore` 无法忽略工作区外的后端静态目录，涉及构建产物时要额外留意。

## Git 提交规则

- 提交前先查看变更范围，确认没有混入无关文件、构建产物或本地配置。
- 提交信息使用 Conventional Commits：`type(scope): 中文提交说明`，提交说明必须使用中文。
- 常用类型：`feat`、`fix`、`docs`、`style`、`refactor`、`test`、`chore`、`build`、`ci`、`perf`、`revert`。
- 每个提交只做一件逻辑完整的事；格式化、重构、功能、修复尽量拆开。
- 修改 `.gitignore` 后，确认新增规则不会误忽略应提交的源码、锁文件、配置模板或文档。
- `.env.example`、`.env.*.example` 这类无密钥模板可以提交。

## Git 远端与 SSH

- 当前远端使用 SSH 地址：`ssh://git@192.168.1.4:10022/bugc/bugc-ui.git`。
- `10022` 是 Git SSH 端口；Web 页面端口和 Git SSH 端口不是同一个用途。
- 不要把私钥、SSH 配置备份、真实内网拓扑等敏感信息提交到仓库。
