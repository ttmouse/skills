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

    // 找到可见的 cls-btn-edit-preview 按钮
    const editButton = await grokPage.$('button.cls-btn-edit-preview >> visible=true');

    if (!editButton) {
      console.log('❌ 未找到可见的编辑按钮');
      await browser.close();
      process.exit(1);
    }

    console.log('✅ 找到编辑按钮');

    console.log('🖱️ 点击编辑按钮...');
    await editButton.click();

    console.log('⏳ 等待 3 秒...');
    await grokPage.waitForTimeout(3000);

    // 检查是否有可编辑的区域
    const editables = await grokPage.$$('div[contenteditable="true"], textarea[role="textbox"]');

    console.log(`\n📋 找到 ${editables.length} 个可编辑区域:`);

    for (let i = 0; i < editables.length; i++) {
      const editable = editables[i];
      const text = await editable.textContent();
      const isFocused = await editable.evaluate(e => document.activeElement === e);

      console.log(`\n[${i}] ${isFocused ? '⭐ 聚焦' : ''}`);
      console.log(`    文本: ${text?.substring(0, 100) || 'N/A'}...`);
    }

    console.log('\n✅ 完成');

    await browser.close();
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
})();
