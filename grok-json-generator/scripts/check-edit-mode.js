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

    // 检查是否有可编辑的输入框
    const editableAreas = await grokPage.evaluate(() => {
      // 查找所有可编辑的区域
      const editables = Array.from(document.querySelectorAll(
        'div[contenteditable="true"], textarea[role="textbox"], input[type="text"]'
      ));

      return editables.map((area, idx) => ({
        index: idx,
        tagName: area.tagName,
        role: area.getAttribute('role'),
        placeholder: area.getAttribute('placeholder'),
        isFocused: document.activeElement === area,
        className: area.className?.substring(0, 100),
        text: area.textContent?.substring(0, 100)
      }));
    });

    console.log(`📋 找到 ${editableAreas.length} 个可编辑区域:\n`);

    editableAreas.forEach(area => {
      const focus = area.isFocused ? '✅ 聚焦' : '';
      console.log(`[${area.index}] ${area.tagName} ${focus}`);
      console.log(`    role: ${area.role || 'N/A'}`);
      console.log(`    placeholder: ${area.placeholder || 'N/A'}`);
      console.log(`    class: ${area.className || 'N/A'}`);
      console.log(`    text: ${area.text || 'N/A'}...`);
      console.log('');
    });

    await browser.close();
    console.log('✅ 完成');
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    process.exit(1);
  }
})();
