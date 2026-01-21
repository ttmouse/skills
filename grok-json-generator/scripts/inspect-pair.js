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

    // 获取更详细的消息列表
    const messages = await grokPage.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('*'));

      // 查找所有包含文本的重要元素
      const result = [];

      allElements.forEach((el, index) => {
        const text = el.innerText?.trim();
        if (!text || text.length < 10 || text.length > 5000) return;

        // 检查关键特征
        const hasLink = text.includes('https://x.com/');
        const hasJSON = text.includes('{') || text.includes('[');
        const hasUserAvatar = !!el.querySelector('[data-testid="UserAvatar"]');
        const hasEditButton = el.querySelector('button[aria-label*="Edit"], button[aria-label*="编辑"]');

        // 只记录重要的元素
        if (hasLink || hasJSON || hasUserAvatar) {
          result.push({
            index,
            isUser: hasUserAvatar,
            text: text.substring(0, 400),
            hasLink,
            hasJSON,
            hasEditButton,
            tagName: el.tagName,
            className: el.className?.substring(0, 100),
            dataTestId: el.getAttribute('data-testid')
          });
        }
      });

      return result;
    });

    console.log(`📋 找到 ${messages.length} 个相关消息元素:\n`);

    messages.forEach((msg, i) => {
      const type = msg.isUser ? '👤 用户' : '🤖 AI';
      const badges = [];
      if (msg.hasLink) badges.push('链接');
      if (msg.hasJSON) badges.push('JSON');
      if (msg.hasEditButton) badges.push('可编辑');

      console.log(`[${msg.index}] ${type} ${badges.length > 0 ? `[${badges.join(', ')}]` : ''}`);
      console.log(`    ${msg.text.substring(0, 150)}...`);
      console.log('');
    });

    // 特别关注包含 "https://x.com/i/status/2010814666331869283" 的元素
    console.log('--- 查找特定链接 ---\n');

    const targetLink = '2010814666331869283';
    const withTargetLink = messages.filter(m => m.text.includes(targetLink));

    if (withTargetLink.length > 0) {
      console.log(`✅ 找到包含 ${targetLink} 的消息:\n`);
      withTargetLink.forEach(msg => {
        const type = msg.isUser ? '👤 用户' : '🤖 AI';
        console.log(`[${msg.index}] ${type}`);
        console.log(`    ${msg.text.substring(0, 300)}...`);
        console.log(`    可编辑: ${msg.hasEditButton ? '✅ 是' : '❌ 否'}`);
        console.log('');
      });
    } else {
      console.log(`❌ 未找到包含 ${targetLink} 的消息\n`);
    }

    await browser.close();
    console.log('✅ 检查完成');
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
})();
