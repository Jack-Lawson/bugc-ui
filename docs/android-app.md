# Android APP 构建

当前 Android 客户端通过 Capacitor 复用 Vue 页面，服务端仍独立部署。

## 环境准备

- Node.js 18 或更高版本
- JDK 17。当前项目固定使用 Capacitor 6 / Android Gradle Plugin 8.2.1，避免 JDK 21 依赖。
- Android Studio 和 Android SDK Platform 34
- Android SDK Build-Tools、Platform-Tools、Command-line Tools 和 Android Emulator

## 配置

复制 `.env.android.example` 为 `.env.android`，填写手机能够访问的 HTTPS API 地址和 WSS 地址。不要使用 `localhost`，也不要提交包含真实地址的环境文件。

服务端需允许 Capacitor WebView 的跨域请求，并通过可信 HTTPS 证书提供 API 和 WebSocket 服务。

Android Studio 中将 Gradle JDK 设置为 JDK 17。`android/local.properties` 由本机生成并指向本机 SDK 目录，该文件已被 Git 忽略，不要提交。

## 构建

```bash
npm ci
npm run typecheck
npm run build:android
npm run android:open
```

在 Android Studio 中选择真机或模拟器运行。生成安装包时使用 Android Studio 的 Generate Signed Bundle / APK，并把签名文件保存在项目目录之外。

如果项目放在 WSL 目录下，不要在 WSL 命令行里直接复用 Windows Android SDK，也不要在 Windows Gradle 里直接使用 WSL UNC 路径。建议用 Android Studio 打开 `android/` 子工程运行；需要命令行构建时，把项目临时复制到 Windows 本地目录，或在 WSL 内单独安装 Linux 版 Android SDK。

## 同步规则

每次修改前端后运行 `npm run build:android`，它会构建 `dist-android` 并同步到 Android 工程。仅修改原生配置时可以直接运行 `npx cap sync android`。

## 当前兼容范围

- 登录、菜单、列表、表单和 WebSocket 复用现有手机端页面。
- 刘海屏和底部手势区使用安全区变量适配。
- Android 返回键在业务页面返回上一页，在首页和登录页退到后台。
- APP 禁止明文 HTTP，API 必须使用 HTTPS，WebSocket 必须使用 WSS。
- 普通文件、图片和视频可以使用系统文件选择器；浏览器专属的文件夹选择能力取决于 Android WebView，不能作为稳定的原生能力。
- 当前 Capacitor 版本固定为 6.x，`minSdkVersion=26`、`compileSdkVersion=34`、`targetSdkVersion=34`。

## 常见问题

1. WSL 下直接使用 Windows Android SDK 构建，可能提示 Build Tools 缺少 Linux 可执行文件。这是 SDK 平台不匹配，不是 Android 工程损坏。
2. Windows 下直接在 WSL UNC 路径运行 Gradle，可能在文件哈希阶段失败。建议使用 Android Studio 打开工程，或临时复制到 Windows 本地目录构建。
3. 如果命令行提示 `invalid source release: 21`，说明依赖或 Android 工程又被升级到 Capacitor 7/8，需要回到 Capacitor 6 版本线。
4. 如果提示 `Unsupported class file major version 69`，说明当前 Gradle 使用的 JDK 版本过新，需要切换到 JDK 17。
5. 若未来要上架应用商店并要求更高 targetSdk，需要另起 JDK 21 + Capacitor 8 的发布线评估。
