const { chromium } = require('playwright');

(async () => {
  try {
    console.log('🔍 正在连接到浏览器...\n');
    const browser = await chromium.connectOverCDP('http://localhost:9222');

    const contexts = browser.contexts();
    const context = contexts[0];
    const pages = context.pages();

    // 找到 Grok 对话页面
    const grokPage = pages.find(page => page.url().includes('conversation=2011046911403573376'));

    if (!grokPage) {
      console.log('❌ 未找到 Grok 对话页面');
      await browser.close();
      process.exit(1);
    }

    console.log('✅ 找到 Grok 对话页面\n');

    // 查找用户消息
    const searchText = '下面是一批新的链接：';
    console.log(`🔍 查找包含 "${searchText}" 的消息...\n`);

    const messages = await grokPage.evaluateHandle((text) => {
      // 尝试多种选择器
      const allMessages = [];

      // 方法 1: 查找所有可能的消息容器
      const method1 = Array.from(document.querySelectorAll('[data-testid^="tweet"]'));
      if (method1.length > 0) allMessages.push(...method1);

      // 方法 2: 查找所有 article 元素
      const method2 = Array.from(document.querySelectorAll('[role="article"]'));
      if (method2.length > 0) allMessages.push(...method2);

      // 方法 3: 查找所有包含文本的 div
      const method3 = Array.from(document.querySelectorAll('div[data-testid]'));
      if (method3.length > 0) allMessages.push(...method3);

      return allMessages.map((msg, index) => ({
        index,
        tagName: msg.tagName,
        dataTestId: msg.getAttribute('data-testid'),
        role: msg.getAttribute('role'),
        innerText: msg.innerText?.substring(0, 100),
        hasText: msg.innerText?.includes(text),
        buttonCount: msg.querySelectorAll('button').length
      }));
    }, searchText);

    const messagesArray = await messages.jsonValue();

    console.log(`📋 找到 ${messagesArray.length} 个潜在消息元素:\n`);

    messagesArray.forEach(msg => {
      if (msg.hasText) {
        console.log(`✅ [${msg.index}] 匹配!`);
        console.log(`   标签: ${msg.tagName}`);
        console.log(`   data-testid: ${msg.dataTestId}`);
        console.log(`   role: ${msg.role}`);
        console.log(`   按钮数: ${msg.buttonCount}`);
        console.log(`   文本: ${msg.innerText}...`);
        console.log('');
      }
    });

    // 查找编辑相关的按钮
    console.log('🔍 查找页面上的编辑按钮...\n');

    const editButtons = await grokPage.evaluate(() => {
      const results = [];

      // 查找所有按钮的 aria-label
      const allButtons = Array.from(document.querySelectorAll('button'));
      allButtons.forEach(btn => {
        const ariaLabel = btn.getAttribute('aria-label');
        if (ariaLabel && (
          ariaLabel.toLowerCase().includes('edit') ||
          ariaLabel.toLowerCase().includes('编辑') ||
          ariaLabel.toLowerCase().includes('more') ||
          ariaLabel.toLowerCase().includes('更多')
        )) {
          results.push({
            ariaLabel,
            textContent: btn.textContent?.substring(0, 50),
            parentTag: btn.parentElement?.tagName,
            parentDataTestId: btn.parentElement?.getAttribute('data-testid')
          });
        }
      });

      return results;
    });

    console.log(`找到 ${editButtons.length} 个编辑/更多按钮:\n`);
    editButtons.forEach((btn, i) => {
      console.log(`[${i + 1}] aria-label: "${btn.ariaLabel}"`);
      console.log(`    文本: ${btn.textContent}`);
      console.log(`    父元素: ${btn.parentTag} (${btn.parentDataTestId})`);
      console.log('');
    });

    await browser.close();
    console.log('✅ 调试完成');
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
})();
