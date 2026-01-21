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

    // 找到第一个用户消息
    let firstMessage = await grokPage.$(`*:text-is("请严格按照以下JSON结构，为我提供的每个X帖子生成标签。")`);

    if (!firstMessage) {
      // 尝试 text-contains
      firstMessage = await grokPage.$(`*:text("请严格按照以下JSON结构")`);
    }

    if (!firstMessage) {
      console.log('❌ 未找到第一个用户消息');
      await browser.close();
      process.exit(1);
    }

    console.log('✅ 找到第一个用户消息\n');

    // 悬停
    console.log('🖱️ 悬停到消息...');
    await firstMessage.hover();
    await grokPage.waitForTimeout(2000);

    // 查找附近的按钮
    const buttons = await grokPage.$$eval('*', (elements) => {
      const targetText = '请严格按照以下JSON结构，为我提供的每个X帖子生成标签。';

      // 找到第一个用户消息
      const targetEl = elements.find(el => el.innerText && el.innerText.includes(targetText));

      if (!targetEl) return [];

      // 向上查找 5 层，收集所有按钮
      let container = targetEl;
      const allButtons = [];

      for (let i = 0; i < 5; i++) {
        if (!container || container === document.body) break;

        const buttons = Array.from(container.querySelectorAll('button'));
        buttons.forEach(btn => {
          if (!allButtons.includes(btn)) {
            allButtons.push(btn);
          }
        });

        container = container.parentElement;
      }

      return allButtons.map(btn => ({
        ariaLabel: btn.getAttribute('aria-label'),
        text: btn.textContent?.substring(0, 30),
        className: btn.className?.substring(0, 100),
        visible: btn.offsetParent !== null
      }));
    });

    console.log(`📋 附近找到 ${buttons.length} 个按钮:\n`);

    const visibleIndices = [];
    buttons.forEach((btn, idx) => {
      const status = btn.visible ? '✅' : '❌';
      console.log(`[${idx}] ${status} ${btn.text ? `"${btn.text}"` : btn.ariaLabel || 'N/A'}`);

      if (btn.visible) {
        visibleIndices.push(idx);
      }
    });

    if (visibleIndices.length === 0) {
      console.log('\n❌ 没有可见的按钮');
      await browser.close();
      process.exit(1);
    }

    // 点击第一个可见的按钮
    const firstVisibleIdx = visibleIndices[0];
    console.log(`\n🖱️ 点击第 [${firstVisibleIdx}] 个按钮...`);

    const allButtons = await firstMessage.$$('button');
    await allButtons[firstVisibleIdx].click();

    console.log('⏳ 等待 3 秒...');
    await grokPage.waitForTimeout(3000);

    // 检查编辑模式
    const editables = await grokPage.$$('div[contenteditable="true"]');

    console.log(`\n📋 编辑模式激活: ${editables.length > 0 ? '✅' : '❌'}`);

    if (editables.length > 0) {
      const text = await editables[0].textContent();
      console.log(`    文本: ${text?.substring(0, 200)}...`);
    }

    console.log('\n✅ 完成');

    await browser.close();
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
})();
