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

    // 查找所有包含长文本的元素（可能是用户消息）
    const result = await grokPage.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('*'));

      // 查找所有可见的、包含较长文本的元素
      const longTextElements = allElements.filter(el => {
        const text = el.innerText || '';
        const childrenText = Array.from(el.children).reduce((acc, child) => acc + (child.innerText || ''), '');

        // 必须是可见的、文本长度适中、不能是父元素
        return (
          el.offsetParent !== null &&
          text.length > 100 &&
          text.length < 5000 &&
          childrenText.length < text.length * 0.8
        );
      });

      // 按文本长度排序，取最长的 10 个
      const sorted = longTextElements
        .sort((a, b) => (b.innerText || '').length - (a.innerText || '').length)
        .slice(0, 10);

      return sorted.map(el => ({
        tagName: el.tagName,
        id: el.id,
        className: el.className?.substring(0, 100),
        text: el.innerText.substring(0, 300),
        length: el.innerText.length
      }));
    });

    console.log(`📋 找到 ${result.length} 个可能的用户消息:\n`);

    result.forEach((msg, idx) => {
      console.log(`[${idx}] ${msg.tagName} (${msg.length} 字符)`);
      console.log(`    ${msg.text.substring(0, 150)}...`);
      console.log('');
    });

    console.log('💡 请告诉我：哪个消息是我们的标签生成提示词？\n');
    console.log('   或者是否需要创建一个新的 Grok 对话？\n');

    await browser.close();
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    process.exit(1);
  }
}

main();
