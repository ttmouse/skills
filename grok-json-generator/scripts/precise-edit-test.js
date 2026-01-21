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

    // 更精确地定位用户消息
    const result = await grokPage.evaluate(() => {
      const targetText = '直接在代码块中输出JSON数组';
      const link1 = 'https://x.com/i/status/2010814666331869283';

      // 查找所有可能的用户消息容器
      const messageContainers = Array.from(document.querySelectorAll('[data-testid^="tweet"], [role="article"], div[data-message]'));

      let bestMatch = null;
      let bestScore = 0;

      messageContainers.forEach(container => {
        const text = container.innerText || '';

        // 检查是否包含目标和链接
        if (text.includes(targetText) && text.includes(link1)) {
          // 计算匹配分数（越小越好）
          const score = text.length;

          if (!bestMatch || score < bestScore) {
            bestMatch = container;
            bestScore = score;
          }
        }
      });

      if (bestMatch) {
        return {
          found: true,
          tagName: bestMatch.tagName,
          className: bestMatch.className?.substring(0, 200),
          innerText: bestMatch.innerText?.substring(0, 300),
          buttonCount: bestMatch.querySelectorAll('button').length
        };
      }

      return { found: false };
    });

    if (!result.found) {
      console.log('❌ 未找到用户消息');
      await browser.close();
      process.exit(1);
    }

    console.log('✅ 找到用户消息:');
    console.log(`  标签: ${result.tagName}`);
    console.log(`  按钮数: ${result.buttonCount}`);
    console.log(`  文本: ${result.innerText}...\n`);

    // 重新定位并悬停
    const messageElement = await grokPage.evaluate(() => {
      const targetText = '直接在代码块中输出JSON数组';
      const link1 = 'https://x.com/i/status/2010814666331869283';

      const messageContainers = Array.from(document.querySelectorAll('[data-testid^="tweet"], [role="article"]'));

      let bestMatch = null;
      let bestScore = 0;

      messageContainers.forEach(container => {
        const text = container.innerText || '';

        if (text.includes(targetText) && text.includes(link1)) {
          const score = text.length;

          if (!bestMatch || score < bestScore) {
            bestMatch = container;
            bestScore = score;
          }
        }
      });

      return bestMatch;
    });

    console.log('🖱️ 悬停到用户消息...');
    await messageElement.hover();
    await grokPage.waitForTimeout(2000);

    // 查找悬停后的按钮
    const buttons = await grokPage.$$eval('*', (elements) => {
      const targetText = '直接在代码块中输出JSON数组';
      const link1 = 'https://x.com/i/status/2010814666331869283';

      // 找到用户消息容器
      const messageContainers = Array.from(document.querySelectorAll('[data-testid^="tweet"], [role="article"]'));

      let bestMatch = null;
      let bestScore = 0;

      messageContainers.forEach(container => {
        const text = container.innerText || '';

        if (text.includes(targetText) && text.includes(link1)) {
          const score = text.length;

          if (!bestMatch || score < bestScore) {
            bestMatch = container;
            bestScore = score;
          }
        }
      });

      if (!bestMatch) return [];

      // 查找容器内的按钮
      const buttons = Array.from(bestMatch.querySelectorAll('button'));

      return buttons.map((btn, idx) => ({
        index: idx,
        ariaLabel: btn.getAttribute('aria-label'),
        text: btn.textContent?.substring(0, 30),
        className: btn.className?.substring(0, 100),
        visible: btn.offsetParent !== null
      }));
    });

    console.log(`📋 消息内有 ${buttons.length} 个按钮:\n`);

    buttons.forEach((btn, idx) => {
      const status = btn.visible ? '✅' : '❌';
      console.log(`[${idx}] ${status} class: ${btn.className || 'N/A'}`);
      console.log(`    aria-label: "${btn.ariaLabel || 'N/A'}"`);
      console.log(`    text: "${btn.text || 'N/A'}"`);
    });

    // 查找并点击第一个可见的按钮
    const visibleButtons = await messageElement.$$('button');
    let clicked = false;

    for (let i = 0; i < visibleButtons.length; i++) {
      const btn = visibleButtons[i];

      // 检查按钮是否可见
      const isVisible = await btn.evaluate(b => b.offsetParent !== null);

      if (isVisible) {
        console.log(`\n🖱️ 点击第 [${i}] 个按钮...`);
        await btn.click();
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      console.log('\n❌ 没有找到可见的按钮');
      await browser.close();
      process.exit(1);
    }

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
