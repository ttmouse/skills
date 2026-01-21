# 评估框架

> 当需要深入评估时参考此文件，日常复盘不需要逐条检查

## 已用技能评估清单

对每个使用过的技能，对比实际执行与技能文档：

- [ ] 是否完全按技能流程执行？
- [ ] 有无偏离？偏离是改进还是退化？
- [ ] 有无遗漏的边界情况？
- [ ] 有无可补充的示例？
- [ ] 流程是否可简化？
- [ ] 官方技能是否有更新？（针对来自 anthropics/skills 仓库的技能）

### 官方技能更新检查

对于来自官方仓库的技能（如 skill-creator、pdf、docx 等）：
- 仓库地址：`https://github.com/anthropics/skills/tree/main/skills`
- 获取原始文件：`https://raw.githubusercontent.com/anthropics/skills/main/skills/[skill-name]/SKILL.md`

## 新技能判断框架

### 准入门槛（任一满足即可考虑）

| 维度 | 问题 | 阈值 |
|------|------|------|
| 重复性 | 这个流程会再次用到吗？ | 预期 ≥2 次 |
| 复杂度 | 下次能凭记忆复现吗？ | 步骤 ≥3 或有隐性知识 |
| 时间成本 | 重新摸索要多久？ | ≥10 分钟 |
| 失败代价 | 做错了后果严重吗？ | 有不可逆操作 |

### 反向检查（不值得沉淀的信号）

- 流程太简单，3 步以内能完成
- 只用一次，没有复用场景
- 容易记住，不需要文档
- 已有类似技能可以扩展

### 沉淀物分级

根据复杂度决定沉淀形式：

```
├── 规则（一句话原则）     → ~/.claude/rules/
├── 检查清单（步骤列表）   → 技能库/轻量级
├── 完整技能（流程+代码）  → ~/.claude/skills/
└── 工具脚本（纯自动化）   → tools/ 或 scripts/
```

## 失败归因分类

当技能执行出现问题时，归类原因：

| 类别 | 说明 | 典型修复 |
|------|------|----------|
| 信息缺失 | 输入不足，需要更多上下文 | 补充 Inputs Required |
| 步骤缺失 | 流程不完整，漏了关键步骤 | 补充 Workflow |
| 边界未覆盖 | 特殊情况没处理 | 补充 Failure Patterns |
| 触发不灵 | 该用的时候没触发 | 优化 description 触发词 |
| 工具误用 | 用错了方法或工具 | 补充 Safety Constraints |

## 技能结构规范（完整版）

```markdown
---
name: skill-name
description: ...
---

# Skill Name

## When to Use
- Use ONLY when: ...
- DO NOT use when: ...

## Inputs Required
| 字段 | 必填 | 说明 |
|------|------|------|
| ... | Y/N | ... |

## Outputs (Must Produce)
- [ ] Artifact A: ...
- [ ] Command(s): ...

## Workflow
1. ...
2. ...

## Acceptance Tests
| 测试项 | 验证方式 | 预期结果 |
|--------|----------|----------|
| ... | ... | ... |

## Safety Constraints
- ...

## Failure Patterns
| 失败模式 | 原因 | 防护措施 |
|----------|------|----------|
| ... | ... | ... |
```
