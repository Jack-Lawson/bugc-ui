#!/bin/bash

# 前端发布脚本
# 将构建产物(dist/)同步到ECS Nginx服务器
# 使用方式: ./scripts/deploy.sh [environment]
# 环境: dev / staging / prod (默认: prod)

set -e

# 配置文件
DEPLOY_CONFIG=".deploy.env"

# 参数
ENVIRONMENT="${1:-prod}"

# 检查配置文件
if [ ! -f "$DEPLOY_CONFIG" ]; then
    echo "错误: 部署配置文件 $DEPLOY_CONFIG 不存在"
    echo "请创建 $DEPLOY_CONFIG 文件，包含以下内容:"
    echo "DEPLOY_HOST=<host>"
    echo "DEPLOY_USER=<user>"
    echo "DEPLOY_PORT=<port>"
    echo "DEPLOY_PATH_DEV=<dev_path>"
    echo "DEPLOY_PATH_STAGING=<staging_path>"
    echo "DEPLOY_PATH_PROD=<prod_path>"
    exit 1
fi

# 加载配置
source "$DEPLOY_CONFIG"

# 检查必需的配置
for var in DEPLOY_HOST DEPLOY_USER DEPLOY_PORT DEPLOY_PATH_DEV DEPLOY_PATH_STAGING DEPLOY_PATH_PROD; do
    if [ -z "${!var}" ]; then
        echo "错误: 缺少配置 $var"
        exit 1
    fi
done

# 根据环境选择目标路径
case $ENVIRONMENT in
    dev)
        DEPLOY_PATH=$DEPLOY_PATH_DEV
        ;;
    staging)
        DEPLOY_PATH=$DEPLOY_PATH_STAGING
        ;;
    prod)
        DEPLOY_PATH=$DEPLOY_PATH_PROD
        ;;
    *)
        echo "错误: 未知的环境 $ENVIRONMENT"
        echo "支持的环境: dev, staging, prod"
        exit 1
        ;;
esac

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}=== 前端发布 ===${NC}"
echo "环境: $ENVIRONMENT"
echo "目标: 脱敏信息"
echo ""

# 检查构建产物
if [ ! -d "dist" ]; then
    echo -e "${RED}错误: 构建产物 dist/ 不存在${NC}"
    echo "请先运行: npm run build"
    exit 1
fi

echo -e "${YELLOW}检查构建产物...${NC}"
DIST_SIZE=$(du -sh dist | awk '{print $1}')
echo "构建产物大小: $DIST_SIZE"
echo "文件数量: $(find dist -type f | wc -l)"
echo ""

# 备份检查
echo -e "${YELLOW}创建远程备份...${NC}"
BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
ssh -p "$DEPLOY_PORT" "$DEPLOY_USER@$DEPLOY_HOST" \
    "cd $DEPLOY_PATH && cp -r ./* ../$BACKUP_NAME/ 2>/dev/null || true" \
    && echo -e "${GREEN}备份完成${NC}" || echo -e "${YELLOW}备份可能已存在或失败${NC}"
echo ""

# 同步文件
echo -e "${YELLOW}同步文件到服务器...${NC}"
rsync -avz --delete \
    -e "ssh -p $DEPLOY_PORT" \
    dist/ "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/" || {
    echo -e "${RED}同步失败${NC}"
    exit 1
}
echo -e "${GREEN}文件同步完成${NC}"
echo ""

# 验证
echo -e "${YELLOW}验证部署...${NC}"
ssh -p "$DEPLOY_PORT" "$DEPLOY_USER@$DEPLOY_HOST" \
    "ls -lh $DEPLOY_PATH/index.html && echo '✓ 部署验证成功' || echo '✗ 部署验证失败'"
echo ""

echo -e "${GREEN}=== 发布完成 ===${NC}"
echo "环境: $ENVIRONMENT"
echo "时间: $(date '+%Y-%m-%d %H:%M:%S')"
