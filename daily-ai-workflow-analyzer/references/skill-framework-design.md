# 技能框架设计（基于 makepad-skills 参考）

> 文档版本：v1.0
> 创建时间：2026-01-12
> 参考：https://github.com/ZhangHanDong/makepad-skills

---

## 📐 核心设计理念

### 1. 原子化知识结构
每个知识点独立成文件，避免大文件冲突，支持并行开发和更新

### 2. 渐进式披露（Progressive Disclosure）
- **第一层**：SKILL.md 提供概览和快速导航
- **第二层**：分类索引（沟通分析/流程优化/沟通工具）
- **第三层**：原子化知识单元（单个问题/SOP/Prompt）
- **第四层**：详细内容和使用示例

### 3. 自我进化机制
- **自动捕获**：分析过程中发现的新知识自动归档
- **验证升级**：经验证的知识从 community/ 提升到 _base/
- **热更新**：通过文件读取实时更新 AI 上下文

### 4. 无冲突协作
- `_base/`：官方维护的知识库（原子化、编号）
- `community/`：用户贡献的知识（用户名标识）
- 更新时互不干扰，可并行开发

---

## 🏗️ 目录结构设计

```
daily-ai-workflow-analyzer/
├── skill.md                           # 技能入口（渐进式披露第一层）
├── references/                        # 参考文档（设计文档、规范）
│   ├── core-goals.md                  # 核心目标和价值 ✅
│   ├── architecture.md                 # 架构设计 ✅
│   ├── output-formats.md               # 输出格式规范 ✅
│   ├── prompt-templates.md            # Prompt模板库 ✅
│   ├── value-evaluation.md             # 价值评估标准 ✅
│   └── skill-framework-design.md       # 本文档 ✅
│
├── knowledge/                          # 知识库（核心）
│   ├── 01-communication-analysis/     # 沟通分析知识
│   │   ├── CATEGORY.md                # 分类索引
│   │   ├── _base/                     # 官方知识（原子化）
│   │   │   ├── 01-instruction-clarity.md
│   │   │   ├── 02-context-continuity.md
│   │   │   ├── 03-emotion-impact.md
│   │   │   └── 04-iteration-efficiency.md
│   │   └── community/                 # 用户贡献
│   │       └── {username}-{issue-name}.md
│   │
│   ├── 02-process-optimization/        # 流程优化知识
│   │   ├── CATEGORY.md
│   │   ├── _base/
│   │   │   ├── 01-pre-release-checklist.md
│   │   │   ├── 02-automated-testing.md
│   │   │   └── 03-requirement-tracking.md
│   │   └── community/
│   │
│   ├── 03-communication-tools/         # 沟通工具知识
│   │   ├── CATEGORY.md
│   │   ├── _base/
│   │   │   ├── 01-programming-task-template.md
│   │   │   ├── 02-issue-report-template.md
│   │   │   └── 03-knowledge-capture-template.md
│   │   └── community/
│   │
│   └── 04-troubleshooting/             # 问题诊断知识
│       ├── CATEGORY.md
│       ├── _base/
│       │   ├── 01-website-not-accessible.md
│       │   ├── 02-delete-key-conflict.md
│       │   └── 03-slow-loading.md
│       └── community/
│
├── templates/                          # 知识模板（自我进化用）
│   ├── issue-template.md               # 问题诊断模板
│   ├── sop-template.md                 # SOP模板
│   ├── prompt-template.md              # Prompt模板
│   └── troubleshooting-template.md     # 问题解决模板
│
├── scripts/                            # 分析脚本
│   ├── extract_voice_records.py        # 数据提取
│   ├── preprocess_records.py           # 数据预处理（价值筛选）
│   ├── ai_analyze.py                   # AI深度分析
│   └── knowledge_capture.py            # 知识自动捕获
│
├── hooks/                              # 自我进化 hooks（可选）
│   ├── auto-capture.sh                 # 自动捕获新知识
│   ├── validate.sh                     # 验证知识质量
│   └── promote.sh                      # 从 community 提升到 _base
│
└── examples/                           # 使用示例
    ├── antigravity-analysis.md         # Antigravity 完整分析示例
    └── alma-analysis.md                # Alma 完整分析示例
```

