# 自动采集脚本使用指南

本目录包含用于自动采集 designprompts.dev 所有设计风格的脚本。

## 📁 文件说明

- `fetch-all-styles.js` - 浏览器控制台脚本（推荐）
- `collect-styles.py` - Python 处理脚本
- `auto-collect.sh` - Shell 辅助脚本
- `README.md` - 本文档

## 🚀 推荐方法：使用浏览器脚本

### 步骤 1：打开网站

```bash
open https://www.designprompts.dev/
```

### 步骤 2：运行采集脚本

1. 按 `F12` 或 `Cmd+Option+I` 打开浏览器开发者工具
2. 切换到 "Console"（控制台）标签
3. 复制 `fetch-all-styles.js` 的全部内容
4. 粘贴到控制台并按回车执行

### 步骤 3：等待采集完成

脚本会自动：
- 遍历所有30个风格
- 点击每个风格的 "Get Prompt" 按钮
- 提取完整的设计系统提示词
- 生成 JSON 文件并下载

### 步骤 4：处理数据

下载的 `design-styles.json` 文件会包含所有风格数据，然后运行：

```bash
cd ~/.claude/skills/designprompt/scripts
python3 collect-styles.py ~/Downloads/design-styles.json
```

脚本会自动生成所有风格的 Markdown 文件到 `styles/` 目录。

## 🔧 手动方法：让 Claude 帮你

如果自动脚本遇到问题，可以让 Claude Code 帮你逐个采集：

```
请帮我采集以下设计风格的提示词并创建文件：

1. Luxury (Light, Serif)
2. Cyberpunk (Dark, Sans-serif)
3. Terminal (Dark, Mono)
... （列出需要的风格）

从 https://www.designprompts.dev/ 获取提示词
保存到 ~/.claude/skills/designprompt/styles/
```

## 📝 数据格式

### JSON 格式（从浏览器导出）

```json
[
  {
    "id": "01",
    "name": "Monochrome",
    "mode": "light",
    "fontType": "serif",
    "description": "极简黑白设计...",
    "prompt": "<role>...</role>...",
    "filename": "monochrome.md"
  }
]
```

### Markdown 格式（生成的文件）

```markdown
# Monochrome Design System

**风格ID**: monochrome
**模式**: Light
**字体类型**: Serif
**简短描述**: 极简黑白设计...

## 适用场景
- ...

## 设计系统提示词
...
```

## 🎯 采集清单

### Light Mode 风格（已完成 2/20）
- [x] 01. Monochrome
- [x] 02. Bauhaus
- [ ] 03. Modern Dark（虽然名字带Dark，实际是Light模式的深色主题）
- [ ] 04. Newsprint
- [ ] 05. SaaS
- [ ] 06. Luxury
- [ ] 08. Swiss Minimalist
- [ ] 10. Flat Design
- [ ] 12. Material Design
- [ ] 13. Neo Brutalism
- [ ] 15. Academia
- [ ] 18. Playful Geometric
- [ ] 20. Claymorphism
- [ ] 21. Professional
- [ ] 22. Botanical
- [ ] 24. Enterprise
- [ ] 25. Sketch
- [ ] 26. Industrial
- [ ] 27. Neumorphism
- [ ] 28. Organic
- [ ] 29. Maximalism
- [ ] 30. Retro

### Dark Mode 风格（已完成 0/10）
- [ ] 07. Terminal
- [ ] 09. Kinetic
- [ ] 11. Art Deco
- [ ] 14. Bold Typography
- [ ] 16. Cyberpunk
- [ ] 17. Web3
- [ ] 19. Minimal Dark
- [ ] 23. Vaporwave

## ⚠️ 注意事项

1. **网站限制**：designprompts.dev 可能有速率限制，如果遇到问题，请等待一段时间后重试

2. **提示词版权**：这些设计系统提示词由 designprompts.dev 提供，仅用于学习和个人使用

3. **元数据补充**：生成的文件中，部分风格的"适用场景"等元数据需要手动补充完善

4. **文件覆盖**：运行脚本会覆盖已存在的同名文件，请注意备份

## 🐛 问题排查

### 问题：浏览器脚本无法运行

**解决方案**：
- 确保在正确的页面（https://www.designprompts.dev/）
- 检查浏览器控制台是否有错误提示
- 尝试刷新页面后重试

### 问题：JSON 文件格式错误

**解决方案**：
- 检查 JSON 文件是否完整
- 使用在线工具验证 JSON 格式：https://jsonlint.com/

### 问题：Python 脚本报错

**解决方案**：
```bash
# 检查 Python 版本（需要 3.6+）
python3 --version

# 确保文件权限正确
chmod +x collect-styles.py
```

## 💡 提示

采集完成后，记得：

1. 检查生成的文件
2. 补充缺失的元数据
3. 更新 SKILL.md 中的风格索引
4. 测试新添加的风格

## 🔗 相关文档

- 扩展指南：`../EXTEND.md`
- 技能文档：`../SKILL.md`
- 使用说明：`../README.md`
