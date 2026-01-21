const { chromium } = require('playwright');

(async () => {
  try {
    console.log('🔍 正在连接到浏览器...\n');
    const browser = await chromium.connectOverCDP('http://localhost:9222');

    const contexts = browser.contexts();
    const context = contexts[0];
    const pages = context.pages();

    const grokPage = pages.find(page => page.url().includes('conversation=2011046911403573376'));

    if (!grokPage) {
      console.log('❌ 未找到 Grok 对话页面');
      await browser.close();
      process.exit(1);
    }

    console.log('✅ 找到 Grok 对话页面\n');

    const targetText = '直接在代码块中输出JSON数组';

    // 找到消息元素
    const messageElement = await grokPage.evaluateHandle(({ text }) => {
      const allElements = Array.from(document.querySelectorAll('*'));

      // 过滤掉太大的元素（比如 BODY, HTML）
      for (const el of allElements) {
        const innerText = el.innerText || '';

        // 检查长度和是否包含目标
        if (innerText.includes(text) &&
            innerText.includes('https://x.com/i/status/2010814666331869283') &&
            innerText.length > 50 &&
            innerText.length < 5000) {

          // 排除父级元素
          const childrenText = Array.from(el.children).reduce((acc, child) => acc + (child.innerText || ''), '');
          if (childrenText.length > innerText.length * 0.8) {
            continue; // 这是父元素
          }

          return el;
        }
      }
      return undefined;
    }, { text: targetText });

    if (!messageElement) {
      console.log('❌ 未找到目标消息');
      await browser.close();
      process.exit(1);
    }

    console.log('✅ 找到目标消息');

    // 打印消息信息
    const msgInfo = await grokPage.evaluate((el) => {
      if (!el) return null;
      return {
        tagName: el.tagName,
        className: el.className?.substring(0, 100),
        innerText: el.innerText?.substring(0, 200),
        childElementCount: el.children.length
      };
    }, messageElement).then(v => v).catch(e => null);

    if (!msgInfo) {
      console.log('⚠️ 无法获取消息信息');
    } else {
      console.log(`标签: ${msgInfo.tagName}`);
      console.log(`class: ${msgInfo.className || 'N/A'}`);
      console.log(`文本: ${msgInfo.innerText}...\n`);
    }

    // 悬停
    console.log('🖱️ 悬停到消息...');
    await messageElement.hover();
    await grokPage.waitForTimeout(2000);

    // 查找悬停后的按钮
    console.log('🔍 查找悬停后的按钮...');
    const buttonsAfterHover = await grokPage.evaluateHandle((targetEl) => {
      if (!targetEl) return [];
      const buttons = Array.from(targetEl.querySelectorAll('button'));
      return buttons.map((btn, idx) => ({
        index: idx,
        ariaLabel: btn.getAttribute('aria-label'),
        text: btn.textContent?.substring(0, 30),
        className: btn.className?.substring(0, 100)
      }));
    }, messageElement).then(h => h.jsonValue());

    console.log(`找到 ${buttonsAfterHover.length} 个按钮:`);
    buttonsAfterHover.forEach(btn => {
      console.log(`  [${btn.index}] aria-label: "${btn.ariaLabel || 'N/A'}", text: "${btn.text}"`);
    });

    // 查找并点击编辑按钮
    const editButton = await grokPage.evaluateHandle((targetEl) => {
      if (!targetEl) return null;
      const buttons = Array.from(targetEl.querySelectorAll('button'));
      for (const btn of buttons) {
        const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
        const text = (btn.textContent || '').toLowerCase();
        const className = (btn.className || '').toLowerCase();

        if (ariaLabel.includes('edit') || text.includes('编辑') || className.includes('edit')) {
          return btn;
        }
      }
      return null;
    }, messageElement);

    if (!editButton) {
      console.log('❌ 未找到编辑按钮');
      await browser.close();
      process.exit(1);
    }

    console.log('\n✅ 找到编辑按钮，点击...');
    await editButton.click();

    // 等待页面更新
    console.log('⏳ 等待 5 秒...');
    await grokPage.waitForTimeout(5000);

    // 检查所有可编辑区域
    console.log('\n📋 检查所有可编辑区域:');
    const allEditables = await grokPage.evaluate(() => {
      const editables = Array.from(document.querySelectorAll(
        'div[contenteditable="true"], textarea[role="textbox"], textarea'
      ));

      return editables.map((area, idx) => ({
        index: idx,
        tagName: area.tagName,
        role: area.getAttribute('role'),
        isFocused: document.activeElement === area,
        text: area.textContent?.substring(0, 150),
        className: area.className?.substring(0, 100)
      }));
    });

    allEditables.forEach(area => {
      const focus = area.isFocused ? ' ⭐' : '';
      console.log(`[${area.index}] ${area.tagName}${focus}`);
      console.log(`    text: ${area.text}...`);
      console.log(`    class: ${area.className}`);
    });

    await browser.close();
    console.log('\n✅ 测试完成');
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
})();
