#!/bin/bash

# Interactive Feedback Evaluator - 停止脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/.eval_server.pid"

if [ ! -f "$PID_FILE" ]; then
    echo "No PID file found. Server may not be running."
    exit 0
fi

PID=$(cat "$PID_FILE")

if ps -p $PID > /dev/null 2>&1; then
    echo "Stopping server (PID: $PID)..."
    kill $PID
    sleep 1

    # 如果进程还在运行，强制杀死
    if ps -p $PID > /dev/null 2>&1; then
        echo "Force killing server..."
        kill -9 $PID
    fi

    echo "✓ Server stopped"
else
    echo "Server is not running (PID: $PID not found)"
fi

# 清理PID文件
rm -f "$PID_FILE"
