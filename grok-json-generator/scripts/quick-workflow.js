const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    console.log('🚀 开始快速更新流程...\n');

    // 连接浏览器
    console.log('🔍 步骤 1：连接浏览器...');
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const context = browser.contexts()[0];
    const pages = context.pages();

    // 步骤 1：获取待分类链接
    console.log('🔍 步骤 2：获取待分类链接...');
    let importPage = pages.find(page => page.url().includes('ttmouse.com/import_classifications.html'));

    if (!importPage) {
      importPage = await context.newPage();
      await importPage.goto('https://ttmouse.com/import_classifications.html');
      await importPage.waitForLoadState('networkidle');
    }

    const fetchButton = await importPage.$('#fetchUnclassifiedBtn');
    await fetchButton.click();
    console.log('✅ 点击"获取待分类链接"按钮');

    await importPage.waitForTimeout(3000);

    let linksContent = '';
    let retries = 10;

    while (retries > 0) {
      await importPage.waitForTimeout(1000);
      linksContent = await importPage.$eval('#unclassifiedOutput', textarea => textarea.value);

      if (linksContent.trim().length > 0) {
        break;
      }

      retries--;
      console.log(`⏳ 等待中... (${10 - retries}/10)`);
    }

    const links = linksContent.split('\n').filter(link => link.trim());

    if (links.length === 0) {
      console.log('\n⚠️ 没有获取到待分类链接！');
      console.log('💡 数据库可能没有待分类的数据\n');
      await browser.close();
      process.exit(0);
    }

    console.log(`✅ 成功获取 ${links.length} 条链接\n`);

    // 步骤 2：找到并编辑 Grok 消息
    console.log('🔍 步骤 3：编辑 Grok 对话...');

    let grokPage = pages.find(page => page.url().includes('/i/grok'));

    if (!grokPage) {
      console.log('❌ 未找到 Grok 对话页面');
      await browser.close();
      process.exit(1);
    }

    // 查找包含提示词的元素
    const targetElement = await grokPage.evaluateHandle(() => {
      const allElements = Array.from(document.querySelectorAll('*'));

      // 查找包含"二级子类：从以下完整列表中选"的元素
      const targetElements = allElements.filter(el => {
        const text = el.innerText || '';
        return text.includes('二级子类：从以下完整列表中选最贴合的');
      });

      // 选择文本长度最合适的
      const sorted = targetElements.sort((a, b) => {
        return (a.innerText || '').length - (b.innerText || '').length;
      });

      // 选择第二个（第一个可能太小，第二个可能刚好是完整消息）
      return sorted.length > 0 ? sorted[0] : null;
    });

    if (!targetElement) {
      console.log('❌ 未找到提示词消息');
      await browser.close();
      process.exit(1);
    }

    console.log('✅ 找到提示词消息');

    // 悬停到消息
    console.log('🖱️ 悬停到消息...');
    await targetElement.asElement().hover();
    await grokPage.waitForTimeout(2000);
    console.log('✅ 悬停完成');

    // 查找并点击编辑按钮
    const allButtons = await grokPage.$$('button');
    let editButton = null;

    for (let i = 0; i < allButtons.length; i++) {
      const btn = allButtons[i];

      const hasEditIcon = await btn.evaluate(button => {
        const svg = button.querySelector('svg');
        if (!svg) return false;

        const path = svg.querySelector('path');
        if (!path) return false;

        const d = path.getAttribute('d');
        return d && d.includes('M21 18s-1.334 1.544') && d.includes('m7.414-15.13');
      });

      if (hasEditIcon) {
        const isVisible = await btn.evaluate(b => b.offsetParent !== null);
        if (isVisible) {
          editButton = btn;
          break;
        }
      }
    }

    await editButton.click();
    console.log('✅ 点击编辑按钮');
    await grokPage.waitForTimeout(2000);

    // 获取当前内容
    const textareas = await grokPage.$$('textarea >> visible=true');
    const textarea = textareas[0];
    const currentContent = await textarea.inputValue();

    // 查找链接列表开始的位置
    const linkStartMarker = '现在请为以下帖子生成标签';

    let newContent;
    if (currentContent.includes(linkStartMarker)) {
      // 保留前面的提示词，只替换链接部分
      const parts = currentContent.split(linkStartMarker);
      const promptPart = parts[0];
      newContent = promptPart + linkStartMarker + '（直接在代码块中输出JSON数组）：\n\n' + links.join('\n');
    } else {
      newContent = currentContent + '\n\n现在请为以下帖子生成标签（直接在代码块中输出JSON数组）：\n\n' + links.join('\n');
    }

    // 更新内容
    console.log('📝 更新链接列表...');
    await textarea.fill(newContent);
    console.log('✅ 链接列表更新完成');

    // 保存编辑
    console.log('💾 保存编辑...');
    await grokPage.keyboard.press('Enter');
    console.log('✅ 编辑已保存\n');

    // 步骤 3：监控 Grok JSON 生成
    console.log('🔍 步骤 4：监控 Grok JSON 生成...');

    let lastJsonContent = '';
    let stableCount = 0;
    const maxStableCount = 10;
    const checkInterval = 1000;
    const maxWaitTime = 300000; // 最多等待 5 分钟
    const startTime = Date.now();

    console.log('⏳ 等待 JSON 生成中...\n');
    console.log('⚠️ 监控条件：暂停按钮消失 或 连续 10 秒内容不变\n');

    while (stableCount < maxStableCount && (Date.now() - startTime) < maxWaitTime) {
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

      // 如果没有暂停按钮，说明生成完成
      if (!hasPauseButton) {
        console.log('✅ 暂停按钮消失，生成已完成！');
        break;
      }

      const result = await grokPage.evaluate(() => {
        // 滚动到底部
        window.scrollTo(0, document.body.scrollHeight);

        // 等待一下让内容加载
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
        if (result.content === lastJsonContent) {
          stableCount++;
          if (stableCount <= 3) {
            console.log(`📝 生成中... (${result.content.length} 字符) [稳定 ${stableCount}/${maxStableCount}] [来源: ${result.source}] [暂停按钮: 存在]`);
          }
        } else {
          stableCount = 0;
          lastJsonContent = result.content;
          console.log(`📝 生成中... (${result.content.length} 字符) [新内容] [来源: ${result.source}] [暂停按钮: 存在]`);
        }
      } else {
        stableCount = 0;
        console.log('⏳ 等待生成... [暂停按钮: 存在]');
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    // 检查是否超时
    if ((Date.now() - startTime) >= maxWaitTime) {
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

    console.log(`\n✅ JSON 生成完成！总长度: ${lastJsonContent.length} 字符\n`);

    // 步骤 4：验证并保存 JSON
    console.log('🔍 步骤 5：验证并保存 JSON...');

    let parsedJson;

    try {
      // 提取 JSON 内容（去除代码块标记）
      const jsonContent = lastJsonContent.replace(/```json\s*/, '').replace(/```\s*$/, '');
      parsedJson = JSON.parse(jsonContent);
      console.log(`✅ JSON 格式正确，包含 ${parsedJson.length} 个对象\n`);
      lastJsonContent = jsonContent;
    } catch (error) {
      console.log(`⚠️ JSON 解析失败: ${error.message}`);

      try {
        const fixedJson = lastJsonContent
          .replace(/```json\s*/, '')
          .replace(/```\s*$/, '')
          .replace(/,\s*]/g, ']')
          .replace(/,\s*}/g, '}')
          .replace(/\/\*[\s\S]*?\*\//g, '');

        parsedJson = JSON.parse(fixedJson);
        console.log(`✅ JSON 修复成功，包含 ${parsedJson.length} 个对象\n`);
        lastJsonContent = fixedJson;
      } catch (error2) {
        console.log(`❌ JSON 修复失败，将保存原始内容\n`);
      }
    }

    // 保存 JSON
    const timestamp = new Date().toISOString().split('T')[0];
    const outputDir = '/Users/douba/twitter-output';
    const jsonFileName = `grok-json-output-${timestamp}.json`;
    const jsonFilePath = path.join(outputDir, jsonFileName);
    const formattedJson = JSON.stringify(parsedJson || lastJsonContent, null, 2);

    fs.writeFileSync(jsonFilePath, formattedJson, 'utf-8');

    console.log(`💾 JSON 已保存: ${jsonFileName}`);
    console.log(`   文件大小: ${formattedJson.length} 字节\n`);

    // 步骤 5：粘贴到导入页面
    console.log('🔍 步骤 6：粘贴 JSON 到导入页面...');

    pages = context.pages();
    let currentImportPage = pages.find(page => page.url().includes('ttmouse.com/import_classifications.html'));

    if (!currentImportPage) {
      console.log('❌ 导入页面已关闭，无法粘贴 JSON');
      console.log('JSON 已保存到文件，可以手动粘贴\n');
    } else {
      const jsonInput = await currentImportPage.$('#jsonInput');
      await jsonInput.fill(formattedJson);
      console.log('✅ JSON 已粘贴到输入框\n');
    }

    // 完成
    console.log('🔍 步骤 7：完成总结...\n');

    console.log('🎉 完整自动化流程完成！\n');

    console.log('📊 流程统计:');
    console.log(`   获取链接数: ${links.length}`);
    console.log(`   JSON 长度: ${formattedJson.length} 字节`);
    console.log(`   对象数量: ${Array.isArray(parsedJson) ? parsedJson.length : 'N/A'}`);
    console.log(`   完成时间: ${new Date().toLocaleString('zh-CN')}\n`);

    console.log('💾 生成的文件:');
    console.log(`   1. ${path.join(outputDir, `unclassified-links-${timestamp}.txt`)} - 待分类链接`);
    console.log(`   2. ${jsonFileName} - 标签 JSON\n`);

    console.log('⚠️ 重要提示:');
    console.log('   JSON 已粘贴到导入页面的输入框中');
    console.log('   👆 请手动点击"📥 导入数据库"按钮完成导入\n');

    await browser.close();
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
