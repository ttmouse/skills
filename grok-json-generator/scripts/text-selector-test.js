const { chromium } = require('playwright');

(async () => {
  try {
    console.log('🔍 连接浏览器...\n');
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const pages = browser.contexts()[0].pages();
    const grokPage = pages.find(page => page.url().includes('conversation=2011046911403573376'));

    if (!grokPage) {
      console.log('❌ 未找到 Grok 对话');
      await browser.close();
      process.exit(1);
    }

    console.log('✅ 找到 Grok 对话\n');

    // 使用文本选择器
    const targetText = '直接在代码块中输出JSON数组';

    const element = await grokPage.$(`*:text-is("${targetText}")`);

    if (!element) {
      console.log('❌ 未找到元素');

      // 尝试 text-contains
      const element2 = await grokPage.$(`*:text("${targetText}")`);

      if (!element2) {
        console.log('❌ text-contains 也未找到');
        await browser.close();
        process.exit(1);
      }

      console.log('✅ 使用 text-contains 找到元素');
      return element2;
    }

    console.log('✅ 使用 text-is 找到元素\n');

    // 悬停
    console.log('🖱️ 悬停...');
    await element.hover();
    await grokPage.waitForTimeout(2000);

    // 查找该元素的所有按钮
    const buttons = await element.$$('button');
    console.log(`📋 找到 ${buttons.length} 个按钮\n`);

    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];

      const ariaLabel = await btn.getAttribute('aria-label');
      const text = await btn.textContent();
      const className = await btn.getAttribute('class');
      const visible = await btn.evaluate(b => b.offsetParent !== null);

      const status = visible ? '✅' : '❌';
      console.log(`[${i}] ${status}`);
      console.log(`    aria-label: "${ariaLabel || 'N/A'}"`);
      console.log(`    text: "${text?.substring(0, 30) || 'N/A'}"`);
      console.log(`    class: ${className || 'N/A'}`);
      console.log('');
    }

    // 点击第一个可见的按钮
    const visibleButton = await element.$('button >> visible=true');

    if (!visibleButton) {
      console.log('❌ 没有可见的按钮');
      await browser.close();
      process.exit(1);
    }

    console.log('🖱️ 点击第一个可见的按钮...');
    await visibleButton.click();

    console.log('⏳ 等待 3 秒...');
    await grokPage.waitForTimeout(3000);

    console.log('\n✅ 完成');

    await browser.close();
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
})();
