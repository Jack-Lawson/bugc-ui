# 前端部署指南

本文档说明如何将前端应用部署到 ECS 服务器。

## 部署架构

```
源代码 → npm run build → dist/ → rsync/scp → ECS Nginx 静态目录
```

前端应用通过 Vite 构建生成静态资源（`dist/`），然后同步到 ECS 上的 Nginx 服务器。系统 Nginx 配置反代后端 API (`/api`, `/ws`) 路径。

## 快速开始

### 1. 配置部署信息

复制部署配置模板：

```bash
cp .deploy.env.example .deploy.env
```

编辑 `.deploy.env` 填入你的 ECS 信息：

```env
DEPLOY_HOST=your-ecs-host
DEPLOY_USER=your-username
DEPLOY_PORT=22
DEPLOY_PATH_DEV=/var/www/bugc-dev
DEPLOY_PATH_STAGING=/var/www/bugc-staging
DEPLOY_PATH_PROD=/var/www/bugc
```

⚠️ **重要**: `.deploy.env` 文件不要提交到 Git（已在 `.gitignore` 中）

### 2. 生成 SSH 密钥（如果需要）

```bash
ssh-keygen -t ed25519 -f ~/.ssh/deploy_key
# 将公钥添加到 ECS 服务器的 ~/.ssh/authorized_keys
```

### 3. 部署

#### 部署到生产环境

```bash
npm run deploy
# 或
./scripts/deploy.sh prod
```

#### 部署到开发环境

```bash
npm run deploy:dev
```

#### 部署到测试环境

```bash
npm run deploy:staging
```

## 部署流程详解

### 执行步骤

1. **构建**: `npm run build` 生成 `dist/` 目录
2. **检查**: 验证构建产物存在
3. **备份**: 在 ECS 服务器上创建远程备份
4. **同步**: 使用 rsync 增量同步文件
5. **验证**: 检查 `index.html` 是否存在于目标路径

### 部署脚本说明

脚本位置: `scripts/deploy.sh`

功能:
- 自动构建前端应用
- 检查构建产物
- 创建远程备份
- 增量同步文件 (只同步有变化的文件)
- 验证部署结果

### 使用 rsync 的好处

- **增量同步**: 只传输有变化的文件
- **性能优化**: 压缩传输数据
- **自动删除**: `--delete` 选项可删除远程已移除的文件
- **断点续传**: 支持中断后重新开始

## 手动部署

如果需要手动部署，可以使用：

```bash
# 构建
npm run build

# 使用 rsync 同步
rsync -avz --delete \
  -e "ssh -p 22" \
  dist/ username@host:/var/www/bugc/

# 使用 scp（无增量，建议用 rsync）
scp -r dist/* username@host:/var/www/bugc/
```

## 故障排除

### 连接失败

```bash
# 测试 SSH 连接
ssh -p 22 username@host "ls /var/www/bugc"

# 检查 SSH 密钥
ssh -p 22 -i ~/.ssh/deploy_key username@host "pwd"
```

### 权限问题

```bash
# 在 ECS 上设置目录权限
ssh -p 22 username@host "sudo chown -R www-data:www-data /var/www/bugc"
```

### 路径不存在

```bash
# 在 ECS 上创建部署目录
ssh -p 22 username@host "sudo mkdir -p /var/www/bugc && sudo chown username:username /var/www/bugc"
```

### 备份失败

备份失败不会中断部署流程。如果需要手动备份：

```bash
ssh -p 22 username@host "cd /var/www/bugc && cp -r . ../backup-$(date +%Y%m%d-%H%M%S)/"
```

## Nginx 配置示例

在 ECS 的 Nginx 配置中，前端和后端通常这样配置：

```nginx
server {
    listen 80;
    server_name api.example.com;

    # 前端静态资源
    location / {
        root /var/www/bugc;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 反代
    location /api {
        proxy_pass http://backend:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket 支持
    location /ws {
        proxy_pass http://backend:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 部署后验证

### 检查文件

```bash
ssh -p 22 username@host "ls -la /var/www/bugc/ | head -20"
```

### 检查 Web 访问

```bash
curl -I http://api.example.com/
# 应该返回 200 OK 和 HTML 内容
```

### 查看日志

```bash
ssh -p 22 username@host "tail -f /var/log/nginx/access.log"
```

## 最佳实践

1. **始终备份**: 部署前自动创建备份
2. **渐进式发布**: 先部署到 dev，再到 staging，最后 prod
3. **版本控制**: 使用 Git tag 标记每个发布版本
4. **监控**: 部署后监控应用性能和日志
5. **文档**: 记录任何特殊部署需求或注意事项

## 相关配置

- 前端配置: [vite.config.ts](../vite.config.ts)
- 环境变量: [.env.example](../.env.example)
- Nginx 配置: ECS 服务器上的 nginx.conf
- 部署脚本: [scripts/deploy.sh](./deploy.sh)

## 参考资源

- [Rsync 手册](https://linux.die.net/man/1/rsync)
- [SSH 使用指南](https://www.ssh.com/ssh/command/)
- [Nginx 文档](https://nginx.org/en/docs/)
