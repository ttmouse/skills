#!/bin/bash
#
# 一键生成语音记录分析报告（静态HTML）
# 无需启动服务器，直接打开查看
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "📊 一键生成语音记录分析报告"
echo "=========================================="
echo ""

# 检查参数
if [ -z "$1" ]; then
    echo "用法：$0 <APP名称>"
    echo ""
    echo "示例："
    echo "  $0 Alma"
    echo "  $0 Antigravity"
    echo "  $0 '所有APP'  # 分析所有APP"
    exit 1
fi

APP_NAME="$1"

# 分析所有APP
if [ "$APP_NAME" = "所有APP" ] || [ "$APP_NAME" = "all" ]; then
    echo "正在分析所有APP..."
    python3 "$SCRIPT_DIR/analyze_voice_workflow.py" --all

    echo ""
    echo "选择要查看的APP报告："
    echo "  python3 $SCRIPT_DIR/generate_static_report.py --app <名称>"
    echo ""
    echo "例如："
    echo "  python3 $SCRIPT_DIR/generate_static_report.py --app Alma"

    exit 0
fi

# 分析单个APP并生成HTML报告
echo "正在分析: $APP_NAME"
echo ""

# 执行完整分析流程
python3 "$SCRIPT_DIR/analyze_voice_workflow.py" --app "$APP_NAME" --skip-extract --skip-group

if [ $? -eq 0 ]; then
    echo ""
    echo "正在生成静态HTML报告..."
    python3 "$SCRIPT_DIR/generate_static_report.py" --app "$APP_NAME"

    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ 完成！"
        echo ""
        echo "报告已自动在浏览器中打开"
    else
        echo ""
        echo "❌ 生成HTML报告失败"
        exit 1
    fi
else
    echo ""
    echo "❌ 分析失败"
    exit 1
fi
