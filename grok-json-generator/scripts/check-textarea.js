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

    // 检查文本框
    const result = await grokPage.evaluate(() => {
      const textareas = Array.from(document.querySelectorAll('textarea'));

      return textareas.map(ta => ({
        value: ta.value?.substring(0, 100) || '',
        placeholder: ta.placeholder?.substring(0, 50) || '',
        visible: ta.offsetParent !== null,
        disabled: ta.disabled,
        readOnly: ta.readOnly
      }));
    });

    console.log('📋 页面上所有文本框:\n');

    result.forEach((ta, idx) => {
      if (ta.visible) {
        console.log(`[${idx}] ${ta.visible ? '✅ 可见' : '❌ 不可见'}`);
        console.log(`    value: ${ta.value || '(空)'}`);
        console.log(`    placeholder: ${ta.placeholder || '(无)'}`);
        console.log(`    disabled: ${ta.disabled}`);
        console.log(`    readOnly: ${ta.readOnly}`);
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
