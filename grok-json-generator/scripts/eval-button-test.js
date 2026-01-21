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

    const targetText = '直接在代码块中输出JSON数组';
    const messageElement = await grokPage.$(`*:text-is("${targetText}")`);

    if (!messageElement) {
      console.log('❌ 未找到目标消息');
      await browser.close();
      process.exit(1);
    }

    console.log('✅ 找到目标消息');

    // 悬停
    console.log('🖱️ 悬停...');
    await messageElement.hover();
    await grokPage.waitForTimeout(2000);

    // 查找按钮
    console.log('🔍 查找消息内的所有按钮...\n');

    const buttonInfo = await grokPage.$$eval('*', (elements) => {
      const targetText = '直接在代码块中输出JSON数组';

      // 找到包含目标文本的元素
      const targetEl = elements.find(el => el.innerText && el.innerText.includes(targetText));

      if (!targetEl) {
        return { found: false, buttons: [] };
      }

      // 查找该元素内的所有按钮
      const buttons = Array.from(targetEl.querySelectorAll('button'));

      return {
        found: true,
        buttons: buttons.map(btn => ({
          ariaLabel: btn.getAttribute('aria-label'),
          text: btn.textContent?.substring(0, 30),
          className: btn.className?.substring(0, 100),
          visible: btn.offsetParent !== null
        }))
      };
    });

    console.log(`找到 ${buttonInfo.buttons.length} 个按钮:\n`);

    buttonInfo.buttons.forEach((btn, idx) => {
      console.log(`[${idx}]`);
      console.log(`  aria-label: "${btn.ariaLabel || 'N/A'}"`);
      console.log(`  text: "${btn.text || 'N/A'}"`);
      console.log(`  visible: ${btn.visible}`);
      console.log(`  class: ${btn.className || 'N/A'}`);
      console.log('');
    });

    if (buttonInfo.buttons.length === 0) {
      console.log('❌ 没有找到按钮');
      await browser.close();
      process.exit(1);
    }

    // 尝试点击第一个可见的按钮
    const firstVisibleIndex = buttonInfo.buttons.findIndex(btn => btn.visible);

    if (firstVisibleIndex === -1) {
      console.log('❌ 没有可见的按钮');
      await browser.close();
      process.exit(1);
    }

    console.log(`🖱️ 点击第 [${firstVisibleIndex}] 个按钮...`);

    const buttons = await messageElement.$$('button');
    await buttons[firstVisibleIndex].click();

    console.log('⏳ 等待 5 秒...');
    await grokPage.waitForTimeout(5000);

    console.log('\n✅ 完成');

    await browser.close();
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
})();
