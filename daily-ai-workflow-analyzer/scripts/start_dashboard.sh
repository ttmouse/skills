#!/bin/bash
#
# 启动语音记录分析控制台
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================="
echo "🚀 启动语音记录分析控制台"
echo "=========================================="
echo ""

# 检查Flask是否安装
if ! python3 -c "import flask" 2>/dev/null; then
    echo "❌ Flask未安装，正在安装..."
    pip3 install --break-system-packages flask flask-cors
fi

echo "📡 启动服务器..."
echo "📍 访问地址: http://localhost:8080"
echo "⏹️  按 Ctrl+C 停止服务器"
echo ""
echo "=========================================="
echo ""

# 启动Flask服务器
python3 analysis_server.py
