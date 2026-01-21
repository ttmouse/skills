#!/bin/bash
# pre-analyze.sh - 分析前准备工作
# 用途：检查环境、备份数据、加载知识库

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"

echo "🔍 [Pre-Analyze] 环境检查"

# 1. 检查 Typeless 数据库
TYPELESS_DB="$HOME/Library/Application Support/Typeless/typeless.db"
if [[ ! -f "$TYPELESS_DB" ]]; then
    echo "❌ 错误：未找到 Typeless 数据库"
    exit 1
fi

echo "✓ Typeless 数据库存在"

# 2. 检查输出目录
OUTPUT_DIR="$HOME/Library/Application Support/alma/workspaces/temp-voice-extraction"
mkdir -p "$OUTPUT_DIR"

echo "✓ 输出目录就绪: $OUTPUT_DIR"

# 3. 检查知识库完整性
KNOWLEDGE_DIR="$SKILL_DIR/knowledge"
if [[ ! -d "$KNOWLEDGE_DIR" ]]; then
    echo "❌ 错误：知识库目录不存在"
    exit 1
fi

# 统计知识点数量
TOTAL_KNOWLEDGE=$(find "$KNOWLEDGE_DIR" -name "*.md" | wc -l)
echo "✓ 知识库就绪: $TOTAL_KNOWLEDGE 个知识点"

# 4. 检查 Python 环境
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误：未找到 python3"
    exit 1
fi

echo "✓ Python3 环境: $(python3 --version)"

# 5. 检查依赖
REQUIRED_DEPS=("anthropic" "sqlite3")
for dep in "${REQUIRED_DEPS[@]}"; do
    if ! python3 -c "import $dep" 2>/dev/null; then
        echo "⚠ 警告：缺少 Python 依赖 '$dep'"
    fi
done

# 6. 创建本次分析记录
ANALYSIS_ID="$(date +%Y%m%d_%H%M%S)"
ANALYSIS_DIR="$OUTPUT_DIR/analysis-$ANALYSIS_ID"
mkdir -p "$ANALYSIS_DIR"

echo "$ANALYSIS_ID" > "$ANALYSIS_DIR/.analysis_id"

echo "✓ 分析 ID: $ANALYSIS_ID"
echo "✓ 分析目录: $ANALYSIS_DIR"

echo ""
echo "🚀 [Pre-Analyze] 准备完成，可以开始分析"
