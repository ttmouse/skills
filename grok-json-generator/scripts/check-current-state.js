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

    // 滚动到底部
    await grokPage.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await grokPage.waitForTimeout(2000);

    // 查找所有消息
    const result = await grokPage.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('*'));

      // 查找所有可见的、包含较长文本的元素
      const longTextElements = allElements.filter(el => {
        const text = el.innerText || '';
        const childrenText = Array.from(el.children).reduce((acc, child) => acc + (child.innerText || ''), '');

        return (
          el.offsetParent !== null &&
          text.length > 100 &&
          text.length < 10000 &&
          childrenText.length < text.length * 0.8
        );
      });

      // 按文本长度排序，取最长的 5 个
      const sorted = longTextElements
        .sort((a, b) => (b.innerText || '').length - (a.innerText || '').length)
        .slice(0, 5);

      return sorted.map(el => ({
        tagName: el.tagName,
        text: el.innerText.substring(0, 400),
        length: el.innerText.length
      }));
    });

    console.log(`📋 页面上最长的 5 条消息:\n`);

    result.forEach((msg, idx) => {
      console.log(`[${idx}] ${msg.tagName} (${msg.length} 字符)`);
      console.log(`    ${msg.text.substring(0, 200)}...`);
      console.log('');
    });

    console.log('💡 请告诉我：当前的 Grok 对话状态如何？\n');
    console.log('   1. 是否看到 AI 正在生成响应？');
    console.log('   2. 是否已经有 JSON 响应？');
    console.log('   3. 是否需要重新发送提示词？\n');

    await browser.close();
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    process.exit(1);
  }
}

main();
