# Twitter to Feishu

将 Twitter/X 文章保存到飞书文档。

## 触发条件

- 用户说"保存到飞书"、"存到飞书"、"save to feishu"
- 用户提供 Twitter URL 并希望保存到飞书

## 前置条件

1. Chrome 浏览器以调试模式运行（带 `--remote-debugging-port`）
2. 已在 Chrome 中登录 Twitter 和飞书
3. 至少打开一个飞书页面

## 使用方式

```bash
cd /Users/douba/.claude/skills/twitter-to-feishu

# 基本用法
node scripts/save.js "<twitter-url>" --cdp-port <port>

# 示例
node scripts/save.js "https://x.com/ponyodong/status/2017610538445115422" --cdp-port 9224
```

## 工作流程

1. 连接已运行的 Chrome 浏览器（通过 CDP）
2. 定位 Twitter 页面，提取文章标题和内容
3. 复制内容到剪贴板
4. 在飞书中新建空白文档
5. 设置标题（一级标题格式）
6. 粘贴正文（保留富文本格式）
7. 返回新文档 URL

## 输出

脚本会输出执行日志和 JSON 结果：

```json
{
  "success": true,
  "title": "文章标题",
  "url": "https://feishu.cn/wiki/xxx",
  "contentLength": 7332
}
```

## 启动 Chrome 调试模式

如果 Chrome 未以调试模式运行：

```bash
# 关闭所有 Chrome 窗口后执行
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

# 或使用独立数据目录（不影响现有 Chrome）
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9224 \
  --user-data-dir="/tmp/chrome-feishu"
```

## 依赖

```bash
cd /Users/douba/.claude/skills/twitter-to-feishu
npm install playwright
```
