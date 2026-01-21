const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    console.log('🔍 连接浏览器...');
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const pages = browser.contexts()[0].pages();
    const grokPage = pages.find(page => page.url().includes('/i/grok?conversation='));

    if (!grokPage) {
      console.log('❌ 未找到 Grok 对话');
      await browser.close();
      process.exit(1);
    }

    console.log('✅ 找到 Grok 对话\n');

    console.log('🔍 开始监控 Grok 输出...\n');

    // 监控 JSON 生成
    let lastJsonContent = '';
    let stableCount = 0;
    const maxStableCount = 10; // 连续 10 次检查内容不变，认为生成完成
    const checkInterval = 1000; // 每 1 秒检查一次

    console.log('⏳ 等待 JSON 生成中...\n');

    while (stableCount < maxStableCount) {
      // 查找 AI 响应中的 JSON
      const result = await grokPage.evaluate(() => {
        // 查找所有可能的 JSON 位置
        const allText = document.body.innerText;

        // 查找 JSON 数组
        const jsonMatches = allText.match(/\[\s*\{[\s\S]*?\}\s*\]/g);

        if (!jsonMatches || jsonMatches.length === 0) {
          return { found: false, content: '' };
        }

        // 找到最长的 JSON 数组
        const longestJson = jsonMatches.reduce((max, current) => {
          return current.length > max.length ? current : max;
        }, '');

        return {
          found: true,
          content: longestJson,
          length: longestJson.length
        };
      });

      if (result.found && result.content.length > 100) {
        // 检查内容是否变化
        if (result.content === lastJsonContent) {
          stableCount++;

          if (stableCount <= 3) {
            console.log(`📝 生成中... (${result.content.length} 字符) [稳定 ${stableCount}/${maxStableCount}]`);
          }
        } else {
          stableCount = 0;
          lastJsonContent = result.content;

          // 每次有新内容时显示进度
          console.log(`📝 生成中... (${result.content.length} 字符) [新内容]`);
        }
      } else {
        stableCount = 0;
        console.log('⏳ 等待生成...');
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    console.log('\n✅ JSON 生成完成！');
    console.log(`   总长度: ${lastJsonContent.length} 字符\n`);

    // 验证 JSON 格式
    console.log('🔍 验证 JSON 格式...');
    let parsedJson;

    try {
      parsedJson = JSON.parse(lastJsonContent);
      console.log(`✅ JSON 格式正确，包含 ${parsedJson.length} 个对象\n`);
    } catch (error) {
      console.log(`⚠️ JSON 解析失败: ${error.message}`);
      console.log('   将尝试修复常见错误...\n');

      // 尝试修复 JSON（去除尾随逗号等）
      try {
        const fixedJson = lastJsonContent
          .replace(/,\s*]/g, ']')  // 去除数组末尾的逗号
          .replace(/,\s*}/g, '}')  // 去除对象末尾的逗号
          .replace(/\/\*[\s\S]*?\*\//g, ''); // 去除注释

        parsedJson = JSON.parse(fixedJson);
        console.log(`✅ JSON 修复成功，包含 ${parsedJson.length} 个对象\n`);
        lastJsonContent = fixedJson;
      } catch (error2) {
        console.log(`❌ JSON 修复失败: ${error2.message}`);
        console.log('   仍将保存原始内容');
      }
    }

    // 保存 JSON
    const timestamp = new Date().toISOString().split('T')[0];
    const outputDir = '/Users/douba/twitter-output';
    const fileName = `grok-json-output-${timestamp}.json`;
    const filePath = path.join(outputDir, fileName);

    // 美化 JSON（格式化）
    const formattedJson = JSON.stringify(parsedJson || lastJsonContent, null, 2);

    fs.writeFileSync(filePath, formattedJson, 'utf-8');

    console.log('💾 JSON 已保存:');
    console.log(`   文件路径: ${filePath}`);
    console.log(`   文件大小: ${formattedJson.length} 字节\n`);

    // 生成统计信息
    if (Array.isArray(parsedJson)) {
      console.log('📊 JSON 统计信息:\n');

      // 统计字段
      const fieldStats = {};
      parsedJson.forEach(item => {
        Object.keys(item).forEach(key => {
          fieldStats[key] = (fieldStats[key] || 0) + 1;
        });
      });

      console.log('   字段分布:');
      Object.entries(fieldStats)
        .sort((a, b) => b[1] - a[1])
        .forEach(([field, count]) => {
          const percentage = ((count / parsedJson.length) * 100).toFixed(1);
          console.log(`     ${field}: ${count} (${percentage}%)`);
        });

      console.log(`\n   对象总数: ${parsedJson.length}`);
      console.log(`   平均每对象字段数: ${(parsedJson.reduce((sum, item) => sum + Object.keys(item).length, 0) / parsedJson.length).toFixed(1)}\n`);
    }

    // 生成预览
    console.log('📄 内容预览（前 500 字符）:');
    console.log(lastJsonContent.substring(0, 500) + '...\n');

    // 生成 HTML 报告
    const htmlFileName = `grok-json-report-${timestamp}.html`;
    const htmlFilePath = path.join(outputDir, htmlFileName);

    const htmlReport = generateHtmlReport(parsedJson || lastJsonContent, fileName, timestamp);

    fs.writeFileSync(htmlFilePath, htmlReport, 'utf-8');

    console.log(`📄 HTML 报告已生成: ${htmlFilePath}`);
    console.log(`\n✅ 监控完成！\n`);

    // 询问是否打开报告
    console.log('💡 提示: 你可以在浏览器中打开 HTML 报告查看结果\n');

    await browser.close();
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

function generateHtmlReport(jsonData, sourceFile, timestamp) {
  const data = Array.isArray(jsonData) ? jsonData : [jsonData];
  const prettyJson = JSON.stringify(jsonData, null, 2);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Grok JSON 输出报告 - ${timestamp}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      font-size: 28px;
      margin-bottom: 10px;
    }
    .header .meta {
      font-size: 14px;
      opacity: 0.9;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      padding: 30px;
      background: #f8f9fa;
    }
    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      text-align: center;
    }
    .stat-value {
      font-size: 32px;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 5px;
    }
    .stat-label {
      font-size: 14px;
      color: #6c757d;
    }
    .content {
      padding: 30px;
    }
    .section-title {
      font-size: 20px;
      margin-bottom: 20px;
      color: #333;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
    }
    .json-preview {
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 20px;
      border-radius: 8px;
      overflow-x: auto;
      max-height: 500px;
      overflow-y: auto;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 13px;
      line-height: 1.6;
    }
    .item-list {
      display: grid;
      gap: 15px;
      margin-top: 20px;
    }
    .item-card {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 15px;
      transition: all 0.3s ease;
    }
    .item-card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transform: translateY(-2px);
    }
    .item-card .index {
      font-weight: bold;
      color: #667eea;
      margin-bottom: 10px;
    }
    .item-card .field {
      margin: 5px 0;
      font-size: 14px;
    }
    .item-card .field-name {
      color: #495057;
      font-weight: 500;
    }
    .item-card .field-value {
      color: #6c757d;
      word-break: break-word;
    }
    .actions {
      padding: 30px;
      background: #f8f9fa;
      text-align: center;
    }
    .btn {
      display: inline-block;
      padding: 12px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      transition: all 0.3s ease;
      margin: 5px;
    }
    .btn:hover {
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      transform: translateY(-2px);
    }
    @media (max-width: 768px) {
      .stats {
        grid-template-columns: 1fr;
      }
      .content {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🤖 Grok JSON 输出报告</h1>
      <div class="meta">
        <div>生成时间: ${timestamp}</div>
        <div>数据源: ${sourceFile}</div>
        <div>对象数量: ${data.length}</div>
      </div>
    </div>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-value">${data.length}</div>
        <div class="stat-label">对象总数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${prettyJson.length}</div>
        <div class="stat-label">JSON 大小（字符）</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${Object.keys(data[0] || {}).length}</div>
        <div class="stat-label">每对象字段数</div>
      </div>
    </div>

    <div class="content">
      <h2 class="section-title">📋 JSON 数据预览</h2>
      <div class="json-preview">
        <pre>${escapeHtml(prettyJson)}</pre>
      </div>

      <h2 class="section-title">📝 详细列表</h2>
      <div class="item-list">
        ${data.map((item, index) => `
          <div class="item-card">
            <div class="index">#${index + 1}</div>
            ${Object.entries(item).map(([key, value]) => `
              <div class="field">
                <span class="field-name">${escapeHtml(key)}:</span>
                <span class="field-value">${escapeHtml(String(value))}</span>
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>
    </div>

    <div class="actions">
      <a href="data:text/plain;charset=utf-8,${encodeURIComponent(prettyJson)}" download="grok-output.json" class="btn">📥 下载 JSON</a>
      <a href="${sourceFile}" target="_blank" class="btn">📂 查看源文件</a>
    </div>
  </div>

  <script>
    // 添加交互功能
    document.querySelectorAll('.item-card').forEach(card => {
      card.addEventListener('click', function() {
        this.classList.toggle('expanded');
      });
    });
  </script>
</body>
</html>`;
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

main();
