const { chromium } = require('playwright');

async function main() {
  try {
    console.log('🔍 检查所有可能的选择器...\n');

    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const pages = browser.contexts()[0].pages();
    const grokPage = pages.find(page => page.url().includes('/i/grok'));

    if (!grokPage) {
      console.log('❌ 未找到 Grok 页面');
      await browser.close();
      return;
    }

    console.log('✅ 找到 Grok 页面\n');

    // 检查所有可能的选择器
    const result = await grokPage.evaluate(() => {
      // 滚动到顶部
      window.scrollTo(0, 0);

      const selectors = [
        '[data-testid="tweet"]',
        '[data-testid="cellInnerDiv"]',
        '[role="article"]',
        '[data-testid="primaryColumn"]',
        '[data-testid="primaryColumn"] article',
        '[data-testid="tweet"] article',
        '.r-kemksi'
      ];

      const results = selectors.map(selector => {
        const elements = Array.from(document.querySelectorAll(selector));
        return {
          selector,
          count: elements.length,
          firstElementHasPrompt: elements.length > 0 ? (elements[0].innerText || '').includes('二级子类：从以下完整列表中选最贴合的') : false
        };
      });

      return results;
    });

    console.log('📋 所有选择器的匹配结果:\n');

    result.forEach((res, idx) => {
      console.log(`[${idx}] ${res.selector}`);
      console.log(`    元素数量: ${res.count}`);
      console.log(`    首元素包含提示词: ${res.firstElementHasPrompt}`);
      console.log('');
    });

    await browser.close();
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    process.exit(1);
  }
}

main();
