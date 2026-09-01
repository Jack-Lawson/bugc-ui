# iOS 应用打包指南

本指南提供了将 Vue 3 + Vite 前端项目打包成 iOS IPA 文件的完整流程。

## 环境要求

### macOS
- macOS 12.0 或更高版本
- Xcode 14.0 或更高版本（通过 App Store 安装）
- Xcode Command Line Tools：`xcode-select --install`

### 开发工具
- Node.js 18+ 和 npm
- CocoaPods（iOS 依赖管理器）：`sudo gem install cocoapods`

### 开发账户
- Apple Developer Account（用于签名和发布）
- Team ID
- 开发者证书和配置文件

## 本地开发设置

### 1. 初始化 iOS 环境

在项目根目录运行：

```bash
chmod +x scripts/setup-ios.sh
./scripts/setup-ios.sh
```

这个脚本会：
- 检查 Xcode 和开发工具
- 安装 CocoaPods
- 构建 Web 资源
- 添加 iOS 平台
- 同步 Capacitor 配置

### 2. 配置环境变量

创建 `.env.ios` 文件（从 `.env.ios.example` 复制）：

```bash
cp .env.ios.example .env.ios
```

编辑 `.env.ios` 并设置你的后端 API 和 WebSocket 服务器地址：

```env
# 必须使用 HTTPS 和 WSS 协议
VITE_API_BASE_URL=https://api.example.com/api
VITE_WS_BASE_URL=wss://api.example.com/ws
```

### 3. 配置签名

在 Xcode 中配置开发签名：

```bash
npm run ios:open
```

然后：
1. 选择 "App" target
2. 进入 "Signing & Capabilities"
3. 选择你的开发团队
4. 验证 Bundle Identifier 为 `com.bugc.admin`

## 本地构建

### 开发构建

```bash
# 构建 Web 资源
npm run build:ios

# 在模拟器上运行
npm run ios:run

# 或者手动打开 Xcode 进行开发
npm run ios:open
```

### 发布构建

使用自动化脚本构建 IPA：

```bash
# 构建 Release 版本的 IPA
./scripts/build-ios-ipa.sh release

# 构建 Debug 版本的 IPA（用于测试）
./scripts/build-ios-ipa.sh debug

# 指定团队 ID 和配置文件（可选）
./scripts/build-ios-ipa.sh release --team-id ABCD12345E --provisioning-profile MyProfile
```

脚本会在 `ios/App/build/ipa/` 目录生成 `.ipa` 文件。

## GitHub Actions 自动化构建

### 配置 Secrets

在 GitHub 仓库中添加以下 Secrets：

1. **API 配置** (必需)：
   - `VITE_API_BASE_URL`: 后端 API 基础 URL
   - `VITE_WS_BASE_URL`: WebSocket 基础 URL
   - `VITE_DEV_BACKEND_URL`: 开发环境后端 URL

2. **iOS 环境**（可选但推荐）：
   - `IOS_ENV`: 整个 `.env.ios` 文件内容（base64 编码）

3. **代码签名**（用于 App Store 分发）：
   - `IOS_CERTIFICATE`: 开发者证书 (`.p12`)，base64 编码
   - `IOS_PROVISIONING_PROFILE`: 配置文件，base64 编码
   - `CERTIFICATE_PASSWORD`: 证书密码
   - `KEYCHAIN_PASSWORD`: Keychain 密码
   - `TEAM_ID`: Apple Team ID

### 编码 Secrets

#### 编码证书和配置文件：

```bash
# 编码 .p12 证书
base64 -i certificate.p12 | tr -d '\n' | pbcopy

# 编码 .mobileprovision 配置文件
base64 -i profile.mobileprovision | tr -d '\n' | pbcopy

# 编码 .env.ios 文件
base64 -i .env.ios | tr -d '\n' | pbcopy
```

### 工作流触发

工作流会在以下情况自动触发：

- 推送到 `main` 或 `develop` 分支
- 创建 Pull Request
- 手动触发 (使用 `workflow_dispatch`)