---

## 📖 渐进式披露实现

### 第一层：skill.md（技能入口）

```markdown
# Daily AI Workflow Analyzer

## 📖 快速开始

这个技能帮助你从语音聊天记录中提取价值知识，提升沟通效率和工作质量。

**核心功能**：
- 📊 分析语音记录，识别沟通中的问题
- 🔍 发现流程优化机会，生成 SOP
- 🛠️ 生成沟通工具（Prompt模板、最佳实践）

## 🗂️ 知识库导航

### 1️⃣ 沟通分析
[点击查看详情 →](knowledge/01-communication-analysis/CATEGORY.md)

- 指令清晰度
- 上下文连续性
- 情绪影响度
- 迭代效率

### 2️⃣ 流程优化
[点击查看详情 →](knowledge/02-process-optimization/CATEGORY.md)

- 发布前检查清单
- 自动化测试
- 需求追踪

### 3️⃣ 沟通工具
[点击查看详情 →](knowledge/03-communication-tools/CATEGORY.md)

- 编程任务模板
- 问题反馈模板
- 知识沉淀模板

### 4️⃣ 问题诊断
[点击查看详情 →](knowledge/04-troubleshooting/CATEGORY.md)

- 技术问题
- 流程问题
- 沟通问题

## 🚀 快速使用

```bash
# 分析最近1天的语音记录
python3 scripts/analyze_voice_workflow.py --days 1 --all

# 分析特定应用
python3 scripts/analyze_voice_workflow.py --app Antigravity
```

## 📚 更多文档

- [核心目标和价值](references/core-goals.md)
- [架构设计](references/architecture.md)
- [输出格式规范](references/output-formats.md)
```

---

### 第二层：CATEGORY.md（分类索引）

**文件：`knowledge/01-communication-analysis/CATEGORY.md`**

```markdown
# 沟通分析知识库

## 📋 知识点概览

| 编号 | 知识点 | 类型 | 难度 | 状态 |
|------|--------|------|------|------|
| 01 | 指令清晰度 | 问题诊断 | 初级 | 官方 |
| 02 | 上下文连续性 | 问题诊断 | 初级 | 官方 |
| 03 | 情绪影响度 | 问题诊断 | 中级 | 官方 |
| 04 | 迭代效率 | 问题诊断 | 中级 | 官方 |

## 🔧 官方知识（_base/）

- [01-指令清晰度](_base/01-instruction-clarity.md)
- [02-上下文连续性](_base/02-context-continuity.md)
- [03-情绪影响度](_base/03-emotion-impact.md)
- [04-迭代效率](_base/04-iteration-efficiency.md)

## 🌟 社区贡献（community/）

*这里将显示用户贡献的知识点*

## 📊 统计信息

- 官方知识：4 个
- 社区贡献：0 个
- 总知识点：4 个
```

---

### 第三层：原子化知识单元

**文件：`knowledge/01-communication-analysis/_base/01-instruction-clarity.md`**

