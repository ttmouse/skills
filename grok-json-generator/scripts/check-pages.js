const { chromium } = require('playwright');

(async () => {
  try {
    console.log('🔍 连接浏览器...');
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const pages = browser.contexts()[0].pages();

    console.log(`\n📋 当前有 ${pages.length} 个页面:\n`);

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      console.log(`[${i}]`);
      console.log(`    URL: ${page.url()}`);
      const title = await page.title();
      console.log(`    标题: ${title}`);
      console.log('');
    }

    await browser.close();
    console.log('✅ 完成');
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    process.exit(1);
  }
})();
