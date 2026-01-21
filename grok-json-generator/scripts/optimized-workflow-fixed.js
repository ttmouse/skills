const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// 解析命令行参数
const args = process.argv.slice(2);
const isTestMode = args.includes('--test') || args.includes('--debug');
const isDebugMode = args.includes('--debug');

async function main() {
  try {
    const mode = isDebugMode ? '调试' : (isTestMode ? '测试' : '生产');
    console.log(`🚀 ${mode}模式 - 开始执行...`);
    console.log(`   模式: ${mode}`);
    console.log(`   测试模式: ${isTestMode}`);
    console.log(`   调试模式: ${isDebugMode}\n`);

    const startTime = Date.now();

    // 连接浏览器
    console.log('🔍 [1/6] 连接浏览器...');
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const context = browser.contexts()[0];
    const currentPages = context.pages();
    console.log('✅ 浏览器连接成功\n');

    // ========== 步骤 1：获取待分类链接 ==========
    console.log('🔍 [2/6] 获取待分类链接...');

    let importPage = currentPages.find(page => page.url().includes('ttmouse.com/import_classifications.html'));

    if (!importPage) {
      importPage = await context.newPage();
      await importPage.goto('https://ttmouse.com/import_classifications.html');
      await importPage.waitForLoadState('networkidle');
    }

    const fetchButton = await importPage.$('#fetchUnclassifiedBtn');
    await fetchButton.click();
    if (isDebugMode) console.log('  ✅ 点击"获取待分类链接"按钮');

    let linksContent = '';
    let retries = 10;

    while (retries > 0) {
      await importPage.waitForTimeout(1000);
      linksContent = await importPage.$eval('#unclassifiedOutput', textarea => textarea.value);

      if (linksContent.trim().length > 0) {
        break;
      }

      if (isDebugMode) console.log(`  ⏳ 等待链接内容... (${10 - retries}/10)`);
      retries--;
    }

    const links = linksContent.split('\n').filter(link => link.trim());

    if (links.length === 0) {
      console.log('\n⚠️ 没有获取到待分类链接！');
      console.log('💡 数据库可能没有待分类的数据\n');
      await browser.close();
      process.exit(0);
    }

    console.log(`✅ 获取成功: ${links.length} 条链接\n`);

    // 🔧 测试节点：保存链接到文件
    if (isTestMode) {
      const timestamp = new Date().toISOString().split('T')[0];
      const outputDir = '/Users/douba/twitter-output';
      const linksFile = path.join(outputDir, `unclassified-links-${timestamp}.txt`);
      fs.writeFileSync(linksFile, links.join('\n'), 'utf-8');
      console.log(`💾 测试模式: 链接已保存: ${linksFile}\n`);
    }

    // ========== 步骤 2：发送新消息到 Grok ==========
    console.log('🔍 [3/6] 发送新消息到 Grok...');

    let grokPage = currentPages.find(page => page.url().includes('/i/grok'));

    if (!grokPage) {
      console.log('❌ 未找到 Grok 对话页面');
      await browser.close();
      process.exit(1);
    }

    // 滚动到底部，找到输入框
    await grokPage.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await grokPage.waitForTimeout(1000);

    // 查找可见的文本框
    const textareas = await grokPage.$$('textarea >> visible=true');

    if (textareas.length === 0) {
      console.log('❌ 未找到文本输入框');
      await browser.close();
      process.exit(1);
    }

    const textarea = textareas[textareas.length - 1]; // 使用最后一个（底部的）文本框

    // 构造新消息
    const newMessage = `现在请为以下帖子生成标签（直接在代码块中输出JSON数组）：\n\n${links.join('\n')}`;

    // 填充消息
    await textarea.fill(newMessage);
    if (isDebugMode) console.log('  ✅ 填充消息内容');

    // 发送消息（Ctrl+Enter 或 Cmd+Enter）
    await grokPage.keyboard.press('Meta+Enter');
    if (isDebugMode) console.log('  ✅ 发送消息');

    console.log('✅ 消息已发送到 Grok\n');

    // ========== 步骤 3：监控 Grok 生成状态 ==========
    console.log('🔍 [4/6] 监控 Grok 生成状态...');
    console.log('⏳ 等待生成...\n');

    const maxWaitTime = 300000; // 最多等待 5 分钟
    const checkInterval = 1000;
    const monitorStartTime = Date.now();

    // 监控生成状态
    while ((Date.now() - monitorStartTime) < maxWaitTime) {
      // 检查暂停按钮是否存在
      const hasPauseButton = await grokPage.evaluate(() => {
        const pauseButtons = Array.from(document.querySelectorAll('button, [role="button"]'));
        return pauseButtons.some(btn => {
          const text = btn.textContent?.toLowerCase() || '';
          const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
          return (
            text.includes('pause') ||
            text.includes('暂停') ||
            text.includes('stop') ||
            text.includes('停止') ||
            ariaLabel.includes('pause') ||
            ariaLabel.includes('暂停')
          );
        });
      });

      if (!hasPauseButton) {
        console.log('  ✅ 生成已完成！\n');
        break;
      }

      if (isDebugMode) {
        console.log('  ⏳ 生成中...');
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    // 检查是否超时
    if ((Date.now() - monitorStartTime) >= maxWaitTime) {
      console.log('\n⚠️ 等待超时（5 分钟）');
      console.log('💡 建议：检查 Grok 对话是否正在生成\n');
      await browser.close();
      process.exit(1);
    }

    // 等待一小段时间，确保 JSON 完全渲染
    await grokPage.waitForTimeout(2000);

    // ========== 步骤 4：抓取最新的 JSON ==========
    console.log('🔍 [5/6] 抓取最新的 JSON...');

    // 滚动到底部
    await grokPage.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await grokPage.waitForTimeout(1000);

    // 抓取所有 JSON
    const result = await grokPage.evaluate(() => {
      const allText = document.body.innerText;

      // 查找所有 JSON 数组
      const jsonMatches = allText.match(/\[\s*\{[\s\S]*?\}\s*\]/g);

      if (!jsonMatches || jsonMatches.length === 0) {
        return { found: false };
      }

      // 找到最长的 JSON（应该是最新的）
      const longestJson = jsonMatches.reduce((max, current) => {
        return current.length > max.length ? current : max;
      }, '');

      return {
        found: true,
        content: longestJson,
        length: longestJson.length
      };
    });

    if (!result.found) {
      console.log('❌ 未找到 JSON 内容！');
      console.log('💡 建议：检查 Grok 对话是否生成了 JSON\n');
      await browser.close();
      process.exit(1);
    }

    console.log(`✅ 找到 JSON，长度: ${result.content.length} 字符\n`);

    // ========== 步骤 5：验证并提取 JSON ==========
    console.log('🔍 [6/6] 验证并提取 JSON...');

    let parsedJson;
    let jsonContent = result.content;

    try {
      const extractedJson = jsonContent.replace(/```json\s*/, '').replace(/```\s*$/, '');
      parsedJson = JSON.parse(extractedJson);
      console.log(`✅ JSON 格式正确，包含 ${parsedJson.length} 个对象\n`);
      jsonContent = extractedJson;
    } catch (error) {
      if (isDebugMode) console.log(`  ⚠️ JSON 解析失败: ${error.message}`);

      // 尝试修复 JSON
      try {
        const fixedJson = jsonContent
          .replace(/```json\s*/, '')
          .replace(/```\s*$/, '')
          .replace(/,\s*]/g, ']')
          .replace(/,\s*}/g, '}')
          .replace(/\/\*[\s\S]*?\*\//g, '');

        parsedJson = JSON.parse(fixedJson);
        console.log(`✅ JSON 修复成功，包含 ${parsedJson.length} 个对象\n`);
        jsonContent = fixedJson;
      } catch (error2) {
        console.log(`❌ JSON 修复失败，将使用原始内容\n`);
      }
    }

    // 格式化 JSON
    const formattedJson = JSON.stringify(parsedJson || jsonContent, null, 2);

    // 🔧 测试节点：保存 JSON 到文件
    if (isTestMode) {
      const timestamp = new Date().toISOString().split('T')[0];
      const outputDir = '/Users/douba/twitter-output';
      const jsonFileName = `grok-json-output-${timestamp}.json`;
      const jsonFilePath = path.join(outputDir, jsonFileName);
      fs.writeFileSync(jsonFilePath, formattedJson, 'utf-8');
      console.log(`💾 测试模式: JSON 已保存: ${jsonFileName}\n`);
    }

    // 🔧 调试节点：生成 HTML 报告
    if (isDebugMode) {
      const timestamp = new Date().toISOString().split('T')[0];
      const outputDir = '/Users/douba/twitter-output';
      const htmlFileName = `grok-json-report-${timestamp}.html`;
      const htmlFilePath = path.join(outputDir, htmlFileName);
      const htmlReport = generateHtmlReport(parsedJson || jsonContent, mode + '模式', timestamp);
      fs.writeFileSync(htmlFilePath, htmlReport, 'utf-8');
      console.log(`💾 调试模式: HTML 报告已生成: ${htmlFileName}\n`);
    }

    // ========== 步骤 6：粘贴到导入页面 ==========
    console.log('🔍 [7/7] 粘贴 JSON 到导入页面...');

    let currentImportPage = currentPages.find(page => page.url().includes('ttmouse.com/import_classifications.html'));

    if (!currentImportPage) {
      console.log('❌ 导入页面已关闭，无法粘贴 JSON');
      console.log('JSON 已准备好，可以手动粘贴\n');
    } else {
      const jsonInput = await currentImportPage.$('#jsonInput');
      await jsonInput.fill(formattedJson);
      console.log('✅ JSON 已粘贴到输入框\n');
    }

    // ========== 完成 ==========
    const endTime = Date.now();
    const totalTime = ((endTime - startTime) / 1000).toFixed(2);

    console.log('=' .repeat(60));
    console.log(`🎉 ${mode}模式 - 执行完成！\n`);

    console.log('📊 执行统计:');
    console.log(`   获取链接数: ${links.length}`);
    console.log(`   JSON 长度: ${formattedJson.length} 字节`);
    console.log(`   对象数量: ${Array.isArray(parsedJson) ? parsedJson.length : 'N/A'}`);
    console.log(`   执行时间: ${totalTime} 秒\n`);

    if (isTestMode) {
      const timestamp = new Date().toISOString().split('T')[0];
      const outputDir = '/Users/douba/twitter-output';
      console.log('💾 生成的文件:');
      console.log(`   1. ${path.join(outputDir, `unclassified-links-${timestamp}.txt`)} - 待分类链接`);
      console.log(`   2. ${path.join(outputDir, `grok-json-output-${timestamp}.json`)} - 标签 JSON\n`);

      if (isDebugMode) {
        console.log(`   3. ${path.join(outputDir, `grok-json-report-${timestamp}.html`)} - HTML 报告\n`);
      }
    }

    console.log('⚠️ 重要提示:');
    console.log('   JSON 已粘贴到导入页面的输入框中');
    console.log('   👆 请手动点击"📥 导入数据库"按钮完成导入\n');

    console.log('=' .repeat(60));

    await browser.close();
  } catch (error) {
    console.error(`\n❌ 错误: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// HTML 报告生成函数（仅用于调试模式）
function generateHtmlReport(jsonData, mode, timestamp) {
  const data = Array.isArray(jsonData) ? jsonData : [jsonData];
  const prettyJson = JSON.stringify(jsonData, null, 2);

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

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Grok JSON 输出报告 - ${mode} - ${timestamp}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); overflow: hidden; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { font-size: 28px; margin-bottom: 10px; }
    .header .meta { font-size: 14px; opacity: 0.9; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; padding: 30px; background: #f8f9fa; }
    .stat-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); text-align: center; }
    .stat-value { font-size: 32px; font-weight: bold; color: #667eea; margin-bottom: 5px; }
    .stat-label { font-size: 14px; color: #6c757d; }
    .content { padding: 30px; }
    .section-title { font-size: 20px; margin-bottom: 20px; color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
    .json-preview { background: #1e1e1e; color: #d4d4d4; padding: 20px; border-radius: 8px; overflow-x: auto; max-height: 500px; overflow-y: auto; font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; font-size: 13px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🤖 Grok JSON 输出报告</h1>
      <div class="meta">
        <div>模式: ${mode}</div>
        <div>生成时间: ${timestamp}</div>
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
    </div>
    <div class="content">
      <h2 class="section-title">📋 JSON 数据预览</h2>
      <div class="json-preview">
        <pre>${escapeHtml(prettyJson)}</pre>
      </div>
    </div>
  </div>
</body>
</html>`;
}

main();
