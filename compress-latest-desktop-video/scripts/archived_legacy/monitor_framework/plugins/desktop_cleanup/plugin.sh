#!/bin/bash

# Desktop Cleanup Plugin - 清理下载文件夹

DOWNLOADS_PATH="$HOME/Downloads"
ORGANIZER_SCRIPT="$HOME/.claude/skills/downloads-organizer/scripts/organizer.py"

# 执行清理
echo "🧹 开始清理下载文件夹..."

if [ ! -f "$ORGANIZER_SCRIPT" ]; then
    echo "❌ 清理脚本不存在: $ORGANIZER_SCRIPT"
    exit 1
fi

cd "$DOWNLOADS_PATH" || exit 1

# 运行清理（简化版本）
echo "整理文件..."
python3 "$ORGANIZER_SCRIPT" --organize 2>/dev/null || {
    echo "⚠️  整理失败，继续清理..."
}

echo "清理旧文件..."
python3 "$ORGANIZER_SCRIPT" --cleanup 2>/dev/null || {
    echo "⚠️  清理失败"
}

echo "✅ 下载文件夹清理完成"
