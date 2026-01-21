const { chromium } = require('playwright');

(async () => {
  try {
    console.log('🔍 连接浏览器...\n');
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const pages = browser.contexts()[0].pages();
    const grokPage = pages.find(page => page.url().includes('conversation=2011046911403573376'));

    if (!grokPage) {
      console.log('❌ 未找到 Grok 对话');
      await browser.close();
      process.exit(1);
    }

    console.log('✅ 找到 Grok 对话\n');

    const result = await grokPage.evaluate(() => {
      const targetText = '直接在代码块中输出JSON数组';
      const allElements = Array.from(document.querySelectorAll('*'));

      const results = [];

      allElements.forEach(el => {
        const innerText = el.innerText || '';

        if (innerText.includes(targetText) && innerText.length < 5000) {
          // 提取所有链接
          const links = innerText.match(/https?:\/\/\S+/g) || [];

          results.push({
            text: innerText.substring(0, 200),
            links: links,
            hasLink: links.length > 0
          });
        }
      });

      // 去重
      const unique = results.filter((item, index, self) =>
        index === self.findIndex((t) => t.text === item.text)
      );

      return unique.slice(0, 10);
    });

    console.log(`📋 找到 ${result.length} 个包含目标文本的元素:\n`);

    result.forEach((item, idx) => {
      console.log(`[${idx}] ${item.hasLink ? '✅ 包含链接' : '❌ 无链接'}`);
      console.log(`    文本: ${item.text}...`);
      if (item.hasLink) {
        console.log(`    链接: ${item.links.join(', ')}`);
      }
      console.log('');
    });

    await browser.close();
    console.log('✅ 完成');
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    process.exit(1);
  }
})();
