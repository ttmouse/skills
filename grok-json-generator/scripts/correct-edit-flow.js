const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    console.log('🚀 正确的编辑流程测试...\n');

    const startTime = Date.now();

    // 连接浏览器
    console.log('🔍 [1/5] 连接浏览器...');
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const context = browser.contexts()[0];
    const pages = context.pages();

    // 步骤 1：获取待分类链接
    console.log('🔍 [2/5] 获取待分类链接...');
    let importPage = pages.find(page => page.url().includes('ttmouse.com/import_classifications.html'));

    if (!importPage) {
      importPage = await context.newPage();
      await importPage.goto('https://ttmouse.com/import_classifications.html');
      await importPage.waitForLoadState('networkidle');
    }

    const fetchButton = await importPage.$('#fetchUnclassifiedBtn');
    await fetchButton.click();

    let linksContent = '';
    let retries = 10;

    while (retries > 0) {
      await importPage.waitForTimeout(1000);
      linksContent = await importPage.$eval('#unclassifiedOutput', textarea => textarea.value);
      if (linksContent.trim().length > 0) break;
      retries--;
    }

    const links = linksContent.split('\n').filter(link => link.trim());

    if (links.length === 0) {
      console.log('\n⚠️ 没有获取到待分类链接！');
      await browser.close();
      process.exit(0);
    }

    console.log(`✅ 获取成功: ${links.length} 条链接\n`);

    // 步骤 2：找到并编辑完整的用户消息
    console.log('🔍 [3/5] 找到并编辑完整的用户消息...');

    let grokPage = pages.find(page => page.url().includes('/i/grok'));

    if (!grokPage) {
      console.log('❌ 未找到 Grok 对话页面');
      await browser.close();
      process.exit(1);
    }

    // 查找完整的用户消息容器
    const result = await grokPage.evaluate(() => {
      // 查找所有可能的用户消息容器
      const allElements = Array.from(document.querySelectorAll('[data-testid], [role="article"], [class*="tweet"], [class*="message"]'));

      // 找到包含完整提示词的容器
      const messageContainers = allElements.filter(el => {
        const text = el.innerText || '';

        // 检查是否包含提示词的关键部分
        return (
          text.includes('请严格按照以下格式输出') &&
          text.includes('二级子类：从以下完整列表中选最贴合的') &&
          text.includes('hierarchical') &&
          text.includes('flat_tags') &&
          text.length > 500 && // 完整的消息应该很长
          text.length < 10000
        );
      });

      // 按文本长度排序，找到最长的（最完整的）
      const sorted = messageContainers.sort((a, b) => {
        return (b.innerText || '').length - (a.innerText || '').length;
      });

      if (sorted.length === 0) {
        return { found: false };
      }

      const bestMatch = sorted[0];

      return {
        found: true,
        tagName: bestMatch.tagName,
        className: bestMatch.className?.substring(0, 100) || '',
        dataTestId: bestMatch.getAttribute('data-testid') || '',
        textLength: bestMatch.innerText.length,
        text: bestMatch.innerText.substring(0, 300) + '...'
      };
    });

    if (!result.found) {
      console.log('❌ 未找到完整的用户消息');
      console.log('💡 建议：创建新的 Grok 对话\n');
      await browser.close();
      process.exit(1);
    }

    console.log('✅ 找到完整的用户消息容器:');
    console.log(`   标签: ${result.tagName}`);
    console.log(`   类名: ${result.className}`);
    console.log(`   data-testid: ${result.dataTestId}`);
    console.log(`   文本长度: ${result.textLength} 字符`);
    console.log(`   内容预览: ${result.text}\n`);

    // 使用 ElementHandle 悬停到消息容器
    console.log('🖱️ 悬停到消息容器...');

    const messageElement = await grokPage.evaluateHandle((selector) => {
      // 使用我们找到的属性来定位元素
      const elements = Array.from(document.querySelectorAll('*'));
      return elements.find(el => {
        return el.tagName === selector.tagName &&
               (selector.className ? el.className?.includes(selector.className.substring(0, 20)) : true) &&
               (selector.dataTestId ? el.getAttribute('data-testid') === selector.dataTestId : true);
      });
    }, result);

    await messageElement.asElement().hover();
    await grokPage.waitForTimeout(2000);
    console.log('  ✅ 悬停完成\n');

    // 查找编辑按钮
    console.log('🔍 查找编辑按钮...');

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

    console.log('✅ 找到编辑按钮\n');

    // 点击编辑按钮
    console.log('🖱️ 点击编辑按钮...');
    await editButton.click({ force: true });
    await grokPage.waitForTimeout(2000);
    console.log('  ✅ 编辑按钮已点击\n');

    // 获取当前内容
    console.log('📝 获取当前消息内容...');
    const textareas = await grokPage.$$('textarea >> visible=true');
    const textarea = textareas[0];
    const currentContent = await textarea.inputValue();

    console.log(`  当前内容长度: ${currentContent.length} 字符\n`);

    // 查找链接列表开始的位置
    const linkStartMarker = '现在请为以下帖子生成标签';

    if (!currentContent.includes(linkStartMarker)) {
      console.log('⚠️ 当前消息中没有找到链接列表开始标记');
      console.log('💡 可能的原因：这不是正确的用户消息\n');
      await browser.close();
      process.exit(1);
    }

    // 更新链接列表（保留提示词，只替换链接）
    console.log('📝 更新链接列表（保留提示词，只替换链接）...');

    const parts = currentContent.split(linkStartMarker);
    const promptPart = parts[0];

    // 检查是否已有链接列表
    let newContent;
    if (parts.length > 1) {
      // 保留提示词，替换链接列表
      const oldLinkPart = parts[1];
      // 查找链接列表的开始（通常是空行后）
      const linkListStart = oldLinkPart.search(/\n\S/);
      if (linkListStart !== -1) {
        // 替换链接列表
        newContent = promptPart + linkStartMarker + '（直接在代码块中输出JSON数组）：\n\n' + links.join('\n');
      } else {
        // 添加新链接列表
        newContent = promptPart + linkStartMarker + '（直接在代码块中输出JSON数组）：\n\n' + links.join('\n');
      }
    } else {
      // 添加新链接列表
      newContent = currentContent + '\n\n现在请为以下帖子生成标签（直接在代码块中输出JSON数组）：\n\n' + links.join('\n');
    }

    // 更新内容
    console.log(`  新内容长度: ${newContent.length} 字符`);
    await textarea.fill(newContent);
    console.log('  ✅ 链接列表已更新\n');

    // 保存编辑
    console.log('💾 保存编辑...');
    await grokPage.keyboard.press('Enter');
    console.log('  ✅ 编辑已保存\n');

    console.log('✅ 用户消息编辑完成\n');

    const endTime = Date.now();
    const totalTime = ((endTime - startTime) / 1000).toFixed(2);

    console.log('=' .repeat(60));
    console.log(`🎉 编辑流程完成！\n`);

    console.log('📊 执行统计:');
    console.log(`   获取链接数: ${links.length}`);
    console.log(`   执行时间: ${totalTime} 秒\n`);

    console.log('⚠️ 重要提示:');
    console.log('   用户消息已更新，Grok 应该会重新生成响应');
    console.log('   请检查 Grok 对话，确认是否在生成新的响应\n');

    console.log('=' .repeat(60));

    await browser.close();
  } catch (error) {
    console.error(`\n❌ 错误: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
