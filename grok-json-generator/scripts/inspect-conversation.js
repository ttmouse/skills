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

    // 获取页面的文本内容
    const pageContent = await grokPage.evaluate(() => {
      // 查找所有消息元素
      const messages = Array.from(document.querySelectorAll('[data-testid^="tweet"], [role="article"]'));

      return messages.map((msg, index) => {
        // 检查是否是用户消息
        const hasAvatar = !!msg.querySelector('[data-testid="UserAvatar"]');
        const text = msg.innerText?.substring(0, 200);

        return {
          index,
          isUser: hasAvatar,
          text,
          buttonCount: msg.querySelectorAll('button').length
        };
      });
    });

    console.log(`📋 对话中共有 ${pageContent.length} 条消息:\n`);

    // 显示前 10 条消息
    pageContent.slice(0, 10).forEach(msg => {
      const type = msg.isUser ? '👤 用户' : '🤖 AI';
      console.log(`[${msg.index}] ${type}`);
      console.log(`    文本: ${msg.text}...`);
      console.log(`    按钮数: ${msg.buttonCount}`);
      console.log('');
    });

    // 获取页面 HTML 的片段，用于分析结构
    const htmlSample = await grokPage.evaluate(() => {
      const messages = Array.from(document.querySelectorAll('[data-testid^="tweet"], [role="article"]'));
      if (messages.length > 0) {
        const firstMsg = messages[0];
        return firstMsg.outerHTML.substring(0, 500);
      }
      return '';
    });

    console.log('\n📄 第一条消息的 HTML 片段:\n');
    console.log(htmlSample);

    await browser.close();
    console.log('\n✅ 检查完成');
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    process.exit(1);
  }
})();
