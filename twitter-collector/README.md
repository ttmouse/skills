# Twitter 推文采集器

自动采集 Twitter 搜索结果，输出推文链接列表，可直接粘贴到筛选网页进行人工筛选。

## 快速开始

### 1. 安装依赖

```bash
cd /Users/douba/.claude/skills/twitter-collector
npm install
```

### 2. 运行采集

**使用预设配置（Nano Banana Pro）**
```bash
npm start
```

**自定义搜索参数**
```bash
npm run collect -- --query "你的关键词" --since 24h
npm run collect -- --query "AI OR ChatGPT" --min-likes 50
```

### 3. 使用输出

1. 复制输出的链接列表
2. 粘贴到筛选网页：https://twitterhot.vercel.app/tweet-filter.html
3. 继续你现有的筛选流程

## 功能特性

- ✅ **开箱即用**：内置 Nano Banana Pro 搜索参数
- ✅ **完全自动化**：无需手动操作浏览器
- ✅ **智能去重**：自动去除重复推文
- ✅ **灵活配置**：支持自定义搜索参数
- ✅ **可观察性**：实时显示采集进度

## 可用参数

| 参数 | 说明 | 默认值 | 示例 |
|------|--------|---------|--------|
| `--preset` | 使用预设配置 | 无 | nano-banana-pro |
| `--query` | 搜索关键词 | 无 | "AI OR ChatGPT" |
| `--since` | 时间范围 | 无 | 24h, 7d, 30d |
| `--min-likes` | 最小点赞数 | 无 | 50 |
| `--max-tweets` | 最大采集数量 | 100 | 50 |
| `--exclude` | 排除关键词 | 无 | "spam bot" |
| `--filter-content` | 内容类型 | 无 | media, videos, images |
| `--exclude-replies` | 排除回复 | false | |
| `--exclude-retweets` | 排除转发 | false | |
| `--output` | 输出格式 | console | console, file, preview, filter-json |
| `--score-keywords` | 评分关键词 | nano,banana,prompt | "prompt,nano,banana" |
| `--min-score` | 最低评分 | 0 | 0.3 |
| `--filter-url` | 筛选页地址 | https://twitterhot.vercel.app/tweet-filter.html | https://twitterhot.vercel.app/tweet-filter.html |
| `--output-dir` | 输出目录 | /Users/douba/twitter-output | /path/to/output |
| `--headless` | 无头模式 | false | |

## 预设配置

### Nano Banana Pro

```
#NanoBananaPro OR #NanoBanana OR "Nano Banana" OR "prompt"
AND -female -woman -hair -GEMINIFOURTH
since_time:{{NOW-24h}}
min_faves:50
filter:media
-filter:replies
```

## 使用示例

### 基础使用

```bash
# 使用预设配置（默认）
node scripts/collector.js --preset nano-banana-pro

# 自定义搜索
node scripts/collector.js --query "your keywords"
node scripts/collector.js --query "AI" --since 7d --min-likes 50

# 保存到文件
node scripts/collector.js --preset nano-banana-pro --output file

# 生成可视化预览页面
node scripts/collector.js --preset nano-banana-pro --output preview

# 从筛选页导出完整文本（基于第三方解析）
node scripts/collector.js --preset nano-banana-pro --output filter-json
```

### 高级用法

```bash
# 排除特定内容
node scripts/collector.js --query "AI" --exclude "spam bot advertisement"

# 仅采集图片推文
node scripts/collector.js --query "art" --filter-content images --max-tweets 30

# 无头模式运行
node scripts/collector.js --query "tech news" --headless

# 关键词评分筛选
node scripts/collector.js --preset nano-banana-pro --score-keywords "prompt,nano,banana" --min-score 0.3
```

## 输出示例

```
🚀 Twitter 推文采集器启动...

⚙️ 采集配置:
   搜索参数: (#NanoBananaPro OR #NanoBanana OR "Nano Banana" OR "prompt") AND -female -woman -hair -GEMINIFOURTH
   时间范围: 24h
   最小点赞: 50
   最大采集: 100 条
   无头模式: 否

🌐 启动浏览器...
🔍 访问: https://x.com/search?q=...&src=typed_query&vertical=default

📊 采集进度: ████████████████ 100/100
✅ 采集完成
📊 总计: 100 条
✅ 去重后: 95 条
🔗 链接列表:

https://x.com/username1/status/1234567890
https://x.com/username2/status/1234567891
https://x.com/username3/status/1234567892
...

✅ 采集完成
```

## 技术栈

- **Node.js**: 运行环境
- **Playwright**: 浏览器自动化
- **Chromium**: 浏览器引擎

## 与现有流程集成

```
采集器（新增）
   ↓
输出链接列表
   ↓
筛选网页（现有）
   ↓
人工筛选 → 上传到服务器
```

**优势**：
- 不修改现有插件
- 不修改筛选网页
- 完全自动化采集
- 零学习成本

## 故障排查

### Playwright 未安装

```bash
npx playwright install chromium
```

### 搜索页面加载失败

确保网络连接正常，或尝试增加等待时间：
```bash
node scripts/collector.js --preset nano-banana-pro
```

### 链接数量不对

检查搜索参数是否正确，或尝试减少 `--max-tweets` 参数。

## 下一步

1. 测试基础采集功能
2. 调整搜索参数以优化结果
3. 集成到定时任务（如需要）
4. 扩展预设配置

## 许可证

MIT
