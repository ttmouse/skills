# 扩展指南：添加新的设计风格

本指南说明如何为 designprompt 技能添加新的设计风格。

## 快速开始

添加一个新风格需要3个步骤：

1. 从 https://www.designprompts.dev/ 获取设计系统提示词
2. 创建风格文档文件
3. 更新 SKILL.md 中的风格索引

## 详细步骤

### 步骤1：获取设计系统提示词

访问 https://www.designprompts.dev/ 并选择一个风格：

1. 浏览30个设计风格
2. 点击感兴趣的风格
3. 点击 "Get Prompt" 按钮
4. 复制完整的提示词内容

### 步骤2：创建风格文档

在 `styles/` 目录创建新的 Markdown 文件，命名格式：`{风格名}-{模式}.md`

例如：`luxury-light.md`, `cyberpunk-dark.md`

#### 文件模板

```markdown
# {风格名称} Design System

**风格ID**: {风格id}（小写，用连字符）
**模式**: Light | Dark
**字体类型**: Sans-serif | Serif | Mono
**简短描述**: 一句话描述这个风格

## 适用场景
- 场景1
- 场景2
- 场景3
- ...

## 情感调性
{关键词列表：如 优雅、专业、活泼、严肃...}

## 适用行业
{行业列表：如 时尚、科技、金融、教育...}

## 设计系统提示词

{从designprompts.dev复制的完整提示词}

```

#### 示例：Luxury 风格

```markdown
# Luxury Design System

**风格ID**: luxury
**模式**: Light
**字体类型**: Serif
**简短描述**: 奢侈品风格，金色与精致细节

## 适用场景
- 奢侈品品牌官网
- 高端酒店预订平台
- 珠宝首饰展示
- 精品时装电商
- 豪华汽车展厅
- 高端房地产

## 情感调性
优雅、奢华、精致、尊贵、品质、永恒、细腻、高贵

## 适用行业
奢侈品、时尚、珠宝、酒店、高端服务、精品零售

## 设计系统提示词

<role>
You are an expert frontend engineer...
</role>

<design-system>
# Design Style: Luxury

[完整的设计系统规范...]
</design-system>
```

### 步骤3：更新风格索引

编辑 `SKILL.md` 文件，在 `<styles-index>` 部分添加新风格：

```markdown
### XX. {风格名称} ({模式}, {字体类型})
**简介**：{一句话描述}
**适用**：{主要应用场景，逗号分隔}
**调性**：{情感关键词，逗号分隔}
**行业**：{适用行业，逗号分隔}
```

#### 完整示例

```markdown
### 06. Luxury (Light, Serif)
**简介**：奢侈品风格，金色与精致细节
**适用**：奢侈品牌、高端酒店、珠宝首饰、豪华服务
**调性**：优雅、奢华、精致、尊贵、品质
**行业**：奢侈品、高端服务、精品
```

### 步骤4：更新推荐逻辑（可选）

如果新风格有特定的应用场景，可以在 `SKILL.md` 的推荐逻辑部分添加：

```markdown
### 按行业推荐
- **奢侈品/高端品牌** → Luxury, Monochrome, Art Deco  # 添加这里
```

## 批量添加风格

如果要批量添加多个风格，可以使用以下脚本辅助：

### 方法1：浏览器自动化脚本

访问 designprompts.dev，在浏览器控制台运行：

```javascript
// 获取所有风格按钮
const buttons = Array.from(document.querySelectorAll('button'))
  .filter(btn => btn.textContent.match(/Light \d+$|Dark \d+$/));

// 提取风格信息
const styles = buttons.map(btn => {
  const text = btn.textContent.trim();
  const match = text.match(/^(.+?)\s+(Light|Dark)\s+(\d+)$/);
  return match ? {
    name: match[1],
    mode: match[2],
    id: match[3]
  } : null;
}).filter(Boolean);

console.table(styles);
```

### 方法2：Claude Code 辅助

让 Claude Code 帮你批量创建文件：

