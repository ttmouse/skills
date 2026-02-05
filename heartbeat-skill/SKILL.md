# 心跳任务完成技能 (Heartbeat Task Completion Skill)

> 自动化任务完成流程：标记完成 + TG 通知 + 归档

---

## 触发条件

当任务完成时调用此技能：
- Agent 手动完成任务
- 自动化任务执行结束
- 架构师审查完成
- 任何需要标记任务完成的场景

---

## 使用方式

### 方式 1：直接执行脚本
```bash
cd ~/.claude/skills/heartbeat-skill
./execute.sh --task-id <任务ID> --title "任务标题" --description "完成内容"
```

### 方式 2：通过环境变量
```bash
export TASK_ID="abc123"
export TASK_TITLE="完成任务标题"
export TASK_DESCRIPTION="完成内容描述"
export TASK_FILES="file1.ts,file2.ts"
cd ~/.claude/skills/heartbeat-skill && ./execute.sh
```

### 方式 3：从 AI 工作区调用
```bash
cd /Users/douba/Projects/XM
python3 ~/.claude/skills/heartbeat-skill/task_completion.py \
  --task-id abc123 \
  --title "完成任务" \
  --description "实现了新功能"
```

---

## 核心流程

```
1. 验证任务
   ├─ 通过 API 获取任务状态
   └─ 验证任务存在且未完成

2. 标记任务完成（通过 API）
   ├─ 调用 POST /api/todos/{task_id}/complete
   ├─ 设置 completed: true
   ├─ 设置 completed_at: 当前时间
   └─ 清除 processing 状态

3. 发送 TG 通知
   ├─ 格式化消息（标准格式）
   ├─ 调用 telegram_notifier
   └─ 记录发送结果

4. 归档已完成任务
   ├─ 运行 archive_completed_todos.sh
   └─ 移动已完成任务到 archives/

5. 报告结果
   └─ 输出完成状态和归档路径
```

**重要**: 所有任务状态变更都通过 API 完成，不直接修改 todos.json 文件。

---

## 输入参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--task-id` | string | ✅ | 任务 ID |
| `--title` | string | ❌ | 任务标题（用于 TG 通知，默认从 todos.json 读取） |
| `--description` | string | ❌ | 完成内容描述（支持 Markdown） |
| `--files` | string | ❌ | 影响的文件列表（逗号分隔） |
| `--no-notify` | flag | ❌ | 跳过 TG 通知（用于测试） |

---

## 输出格式

```
✅ 任务完成
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
任务ID: abc123
任务标题: 实现新功能
完成时间: 2026-02-04 12:35:00

TG 通知: ✅ 已发送
归档: ✅ 已完成 (archives/completed_20260204_123500.json)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## TG 通知格式

```markdown
✅ 任务完成

📋 **任务标题**: 任务标题
🆔 **任务ID**: `abc123`

📝 **完成内容**:
```
实现了新功能的核心逻辑
- 添加了 API 端点
- 完成了单元测试
```

📂 **影响文件**:
  • `src/api/endpoint.ts`
  • `src/tests/test.ts`

⏰ **完成时间**: 2026-02-04 12:35:00
```

---

## 错误处理

| 错误 | 处理方式 |
|------|----------|
| 任务不存在 | 打印错误并退出（exit 1） |
| 任务已完成 | 打印警告并跳过 |
| TG 通知失败 | 打印警告，继续归档 |
| 归档失败 | 打印错误并退出（exit 1） |
| todos.json 不存在 | 打印错误并退出（exit 1） |

---

## 与现有系统的关系

### 依赖
- `scripts/todos_manager.py` - 任务管理
- `scripts/archive_completed_todos.sh` - 归档脚本
- `telegram_ops_bot/telegram_notifier.py` - TG 通知
- `scripts/tg_notifier.py` - TG 通知封装（新增）

### 调用方
- Agent 手动完成任务时
- 自动化任务执行结束时
- 架构师审查完成时
- 任何需要标记任务完成的场景

### 替代方案
**旧方式**（分散且易冲突）：
```bash
# ❌ 禁止：直接修改 todos.json（可能导致并发冲突）
vi AI工作区/待办/todos.json

# 2. 手动运行归档脚本
./scripts/archive_completed_todos.sh

# 3. 手动发送 TG 通知（经常忘记！）
cd telegram_ops_bot
.venv312/bin/python -c "..."
```

**新方式**（API 驱动）：
```bash
# ✅ 推荐：一键完成所有步骤（通过 API）
~/.claude/skills/heartbeat-skill/execute.sh --task-id abc123 --title "完成任务"

# ✅ 或直接使用 API（极简）
curl -X POST "http://localhost:18920/api/todos/abc123/complete" \
  -H "Content-Type: application/json" \
  -d '{"summary": "完成了核心功能"}'
```

**设计原则**：所有任务状态变更都通过 API 完成，避免直接文件操作导致的并发冲突。

---

## 测试

```bash
# 测试 TG 通知（不修改 todos.json）
cd ~/.claude/skills/heartbeat-skill
./task_completion.py --test-notify

# 测试完整流程（使用虚拟任务）
./task_completion.py --test-completion

# 实际完成任务
./execute.sh --task-id abc123 --title "测试任务"
```

---

## 版本历史

- **v1.0** (2026-02-04): 初始版本
  - 标记任务完成
  - TG 通知
  - 自动归档
