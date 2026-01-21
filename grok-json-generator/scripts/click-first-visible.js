const { chromium } = require('playwright');

(async () => {
  try {
    console.log('🔍 连接浏览器...');
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const pages = browser.contexts()[0].pages();
    const grokPage = pages.find(page => page.url().includes('conversation=2011046911403573376'));

    if (!grokPage) {
      console.log('❌ 未找到 Grok 对话');
      await browser.close();
      process.exit(1);
    }

    console.log('✅ 找到 Grok 对话\n');

    // 找到所有可见的按钮
    const visibleButtons = await grokPage.$$('button >> visible=true');

    console.log(`📋 页面上有 ${visibleButtons.length} 个可见的按钮\n`);

    // 点击第 5 个按钮（跳过导航栏的前几个）
    if (visibleButtons.length > 5) {
      const button = visibleButtons[5];

      const ariaLabel = await button.getAttribute('aria-label');
      const text = await button.textContent();

      console.log(`🖱️ 点击第 [5] 个按钮:`);
      console.log(`    aria-label: "${ariaLabel || 'N/A'}"`);
      console.log(`    text: "${text?.substring(0, 50) || 'N/A'}"`);
      console.log('');

      await button.click();
      await grokPage.waitForTimeout(3000);

      // 检查是否有可编辑区域
      const editables = await grokPage.$$('div[contenteditable="true"]');

      console.log(`\n📋 编辑模式激活: ${editables.length > 0 ? '✅' : '❌'}`);

      if (editables.length > 0) {
        const text = await editables[0].textContent();
        console.log(`    文本: ${text?.substring(0, 200)}...`);
      }
    } else {
      console.log('❌ 没有足够的可见按钮');
    }

    console.log('\n✅ 完成');

    await browser.close();
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
})();
