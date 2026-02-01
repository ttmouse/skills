#!/bin/bash

# Twitter 图片下载脚本
# 用途：从 Markdown 文件中提取并下载 Twitter 图片
# 作者：Dr.DB (超级智能体)
# 版本：v1.0

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函数：打印成功消息
success_msg() {
    echo -e "${GREEN}✅ $1${NC}"
}

# 函数：打印错误消息
error_msg() {
    echo -e "${RED}❌ $1${NC}"
}

# 函数：打印信息消息
info_msg() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# 函数：打印警告消息
warn_msg() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 函数：显示帮助信息
show_help() {
    cat << EOF
Twitter 图片下载脚本 v1.0

用法: $0 <markdown文件> [图片目录]

参数:
  markdown文件   必需。包含 Twitter 图片链接的 Markdown 文件
  图片目录       可选。指定图片保存目录，默认为 "[文件名]_images"

示例:
  $0 "文章.md"
  $0 "文章.md" "custom_images"

说明:
  - 自动提取所有 pbs.twimg.com 图片链接
  - 下载图片到指定目录
  - 生成发布版 Markdown 文件（路径已替换）
  - 支持 macOS 和 Linux

EOF
}

# 检查参数
if [ -z "$1" ]; then
    error_msg "缺少必需参数"
    show_help
    exit 1
fi

if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

MARKDOWN_FILE="$1"
IMAGE_DIR="$2"

# 检查文件是否存在
if [ ! -f "$MARKDOWN_FILE" ]; then
    error_msg "文件不存在: $MARKDOWN_FILE"
    exit 1
fi

# 获取文件名（不含扩展名）
FILENAME=$(basename "$MARKDOWN_FILE" .md)

# 获取文件所在目录
FILE_DIR=$(dirname "$MARKDOWN_FILE")

# 如果没有指定图片目录，使用默认值（相对路径）
if [ -z "$IMAGE_DIR" ]; then
    IMAGE_DIR_REL="${FILENAME}_images"
else
    # 如果用户指定了绝对路径，提取相对部分
    if [[ "$IMAGE_DIR" == /* ]]; then
        IMAGE_DIR_REL=$(basename "$IMAGE_DIR")
    else
        IMAGE_DIR_REL="$IMAGE_DIR"
    fi
fi

# 图片目录的绝对路径（用于下载）
if [[ "$IMAGE_DIR" == /* ]]; then
    IMAGE_DIR_ABS="$IMAGE_DIR"
else
    IMAGE_DIR_ABS="${FILE_DIR}/${IMAGE_DIR}"
fi

# 输出文件名（使用绝对路径）
OUTPUT_FILE="${FILE_DIR}/${FILENAME}_发布版.md"

# 开始处理
echo ""
echo "========================================"
echo "Twitter 图片下载工具 v1.0"
echo "========================================"
info_msg "输入文件: $MARKDOWN_FILE"
info_msg "图片目录: $IMAGE_DIR_ABS"
info_msg "输出文件: $OUTPUT_FILE"
echo "========================================"
echo ""

# 提取图片 URL
info_msg "提取图片 URL..."
URLS=$(grep -oE 'https://pbs\.twimg\.com/media/[^)]+' "$MARKDOWN_FILE" | sort | uniq || true)

if [ -z "$URLS" ]; then
    warn_msg "未找到任何 Twitter 图片链接"
    exit 0
fi

# 统计图片数量
TOTAL=$(echo "$URLS" | wc -l | tr -d ' ')
success_msg "找到 $TOTAL 张图片"
echo ""

# 创建图片目录
info_msg "创建图片目录: $IMAGE_DIR_ABS"
mkdir -p "$IMAGE_DIR_ABS"
success_msg "图片目录已创建"
echo ""

# 下载图片
info_msg "开始下载图片..."
echo ""

SUCCESS=0
FAILED=0
INDEX=1

# 下载每张图片
while IFS= read -r url; do
    if [ -n "$url" ]; then
        # 生成文件名（补零）
        NUM=$(printf "%02d" "$INDEX")
        FILENAME_IMG="${IMAGE_DIR_ABS}/${NUM}.jpg"

        # 显示下载信息
        echo -n "  [$INDEX/$TOTAL] 下载: ${NUM}.jpg ... "

        # 下载图片
        if curl -s -L -o "$FILENAME_IMG" "$url" \
            -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
            --connect-timeout 30 \
            --max-time 120 \
            --fail \
            --silent \
            --show-error 2>/dev/null; then

            # 检查文件是否有效
            if [ -f "$FILENAME_IMG" ] && [ -s "$FILENAME_IMG" ]; then
                FILE_SIZE=$(ls -lh "$FILENAME_IMG" | awk '{print $5}')
                success_msg "成功 ($FILE_SIZE)"
                SUCCESS=$((SUCCESS + 1))
            else
                error_msg "失败（文件为空）"
                rm -f "$FILENAME_IMG"
                FAILED=$((FAILED + 1))
            fi
        else
            error_msg "失败（下载错误）"
            rm -f "$FILENAME_IMG"
            FAILED=$((FAILED + 1))
        fi

        INDEX=$((INDEX + 1))
    fi
done <<< "$URLS"

echo ""
echo "========================================"
echo "下载完成"
echo "========================================"
success_msg "成功: $SUCCESS / $TOTAL"
error_msg "失败: $FAILED / $TOTAL"
echo ""

# 生成发布版文件
info_msg "生成发布版文件..."

# 复制原文件
cp "$MARKDOWN_FILE" "$OUTPUT_FILE"

# 替换图片路径
INDEX=1
while IFS= read -r url; do
    if [ -n "$url" ]; then
        NUM=$(printf "%02d" "$INDEX")
        # 使用相对路径（相对于 Markdown 文件）
        NEW_PATH="./$IMAGE_DIR_REL/${NUM}.jpg"

        # 根据操作系统选择 sed 语法
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS 版本
            sed -i '' "s|${url}|${NEW_PATH}|g" "$OUTPUT_FILE"
        else
            # Linux 版本
            sed -i "s|${url}|${NEW_PATH}|g" "$OUTPUT_FILE"
        fi

        INDEX=$((INDEX + 1))
    fi
done <<< "$URLS"

success_msg "发布版文件已生成"
echo ""

# 输出图片清单
info_msg "图片清单:"
echo ""

INDEX=1
while IFS= read -r url; do
    if [ -n "$url" ]; then
        NUM=$(printf "%02d" "$INDEX")
        FILENAME_IMG="${IMAGE_DIR_ABS}/${NUM}.jpg"

        if [ -f "$FILENAME_IMG" ]; then
            FILE_SIZE=$(ls -lh "$FILENAME_IMG" | awk '{print $5}')
            echo "  ${INDEX}. ${IMAGE_DIR_REL}/${NUM}.jpg (${FILE_SIZE})"
        fi

        INDEX=$((INDEX + 1))
    fi
done <<< "$URLS"

echo ""
echo "========================================"
success_msg "📁 图片目录: $IMAGE_DIR"
success_msg "📄 发布版文件: $OUTPUT_FILE"
echo "========================================"
echo ""
