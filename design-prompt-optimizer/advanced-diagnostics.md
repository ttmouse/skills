# 高级诊断能力补充

## 🔍 标准化视觉诊断清单

### 优先级P0 (必须修复 - 影响可用性)
- [ ] 色彩对比度是否≥4.5:1 (WCAG AA标准)
- [ ] 正文字体大小是否≥12px
- [ ] 重要操作按钮是否清晰可见
- [ ] 错误状态下用户是否能理解发生了什么

### 优先级P1 (强烈建议 - 影响专业度)
- [ ] 是否建立了8点网格间距系统 (4/8/16/24/32px)
- [ ] 字体层级是否清晰 (至少4级:标题/副标题/正文/辅助)
- [ ] 是否存在"卡片套卡片"的嵌套
- [ ] 是否存在仅用于装饰的边框/阴影/背景
- [ ] 是否有明显的"层层套盒"结构

### 优先级P2 (建议优化 - 影响美观)
- [ ] 圆角使用是否统一
- [ ] 阴影使用是否克制
- [ ] 图标风格是否一致
- [ ] 悬停状态是否有反馈

---

## 📦 标准组件设计规范

### 按钮 (Buttons)

**必须遵循:**
- 最小点击区域: 44x44px (移动端) / 32x32px (桌面端)
- 文本按钮: padding 8px 16px
- 边框与背景对比度≥3:1
- 禁用状态: opacity 0.6 或灰色背景

**按钮层级:**
1. **Primary (主按钮)**: 使用频率最高的操作
   - 背景: 主色调
   - 文字: 白色
   - 用法: 保存、确认、提交

2. **Secondary (次要按钮)**: 次重要的操作
   - 背景: 白色
   - 边框: 1px 主色
   - 用法: 取消、返回、编辑态

3. **Text or Link (文本按钮)**: 最少使用的操作
   - 背景: 透明
   - 下划线或不同颜色
   - 用法: 删除、高级设置、次要操作

**禁止:**
- 按钮内嵌套多个 span/div
- 仅为装饰的渐变按钮
- 4个以上的按钮变体(主/次/三级/危险/链接足够)

---

### 卡片 (Cards)

**使用场景:**
- ✅ 功能区块分组 (如:用户信息卡片)
- ✅ 需要视觉分离的内容 (如:商品列表)
- ✅ 可交互的内容块 (如:点击跳转)

**禁止使用:**
- ❌ 整个页面套一个大卡片 (Chrome扩展弹窗本身就是卡片)
- ❌ 卡片内再套小卡片 (除非功能完全不同)
- ❌ 用卡片包装单个按钮/输入框
- ❌ "为了卡片而卡片" - 装饰性卡片

**何时用卡片:**
```
❌ 错误: 单个设置项 + 卡片包装
  <div class="card">
    <label><input type="checkbox" />选项</label>
  </div>

✅ 正确: 直接内容
  <label><input type="checkbox" />选项</label>
```

---

### 表单 (Forms)

**最佳实践:**
- 标签在上或左对齐 (不在输入框内)
- 错误提示在下方直接显示
- 必填项用 * 或明确标注
- 提交按钮与表单对齐
- 避免水平滚动

**输入框规范:**
```css
input {
  padding: 12px 16px;        /* 舒适内边距 */
  border: 1px solid #d0d7de;  /* 可见边框 */
  border-radius: 8px;        /* 适度圆角 */
  font-size: 15px;           /* 可读字体 */
  line-height: 1.5;
}

input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.1);  /* 聚焦环 */
  outline: none;
}
```

---

### 表格 (Tables)

**何时用表格:**
- 需要对比多行数据
- 有明确的列关系
- 横向扫描效率高于纵向

**何时不用表格:**
- 只有1-2列数据 (用列表或卡片更好)
- 纯展示不需要对比
- 移动端显示不完整

**表格规范:**
- 字体大小: 14px (不能小于 13px)
- 行高: 48px (舒适点击区域)
- 表头: 粗体、背景浅灰、与内容区分隔
- 隔行变色: 可选,提高扫描效率
- 悬停效果: 必须有,反馈重要信息

---

### 标签页 (Tabs)

