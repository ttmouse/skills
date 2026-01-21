const { chromium } = require('playwright');

async function main() {
  try {
    console.log('🔍 连接浏览器...');
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const pages = browser.contexts()[0].pages();
    const grokPage = pages.find(page => page.url().includes('/i/grok'));

    if (!grokPage) {
      console.log('❌ 未找到 Grok 页面');
      await browser.close();
      return;
    }

    console.log('✅ 找到 Grok 页面\n');

    // 查找发送按钮
    const result = await grokPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));

      const sendButtons = buttons.filter(btn => {
        const text = btn.textContent?.toLowerCase() || '';
        const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
        const className = btn.className?.toLowerCase() || '';

        return (
          text.includes('send') ||
          text.includes('发送') ||
          ariaLabel.includes('send') ||
          ariaLabel.includes('发送') ||
          className.includes('send')
        );
      });

      return sendButtons.map(btn => ({
        text: btn.textContent?.substring(0, 50),
        ariaLabel: btn.getAttribute('aria-label')?.substring(0, 50),
        className: btn.className?.substring(0, 50),
        visible: btn.offsetParent !== null
      }));
    });

    console.log(`📋 找到 ${result.length} 个发送按钮:\n`);

    const visibleSendButtons = result.filter(btn => btn.visible);

    visibleSendButtons.forEach((btn, idx) => {
      console.log(`[${idx}] ${btn.text || btn.ariaLabel}`);
      console.log(`    visible: ${btn.visible}`);
      console.log('');
    });

    if (visibleSendButtons.length === 0) {
      console.log('⚠️ 没有找到可见的发送按钮');
      console.log('💡 可能消息已经在发送中，或者需要手动操作\n');
    } else {
      console.log('💡 发现发送按钮，说明可能需要重新发送消息\n');
      console.log('⚠️ 根据安全原则，我不会自动点击发送按钮');
      console.log('👆 请手动点击发送按钮，或者告诉我是否需要重新发送\n');
    }

    await browser.close();
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    process.exit(1);
  }
}

main();
