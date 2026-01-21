#!/bin/bash

# 启动Chrome并开启CDP端口

echo "🚀 启动 Chrome (开启CDP端口 9222)..."

# 检查Chrome是否已运行
if pgrep -x "Google Chrome" > /dev/null; then
    echo "⚠️  Chrome 已在运行"
    echo "💡 请先关闭 Chrome，或手动在 Chrome 中开启远程调试："
    echo "   open -a 'Google Chrome' --args --remote-debugging-port=9222"
    exit 1
fi

# 启动Chrome并开启CDP
open -a 'Google Chrome' --args \
    --remote-debugging-port=9222 \
    --user-data-dir="$HOME/Library/Application Support/Google/Chrome/CDP_Profile" \
    --no-first-run \
    --no-default-browser-check

echo "✅ Chrome 已启动"
echo "🌐 CDP端口: 9222"
echo "📋 等待5秒..."
sleep 5

# 验证CDP是否可用
if curl -s http://localhost:9222/json > /dev/null 2>&1; then
    echo "✅ CDP连接成功"
else
    echo "❌ CDP连接失败，请检查Chrome是否正常启动"
    exit 1
fi

echo ""
echo "💡 现在可以运行采集器了！"