**正确结构:**
```html
<div class="tabs">
  <button class="tab active">标签1</button>
  <button class="tab">标签2</button>
</div>

<div class="tab-content">
  <div class="panel active">内容1</div>
  <div class="panel">内容2</div>
</div>
```

**规范:**
- 选中状态: 下划线 + 颜色变化
- 未选中: 灰色文字
- 间距: 标签之间 ≥ 16px
- 内容区: padding 16px 或 24px

---

## ❌ vs ✅ 常见错误模式库

### 问题1: "为了卡片而卡片"

**❌ 错误:**
```html
<body style="padding:16px">
  <div class="card">
    <h3>标题</h3>
    <button>按钮</button>
  </div>
</body>
```
**问题**: body有padding, card有padding, 双重空间

**✅ 正确:**
```html
<!-- 方案A: 去掉body padding,保留卡片包装 -->
<body>
  <div class="card" style="margin:16px; padding:24px">
    <h3>标题</h3>
    <button>按钮</button>
  </div>
</body>

<!-- 方案B: 去掉卡片,直接用body (Chrome扩展弹窗本身就是卡片) -->
<body style="padding:24px">
  <h3>标题</h3>
  <button>按钮</button>
</body>

<!-- 推荐: 方案B - 更简洁 -->
```

---

### 问题2: "为了边框而边框"

**❌ 错误:**
```css
.actions {
  background: #f8f9fb;
  border: 1px solid #eef1f6;  /* 已经有间距分隔,边框=多余 */
  border-radius: 12px;
  padding: 12px;
}
```

**✅ 正确:**
```css
.actions {
  margin-top: 24px;  /* 用间距分隔 */
  gap: 8px;
  /* 删除: background, border, border-radius, padding */
}
```

---

### 问题3: "装饰性标题"

**❌ 错误:**
```html
<div class="actions">
  <div class="actions-title">自动化操作</div>  <!-- 重复按钮功能 -->
  <button>抓取7天</button>
  <button>抓取全量</button>
  <button>复制数据</button>
</div>
```

```css
.actions-title {
  text-transform: uppercase;  /* 装饰性大写 */
  letter-spacing: 0.5px;      /* 装饰性字间距 */
}
```

**✅ 正确:**
```css
.actions-title {
  display: none;  /* 删除装饰性标题,让按钮自己说话 */
}
```

---

### 问题4: "嵌套阴影"

**❌ 错误:**
```css
.card {
  box-shadow: 0 8px 20px rgba(0,0,0,0.08);
}

.nested-card {
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);  /* 嵌套阴影=过度设计 */
}
```

**✅ 正确:**
```css
/* 方案A: 扁平化 - 内层无阴影 */
.card { box-shadow: 0 8px 20px rgba(0,0,0,0.08); }
.nested-card { box-shadow: none; }

/* 方案B: 功能区分 */
.card { box-shadow: 0 8px 20px rgba(0,0,0,0.08); }
.functional-block {
  border: 1px solid #e0e0e0;  /* 用边框区分功能 */
}
```

---

### 问题5: "按钮层级混乱"

**❌ 错误:**
```html
<button class="btn btn-primary">主要操作</button>
<button class="btn btn-secondary">次要1</button>
<button class="btn btn-secondary">次要2</button>
<button class="btn btn-secondary">次要3</button>
```
**问题**: 3个次要按钮,主次关系混乱

**✅ 正确:**
```html
<!-- 方案A: 减少次要操作 -->
<button class="btn btn-primary">主要操作</button>
<button class="btn btn-secondary">次要1</button>
<button class="btn btn-link">次要2(链接样式)</button>

<!-- 方案B: 重新组织 -->
<div class="primary-actions">
  <button class="btn btn-primary">主要操作</button>
</div>
<div class="secondary-actions">
  <div style="display:flex; gap:8px;">
    <button class="btn btn-quiet">次要1</button>
    <button class="btn btn-quiet">次要2</button>
  </div>
</div>
```

---

### 问题6: "不必要的容器"

