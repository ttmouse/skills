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

    // 获取对话中的消息，重点关注用户消息
    const conversationData = await grokPage.evaluate(() => {
      // 查找所有消息元素
      const allElements = Array.from(document.querySelectorAll('[data-testid^="tweet"], [role="article"], div[data-testid]'));

      // 过滤出真正的消息（包含文本内容的）
      const messages = [];

      allElements.forEach((el, index) => {
        const hasUserAvatar = !!el.querySelector('[data-testid="UserAvatar"]');
        const text = el.innerText?.trim();

        // 跳过太短或没有实际内容的元素
        if (!text || text.length < 5) return;

        messages.push({
          index,
          isUser: hasUserAvatar,
          text: text.substring(0, 300),
          hasLinks: text.includes('https://x.com/'),
          hasJSON: text.includes('{') || text.includes('['),
          buttonCount: el.querySelectorAll('button').length,
          tagName: el.tagName,
          dataTestId: el.getAttribute('data-testid')
        });
      });

      return messages;
    });

    console.log(`📋 共找到 ${conversationData.length} 个消息元素:\n`);

    // 分组显示用户消息和 AI 消息
    console.log('--- 用户消息 ---\n');
    const userMessages = conversationData.filter(m => m.isUser);
    if (userMessages.length === 0) {
      console.log('❌ 没有找到用户消息\n');
    } else {
      userMessages.forEach(msg => {
        console.log(`[${msg.index}] 👤 用户消息`);
        console.log(`    标签: ${msg.tagName} (data-testid: ${msg.dataTestId})`);
        console.log(`    包含链接: ${msg.hasLinks ? '✅ 是' : '❌ 否'}`);
        console.log(`    包含 JSON: ${msg.hasJSON ? '✅ 是' : '❌ 否'}`);
        console.log(`    按钮数: ${msg.buttonCount}`);
        console.log(`    文本预览: ${msg.text}...`);
        console.log('');
      });
    }

    console.log('--- AI 消息 (检查是否包含 JSON) ---\n');
    const aiMessages = conversationData.filter(m => !m.isUser);
    const aiWithJSON = aiMessages.filter(m => m.hasJSON);
    if (aiWithJSON.length === 0) {
      console.log('❌ 没有找到包含 JSON 的 AI 回复\n');
    } else {
      aiWithJSON.forEach(msg => {
        console.log(`[${msg.index}] 🤖 AI 消息 (包含 JSON)`);
        console.log(`    文本预览: ${msg.text}...`);
        console.log('');
      });
    }

    // 找出可能的"用户发送链接 -> AI 返回 JSON"的配对
    console.log('--- 可能的匹配 ---\n');
    for (let i = 0; i < userMessages.length; i++) {
      const userMsg = userMessages[i];
      if (userMsg.hasLinks) {
        // 查找该用户消息后的 AI 消息
        const nextAIMessages = aiMessages.filter(m => m.index > userMsg.index && m.hasJSON);
        if (nextAIMessages.length > 0) {
          console.log(`🎯 找到匹配!`);
          console.log(`    用户消息 [${userMsg.index}]: ${userMsg.text.substring(0, 100)}...`);
          console.log(`    → AI 回复 [${nextAIMessages[0].index}]: ${nextAIMessages[0].text.substring(0, 100)}...`);
          console.log('');
        }
      }
    }

    await browser.close();
    console.log('✅ 检查完成');
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
})();
