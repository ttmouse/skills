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

    // 查找所有包含"编辑"或"Edit"的按钮
    const result = await grokPage.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('button'));

      const editButtons = [];

      allButtons.forEach((btn, idx) => {
        const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
        const text = (btn.textContent || '').toLowerCase();
        const className = (btn.className || '').toLowerCase();
        const visible = btn.offsetParent !== null;

        if (ariaLabel.includes('edit') ||
            text.includes('编辑') ||
            text.includes('edit') ||
            className.includes('edit')) {

          editButtons.push({
            index: idx,
            ariaLabel: btn.getAttribute('aria-label'),
            text: btn.textContent?.substring(0, 50),
            className: btn.className?.substring(0, 150),
            visible
          });
        }
      });

      return editButtons;
    });

    console.log(`📋 找到 ${result.length} 个编辑相关按钮:\n`);

    result.forEach(btn => {
      const status = btn.visible ? '✅' : '❌';
      console.log(`[${btn.index}] ${status}`);
      console.log(`    aria-label: "${btn.ariaLabel || 'N/A'}"`);
      console.log(`    text: "${btn.text || 'N/A'}"`);
      console.log(`    class: ${btn.className}`);
      console.log('');
    });

    // 查找所有 cls-btn-edit 按钮
    const result2 = await grokPage.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('button'));

      const editButtons = [];

      allButtons.forEach((btn, idx) => {
        const className = btn.className || '';

        if (className.includes('cls-btn-edit')) {
          editButtons.push({
            index: idx,
            text: btn.textContent?.substring(0, 50),
            className: btn.className?.substring(0, 150),
            visible: btn.offsetParent !== null
          });
        }
      });

      return editButtons;
    });

    console.log(`📋 找到 ${result2.length} 个 cls-btn-edit 按钮:\n`);

    result2.forEach(btn => {
      const status = btn.visible ? '✅' : '❌';
      console.log(`[${btn.index}] ${status} text: "${btn.text}"`);
      console.log(`    class: ${btn.className}`);
      console.log('');
    });

    await browser.close();
    console.log('✅ 完成');
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
})();
