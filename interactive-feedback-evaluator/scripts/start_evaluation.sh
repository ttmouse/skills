#!/bin/bash

# Interactive Feedback Evaluator - 启动脚本
# 用于启动评估服务器，支持后台运行

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_SCRIPT="$SCRIPT_DIR/evaluation_server.py"
PID_FILE="$SCRIPT_DIR/.eval_server.pid"
LOG_FILE="$SCRIPT_DIR/.eval_server.log"

# 检查Python是否安装
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 is not installed"
    exit 1
fi

# 检查Flask是否安装
python3 -c "import flask" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "Installing Flask..."
    pip3 install flask
fi

# 检查服务器是否已经在运行
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "Server is already running (PID: $PID)"
        echo "Port: 5002"
        exit 0
    else
        # PID文件存在但进程不存在，清理
        rm "$PID_FILE"
    fi
fi

# 启动服务器（后台运行）
nohup python3 "$PYTHON_SCRIPT" > "$LOG_FILE" 2>&1 &
PID=$!

# 保存PID
echo $PID > "$PID_FILE"

# 等待服务器启动
sleep 2

# 检查服务器是否成功启动
if ps -p $PID > /dev/null; then
    echo "✓ Server started successfully"
    echo "  PID: $PID"
    echo "  Port: 5002"
    echo "  Log: $LOG_FILE"
    echo ""
    echo "Available endpoints:"
    echo "  - POST http://localhost:5002/generate"
    echo "  - POST http://localhost:5002/submit"
    echo "  - GET  http://localhost:5002/feedback"
    echo "  - GET  http://localhost:5002/status"
    echo "  - GET  http://localhost:5002/templates"
    echo ""
    echo "To stop the server: kill $PID"
    echo "Or run: bash $SCRIPT_DIR/stop_evaluation.sh"
else
    echo "✗ Failed to start server"
    echo "Check log: $LOG_FILE"
    exit 1
fi