```markdown
---
name: instruction-clarity
type: issue-diagnosis
category: communication-analysis
author: system
date: 2026-01-12
tags: [communication, clarity, instruction]
level: beginner
priority: high
---

# 指令清晰度问题

## 📋 问题描述

**现象**：
- 指令模糊，缺少明确的目标、约束和期望
- AI 需要频繁澄清才能理解需求

**典型示例**：
- "帮我分析一下这个技能是否完善？"
- "你先帮我分析一下"
- "我们先把中英文的"（句子不完整）

**影响**：
- 平均需要 2.3 轮对话才能明确需求
- 频繁澄清浪费时间（约占对话时间的 35%）
- 容易产生误解，导致返工

## 🔍 根因分析

1. **缺少结构化的表达习惯**
   - 没有形成"目标-约束-期望"的表达框架
   - 假设 AI 有更多上下文

2. **信息密度不足**
   - 过于简短，缺少关键信息
   - 依赖 AI 猜测而非明确说明

## ✅ 解决方案

### 方案1：使用标准模板（推荐）

使用 [编程任务模板](../../03-communication-tools/_base/01-programming-task-template.md)

### 方案2：表达前自检

每次表达前先思考三个问题：
1. **目标是什么？** - 我想完成什么
2. **约束是什么？** - 有什么限制条件
3. **期望是什么？** - 我期望得到什么输出

### 方案3：复杂任务先写草稿

对于复杂任务，先用文字写下要点，再语音输入

## 📈 预期效果

- 对话轮次减少 50%
- 误解率降低 70%
- 任务完成速度提升 30%

## 🧪 验证方法

1. 统计澄清对话的次数
2. 记录任务完成所需轮次
3. 定期对比分析前后数据

## 📚 相关知识

- [上下文连续性](_base/02-context-continuity.md)
- [编程任务模板](../../03-communication-tools/_base/01-programming-task-template.md)

## 💡 最佳实践

```markdown
## 任务描述

### 背景
Antigravity 图片编辑功能，当前在实现对比模式

### 目标
实现对比模式下的原图显示逻辑

### 约束条件
- 技术约束：React + TypeScript
- 时间约束：今日完成
- 质量约束：需要通过手动测试

### 期望输出
- 功能实现：刷新后对比模式下显示原图
- 代码规范：符合现有代码风格
- 交付物：代码 + 简要说明
```

## 📝 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-01-12 | 1.0 | 初始版本 | system |
```

---

## 🔄 自我进化机制

### 1. 自动捕获新知识

**场景**：AI 分析语音记录时，发现新的问题模式

**实现**：`scripts/knowledge_capture.py`

```python
def capture_new_knowledge(analysis_result, app_name):
    """
    当分析结果中发现新问题时，自动创建知识条目
    """
    for issue in analysis_result['new_issues']:
        # 使用模板创建新知识文件
        template = load_template('issue-template.md')
        knowledge_file = generate_knowledge_file(
            template,
            issue,
            category='communication-analysis',
            location='community'
        )
        save_knowledge_file(knowledge_file)
        log(f"新知识已捕获：{issue['title']}")
```

### 2. 验证并提升知识

**场景**：社区贡献的知识经过验证后被采纳

**实现**：`hooks/promote.sh`

```bash
#!/bin/bash
# 从 community 提升到 _base

# 输入：知识文件路径
KNOWLEDGE_FILE=$1

# 验证条件
# 1. 用户评分 > 4分
# 2. 使用次数 > 10次
# 3. 至少1个月无问题报告

if validate_knowledge "$KNOWLEDGE_FILE"; then
    promote_to_base "$KNOWLEDGE_FILE"
    echo "知识已提升到 _base/"
fi
```

### 3. 热更新机制

**实现原理**：

```
用户请求分析
  ↓
读取最新的 references/ 和 knowledge/
  ↓
AI 基于最新知识库进行分析
  ↓
生成报告 + 捕获新知识
  ↓
更新 community/ 文件
  ↓
下一次分析时自动使用新知识
```

**优点**：
- 无需重启或重新加载
- 知识更新即时生效
- 通过版本控制追踪变更

---

## 📝 知识模板

### 模板1：问题诊断模板

**文件：`templates/issue-template.md`**

