# Universal Writer - 通用写作技能

> 从数据到文章的自动化写作工作流

## 简介

Universal Writer 是一个强大的通用写作技能，支持多种写作模板，可根据数据源或交互式生成文章。

## 功能特性

- ✅ **多模板支持**：5种专业模板（专题、教程、分析、总结、文档）
- ✅ **三种使用方式**：直接生成、数据驱动、交互式
- ✅ **灵活渲染**：基于 Jinja2 的模板引擎
- ✅ **美观输出**：使用 Rich 库的命令行界面

## 安装

```bash
cd ~/.claude/skills/universal-writer
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
```

## 使用方式

### 1. 列出所有模板

```bash
./venv/bin/python3 scripts/writer.py list-templates
```

### 2. 直接生成文章

```bash
./venv/bin/python3 scripts/writer.py generate \
  --template "专题深度拆解" \
  --topic "液体飞溅摄影" \
  --output "article.md"
```

### 3. 数据驱动生成

```bash
./venv/bin/python3 scripts/writer.py generate \
  --template "专题深度拆解" \
  --data "cases.json" \
  --auto-generate \
  --output "article.md"
```

### 4. 交互式生成

```bash
./venv/bin/python3 scripts/writer.py generate \
  --template "产品文档" \
  --interactive \
  --output "doc.md"
```

### 5. 查看模板内容

```bash
./venv/bin/python3 scripts/writer.py show-template --template "专题深度拆解"
```

## 可用模板

| 模板 | 适用场景 |
|------|---------|
| 专题深度拆解 | designprompt 专题文章 |
| 技术教程 | 技能使用、工具教程 |
| 案例分析 | Twitter 案例研究 |
| 经验总结 | 工作复盘、方法论 |
| 产品文档 | 技能文档、使用指南 |

## 目录结构

```
~/.claude/skills/universal-writer/
├── scripts/
│   ├── writer.py              # 主脚本
│   ├── template_engine.py     # 模板引擎
│   ├── data_parser.py         # 数据解析
│   └── content_generator.py   # 内容生成
├── templates/
│   ├── 专题深度拆解.md
│   ├── 技术教程.md
│   ├── 案例分析.md
│   ├── 经验总结.md
│   └── 产品文档.md
├── examples/                  # 示例文件
├── venv/                      # 虚拟环境
├── SKILL.md                   # 技能说明
├── README.md                  # 使用文档
└── requirements.txt           # 依赖列表
```

## 完整工作流

```
数据采集 → 内容生成 → 图片处理 → 发布
    ↓           ↓           ↓         ↓
twitter-   universal-  twitter-   qiaomu-x-
collector    writer     image-    article-
                       downloader publisher
```

## 模板变量

所有模板支持以下基础变量：

| 变量 | 说明 | 示例 |
|------|------|------|
| topic | 文章主题 | "液体飞溅摄影" |
| description | 文章描述 | "关于液体飞溅摄影的深度分析" |
| author | 作者 | "AI Assistant" |
| date | 日期 | "2026-02-01" |

## 数据格式

### JSON 格式

```json
{
  "topic": "液体飞溅摄影",
  "description": "深度分析液体飞溅摄影技巧",
  "author": "AI Assistant",
  "date": "2026-02-01",
  "cases": [
    {
      "id": 1,
      "content": "案例内容",
      "author": "作者",
      "date": "2026-02-01"
    }
  ]
}
```

## 技术栈

- **Python 3.13+**
- **Jinja2 3.1+** - 模板引擎
- **Click 8.1+** - 命令行接口
- **Rich 13.0+** - 终端美化

## 常见问题

### Q: 如何添加新模板？

在 `templates/` 目录下创建新的 `.md` 文件，使用 `{{ variable }}` 语法定义变量。

### Q: 如何自定义变量？

编辑模板文件，添加或修改变量占位符。生成时会提示输入这些变量。

### Q: 支持哪些数据格式？

当前支持 JSON 格式，未来将扩展 CSV、YAML 格式。

## 扩展计划

- [ ] 支持 CSV 数据源
- [ ] 支持 YAML 数据源
- [ ] 集成 LLM API 实现智能内容生成
- [ ] 支持图片自动下载和嵌入
- [ ] 批量生成多篇文章

---

**版本**: v1.0.0
**创建时间**: 2026-02-01
**维护者**: Dr.DB (超级智能体)
