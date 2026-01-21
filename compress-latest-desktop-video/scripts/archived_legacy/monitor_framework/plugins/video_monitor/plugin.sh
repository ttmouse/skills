#!/bin/bash

# Video Monitor Plugin - 基于原有实现的插件版本
# 调用已验证的 monitor.sh 脚本

MONITOR_SCRIPT="$HOME/.claude/skills/compress-latest-desktop-video/scripts/monitor.sh"
PID_FILE="/tmp/video_monitor.pid"
LOG_FILE="/tmp/video_monitor.log"

echo "👀 视频监控插件已启动"

# 直接运行已验证的监控脚本
nohup bash "$MONITOR_SCRIPT" > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"

echo "✅ 监控已启动 (PID: $!)"

# 保持进程运行，避免插件被框架认为已退出
wait
