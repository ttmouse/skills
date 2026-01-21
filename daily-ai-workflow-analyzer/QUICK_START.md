# DailyAIWorkflowAnalyzer - Quick Start Guide

## 🚀 快速开始

### 1. 启动分析控制台
```bash
/Users/douba/.claude/skills/daily-ai-workflow-analyzer/scripts/start_dashboard.sh
```

### 2. 打开浏览器
访问：http://localhost:8080

### 3. 查看数据
- 总体数据概览（记录数、APP数量、高峰时段）
- APP列表（每个APP的记录数、占比、状态）

### 4. 分析报告
- 点击"AI分析" → 触发Python深度分析
- 点击"查看报告" → 在页面内查看完整报告

---

## 📊 完整工作流

```bash
# 方式1：一键执行所有步骤
python3 /Users/douba/.claude/skills/daily-ai-workflow-analyzer/scripts/analyze_voice_workflow.py --days 1 --all

# 方式2：分步执行
# Step 1: 提取语音记录（可选，如果已有数据可跳过）
python3 /Users/douba/.claude/skills/daily-ai-workflow-analyzer/scripts/extract_voice_records.py --days 1

# Step 2: 按APP分组
python3 /Users/douba/.claude/skills/daily-ai-workflow-analyzer/scripts/group_by_app.py

# Step 3: 生成分析报告
python3 /Users/douba/.claude/skills/daily-ai-workflow-analyzer/scripts/analyze_voice_workflow.py --app Antigravity --skip-extract --skip-group

# Step 4: 启动控制台查看
/Users/douba/.claude/skills/daily-ai-workflow-analyzer/scripts/start_dashboard.sh
```

---

## 📁 文件结构

```
daily-ai-workflow-analyzer/
├── SKILL.md                                    # 完整技能文档
├── QUICK_START.md                              # 本文件
├── scripts/
│   ├── extract_voice_records.py                # 提取语音记录
│   ├── group_by_app.py                         # 按APP分组
│   ├── generate_analysis_report.py              # 生成分析报告
│   ├── analyze_voice_workflow.py               # 主控脚本
│   ├── analysis_server.py                     # Flask API服务器
│   ├── analysis_dashboard.html                 # 控制台HTML
│   └── start_dashboard.sh                      # 启动脚本
├── templates/
│   ├── analysis_report_template.md              # 报告模板
│   └── analysis_framework.json                 # 分析框架配置
└── references/
    └── typeless_db_schema.md                  # 数据库schema
```

---

## 🎯 核心功能

### 1. 数据提取
- 从Typeless.app SQLite数据库提取语音记录
- 支持按日期范围筛选
- 输出JSON格式

### 2. 智能分组
- 按`focused_app_name`自动分组
- 为每个APP生成独立JSON文件

### 3. 价值分析
- 识别高频场景（功能需求、交互设计、问题反馈等）
- 分析工作流阶段（需求、设计、实现、测试、修复）
- 识别协作模式（指令型、建议型、质疑型等）
- 提取可沉淀知识（原则、SOP、Prompt）

### 4. 可视化控制台
- 数据概览统计
- APP列表与状态
- 实时分析进度
- 报告内页查看
- 数据可视化图表

---

## 📝 输出示例

### 数据文件
```
by_app/
├── Alma.json                    # 182条记录
├── Antigravity.json             # 145条记录
├── 微信.json                    # 46条记录
└── ...
```

### 分析报告
```
analysis_reports/
├── Alma_Analysis_2026-01-11.md              # 基础报告
├── Antigravity_Analysis_Final_2026-01-11.md  # 最终报告
└── ...
```

---

## 🔧 故障排查

### 问题：无法加载数据
**解决方案**：
1. 确认服务器正在运行：`lsof -i :8080`
2. 检查数据文件是否存在：`ls ~/Library/Application\ Support/alma/workspaces/temp-voice-extraction/by_app/`

### 问题：无法查看报告
**解决方案**：
1. 强制刷新浏览器：`Cmd + Shift + R`
2. 尝试无痕窗口打开
3. 检查报告文件：`ls ~/Library/Application\ Support/alma/workspaces/temp-voice-extraction/analysis_reports/`

### 问题：端口8080被占用
**解决方案**：
修改`analysis_server.py`中的端口号（搜索`port=8080`）

---

## 📊 分析报告内容

### 执行摘要
- 核心模式（一句话总结）
- 关键问题（3个以内）
- 可沉淀价值（3个以上）
- 行动建议（1个具体行动）

### 数据快照
- 记录总数、时间范围、高峰时段、平均时长

### 模式识别
- 高频场景及占比
- 工作流阶段分布
- 协作模式分析

### 深度洞察
- 问题根因分析
- 可沉淀知识（原则、SOP、Prompt）
- 模式总结

### 行动建议
- 立即行动（今日/明日）
- 短期优化（本周）
- 长期改进（本月）

---

## 💡 使用建议

1. **定期分析**：每天或每周分析一次，追踪模式变化
2. **关注高频**：优先分析记录数多的APP（如Alma、Antigravity）
3. **提取价值**：重点关注可沉淀知识（原则、SOP、Prompt）
4. **迭代改进**：基于报告建议优化工作流，然后重新分析验证

---

## 🔄 迭代改进

当前为**MVP阶段**，核心功能已实现：
- ✅ 数据提取与分组
- ✅ 基础模式识别
- ✅ 结构化报告生成
- ✅ 可视化控制台
- ⏳ AI深度分析（需要模型集成）
- ⏳ 自动同步到Obsidian
- ⏳ 趋势分析

---

## 📞 支持

如遇问题，请检查：
1. Python3已安装
2. Flask已安装（`pip3 install --break-system-packages flask flask-cors`）
3. Typeless数据库路径正确
4. 端口8080未被占用

---

*最后更新：2026-01-11*
