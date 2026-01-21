# Grok JSON 生成器

将 Twitter 链接列表转换为 Grok 生成的结构化 JSON 数据。

## 使用场景

当你完成 Twitter 筛选后，有一批选中的链接需要转换为结构化数据录入数据库时使用。

## 工作流程

1. 打开浏览器并连接到 Grok 聊天界面
2. 将链接列表以文本形式粘贴到 Grok 聊天
3. 使用提示词让 Grok 生成结构化 JSON
4. 解析页面获取生成的 JSON
5. 保存到文件

## 快速开始

### 前置要求

1. 浏览器已启动并运行在调试端口
2. Grok 已登录

### 运行方式

```bash
# 基础使用（命令行输入链接）
node scripts/grok-generator.js --links "https://x.com/link1 https://x.com/link2"

# 从文件读取链接
node scripts/grok-generator.js --input-file /Users/douba/twitter-output/twitter-links-2026-01-13.txt

# 自定义 Grok URL
node scripts/grok-generator.js --grok-url "https://custom-grok-url" --links "https://x.com/link1"

# 调整批次大小
node scripts/grok-generator.js --batch-size 5 --links "https://x.com/link1 https://x.com/link2"
```

## 可用参数

| 参数 | 说明 | 默认值 | 示例 |
|------|--------|---------|--------|
| `--links` | 链接列表 | 无 | "https://x.com/link1 https://x.com/link2" |
| `--input-file` | 从文件读取链接 | - | /Users/douba/twitter-output/links.txt |
| `--grok-url` | Grok 聊天 URL | https://x.com/i/grok | https://custom-grok-url |
| `--prompt` | 自定义提示词 | 固定提示词 | "请将以下 Twitter 链接转换为..." |
| `--batch-size` | 每批处理数量 | 10 | 5 |
| `--timeout` | Grok 生成超时（秒） | 30 | 60 |
| `--output-dir` | 输出目录 | /Users/douba/twitter-output | /path/to/output |
| `--browser` | 浏览器调试端口 | 9222 | 3000 |

## 输出格式

生成 JSON 文件命名：`grok-data-YYYY-MM-DD.json`

JSON 结构：
```json
{
  "generated_at": "2026-01-13T10:00:00Z",
  "total_links": 10,
  "generated_count": 10,
  "data": [
    {
      "url": "https://x.com/user/status/1234567890",
      "title": "推文标题",
      "content": "推文内容",
      "author": "用户名",
      "tags": ["标签1", "标签2"],
      "metadata": {
        "likes": 100,
        "retweets": 50,
        "images": ["图片URL1", "图片URL2"]
      }
    }
  ]
}
```

## 技术细节

### 浏览器自动化

使用 Playwright 连接到已打开的浏览器：
1. 连接调试端口（默认 9222）
2. 查找 Grok 页面
3. 定位输入框并粘贴链接
4. 等待生成完成
5. 解析输出结果

### 提示词设计

提示词包含：
- 转换目标：结构化 JSON 格式
- 必需字段：URL、标题、内容、作者、标签
- 元数据要求：互动数据、图片列表

### 批处理

- 默认每次处理 10 条链接
- 处理间隔 1 秒
- 支持从指定位置继续

### 错误处理

- Grok 页面未响应：重试
- JSON 解析失败：记录错误但继续处理
- 浏览器连接失败：检查端口和调试器

## 故障排查

### Grok 无法连接

```bash
# 检查 Chrome 是否在指定端口运行
lsof -i :9222

# 如果没有输出，启动带调试端口的 Chrome
open -na "Google Chrome" --args --remote-debugging-port=9222
```

### JSON 格式错误

- 检查 Grok 页面是否正常输出 JSON
- 检查页面中是否有成功提示信息
- 查看浏览器控制台错误日志

## 注意事项

- 需要浏览器保持打开状态
- Grok 聊天 URL 需要你提供固定对话
- 确保网络连接稳定
- 批处理大小可根据网络情况调整
