#!/bin/bash

# ==============================================================================
# TaskMonitor Compressor v2.0 (The "zvid Turbo" Edition)
# ==============================================================================
# 基于基准测试结果优化：使用 Very Fast 1080p30 预设
# 速度提升 2.4x，压缩率提升 2x
# ==============================================================================

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
set -e

# --- Config ---
DESKTOP="$HOME/Desktop"
STATE_DIR="/tmp/taskmonitor_monitor_state"
PROGRESS_FILE="$STATE_DIR/progress"

mkdir -p "$STATE_DIR"

notify() { osascript -e "display notification \"$1\" with title \"TaskMonitor 视频压缩\""; }

# --- Find File ---
LATEST_VIDEO="$1"
if [ -z "$LATEST_VIDEO" ]; then
    LATEST_VIDEO=$(find "$DESKTOP" -maxdepth 1 -type f \( -name "*.mp4" -o -name "*.mov" \) -mmin -2 ! -name "*compressed*" | head -n 1)
fi

[ -z "$LATEST_VIDEO" ] && exit 1

FILENAME=$(basename "$LATEST_VIDEO")
OUTPUT="$DESKTOP/${FILENAME%.*}_compressed.mp4"

log_info() { echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"; }

IN_SIZE=$(du -h "$LATEST_VIDEO" | cut -f1)
log_info "🚀 Turbo模式启动: $FILENAME ($IN_SIZE)"
notify "极速压缩: $FILENAME ($IN_SIZE)"

# Initialize progress
echo "0" > "$PROGRESS_FILE"

# --- The Ultimate Clarity Compression Command ---
# 优化点：
# 1. RF 18: 达到视觉无损级别（从 22 提升至 18）
# 2. 硬件加速 vt_h264 + 保持原始分辨率
# 3. 增加 --optimize 并确保没有降采样
HandBrakeCLI -i "$LATEST_VIDEO" -o "$OUTPUT" \
    --encoder vt_h264 \
    -q 18 \
    --optimize \
    2>&1 | tr '\r' '\n' | while read -r line; do
    if [[ "$line" =~ ([0-9]+\.[0-9]+)\ % ]]; then
        percent="${BASH_REMATCH[1]}"
        echo "$percent" > "$PROGRESS_FILE"
    fi
done

if [ -f "$OUTPUT" ] && [ -s "$OUTPUT" ]; then
    OUT_SIZE=$(du -h "$OUTPUT" | cut -f1)
    rm "$LATEST_VIDEO"
    rm -f "$PROGRESS_FILE"
    RESULT="✓ 完成! $IN_SIZE → $OUT_SIZE"
    log_info "$RESULT"
    notify "$RESULT"
else
    log_info "❌ Compression Failed"
    notify "压缩失败: $FILENAME"
    rm -f "$PROGRESS_FILE"
    exit 1
fi
