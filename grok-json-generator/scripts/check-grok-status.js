const { chromium } = require('playwright');

async function main() {
  try {
    console.log('🔍 连接浏览器...');
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const pages = browser.contexts()[0].pages();
    const grokPage = pages.find(page => page.url().includes('/i/grok'));

    if (!grokPage) {
      console.log('❌ 未找到 Grok 页面');
      console.log('请手动打开 Grok 对话页面\n');
      await browser.close();
      return;
    }

    console.log('✅ 找到 Grok 页面');
    console.log(`   URL: ${grokPage.url()}\n`);

    // 检查页面上的消息
    console.log('🔍 检查页面内容...\n');

    const messages = await grokPage.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('*'));

      // 查找包含"请严格按照以下JSON结构"的元素
      const targetElements = allElements.filter(el => {
        const text = el.innerText || '';
        return text.includes('请严格按照以下JSON结构') || text.includes('请严格按照以下格式输出');
      });

      return targetElements.map(el => ({
        tagName: el.tagName,
        text: el.innerText.substring(0, 200),
        visible: el.offsetParent !== null
      }));
    });

    console.log(`📋 找到 ${messages.length} 个包含提示词的元素:\n`);

    messages.forEach((msg, idx) => {
      const status = msg.visible ? '✅ 可见' : '❌ 不可见';
      console.log(`[${idx}] ${msg.tagName} ${status}`);
      console.log(`    ${msg.text.substring(0, 100)}...`);
      console.log('');
    });

    console.log('💡 如果找到可见的提示词，说明 Grok 对话正常');
    console.log('   如果没有找到或都不可见，可能需要重新打开 Grok 对话\n');

    await browser.close();
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    process.exit(1);
  }
}

main();
