# 数据库录入器

将 Grok 生成的 JSON 数据自动录入到 import_classifications.html 网页。

## 使用场景

当你通过 Grok 生成结构化 JSON 数据后，需要将其录入到数据库时使用。

## 工作流程

1. **读取 JSON 文件**
2. **打开 import_classifications.html 网页**
3. **自动录入**
   - 将 JSON 内容粘贴到输入框
   - 点击提交按钮
   - 等待处理完成
4. **断点续跑**：支持从指定记录位置继续

## 快速开始

### 前置要求

1. 浏览器已启动并运行在调试端口（默认 9222）
2. import_classifications.html 网页可访问

### 运行方式

```bash
# 基础使用（默认处理全部数据）
node scripts/importer.js --input-file /Users/douba/twitter-output/grok-data.json

# 断点续跑（从第 20 条开始）
node scripts/importer.js --input-file /Users/douba/twitter-output/grok-data.json --start-index 20

# 自定义批大小和延迟
node scripts/importer.js --batch-size 5 --delay 2000

# 自定义输出目录
node scripts/importer.js --output-dir /path/to/output
```

## 可用参数

| 参数 | 说明 | 默认值 | 示例 |
|------|--------|---------|--------|
| `--input-file` | JSON 文件路径 | - | /Users/douba/twitter-output/grok-data.json |
| `--start-index` | 起始索引 | 0 | 20 |
| `--batch-size` | 每批处理数量 | 10 | 5 |
| `--delay` | 录入延迟（毫秒） | 1000 | 2000 |
| `--output-dir` | 输出目录 | /Users/douba/twitter-output | /path/to/output |
| `--browser` | 浏览器端口 | 9222 | 3000 |

## 输出示例

```
🚀 数据库录入器启动...

📄 读取文件: /Users/douba/twitter-output/grok-data.json
📊 总计记录: 10 条

📤 正在访问网页...
✅ 已粘贴 JSON 数据
✅ 已点击提交
✅ 录入成功
📊 进度: 10/10

✅ 录入完成
📊 进度文件: /Users/douba/twitter-output/importer-progress.json
📁 文件路径: /Users/douba/twitter-output/grok-data.json
```

## 技术实现

### 批量处理策略

1. **分批录入**：避免一次性处理过多数据导致超时
2. **智能延迟**：每次录入后等待一段时间，避免请求过快
3. **断点续跑**：记录处理进度，失败后可继续

### 进度跟踪

```json
{
  "total": 50,
  "processed": 20,
  "current_index": 20,
  "last_processed_url": "https://x.com/user/status/123456789",
  "status": "completed",
  "failed_urls": []
}
```

### 自动化流程

```javascript
async function importToDatabase(browser, jsonData, config) {
  const page = await browser.newPage();
  await page.goto('https://ttmouse.com/import_classifications.html', { waitUntil: 'domcontentloaded' });

  // 定位输入框
  const input = page.locator('textarea, input[type="text"]');
  
  // 粘贴 JSON
  const jsonString = JSON.stringify(jsonData, null, 2);
  await input.fill(jsonString);

  // 点击提交
  const submitButton = page.locator('button[type="submit"]');
  await submitButton.click();

  // 等待处理完成
  await page.waitForTimeout(config.delay);

  await browser.close();
}
```

## 错误处理

### 录入失败

- 检查成功提示信息
- 如果失败，等待延迟后重试
- 记录失败的 URL

### 网页不可访问

- 检查网络连接
- 检查浏览器是否正常运行
- 提供手动操作指导

## 断点续跑

如果录入过程中断开，可以从指定位置继续：

```bash
# 从第 10 条记录继续
node scripts/importer.js --start-index 10
```

## 注意事项

1. **浏览器依赖**：需要浏览器在指定端口运行
2. **网络稳定**：录入过程中保持网络稳定
3. **数据格式**：确保输入的 JSON 格式正确
4. **人工干预**：如果失败率高，考虑减少批大小或增加延迟

## 配置文件（可选）

创建配置文件 `config.json` 保存常用设置：

```json
{
  "batchSize": 10,
  "delay": 1000,
  "outputDir": "/Users/douba/twitter-output",
  "browserPort": 9222
}
```

使用方式：

```bash
node scripts/importer.js --config config.json
```

## 下一步

录入完成后，可以在数据库中查看和管理数据。
