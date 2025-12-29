#!/bin/bash

# 保存单个风格的脚本
# 用法: ./save-style.sh "风格名" "模式" "字体类型" "描述" "提示词文本"

STYLE_NAME="$1"
MODE="$2"
FONT_TYPE="$3"
DESCRIPTION="$4"
PROMPT="$5"

# 生成文件名 (小写，空格替换为连字符)
FILENAME=$(echo "$STYLE_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
FILEPATH="$HOME/.claude/skills/designprompt/styles/${FILENAME}.md"

# 生成 Markdown 内容
cat > "$FILEPATH" << EOFILE
# ${STYLE_NAME} Design System

**风格ID**: ${FILENAME}
**模式**: ${MODE}
**字体类型**: ${FONT_TYPE}
**简短描述**: ${DESCRIPTION}

## 适用场景
- 待补充

## 情感调性
待补充

## 适用行业
待补充

## 设计系统提示词

${PROMPT}
EOFILE

echo "✅ 已保存: ${FILEPATH}"
echo "📏 提示词长度: $(echo "$PROMPT" | wc -c) 字符"
