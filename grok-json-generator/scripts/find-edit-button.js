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

    // 精准查找：找到包含用户消息的容器，然后查找编辑按钮
    const buttonInfo = await grokPage.evaluate(() => {
      const targetText = '直接在代码块中输出JSON数组';

      // 找到包含目标文本的元素
      const targetElement = Array.from(document.querySelectorAll('*')).find(el => {
        const text = el.innerText;
        return text && text.includes(targetText) && text.includes('https://x.com/i/status/2010814666331869283');
      });

      if (!targetElement) {
        return { found: false, message: '未找到目标消息' };
      }

      // 从目标元素向上查找，找到消息容器
      let container = targetElement;
      let levels = 0;
      while (container && levels < 10) {
        const hasEditButton = container.querySelector('button');
        if (hasEditButton) {
          break;
        }
        container = container.parentElement;
        levels++;
      }

      if (!container) {
        return { found: false, message: '未找到包含按钮的容器' };
      }

      // 列出容器内的所有按钮
      const buttons = Array.from(container.querySelectorAll('button'));
      const buttonDetails = buttons.map((btn, idx) => ({
        index: idx,
        ariaLabel: btn.getAttribute('aria-label'),
        textContent: btn.textContent?.substring(0, 50),
        className: btn.className?.substring(0, 100),
        dataTestId: btn.getAttribute('data-testid')
      }));

      // 列出容器的 DOM 路径
      const path = [];
      let current = container;
      while (current && current !== document.body) {
        const tagName = current.tagName;
        const dataTestId = current.getAttribute('data-testid');
        const className = current.className?.substring(0, 50);
        path.unshift({ tagName, dataTestId, className });
        current = current.parentElement;
        if (path.length > 10) break;
      }

      return {
        found: true,
        containerInfo: {
          tagName: container.tagName,
          dataTestId: container.getAttribute('data-testid'),
          className: container.className?.substring(0, 100),
          innerText: container.innerText?.substring(0, 200)
        },
        buttons: buttonDetails,
        domPath: path
      };
    });

    if (!buttonInfo.found) {
      console.log(`❌ ${buttonInfo.message}`);
      await browser.close();
      process.exit(1);
    }

    console.log('✅ 找到消息容器:\n');
    console.log(`标签: ${buttonInfo.containerInfo.tagName}`);
    console.log(`data-testid: ${buttonInfo.containerInfo.dataTestId}`);
    console.log(`className: ${buttonInfo.containerInfo.className}`);
    console.log(`文本: ${buttonInfo.containerInfo.innerText}...\n`);

    console.log('--- DOM 路径 ---\n');
    buttonInfo.domPath.forEach((item, i) => {
      console.log(`[${i}] ${item.tagName} (data-testid: ${item.dataTestId || 'N/A'}, class: ${item.className || 'N/A'})`);
    });

    console.log('\n--- 容器内的按钮 ---\n');
    if (buttonInfo.buttons.length === 0) {
      console.log('❌ 没有找到按钮');
    } else {
      buttonInfo.buttons.forEach(btn => {
        console.log(`按钮 [${btn.index}]:`);
        console.log(`  aria-label: "${btn.ariaLabel || 'N/A'}"`);
        console.log(`  文本: "${btn.textContent || 'N/A'}"`);
        console.log(`  data-testid: ${btn.dataTestId || 'N/A'}`);
        console.log(`  class: ${btn.className || 'N/A'}`);
        console.log('');
      });
    }

    await browser.close();
    console.log('✅ 检查完成');
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
})();
