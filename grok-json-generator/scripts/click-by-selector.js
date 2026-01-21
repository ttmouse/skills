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

    // 查找所有 cls-btn-edit-preview 按钮
    const buttons = await grokPage.$$('button.cls-btn-edit-preview');

    console.log(`📋 找到 ${buttons.length} 个 cls-btn-edit-preview 按钮\n`);

    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      const visible = await btn.evaluate(b => {
        return b.offsetParent !== null &&
               getComputedStyle(b).display !== 'none' &&
               getComputedStyle(b).visibility !== 'hidden';
      });

      console.log(`[${i}] 可见: ${visible ? '✅' : '❌'}`);

      if (visible) {
        console.log(`🖱️ 点击第 [${i}] 个按钮...`);
        await btn.click();
        await grokPage.waitForTimeout(3000);

        // 检查编辑模式
        const editables = await grokPage.$$('div[contenteditable="true"]');
        console.log(`\n📋 编辑模式激活: ${editables.length > 0 ? '✅' : '❌'}`);

        if (editables.length > 0) {
          for (let j = 0; j < Math.min(3, editables.length); j++) {
            const text = await editables[j].textContent();
            console.log(`  [${j}] 文本: ${text?.substring(0, 100)}...`);
          }
        }

        break;
      }
    }

    console.log('\n✅ 完成');
    await browser.close();
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
})();
