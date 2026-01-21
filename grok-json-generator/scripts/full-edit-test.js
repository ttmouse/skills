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

    const targetText = '直接在代码块中输出JSON数组';
    const linkText = 'https://x.com/i/status/2010814666331869283';

    // 找到消息元素
    const messageElement = await grokPage.evaluateHandle(({ text, link }) => {
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

    console.log('✅ 找到目标消息');

    // 悬停
    console.log('🖱️ 悬停到消息...');
    await messageElement.hover();
    await grokPage.waitForTimeout(1500);

    // 查找编辑按钮
    const editButton = await grokPage.evaluateHandle(({ msgEl }) => {
      const buttons = msgEl.querySelectorAll('button');
      for (const btn of buttons) {
        const ariaLabel = btn.getAttribute('aria-label') || '';
        const text = btn.textContent || '';

        if (ariaLabel.toLowerCase().includes('edit') ||
            ariaLabel.toLowerCase().includes('编辑') ||
            text.includes('编辑') ||
            text.includes('Edit')) {
          return btn;
        }
      }
      return null;
    }, { msgEl: messageElement });

    if (!editButton) {
      console.log('❌ 未找到编辑按钮');

      const buttonsInfo = await grokPage.evaluate(({ msgEl }) => {
        const buttons = Array.from(msgEl.querySelectorAll('button'));
        return buttons.map((btn, idx) => ({
          index: idx,
          ariaLabel: btn.getAttribute('aria-label'),
          text: btn.textContent?.substring(0, 30)
        }));
      }, { msgEl: messageElement });

      console.log('\n消息内的按钮:');
      buttonsInfo.forEach(btn => {
        console.log(`  [${btn.index}] aria-label: "${btn.ariaLabel}", text: "${btn.text}"`);
      });

      await browser.close();
      process.exit(1);
    }

    console.log('✅ 找到编辑按钮');

    // 点击编辑按钮
    console.log('🖱️ 点击编辑按钮...');
    await editButton.click();

    // 等待编辑模式激活
    console.log('⏳ 等待编辑模式激活...');
    await grokPage.waitForTimeout(5000);

    // 查找编辑输入框
    const editInput = await grokPage.evaluateHandle(() => {
      // 查找最近激活的可编辑区域
      const editables = Array.from(document.querySelectorAll(
        'div[contenteditable="true"], textarea[role="textbox"]'
      ));

      // 查找包含目标文本的可编辑区域
      for (const area of editables) {
        if (area.textContent && area.textContent.includes('直接在代码块中输出JSON数组')) {
          return area;
        }
      }

      // 返回最后一个可编辑区域（可能是新创建的）
      return editables.length > 0 ? editables[editables.length - 1] : null;
    });

    if (!editInput) {
      console.log('❌ 未找到编辑输入框');

      // 列出所有可编辑区域
      const allEditables = await grokPage.evaluate(() => {
        const editables = Array.from(document.querySelectorAll(
          'div[contenteditable="true"], textarea[role="textbox"], textarea'
        ));
        return editables.map((area, idx) => ({
          index: idx,
          tagName: area.tagName,
          role: area.getAttribute('role'),
          text: area.textContent?.substring(0, 100),
          className: area.className?.substring(0, 100)
        }));
      });

      console.log('\n所有可编辑区域:');
      allEditables.forEach(area => {
        console.log(`  [${area.index}] ${area.tagName}`);
        console.log(`    role: ${area.role}`);
        console.log(`    text: ${area.text}...`);
        console.log(`    class: ${area.className}`);
      });

      await browser.close();
      process.exit(1);
    }

    console.log('✅ 找到编辑输入框');

    // 获取当前内容
    const currentContent = await grokPage.evaluate(({ input }) => {
      return input.textContent || '';
    }, { input: editInput });

    console.log('\n📄 当前编辑内容:');
    console.log(currentContent.substring(0, 200));

    await browser.close();
    console.log('\n✅ 测试完成');
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
})();
