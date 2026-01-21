const { chromium } = require('playwright');

(async () => {
  try {
    console.log('🔍 连接浏览器...');
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const pages = browser.contexts()[0].pages();
    const grokPage = pages.find(page => page.url().includes('conversation=2011046911403573376'));

    if (!grokPage) {
      console.log('❌ 未找到 Grok 对话');
      await browser.close();
      process.exit(1);
    }

    console.log('✅ 找到 Grok 对话\n');

    // 截图
    await grokPage.screenshot({ path: '/Users/douba/twitter-output/dialog-screenshot.png' });
    console.log('📸 截图已保存');

    // 找到对话区域并滚动到顶部
    await grokPage.evaluate(() => {
      // 尝试找对话滚动容器
      const scrollContainers = Array.from(document.querySelectorAll('div[role="complementary"], div[role="main"], main'));
      scrollContainers.forEach(container => {
        container.scrollTop = 0;
      });

      // 同时查找可能的对话列表
      const dialogLists = Array.from(document.querySelectorAll('div[role="log"], div[aria-label*="message"]'));
      dialogLists.forEach(list => list.scrollTop = 0);

      return {
        scrollContainers: scrollContainers.length,
        dialogLists: dialogLists.length
      };
    });

    // 等待
    await grokPage.waitForTimeout(2000);

    // 再次截图
    await grokPage.screenshot({ path: '/Users/douba/twitter-output/dialog-screenshot2.png' });
    console.log('📸 滚动后截图已保存\n');

    // 找到对话中的所有文本
    const dialogContent = await grokPage.evaluate(() => {
      const allTextElements = Array.from(document.querySelectorAll('*'));

      // 过滤出可能是对话内容的元素
      const contentElements = allTextElements.filter(el => {
        const text = el.innerText || '';

        // 排除导航、菜单等
        if (text.includes('Home') || text.includes('Explore') ||
            text.includes('Notifications') || text.includes('Chat') ||
            text.includes('Grok') || text.includes('Premium') ||
            text.includes('Post') || text.includes('Bookmarks')) {
          return false;
        }

        // 只保留中等长度的文本
        return text.length > 50 && text.length < 5000;
      });

      // 去重并返回前 10 个
      const unique = [];
      const seen = new Set();

      contentElements.forEach(el => {
        const text = el.innerText.substring(0, 300);
        if (!seen.has(text)) {
          seen.add(text);
          unique.push(text);
        }
      });

      return unique.slice(0, 10);
    });

    console.log(`📋 对话内容 (${dialogContent.length} 条):\n`);

    dialogContent.forEach((text, idx) => {
      console.log(`[${idx}]`);
      console.log(`    ${text}...`);
      console.log('');
    });

    await browser.close();
    console.log('✅ 完成');
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    process.exit(1);
  }
})();