```markdown
---
name: {issue-name}
type: issue-diagnosis
category: {category-name}
author: {username}
date: {date}
tags: [{tag1}, {tag2}]
level: {beginner|intermediate|advanced}
---

# {Issue Title}

## 📋 问题描述

**现象**：
- {现象描述1}
- {现象描述2}

**典型示例**：
- "{示例1}"
- "{示例2}"

**影响**：
- {影响描述}

## 🔍 根因分析

1. **根因1**
   - {详细说明}

2. **根因2**
   - {详细说明}

## ✅ 解决方案

### 方案1：{方案名称}

{方案详细说明}

### 方案2：{方案名称}

{方案详细说明}

## 📈 预期效果

- {效果1}
- {效果2}

## 🧪 验证方法

1. {验证步骤1}
2. {验证步骤2}

## 📚 相关知识

- [相关知识点]({路径})

## 💡 最佳实践

```markdown
{最佳实践代码块}
```

## 📝 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| {date} | 1.0 | 初始版本 | {username} |
```

### 模板2：SOP模板

**文件：`templates/sop-template.md`**

```markdown
---
name: {sop-name}
type: sop
category: {category-name}
author: {username}
date: {date}
tags: [{tag1}, {tag2}]
level: {beginner|intermediate|advanced}
---

# {SOP Title}

## 📋 背景

{背景说明}

## 🎯 目标

{目标说明}

## 📝 执行步骤

### P0级别（必须通过）
- [ ] {步骤1}
- [ ] {步骤2}

### P1级别
- [ ] {步骤3}
- [ ] {步骤4}

### P2级别
- [ ] {步骤5}
- [ ] {步骤6}

## ✅ 验证标准

- [ ] {标准1}
- [ ] {标准2}

## ⚠️ 注意事项

1. {注意事项1}
2. {注意事项2}

## 📚 相关知识

- [相关知识点]({路径})

## 📝 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| {date} | 1.0 | 初始版本 | {username} |
```

### 模板3：Prompt模板

**文件：`templates/prompt-template.md`**

```markdown
---
name: {prompt-name}
type: prompt-template
category: {category-name}
author: {username}
date: {date}
tags: [{tag1}, {tag2}]
level: {beginner|intermediate|advanced}
---

# {Prompt Title}

## 📋 模板描述

{模板描述和使用场景}

## 📝 Prompt 模板

```markdown
{Prompt 内容}

## 任务描述

### 背景
{占位符说明}

### 目标
{占位符说明}

### 约束条件
- 占位符1：{说明}
- 占位符2：{说明}

### 期望输出
- {占位符说明}
```

## 🧪 使用示例

**示例1**：

```markdown
{实际使用示例}
```

## 📚 相关知识

- [相关知识点]({路径})

## 📝 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| {date} | 1.0 | 初始版本 | {username} |
```

---

## 🚀 实施路线图

### 阶段1：基础框架搭建（本周）

- [ ] 创建目录结构
- [ ] 创建 skill.md 入口文件
- [ ] 创建 CATEGORY.md 索引文件
- [ ] 创建初始 _base/ 知识点
- [ ] 创建模板文件

### 阶段2：自我进化机制（下周）

- [ ] 实现 knowledge_capture.py
- [ ] 实现 hooks 脚本
- [ ] 集成到现有分析流程
- [ ] 测试自动捕获和提升机制

### 阶段3：知识库充实（本月）

- [ ] 基于历史分析填充 _base/ 知识
- [ ] 收集用户反馈，优化模板
- [ ] 建立知识质量评估标准

### 阶段4：生态完善（长期）

- [ ] 开发可视化管理界面
- [ ] 建立社区贡献流程
- [ ] 实现知识推荐系统

---

## 📊 与 makepad-skills 的对比

| 特性 | makepad-skills | 本技能 |
|------|----------------|--------|
| 原子化结构 | ✅ | ✅ |
| _base/community 分离 | ✅ | ✅ |
| 渐进式披露 | ✅ | ✅ |
| 自我进化 hooks | ✅ | ✅ |
| 热更新 | ✅ | ✅ |
| 模板系统 | ✅ | ✅ |
| 知识类型 | 技术模式 | 问题/SOP/Prompt |

---

*本文档定义了技能的完整框架，所有后续开发都应遵循此设计。*
