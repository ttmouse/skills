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

    // 截图保存
    const screenshotPath = '/Users/douba/twitter-output/grok-debug-screenshot.png';
    await grokPage.screenshot({ path: screenshotPath, fullPage: false });

    console.log(`📸 截图已保存: ${screenshotPath}`);
    console.log('\n请查看截图，找到包含"直接在代码块中输出JSON数组"的消息。');
    console.log('然后告诉我编辑按钮旁边有什么标识（比如按钮的 aria-label）。\n');

    await browser.close();
    console.log('✅ 完成');
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    process.exit(1);
  }
})();