### 工作流输出

- **Artifacts**: IPA 文件保存在 GitHub Artifacts（保留 30 天）
- **Releases**: 当推送 tag 时（格式：`v*`），IPA 会自动发布到 Release

## 签名和配置详情

### 开发签名（Automatic）

最简单的方式，使用 Xcode 的自动签名：

1. 在 Xcode 中选择 "Automatically manage signing"
2. 选择你的开发团队
3. Xcode 会自动创建和更新证书和配置文件

### 手动签名

用于 CI/CD 或生产环境：

1. 在 [Apple Developer](https://developer.apple.com) 创建证书和配置文件
2. 下载证书和配置文件
3. 在 CI/CD 中配置签名凭据（见上面的 Secrets）

## exportOptions.plist 配置

`exportOptions.plist` 文件控制 IPA 导出选项：

```xml
<key>method</key>
<string>app-store</string>  <!-- 可选值：app-store, ad-hoc, enterprise, development -->

<key>signingStyle</key>
<string>automatic</string>  <!-- 或 "manual" -->
```

### 不同导出方法：

- **app-store**: App Store 分发（需要 App Store 配置文件）
- **ad-hoc**: 临时分发给指定设备（需要 Ad Hoc 配置文件）
- **enterprise**: 企业分发（需要企业账户）
- **development**: 开发调试（需要开发配置文件）

## 故障排除

### 1. CocoaPods 问题

```bash
# 清理 CocoaPods 缓存
pod deintegrate
pod install --repo-update
```

### 2. 签名错误

```bash
# 重置签名
rm -rf ~/Library/Caches/com.apple.dt.Xcode
```

### 3. 构建失败

```bash
# 清理构建
cd ios/App
xcodebuild clean -workspace App.xcworkspace -scheme App
pod install --repo-update
```

### 4. 模拟器问题

```bash
# 列出可用的模拟器
xcrun simctl list devices

# 重置所有模拟器
xcrun simctl erase all
```

## 分发

### 通过 TestFlight 测试

1. 在 App Store Connect 上传 IPA
2. 邀请测试人员
3. 收集反馈

### 发布到 App Store

1. 上传 IPA 到 App Store Connect
2. 填写应用信息（描述、截图等）
3. 提交审核
4. 等待 Apple 审核

### AdHoc 分发

适用于内部测试：

```bash
./scripts/build-ios-ipa.sh release --provisioning-profile AdHocProfile
```

然后使用 Xcode Organizer 或 Apple Configurator 分发。

## 最佳实践

1. **版本管理**：
   - 在 `Info.plist` 中管理版本号
   - 使用语义化版本标记 (v1.0.0)

2. **配置管理**：
   - 敏感信息使用环境变量
   - 使用 GitHub Secrets 管理凭据
   - 定期轮换证书

3. **测试**：
   - 在模拟器和真实设备上测试
   - 使用 TestFlight 进行 beta 测试
   - 验证 HTTPS 和 WebSocket 连接

4. **监控**：
   - 使用 Xcode Organizer 跟踪崩溃
   - 定期检查日志
   - 监控性能指标

## 相关文件

- `capacitor.config.ts`: Capacitor 配置
- `vite.config.ts`: Vite 构建配置
- `package.json`: npm 脚本
- `.env.ios.example`: 环境变量模板
- `exportOptions.plist`: IPA 导出配置
- `.github/workflows/ios-build.yml`: GitHub Actions 工作流
- `scripts/setup-ios.sh`: 环境设置脚本
- `scripts/build-ios-ipa.sh`: IPA 构建脚本

## 参考资源

- [Capacitor iOS 文档](https://capacitorjs.com/docs/ios)
- [Xcode 文档](https://developer.apple.com/documentation/xcode)
- [Apple Developer 文档](https://developer.apple.com/documentation/)
- [GitHub Actions 文档](https://docs.github.com/en/actions)

## 支持

如有问题，请参考：
- Capacitor 社区论坛
- iOS 开发者论坛
- GitHub Issues
