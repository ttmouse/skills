#!/bin/bash

# Video Monitor Control - 监控控制脚本

PID_FILE="/tmp/video_monitor.pid"
LOG_FILE="/tmp/video_monitor.log"
MONITOR_SCRIPT="$HOME/.claude/skills/compress-latest-desktop-video/scripts/monitor.sh"

case "$1" in
    start)
        if [ -f "$PID_FILE" ]; then
            pid=$(cat "$PID_FILE")
            if ps -p "$pid" > /dev/null 2>&1; then
                echo "❌ 监控已在运行 (PID: $pid)"
                osascript -e 'display notification "视频监控已在运行" with title "VideoMonitor"'
                exit 1
            fi
        fi

        nohup bash "$MONITOR_SCRIPT" > "$LOG_FILE" 2>&1 &
        echo $! > "$PID_FILE"

        echo "✅ 监控已启动 (PID: $!)"
        osascript -e 'display notification "👀 视频监控已启动" with title "VideoMonitor"'
        ;;

    stop)
        if [ ! -f "$PID_FILE" ]; then
            echo "❌ 监控未运行"
            osascript -e 'display notification "视频监控未运行" with title "VideoMonitor"'
            exit 1
        fi

        pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            kill "$pid"
            rm "$PID_FILE"
            echo "✅ 监控已停止"
            osascript -e 'display notification "视频监控已停止" with title "VideoMonitor"'
        else
            rm "$PID_FILE"
            echo "⚠️  监控进程已清理"
            osascript -e 'display notification "监控进程已清理" with title "VideoMonitor"'
        fi
        ;;

    status)
        if [ -f "$PID_FILE" ]; then
            pid=$(cat "$PID_FILE")
            if ps -p "$pid" > /dev/null 2>&1; then
                echo "✅ 监控运行中 (PID: $pid)"
                echo "📄 日志: tail -f $LOG_FILE"
            else
                echo "❌ PID 文件存在但进程未运行"
            fi
        else
            echo "❌ 监控未运行"
        fi
        ;;

    log)
        if [ -f "$LOG_FILE" ]; then
            echo "=== 最近 20 行日志 ==="
            tail -20 "$LOG_FILE"
        else
            echo "❌ 日志文件不存在"
        fi
        ;;

    *)
        echo "使用方法:"
        echo "  $0 start   - 启动监控"
        echo "  $0 stop    - 停止监控"
        echo "  $0 status  - 查看状态"
        echo "  $0 log     - 查看日志"
        exit 1
        ;;
esac
