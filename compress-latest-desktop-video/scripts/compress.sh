#!/bin/bash

# Compress Latest Desktop Video Skill
# 查找桌面上最近30分钟内生成的最新视频并压缩

set -e

# 定义桌面路径
DESKTOP_PATH="$HOME/Desktop"

# 支持的视频格式扩展名
VIDEO_EXTENSIONS=("mp4" "mov" "avi" "mkv" "m4v" "flv" "wmv")

echo "🔍 正在搜索桌面上最近30分钟内的视频文件..."

# 查找最近30分钟内的视频文件
LATEST_VIDEO=""
LATEST_TIME=0

for ext in "${VIDEO_EXTENSIONS[@]}"; do
    # 使用 find 查找最近30分钟内修改的文件
    while IFS= read -r -d '' file; do
        # 获取文件修改时间（Unix时间戳）
        file_time=$(stat -f "%m" "$file" 2>/dev/null || stat -c "%Y" "$file" 2>/dev/null)
        
        if [ -n "$file_time" ] && [ "$file_time" -gt "$LATEST_TIME" ]; then
            LATEST_TIME=$file_time
            LATEST_VIDEO="$file"
        fi
    done < <(find "$DESKTOP_PATH" -maxdepth 1 -type f -name "*.${ext}" -mmin -30 -print0 2>/dev/null)
done

# 检查是否找到视频
if [ -z "$LATEST_VIDEO" ]; then
    echo "❌ 未找到最近30分钟内生成的视频文件"
    echo "   请确保桌面上有视频文件且生成时间在30分钟内"
    exit 1
fi

echo "✅ 找到最新视频: $(basename "$LATEST_VIDEO")"
echo "   文件路径: $LATEST_VIDEO"
echo "   修改时间: $(date -r "$LATEST_TIME" '+%Y-%m-%d %H:%M:%S')"

# 生成输出文件名
FILENAME=$(basename "$LATEST_VIDEO")
EXT="${FILENAME##*.}"
BASENAME="${FILENAME%.*}"
OUTPUT_FILE="$DESKTOP_PATH/${BASENAME}_compressed.${EXT}"

echo ""
echo "🚀 开始压缩视频..."
echo "   输入: $LATEST_VIDEO"
echo "   输出: $(basename "$OUTPUT_FILE")"

# 检查 HandBrakeCLI 是否可用
if ! command -v HandBrakeCLI &> /dev/null; then
    echo "❌ 错误: 未找到 HandBrakeCLI"
    echo "   请安装: brew install handbrake"
    exit 1
fi

# 使用 HandBrake 压缩
# 设置说明:
# -e x264: 使用 H.264 编码器
# -q 22: 质量因子 (RF 22)，数值越小质量越高但文件越大
# -r: 保持原始帧率
# --audio-copy: 复制音频流（更快）
# --optimize: Web 优化
HandBrakeCLI \
    -i "$LATEST_VIDEO" \
    -o "$OUTPUT_FILE" \
    -e x264 \
    -q 22 \
    --optimize \
    2>&1 | grep -E "Encoding|Finished|Work complete" || true

# 检查输出文件是否存在且有效（文件大小大于0）
if [ -f "$OUTPUT_FILE" ] && [ -s "$OUTPUT_FILE" ]; then
    # 获取文件大小
    INPUT_SIZE=$(du -h "$LATEST_VIDEO" | cut -f1)
    OUTPUT_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
    
    echo ""
    echo "✅ 压缩完成!"
    echo "   原始大小: $INPUT_SIZE"
    echo "   压缩后: $OUTPUT_SIZE"
    echo "   输出文件: $OUTPUT_FILE"
    
    # 删除源文件
    echo ""
    echo "🗑️  正在删除源文件..."
    rm "$LATEST_VIDEO"
    
    if [ $? -eq 0 ]; then
        echo "✅ 源文件已删除: $(basename "$LATEST_VIDEO")"
    else
        echo "⚠️  警告: 源文件删除失败，请手动删除"
    fi
else
    echo "❌ 压缩失败: 输出文件未生成或无效"
    echo "   源文件已保留: $LATEST_VIDEO"
    exit 1
fi
