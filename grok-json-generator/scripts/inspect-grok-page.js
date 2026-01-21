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

    // 检查页面上的所有可见文本
    const result = await grokPage.evaluate(() => {
      // 查找所有可见的消息
      const messages = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.innerText || '';
        return text.length > 50 && text.length < 5000 && el.offsetParent !== null;
      });

      // 找到最长的 5 条消息
      const sorted = messages
        .sort((a, b) => (b.innerText || '').length - (a.innerText || '').length)
        .slice(0, 5);

      return sorted.map(el => ({
        tagName: el.tagName,
        text: el.innerText.substring(0, 300),
        length: el.innerText.length
      }));
    });

    console.log('📋 页面上最长的 5 条消息:\n');

    result.forEach((msg, idx) => {
      console.log(`[${idx}] ${msg.tagName} (${msg.length} 字符)`);
      console.log(`    ${msg.text}...`);
      console.log('');
    });

    console.log('💡 请告诉我：当前 Grok 对话的状态如何？\n');

    await browser.close();
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    process.exit(1);
  }
}

main();
