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

    // 找到包含目标文本的元素
    const targetText = '直接在代码块中输出JSON数组';
    const linkText = 'https://x.com/i/status/2010814666331869283';

    const messageElement = await grokPage.evaluateHandle(({ text, link }) => {
      // 查找包含目标文本的元素
      const allElements = Array.from(document.querySelectorAll('*'));
      for (const el of allElements) {
        const innerText = el.innerText || '';
        if (innerText.includes(text) && innerText.includes(link) && innerText.length < 5000) {
          return el;
        }
      }
      return null;
    }, { text: targetText, link: linkText });

    if (!messageElement) {
      console.log('❌ 未找到目标消息');
      await browser.close();
      process.exit(1);
    }

    console.log('✅ 找到目标消息\n');

    // 悬停到消息上
    console.log('🖱️ 鼠标悬停到消息上...');
    await messageElement.hover();
    await grokPage.waitForTimeout(1000);

    // 悬停后查找编辑按钮
    console.log('🔍 查找编辑按钮...');

    const editButton = await grokPage.evaluateHandle(({ msgEl }) => {
      // 在消息元素内查找按钮
      const buttons = msgEl.querySelectorAll('button');

      // 查找可能的编辑按钮
      for (const btn of buttons) {
        const ariaLabel = btn.getAttribute('aria-label') || '';
        const text = btn.textContent || '';

        // 检查是否是编辑相关的按钮
        if (ariaLabel.toLowerCase().includes('edit') ||
            ariaLabel.toLowerCase().includes('编辑') ||
            text.includes('编辑') ||
            text.includes('Edit')) {
          return btn;
        }
      }

      // 如果没找到明确的编辑按钮，查找所有可能的操作按钮
      return buttons.length > 0 ? buttons[0] : null;
    }, { msgEl: messageElement });

    if (!editButton) {
      console.log('❌ 悬停后仍未找到编辑按钮');

      // 打印悬停后消息内的所有按钮
      const buttonsInfo = await grokPage.evaluate(({ msgEl }) => {
        const buttons = Array.from(msgEl.querySelectorAll('button'));
        return buttons.map((btn, idx) => ({
          index: idx,
          ariaLabel: btn.getAttribute('aria-label'),
          text: btn.textContent?.substring(0, 30),
          className: btn.className?.substring(0, 100)
        }));
      }, { msgEl: messageElement });

      console.log('\n消息内的按钮:');
      buttonsInfo.forEach(btn => {
        console.log(`  [${btn.index}] aria-label: "${btn.ariaLabel || 'N/A'}", text: "${btn.text || 'N/A'}"`);
      });

      await browser.close();
      process.exit(1);
    }

    console.log('✅ 找到编辑按钮\n');

    // 点击编辑按钮
    console.log('🖱️ 点击编辑按钮...');
    await editButton.click();
    await grokPage.waitForTimeout(3000);

    console.log('✅ 编辑按钮点击成功\n');

    await browser.close();
    console.log('✅ 完成');
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
})();
