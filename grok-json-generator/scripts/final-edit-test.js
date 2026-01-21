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

    // 找到最精确的目标元素
    const targetElement = await grokPage.evaluate(() => {
      const targetText = '直接在代码块中输出JSON数组';
      const allElements = Array.from(document.querySelectorAll('*'));

      let bestMatch = null;
      let bestScore = Infinity;

      allElements.forEach(el => {
        const innerText = el.innerText || '';

        // 必须包含目标文本
        if (!innerText.includes(targetText)) {
          return;
        }

        // 过滤掉太大的元素
        if (innerText.length > 5000 || innerText.length < 50) {
          return;
        }

        // 检查是否包含链接
        if (!innerText.includes('https://x.com/i/status/2010814666331869283')) {
          return;
        }

        // 排除父元素
        const childrenText = Array.from(el.children).reduce((acc, child) => acc + (child.innerText || ''), '');
        if (childrenText.length > innerText.length * 0.8) {
          return;
        }

        // 选择文本长度最小的（最精确）
        if (innerText.length < bestScore) {
          bestMatch = el;
          bestScore = innerText.length;
        }
      });

      return bestMatch;
    });

    if (!targetElement) {
      console.log('❌ 未找到目标消息');
      await browser.close();
      process.exit(1);
    }

    console.log('✅ 找到目标消息');

    const elInfo = await targetElement.evaluate(el => ({
      tagName: el.tagName,
      innerText: el.innerText?.substring(0, 300)
    }));

    console.log(`标签: ${elInfo.tagName}`);
    console.log(`文本: ${elInfo.innerText}...\n`);

    // 悬停
    console.log('🖱️ 悬停到消息...');
    await targetElement.hover();
    await grokPage.waitForTimeout(2000);

    // 查找附近的按钮
    const buttons = await grokPage.$$eval('*', (elements) => {
      const targetText = '直接在代码块中输出JSON数组';

      // 找到目标元素
      const targetEl = elements.find(el => {
        const innerText = el.innerText || '';
        return innerText.includes(targetText) &&
               innerText.includes('https://x.com/i/status/2010814666331869283') &&
               innerText.length > 50 &&
               innerText.length < 5000;
      });

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
      if (btn.visible) visibleIndices.push(idx);
    });

    if (visibleIndices.length === 0) {
      console.log('\n❌ 没有可见的按钮');
      await browser.close();
      process.exit(1);
    }

    // 点击第一个可见的按钮
    const firstVisibleIdx = visibleIndices[0];
    console.log(`\n🖱️ 点击第 [${firstVisibleIdx}] 个按钮...`);

    const allButtons = await targetElement.$$('button');
    await allButtons[firstVisibleIdx].click();

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
