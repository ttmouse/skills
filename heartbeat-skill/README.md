# 心跳任务完成技能 (Heartbeat Task Completion Skill)

## 快速开始

```bash
# 测试 TG 通知
cd ~/.claude/skills/heartbeat-skill
./execute.sh --test-notify

# 完成任务
./execute.sh \
  --task-id abc123 \
  --title "实现新功能" \
  --description "完成了 API 端点和单元测试" \
  --files "src/api/endpoint.ts,src/tests/test.ts"

# 跳过 TG 通知（测试用）
./execute.sh --task-id abc123 --no-notify
```

---

## 功能

| 功能 | 状态 |
|------|------|
| 标记任务完成 | ✅ |
| TG 通知 | ✅ |
| 自动归档 | ✅ |
| 测试模式 | ✅ |

---

## 文件结构

```
heartbeat-skill/
├── SKILL.md           # 技能文档（详细说明）
├── README.md          # 快速参考（本文件）
├── execute.sh         # Bash 执行入口
└── task_completion.py # 核心逻辑
```

---

## 参数说明

### 命令行参数
```bash
--task-id <ID>           # 任务 ID（必填）
--title <标题>           # 任务标题（用于 TG 通知）
--description <描述>     # 完成内容描述（支持 Markdown）
--files <文件列表>       # 影响的文件（逗号分隔）
--no-notify              # 跳过 TG 通知
--test-notify            # 测试 TG 通知
--test-completion         # 测试完整流程
```

### 环境变量
```bash
export TASK_ID="abc123"
export TASK_TITLE="完成任务"
export TASK_DESCRIPTION="完成内容"
export TASK_FILES="file1.ts,file2.ts"
```

---

## 使用场景

### 场景 1：Agent 手动完成任务
```bash
# Agent 完成任务后调用
./execute.sh \
  --task-id $(jq -r '.id' <(curl -s http://localhost:18920/api/todos/active)) \
  --title "完成代码重构"
```

### 场景 2：自动化任务执行
```bash
# 自动化脚本中
#!/bin/bash
TASK_ID=$(python3 create_task.py "自动任务")

# 执行任务...
python3 run_task.py "$TASK_ID"

# 完成后调用本技能
~/.claude/skills/heartbeat-skill/execute.sh \
  --task-id "$TASK_ID" \
  --title "自动任务完成"
```

### 场景 3：架构师审查完成
```bash
# 架构师审查通过后
./execute.sh \
  --task-id "$REVIEW_TASK_ID" \
  --title "架构师审查完成" \
  --description "审查通过，已合并代码"
```

---

## TG 通知示例

```
✅ 任务完成

📋 **任务标题**: 实现新功能
🆔 **任务ID**: `abc123`

📝 **完成内容**:
```
完成了 API 端点和单元测试
- 添加了 /api/tasks 端点
- 完成了单元测试（覆盖率 95%）
```

📂 **影响文件**:
  • `src/api/endpoint.ts`
  • `src/tests/test.ts`

⏰ **完成时间**: 2026-02-04 12:35:00
```

---

## 故障排查

### TG 通知失败
```bash
# 检查 telegram_notifier 是否可用
cd /Users/douba/Projects/XM
python3 -c "import telegram_notifier; print('OK')"

# 手动测试通知
~/.claude/skills/heartbeat-skill/execute.sh --test-notify
```

### 归档失败
```bash
# 检查归档脚本
ls -la /Users/douba/Projects/XM/scripts/archive_completed_todos.sh

# 手动运行归档
cd /Users/douba/Projects/XM
./scripts/archive_completed_todos.sh
```

### 任务不存在
```bash
# 查看当前任务
jq '.[] | {id, title, completed}' /Users/douba/Projects/XM/AI工作区/待办/todos.json
```

---

## 集成到现有流程

### 替代手动步骤
```bash
# ❌ 旧方式（分散）
vi AI工作区/待办/todos.json                    # 1. 手动编辑
./scripts/archive_completed_todos.sh              # 2. 手动归档
cd telegram_ops_bot && ...                      # 3. 手动发送通知

# ✅ 新方式（技能化）
~/.claude/skills/heartbeat-skill/execute.sh \
  --task-id abc123 --title "完成任务"        # 1. 一键完成
```

### 在脚本中使用
```python
import subprocess

def complete_task(task_id: str, title: str):
    subprocess.run([
        "~/.claude/skills/heartbeat-skill/execute.sh",
        "--task-id", task_id,
        "--title", title
    ])
```

---

## 版本历史

- **v1.0** (2026-02-04): 初始版本
