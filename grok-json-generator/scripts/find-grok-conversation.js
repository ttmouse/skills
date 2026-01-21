const { chromium } = require('playwright');

async function main() {
  try {
    console.log('🔍 连接浏览器...');
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const pages = browser.contexts()[0].pages();

    console.log(`\n📋 当前有 ${pages.length} 个页面:\n`);

    pages.forEach((page, idx) => {
      console.log(`[${idx}] ${page.title()}`);
      console.log(`     ${page.url()}`);
      console.log('');
    });

    // 查找 Grok 相关页面
    const grokPages = pages.filter(page => page.url().includes('grok'));

    console.log(`📋 找到 ${grokPages.length} 个 Grok 页面:\n`);

    if (grokPages.length === 0) {
      console.log('⚠️ 没有找到 Grok 对话页面');
      console.log('💡 请手动打开一个新的 Grok 对话：https://x.com/i/grok\n');
    } else {
      grokPages.forEach((page, idx) => {
        console.log(`[${idx}] ${page.title()}`);
        console.log(`     ${page.url()}`);
        console.log('');
      });
    }

    await browser.close();
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    process.exit(1);
  }
}

main();
