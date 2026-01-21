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

    // 找到包含目标文本的消息
    const targetMessage = await grokPage.evaluateHandle(() => {
      const targetText = '请严格按照以下JSON结构，为我提供的每个X帖子生成标签。';
      const link1 = 'https://x.com/i/status/2010814666331869283';

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

        // 排除父元素
        const childrenText = Array.from(el.children).reduce((acc, child) => acc + (child.innerText || ''), '');
        if (childrenText.length > innerText.length * 0.8) {
          return;
        }

        // 选择文本长度最小的
        if (innerText.length < bestScore) {
          bestMatch = el;
          bestScore = innerText.length;
        }
      });

      return bestMatch;
    });

    if (!targetMessage) {
      console.log('❌ 未找到目标消息');
      await browser.close();
      process.exit(1);
    }

    console.log('✅ 找到目标消息\n');

    // 悬停到消息
    console.log('🖱️ 悬停到消息...');
    await targetMessage.asElement().hover();
    await grokPage.waitForTimeout(2000);

    // 悬停后查找编辑图标按钮
    console.log('🔍 查找编辑图标按钮...\n');

    const allButtons = await grokPage.$$('button');

    for (let i = 0; i < allButtons.length; i++) {
      const btn = allButtons[i];

      // 检查是否包含编辑图标
      const hasEditIcon = await btn.evaluate(button => {
        const svg = button.querySelector('svg');
        if (!svg) return false;

        const path = svg.querySelector('path');
        if (!path) return false;

        const d = path.getAttribute('d');

        return d && d.includes('M21 18s-1.334 1.544') && d.includes('m7.414-15.13');
      });

      if (hasEditIcon) {
        const isVisible = await btn.evaluate(b => b.offsetParent !== null);

        console.log(`[${i}] 编辑图标按钮: ${isVisible ? '✅ 可见' : '❌ 不可见'}`);

        if (isVisible) {
          console.log('\n🖱️ 点击编辑按钮...');
          await btn.click();

          console.log('⏳ 等待 3 秒...');
          await grokPage.waitForTimeout(3000);

          // 检查编辑模式
          const editables = await grokPage.$$('div[contenteditable="true"]');

          console.log(`\n📋 编辑模式激活: ${editables.length > 0 ? '✅' : '❌'}`);

          if (editables.length > 0) {
            const text = await editables[0].textContent();
            const isFocused = await editables[0].evaluate(e => document.activeElement === e);

            console.log(`    聚焦: ${isFocused ? '✅' : '❌'}`);
            console.log(`    文本: ${text?.substring(0, 200)}...`);

            if (isFocused) {
              console.log('\n✅ 成功进入编辑模式');
              await browser.close();
              return;
            }
          }

          break;
        }
      }
    }

    console.log('\n❌ 未找到可见的编辑按钮');
    await browser.close();
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
})();
