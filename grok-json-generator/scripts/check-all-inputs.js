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

    // 等待页面稳定
    await grokPage.waitForTimeout(2000);

    // 检查所有可能的输入框
    const result = await grokPage.evaluate(() => {
      // 查找所有可编辑的元素
      const editables = Array.from(document.querySelectorAll(
        'div[contenteditable="true"], ' +
        'textarea, ' +
        'input[type="text"], ' +
        'input[type="search"], ' +
        '[role="textbox"], ' +
        '[contenteditable]'
      ));

      return editables.map((el, idx) => ({
        index: idx,
        tagName: el.tagName,
        type: el.getAttribute('type'),
        role: el.getAttribute('role'),
        contenteditable: el.getAttribute('contenteditable'),
        placeholder: el.getAttribute('placeholder'),
        isFocused: document.activeElement === el,
        visible: el.offsetParent !== null,
        text: el.textContent?.substring(0, 100),
        value: el.value?.substring(0, 100),
        className: el.className?.substring(0, 100)
      }));
    });

    console.log(`📋 页面上有 ${result.length} 个输入框:\n`);

    result.forEach(input => {
      if (input.visible) {
        const focus = input.isFocused ? ' ⭐ 聚焦' : '';
        console.log(`[${input.index}] ${input.tagName}${focus}`);
        console.log(`    type: ${input.type || 'N/A'}`);
        console.log(`    role: ${input.role || 'N/A'}`);
        console.log(`    contenteditable: ${input.contenteditable || 'N/A'}`);
        console.log(`    placeholder: ${input.placeholder || 'N/A'}`);
        console.log(`    text/value: ${input.text || input.value || 'N/A'}...`);
        console.log(`    class: ${input.className}`);
        console.log('');
      }
    });

    console.log('✅ 完成');
    await browser.close();
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
})();
