#!/bin/bash
# 心跳任务完成脚本执行器

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_SCRIPT="$SCRIPT_DIR/task_completion.py"

if [ ! -f "$PYTHON_SCRIPT" ]; then
    echo "[ERROR] 找不到 task_completion.py: $PYTHON_SCRIPT"
    exit 1
fi

VENV_PATH="/Users/douba/Projects/XM/telegram_ops_bot/.venv312"
if [ -f "$VENV_PATH/bin/activate" ]; then
    source "$VENV_PATH/bin/activate"
else
    echo "[WARNING] 虚拟环境未找到: $VENV_PATH"
fi

python3 "$PYTHON_SCRIPT" "$@"
