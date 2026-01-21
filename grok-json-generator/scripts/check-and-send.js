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

    // 检查是否有发送按钮
    const result = await grokPage.evaluate(() => {
      // 滚动到底部
      window.scrollTo(0, document.body.scrollHeight);

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

      return {
        sendButtonCount: sendButtons.length,
        hasTextarea: !!document.querySelector('textarea'),
        textareaVisible: !!document.querySelector('textarea[style*="display: none"]') === false
      };
    });

    console.log('📋 页面状态:\n');
    console.log(`   发送按钮数: ${result.sendButtonCount}`);
    console.log(`   文本框存在: ${result.hasTextarea}`);
    console.log(`   文本框可见: ${result.textareaVisible}\n`);

    if (result.sendButtonCount > 0) {
      console.log('💡 发现发送按钮，说明可能需要重新发送消息\n');
      console.log('⚠️ 根据安全原则，我不会自动点击发送按钮');
      console.log('👆 请手动点击发送按钮，然后重新运行脚本\n');
    } else {
      console.log('⚠️ 没有找到发送按钮，可能有其他问题\n');
      console.log('💡 请检查 Grok 页面状态\n');
    }

    await browser.close();
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    process.exit(1);
  }
}

main();
