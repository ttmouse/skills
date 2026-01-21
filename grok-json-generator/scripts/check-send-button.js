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

    // 检查发送按钮
    const result = await grokPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));

      return buttons.map(btn => ({
        text: btn.textContent?.substring(0, 30) || '',
        ariaLabel: btn.getAttribute('aria-label')?.substring(0, 30) || '',
        className: btn.className?.substring(0, 50) || '',
        visible: btn.offsetParent !== null
      }));
    });

    console.log('📋 页面上所有按钮:\n');

    result.forEach((btn, idx) => {
      if (btn.visible) {
        console.log(`[${idx}] ${btn.text || btn.ariaLabel}`);
        console.log(`    class: ${btn.className}`);
        console.log('');
      }
    });

    await browser.close();
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    process.exit(1);
  }
}

main();
