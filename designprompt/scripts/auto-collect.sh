#!/bin/bash

# 自动采集所有设计风格的脚本
# 这个脚本会调用 Claude Code 来自动采集所有风格

echo "🚀 自动采集设计风格脚本"
echo "========================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STYLES_DIR="$HOME/.claude/skills/designprompt/styles"
DATA_DIR="$SCRIPT_DIR/data"

# 创建数据目录
mkdir -p "$DATA_DIR"

echo "📂 目录配置："
echo "  - 脚本目录: $SCRIPT_DIR"
echo "  - 风格目录: $STYLES_DIR"
echo "  - 数据目录: $DATA_DIR"
echo ""

echo "📋 使用说明："
echo "1. 此脚本需要配合 Claude Code 运行"
echo "2. 确保浏览器已打开 https://www.designprompts.dev/"
echo "3. Claude 将自动化采集所有30个设计风格"
echo ""

read -p "按回车键继续，或 Ctrl+C 取消..."

echo ""
echo "✨ 请使用以下命令让 Claude 帮你采集："
echo ""
echo "-------------------------------------------"
echo "请帮我从当前打开的浏览器页面自动采集所有30个设计风格："
echo ""
echo "1. 遍历所有风格按钮（Light XX 和 Dark XX）"
echo "2. 点击每个按钮，然后点击 'Get Prompt'"
echo "3. 提取以下信息："
echo "   - 风格名称"
echo "   - 模式（Light/Dark）"
echo "   - 字体类型（Sans-serif/Serif/Mono）"
echo "   - 描述"
echo "   - 完整的设计系统提示词"
echo "4. 将数据保存为 JSON 文件到："
echo "   $DATA_DIR/all-styles.json"
echo "-------------------------------------------"
echo ""

echo "💡 提示：复制上面的指令给 Claude Code"
echo ""
