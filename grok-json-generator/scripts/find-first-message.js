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

    // 找到第一个用户消息
    const result = await grokPage.evaluate(() => {
      // 查找所有可能的消息容器
      const messageContainers = Array.from(document.querySelectorAll(
        '[data-testid*="message"], [role="article"], [data-message-id]'
      ));

      // 或者直接找所有 div，然后根据内容判断
      const allDivs = Array.from(document.querySelectorAll('div'));

      const userMessages = [];

      allDivs.forEach(div => {
        const text = div.innerText || '';

        // 假设用户消息不包含"AI Generated"、"Thought for"、"json"等 AI 输出的特征
        if (text.length > 20 && text.length < 10000) {
          const hasAiOutput = text.includes('json') || text.includes('AI Generated') ||
                            text.includes('Thought for') || text.includes('["post_id"');

          if (!hasAiOutput) {
            userMessages.push({
              text: text.substring(0, 200),
              length: text.length,
              hasLink: text.includes('http')
            });
          }
        }
      });

      // 去重
      const unique = userMessages.filter((item, index, self) =>
        index === self.findIndex((t) => t.text === item.text)
      );

      // 返回前几个
      return unique.slice(0, 5);
    });

    console.log(`📋 找到 ${result.length} 个可能的用户消息:\n`);

    result.forEach((msg, idx) => {
      console.log(`[${idx}] 长度: ${msg.length}, 有链接: ${msg.hasLink ? '✅' : '❌'}`);
      console.log(`    文本: ${msg.text}...`);
      console.log('');
    });

    await browser.close();
    console.log('✅ 完成');
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    process.exit(1);
  }
})();
