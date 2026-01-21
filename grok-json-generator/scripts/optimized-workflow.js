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

    // 记录开始时间
    const startTime = Date.now();

    // 连接浏览器
    console.log('🔍 [1/6] 连接浏览器...');
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const context = browser.contexts()[0];
    const pages = context.pages();
    console.log('✅ 浏览器连接成功\n');

    // ========== 步骤 1：获取待分类链接 ==========
    console.log('🔍 [2/6] 获取待分类链接...');

    let importPage = pages.find(page => page.url().includes('ttmouse.com/import_classifications.html'));

    if (!importPage) {
      importPage = await context.newPage();
      await importPage.goto('https://ttmouse.com/import_classifications.html');
      await importPage.waitForLoadState('networkidle');
    }

    // 点击"获取待分类链接"按钮
    const fetchButton = await importPage.$('#fetchUnclassifiedBtn');
    await fetchButton.click();
    if (isDebugMode) console.log('  ✅ 点击"获取待分类链接"按钮');

    // 智能等待链接内容（最多等待 10 秒）
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

    // ========== 步骤 2：编辑 Grok 对话 ==========
    console.log('🔍 [3/6] 编辑 Grok 对话...');

    let grokPage = pages.find(page => page.url().includes('/i/grok'));

    if (!grokPage) {
      console.log('❌ 未找到 Grok 对话页面');
      await browser.close();
      process.exit(1);
    }

    // 查找包含提示词的容器
    const targetElement = await grokPage.evaluateHandle(() => {
      // 滚动到顶部
      window.scrollTo(0, 0);

      // 查找包含提示词的容器
      const primaryColumn = document.querySelector('[data-testid="primaryColumn"]');

      if (!primaryColumn) {
        return null;
      }

      return primaryColumn;
    });

    if (!targetElement) {
      console.log('❌ 未找到消息容器');
      await browser.close();
      process.exit(1);
    }

    // 悬停到消息容器
    await targetElement.asElement().hover();
    if (isDebugMode) console.log('  ✅ 悬停到消息容器');

    // 智能等待编辑按钮出现（最多等待 5 秒）
    const editButton = await grokPage.waitForSelector('button', {
      timeout: 5000
    }).then(btn => btn.evaluateHandle(button => {
      const svg = button.querySelector('svg');
      if (!svg) return false;

      const path = svg.querySelector('path');
      if (!path) return false;

      const d = path.getAttribute('d');
      return d && d.includes('M21 18s-1.334 1.544') && d.includes('m7.414-15.13');
    })).then(hasIcon => hasIcon ? grokPage.$('button') : null);

    if (!editButton) {
      console.log('❌ 未找到编辑按钮');
      await browser.close();
      process.exit(1);
    }

    // 使用 force 点击，避免被 header 拦截
    await editButton.click({ force: true });
    if (isDebugMode) console.log('  ✅ 点击编辑按钮');

    // 获取当前内容
    const textareas = await grokPage.$$('textarea >> visible=true');
    const textarea = textareas[0];
    const currentContent = await textarea.inputValue();

    // 查找链接列表开始的位置
    const linkStartMarker = '现在请为以下帖子生成标签';

    // 更新链接列表（保留提示词）
    let newContent;
    if (currentContent.includes(linkStartMarker)) {
      const parts = currentContent.split(linkStartMarker);
      const promptPart = parts[0];
      newContent = promptPart + linkStartMarker + '（直接在代码块中输出JSON数组）：\n\n' + links.join('\n');
    } else {
      newContent = currentContent + '\n\n现在请为以下帖子生成标签（直接在代码块中输出JSON数组）：\n\n' + links.join('\n');
    }

    // 更新内容
    await textarea.fill(newContent);
    if (isDebugMode) console.log('  ✅ 更新链接列表');

    // 保存编辑
    await grokPage.keyboard.press('Enter');
    if (isDebugMode) console.log('  ✅ 保存编辑');

    console.log('✅ Grok 对话更新完成\n');

    // ========== 步骤 3：监控 Grok JSON 生成 ==========
    console.log('🔍 [4/6] 监控 Grok JSON 生成...');
    console.log('⏳ 等待生成中...\n');

    let lastJsonContent = '';
    let stableCount = 0;
    const maxStableCount = 10;
    const checkInterval = 1000;
    const maxWaitTime = 300000; // 最多等待 5 分钟
    const monitorStartTime = Date.now();

    // 首先检查是否已有 JSON（可能是之前生成的）
    const initialCheck = await grokPage.evaluate(() => {
      const allText = document.body.innerText;
      const jsonMatches = allText.match(/\[\s*\{[\s\S]*?\}\s*\]/g);
      if (jsonMatches && jsonMatches.length > 0) {
        return jsonMatches[0].length;
      }
      return 0;
    });

    let initialJsonLength = initialCheck;

    while (stableCount < maxStableCount && (Date.now() - monitorStartTime) < maxWaitTime) {
      // 检测 JSON 内容（滚动到底部）
      const result = await grokPage.evaluate(() => {
        // 滚动到底部
        window.scrollTo(0, document.body.scrollHeight);

        // 等待 100ms 让内容加载
        return new Promise(resolve => {
          setTimeout(() => {
            const allText = document.body.innerText;

            // 查找代码块中的 JSON
            const codeBlockMatches = allText.match(/```json[\s\S]*?```/g);

            // 优先使用代码块中的 JSON
            if (codeBlockMatches && codeBlockMatches.length > 0) {
              resolve({
                found: true,
                content: codeBlockMatches[0],
                length: codeBlockMatches[0].length,
                source: 'codeblock'
              });
              return;
            }

            // 查找 JSON 数组
            const jsonMatches = allText.match(/\[\s*\{[\s\S]*?\}\s*\]/g);

            if (jsonMatches && jsonMatches.length > 0) {
              const longestJson = jsonMatches.reduce((max, current) => {
                return current.length > max.length ? current : max;
              }, '');

              if (longestJson.length > 100) {
                resolve({
                  found: true,
                  content: longestJson,
                  length: longestJson.length,
                  source: 'array'
                });
                return;
              }
            }

            resolve({ found: false, content: '', length: 0 });
          }, 100);
        });
      });

      if (result.found && result.content.length > 100) {
        // 如果是初始 JSON，跳过
        if (result.content === lastJsonContent && lastJsonContent.length === 0) {
          if (isDebugMode) {
            console.log(`  ⏳ 检测到旧 JSON (${result.content.length} 字符)，等待新 JSON...`);
          }
        } else if (result.content === lastJsonContent) {
          stableCount++;
          if (stableCount <= 3) {
            if (isDebugMode) {
              console.log(`  📝 生成中... (${result.content.length} 字符) [稳定 ${stableCount}/${maxStableCount}]`);
            }
          } else {
            console.log(`  ✅ JSON 生成完成！连续 ${maxStableCount} 秒内容不变\n`);
            break;
          }
        } else {
          stableCount = 0;
          lastJsonContent = result.content;
          if (isDebugMode) {
            console.log(`  📝 生成中... (${result.content.length} 字符) [新内容]`);
          }
        }
      } else {
        stableCount = 0;
        if (isDebugMode) {
          console.log(`  ⏳ 等待生成...`);
        }
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

    if (lastJsonContent.length === 0) {
      console.log('\n⚠️ 没有检测到 JSON 内容！');
      console.log('💡 建议：检查 Grok 对话是否生成了 JSON\n');
      await browser.close();
      process.exit(1);
    }

    console.log(`✅ JSON 生成完成！总长度: ${lastJsonContent.length} 字符\n`);

    // ========== 步骤 4：验证并提取 JSON ==========
    console.log('🔍 [5/6] 验证并提取 JSON...');

    let parsedJson;
    let jsonContent = lastJsonContent;

    // 提取 JSON 内容（去除代码块标记）
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

    // ========== 步骤 5：粘贴到导入页面 ==========
    console.log('🔍 [6/6] 粘贴 JSON 到导入页面...');

    const currentPages = context.pages();
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