```
请帮我创建以下设计风格的文档文件：

1. Cyberpunk (Dark) - 赛博朋克风格
2. Web3 (Dark) - Web3/区块链风格
3. Vaporwave (Dark) - 蒸汽波美学

从 https://www.designprompts.dev/ 获取提示词并创建文件。
```

## 元数据指南

### 如何确定适用场景

考虑以下问题：
- 这个风格最适合什么类型的网站/应用？
- 什么样的产品使用这个风格会显得专业？
- 哪些用户群体会被这个风格吸引？

### 如何提炼情感调性

从设计系统的 "Emotional Keywords" 或 "Vibe" 部分提取，常见词汇：
- **专业维度**：专业、严肃、权威、可信赖
- **情感维度**：优雅、温暖、友好、活泼
- **视觉维度**：简洁、大胆、精致、丰富
- **时代维度**：现代、复古、未来、经典

### 如何确定适用行业

参考风格的：
- 设计哲学（Design Philosophy）
- 灵感来源（inspired by...）
- 典型应用（typical use cases）

常见行业分类：
- 科技：SaaS、开发工具、AI产品
- 商业：电商、企业服务、金融
- 创意：设计、艺术、媒体
- 生活：教育、医疗、旅游

## 质量检查清单

添加新风格前，确保：

- [ ] 风格ID使用小写和连字符（如：`swiss-minimalist`）
- [ ] 模式明确标注（Light或Dark）
- [ ] 字体类型准确（Sans-serif、Serif或Mono）
- [ ] 适用场景列出至少4个
- [ ] 情感调性包含5-8个关键词
- [ ] 适用行业明确且具体
- [ ] 设计系统提示词完整且格式正确
- [ ] 在 SKILL.md 中更新了风格索引
- [ ] 在推荐逻辑中添加了对应的推荐规则

## 贡献

如果你添加了新的设计风格，欢迎：

1. 测试风格的实际效果
2. 记录使用案例
3. 分享给其他用户

## 常见问题

### Q: 可以添加自定义的设计系统吗？

A: 可以！只要遵循相同的文件格式，你可以添加任何设计系统。不一定要来自 designprompts.dev。

### Q: 一个风格可以有多个变体吗？

A: 可以。例如 `luxury-light.md` 和 `luxury-dark.md` 可以是同一风格的不同模式。

### Q: 如何处理风格冲突？

A: 确保每个风格ID唯一，使用描述性的名称避免混淆。

### Q: 可以修改现有风格吗？

A: 可以，但建议保持与原始设计系统的一致性。如果需要大幅修改，建议创建新的变体风格。

## 示例工作流

### 添加 Cyberpunk 风格的完整流程

#### 1. 获取提示词

```bash
# 访问浏览器
open https://www.designprompts.dev/

# 找到 Cyberpunk Dark 16
# 点击 "Get Prompt"
# 复制全部内容
```

#### 2. 创建文件

```bash
# 在 Claude Code 中
请创建文件：~/.claude/skills/designprompt/styles/cyberpunk.md

内容如下：[粘贴模板并填充]
```

#### 3. 更新索引

编辑 SKILL.md，添加：

```markdown
### 16. Cyberpunk (Dark, Sans-serif)
**简介**：赛博朋克风格，霓虹灯与未来科技
**适用**：游戏平台、科技博客、创意展示、未来主题应用
**调性**：前卫、科技、未来、酷炫、叛逆、数字化
**行业**：游戏、科技、娱乐、数字艺术
```

#### 4. 更新推荐

```markdown
### 按行业推荐
- **游戏/娱乐** → Kinetic, Cyberpunk, Vaporwave  # 添加 Cyberpunk
```

#### 5. 测试

```
使用 /designprompt

我要做一个科幻游戏的官网
```

看看 AI 是否会推荐 Cyberpunk 风格。

## 资源

- Design Prompts 官网：https://www.designprompts.dev/
- 技能文档：SKILL.md
- 使用指南：README.md

---

有问题或建议？欢迎反馈！
