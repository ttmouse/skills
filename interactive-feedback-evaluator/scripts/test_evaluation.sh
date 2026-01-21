#!/bin/bash

# Interactive Feedback Evaluator - 测试脚本
# 用于测试完整的评估流程

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="/tmp/alma-evaluation-test"

# 创建输出目录
mkdir -p "$OUTPUT_DIR"

echo "=========================================="
echo "Interactive Feedback Evaluator - Test"
echo "=========================================="
echo ""

# 1. 启动服务器
echo "Step 1: Starting evaluation server..."
bash "$SCRIPT_DIR/start_evaluation.sh"
if [ $? -ne 0 ]; then
    echo "✗ Failed to start server"
    exit 1
fi
echo ""

# 2. 生成分析报告评估表单
echo "Step 2: Generating analysis-report evaluation form..."
curl -s -X POST http://localhost:5002/generate \
  -H "Content-Type: application/json" \
  -d '{
    "evaluation_type": "analysis-report",
    "title": "Alma 深度洞察分析报告 v2.0 测试",
    "metadata": {
      "test_mode": true,
      "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
    }
  }' > "$OUTPUT_DIR/analysis_report_evaluation.html"

if [ $? -eq 0 ] && [ -s "$OUTPUT_DIR/analysis_report_evaluation.html" ]; then
    echo "✓ Generated analysis-report evaluation form"
    echo "  File: $OUTPUT_DIR/analysis_report_evaluation.html"
else
    echo "✗ Failed to generate form"
    exit 1
fi
echo ""

# 3. 生成技能评估表单
echo "Step 3: Generating skill-evaluation evaluation form..."
curl -s -X POST http://localhost:5002/generate \
  -H "Content-Type: application/json" \
  -d '{
    "evaluation_type": "skill-evaluation",
    "title": "Twitter Collector 技能测试",
    "metadata": {
      "test_mode": true
    }
  }' > "$OUTPUT_DIR/skill_evaluation.html"

if [ $? -eq 0 ] && [ -s "$OUTPUT_DIR/skill_evaluation.html" ]; then
    echo "✓ Generated skill-evaluation evaluation form"
    echo "  File: $OUTPUT_DIR/skill_evaluation.html"
else
    echo "✗ Failed to generate form"
    exit 1
fi
echo ""

# 4. 查看服务器状态
echo "Step 4: Checking server status..."
curl -s http://localhost:5002/status | python3 -m json.tool
echo ""

# 5. 列出可用模板
echo "Step 5: Listing available templates..."
curl -s http://localhost:5002/templates | python3 -m json.tool
echo ""

echo "=========================================="
echo "Test Complete!"
echo "=========================================="
echo ""
echo "Generated files:"
echo "  1. $OUTPUT_DIR/analysis_report_evaluation.html"
echo "  2. $OUTPUT_DIR/skill_evaluation.html"
echo ""
echo "Next steps:"
echo "  1. Open one of the HTML files in Alma sidebar"
echo "  2. Fill out the form and click '提交评估'"
echo "  3. The data will be submitted to the server"
echo "  4. Check feedback with:"
echo "     curl http://localhost:5002/feedback"
echo ""
echo "To stop the server:"
echo "  bash $SCRIPT_DIR/stop_evaluation.sh"
echo ""