**❌ 错误:**
```html
<div class="captured-data-panel">
  <div class="captured-data-header">
    <h4>抓取的数据</h4>
  </div>
  <div class="captured-data-content">
    <p>潜在客户: <span>150</span></p>
  </div>
</div>
```
**问题**: `.panel`, `.header`, `.content` 都是包装容器

**✅ 正确:**
```html
<section class="captured-data">
  <h4>抓取的数据</h4>
  <p>潜在客户: <span>150</span></p>
</section>
```

---

### 问题7: "间距不一致"

**❌ 错误:**
```css
body { padding: 16px; }
.card { margin: 12px; }
.button { margin: 4px; }
.section { padding: 20px; }
```
**问题**: 16px, 12px, 4px, 20px - 无规律

**✅ 正确:**
```css
:root {
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
}

body { padding: var(--space-lg); }
.card { margin: var(--space-md); }
.button { margin: var(--space-xs); }
.section { padding: var(--space-md); }
```

---

### 问题8: "字体层级混乱"

**❌ 错误:**
```css
h3 { font-size: 17px; }
tab { font-size: 13px; }
no-data { font-size: 11px; }
```
**问题**: 17px, 13px, 11px - 梯度不够明显

**✅ 正确:**
```css
:root {
  --font-size-xl: 20px;
  --font-size-lg: 17px;
  --font-size-md: 15px;
  --font-size-sm: 13px;
  --font-size-xs: 11px;
}

h1 { font-size: var(--font-size-xl); }  /* 页面标题 */
h2 { font-size: var(--font-size-lg); }  /* 区块标题 */
h3 { font-size: var(--font-size-md); }  /* 卡片标题 */
p { font-size: var(--font-size-sm); }   /* 正文 */
.small { font-size: var(--font-size-xs); }  /* 辅助 */
```

---

## 🔧 诊断流程标准

### 步骤1: DOM 结构分析

```bash
# 检查嵌套深度
document.querySelectorAll('*').forEach(el => {
  const depth = el.parentElement ?
    el.parentElement.depth + 1 : 0;
  el.depth = depth;
});

const maxDepth = Math.max(...document.querySelectorAll('*').map(el => el.depth));
console.log('最大嵌套深度:', maxDepth);  // 应≤5
```

### 步骤2: CSS 复杂度评估

```bash
grep -o '{' popup.css | wc -l  # 统计规则数量,应<200

# 检查!important使用
grep -o '!important' popup.css | wc -l  # 应≤3

# 检查间距值多样性
grep -oE '\b[0-9]+px\b' popup.css | sort | uniq -c | wc -l  # 应≤10
```

### 步骤3: 视觉噪音识别

**检查项:**
- [ ] 是否存在"页面背景+卡片背景+内部区块背景"
- [ ] 是否存在"已有间距分隔,还有分割线"
- [ ] 是否存在"已有边距,还有边框"
- [ ] 是否存在"嵌套阴影"
- [ ] 是否存在"装饰性大写/间距/变换"

### 步骤4: 输出诊断报告

**格式模板:**
```markdown
## 诊断报告: [项目名称]

**总体评分:** 6.5/10

**优点:**
✅ 使用了8点网格的部分间距
✅ 主色调贯穿一致

**主要问题:**
🔴 层层嵌套: 最大深度6层 (目标≤5)
🔴 视觉噪音: .actions容器有背景+边框+圆角,但功能已有间距分隔
🟡 字体层级: 只有2级,缺少副标题字号
🟡 阴影使用: 主按钮阴影过强 (8px模糊)

**优先级修复:**
1. P0: 减少 .actions 容器层级,删除装饰样式 (30分钟)
2. P1: 增加副标题字体大小到15px (5分钟)
3. P1: 减少按钮阴影到2px (2分钟)
```

### 步骤5: 验证优化效果

**可用性测试:**
1. 5秒测试: 用户能在5秒内理解界面主要功能吗?
2. 视觉扫描: 用户视线自然流向重要信息吗?
3. 点击测试: 用户能轻松找到并点击主要按钮吗?

**代码质量:**
- DOM深度: 从6层降到4层 ✓
- CSS规则数: 从250行降到180行 ✓
- 文件大小: 减少15% ✓
- 加载时间: 提升200ms ✓
