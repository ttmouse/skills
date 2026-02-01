---
name: requirements-clarifier
description: A generic requirement/problem clarification workflow. Use when a user/client request is ambiguous, underspecified, or hard to execute/verify. The skill reframes the request, defines scope, constraints, inputs, and acceptance criteria, then outputs a concise one-page definition and a minimal question set to close gaps. Suitable for product/feature requests, content requests, ops tasks, research asks, and decision-making prompts.
---

# Requirements Clarifier（需求/问题定义顾问）

目标：把“模糊表达”收敛成**可执行、可验收、可复用**的定义文档；并产出**最少追问**与**默认假设**，避免陷入反复沟通。

## Default Outputs（每次必出，固定格式）

1. **One-line Definition（一句话定义）**：一句话说清“要做什么 + 为谁 + 为了什么”。
2. **Definition Card（定义卡 / 1页）**：6 槽位 + 关键风险/约束。
3. **Gap List（缺口清单）**：缺少哪些信息（按优先级）。
4. **Minimal Questions（最少追问 3-7 个）**：给到对方/客户去回答。
5. **Assumptions（默认假设）**：当对方答不上时，给可执行的默认值，让项目继续跑。
6. **Next Actions（下一步行动）**：打样/验证方式/里程碑。

> 输出模板见：`references/output-template.md`

## Workflow（严格按顺序执行）

### Step 0 — Classify the ask（先判别问题类型，避免问错）
将请求归类为以下之一，并在输出里明确写出你的判断：
- **Delivery（交付型）**：要产出具体东西（文案/功能/方案/脚本/页面）
- **Diagnosis（诊断型）**：要定位原因（指标下降/体验差/流程卡住）
- **Decision（决策型）**：要做选择（A/B、要不要做、优先级）
- **Research（探索型）**：要搞清楚（概念、赛道、对标、可行性）

规则：如果用户表述里出现“做一个/写一份/给我…/产出…”，优先判为 Delivery；出现“为什么/怎么回事/下降/变差/问题”，优先判为 Diagnosis。

### Step 1 — Build the 6-slot Definition Card（6 槽位定义卡）
用 6 槽位把需求钉住（不要扩写成长文）：
1) **Goal（目标）**：期望改变是什么（结果/指标/状态）。
2) **Audience/System（对象）**：影响谁/哪个系统/哪个环节。
3) **Scope（边界）**：做什么/不做什么（Out of scope 必写）。
4) **Constraints（约束）**：时间/预算/资源/合规/技术/渠道。
5) **Inputs（输入）**：现有事实、数据、样本、素材、依赖。
6) **Acceptance（验收）**：什么算完成（可验证标准 + 1-2 个例子）。

模板见：`references/definition-card-6slots.md`

### Step 2 — Define deliverable composition（定义“交付物由什么构成”）
将交付物拆成可检查的组成件，确保可批量、可复用：
- Deliverables list：要交付哪些东西（文档/代码/清单/脚本/素材包）。
- For each deliverable：字段/章节/长度/格式/变量槽位。
- Quality bars：一致性/事实性/可追溯/可回滚。

模板见：`references/deliverable-composition.md`

### Step 3 — Produce Gap List + Minimal Questions（缺口与最少追问）
把“缺什么”写成 Gap List，并生成 3-7 个最少追问：
- 问题必须**可回答**（二选一/填空/给样本），避免开放式空耗。
- 追问按优先级排序：先问会影响方向/验收的。

问题库与问法规则见：`references/question-bank.md`

### Step 4 — Provide executable defaults（默认假设，保证可推进）
当信息缺失且对方回答困难时：
- 给出 **2-3 个默认选项**（含利弊），并声明“如无回复默认采用 X”。
- 默认值必须能让你继续推进到“打样/验证”。

### Step 5 — Define validation plan（验证/打样计划）
输出一个最低成本验证：
- Delivery：先打样 3-10 个版本对齐风格/方向。
- Diagnosis：先补齐观测与复现路径，再提假设。
- Decision：用 3-5 条硬指标对比，输出推荐与放弃理由。
- Research：输出目录、信息源、结论置信度与下一步实验。

## Rules（硬规则）
- **不要堆“问题清单”**：只保留 3-7 个最关键追问。
- **先给定义卡，再给解释**：结论先行。
- **不确定就写假设**：用“可推进”优先，而不是“完美信息”。
- **可验收优先**：没有验收标准的需求＝不可交付。

## Resources
- `references/output-template.md`：最终输出模板（固定结构）。
- `references/definition-card-6slots.md`：6槽位定义卡模板。
- `references/deliverable-composition.md`：交付物构成模板。
- `references/question-bank.md`：最少追问问题库（按类型）。
