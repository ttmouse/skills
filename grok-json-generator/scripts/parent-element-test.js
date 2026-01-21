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

    // 找到文本元素并查找其父元素
    const result = await grokPage.evaluate(() => {
      const targetText = '直接在代码块中输出JSON数组';

      // 使用 TreeWalker 查找文本节点
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
      );

      let node;
      let match = null;

      while (node = walker.nextNode()) {
        if (node.textContent.includes(targetText)) {
          match = node;
          break;
        }
      }

      if (!match) {
        return { found: false };
      }

      // 向上查找父元素，直到找到包含按钮的元素
      let parent = match.parentElement;
      let level = 0;

      while (parent && level < 10) {
        const buttons = parent.querySelectorAll('button');
        const hasButtons = buttons.length > 0;

        if (hasButtons) {
          return {
            found: true,
            level,
            tagName: parent.tagName,
            className: parent.className?.substring(0, 200),
            innerText: parent.innerText?.substring(0, 300),
            buttonCount: buttons.length,
            buttonsInfo: Array.from(buttons).map((btn, idx) => ({
              index: idx,
              ariaLabel: btn.getAttribute('aria-label'),
              text: btn.textContent?.substring(0, 30),
              className: btn.className?.substring(0, 100),
              visible: btn.offsetParent !== null
            }))
          };
        }

        parent = parent.parentElement;
        level++;
      }

      return { found: false, message: '未找到包含按钮的父元素' };
    });

    if (!result.found) {
      console.log(`❌ ${result.message || '未找到目标'}`);
      await browser.close();
      process.exit(1);
    }

    console.log('✅ 找到包含按钮的父元素:');
    console.log(`  标签: ${result.tagName}`);
    console.log(`  层级: ${result.level}`);
    console.log(`  文本: ${result.innerText}...\n`);

    console.log(`📋 该元素内有 ${result.buttonCount} 个按钮:\n`);

    const visibleIndices = [];
    result.buttonsInfo.forEach((btn, idx) => {
      const status = btn.visible ? '✅' : '❌';
      console.log(`[${idx}] ${status}`);
      console.log(`    aria-label: "${btn.ariaLabel || 'N/A'}"`);
      console.log(`    text: "${btn.text || 'N/A'}"`);
      console.log(`    class: ${btn.className || 'N/A'}`);

      if (btn.visible) {
        visibleIndices.push(idx);
      }
      console.log('');
    });

    // 重新定位并操作
    console.log('🔍 重新定位元素并悬停...\n');

    const { targetEl, buttons } = await grokPage.evaluateHandle(() => {
      const targetText = '直接在代码块中输出JSON数组';

      // 使用 TreeWalker 查找文本节点
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
      );

      let node;
      let match = null;

      while (node = walker.nextNode()) {
        if (node.textContent.includes(targetText)) {
          match = node;
          break;
        }
      }

      // 向上查找包含按钮的父元素
      let parent = match.parentElement;
      let level = 0;

      while (parent && level < 10) {
        if (parent.querySelectorAll('button').length > 0) {
          break;
        }
        parent = parent.parentElement;
        level++;
      }

      return {
        targetEl: parent,
        buttons: Array.from(parent.querySelectorAll('button'))
      };
    });

    await targetEl.hover();
    await grokPage.waitForTimeout(2000);

    // 点击第一个可见的按钮
    const firstVisibleIdx = visibleIndices[0];
    const buttonHandle = await buttons.nth(firstVisibleIdx);

    console.log(`🖱️ 点击第 [${firstVisibleIdx}] 个按钮...`);
    await buttonHandle.click();

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
