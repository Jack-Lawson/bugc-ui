# AGENTS.md

## 项目画像

- 项目类型：frontend。
- 技术栈：Vue 3、Vite、TypeScript、Naive UI、Pinia、Vue Router、Axios。
- 包管理器：npm；依赖锁文件为 `package-lock.json`，依赖变更时应同步提交。
- 源码目录：`src/`。
- 路径别名：`@` 指向 `src`。
- 开发端口默认 `3000`，由 `VITE_DEV_SERVER_PORT` 覆盖。
- Vite 构建输出目录默认为当前前端项目 `dist/`。
- ECS 使用前后端分离部署：系统 Nginx 托管前端静态资源，`/api`、`/ws` 等路径反代到后端。

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

## 用户指定交付闭环

- 以后涉及本项目前端或联动后端的代码修改，默认必须在本地工作区完成修改和验证，不只给方案。
- 本地验证通过后，默认创建 Git 提交；提交信息使用中文，遵循本文件的 Conventional Commits 格式。
- 提交后默认发布到 ECS；发布过程和回复中不得暴露真实主机、地址、端口、私钥、账号或部署目录，只报告脱敏进度与结果。
- 涉及 Android 端的前端变更，发布后默认重新构建 Android 包，并通过 adb 覆盖安装到已连接手机。
- 涉及 iOS 端的前端变更，发布后默认重新构建 iOS IPA，通过 GitHub Actions macOS 构建机自动化打包。
- 若用户当次明确要求只改本地、只分析、不提交、不发布或不安装，以用户当次要求为准。

## iOS 应用打包

- iOS 打包通过 GitHub Actions 在 macOS 构建机上自动进行；本地开发时使用 `npm run ios:run` 在模拟器测试。
- iOS 构建配置在 `vite.config.ts` 中，使用 `--mode ios` 标志，输出目录为 `dist-ios/`。
- iOS 环境变量模板为 `.env.ios.example`，需复制为 `.env.ios` 后填入真实 API 地址。
- iOS 构建要求 API 和 WebSocket 必须使用 HTTPS/WSS 协议（非 HTTP/WS）；GitHub Actions Secrets 中必须配置 `VITE_API_BASE_URL` 和 `VITE_WS_BASE_URL`。
- iOS 代码签名配置在 `.github/workflows/ios-build.yml` 中；需在 GitHub 仓库 Secrets 中配置 `IOS_CERTIFICATE`、`IOS_PROVISIONING_PROFILE`、`CERTIFICATE_PASSWORD`、`KEYCHAIN_PASSWORD`、`TEAM_ID`。
- 本地构建 IPA 使用 `./scripts/build-ios-ipa.sh release` 脚本；环境初始化使用 `./scripts/setup-ios.sh`。
- IPA 构建产物位置：`ios/App/build/ipa/BugC.ipa`；GitHub Actions 会自动上传到 Artifacts，保留 30 天。
- 推送 tag（格式：`v*`）时，GitHub Actions 会自动将 IPA 发布到 Release；TestFlight 上传及 App Store 发布需手动在 App Store Connect 上传。

## 前后端协作

- 修改请求字段、接口路径、认证流程、WebSocket、上传下载或 API 客户端时，必须检查后端对应 Controller、DTO、校验、权限和返回体。
- 不得在业务代码中硬编码后端地址、真实域名、端口或凭据。
- 跨端变更完成后，分别运行前端构建检查和后端相关检查。

- 本项目 Vite 构建默认写入当前前端仓库 `dist/`，不写入后端 `static` 目录。
- 前端发布到 ECS 时，只同步 `dist/` 内容到系统 Nginx 的前端静态目录。
- 后端 jar 只在后端代码或后端资源需要变更时重新构建和部署。
- 提交前必须检查当前前端仓库状态，避免提交 `dist/`、测试报告或本地配置。

## Git 提交规则

- 提交前先查看变更范围，确认没有混入无关文件、构建产物或本地配置。
- 提交信息使用 Conventional Commits：`type(scope): 中文提交说明`，提交说明必须使用中文。
- 常用类型：`feat`、`fix`、`docs`、`style`、`refactor`、`test`、`chore`、`build`、`ci`、`perf`、`revert`。
- 每个提交只做一件逻辑完整的事；格式化、重构、功能、修复尽量拆开。
- 修改 `.gitignore` 后，确认新增规则不会误忽略应提交的源码、锁文件、配置模板或文档。
- `.env.example`、`.env.*.example` 这类无密钥模板可以提交。

## Git 远端与敏感信息

- 不要把远端地址、端口、私钥、SSH 配置、真实内网拓扑写入规则、文档、提交信息或回复。
- 需要排查 Git 远端或 SSH 时，只报告脱敏结论。
