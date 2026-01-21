const { chromium } = require('playwright');

async function main() {
  try {
    console.log('🔍 分析 Grok 对话结构...\n');

    // 连接浏览器
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const pages = browser.contexts()[0].pages();
    const grokPage = pages.find(page => page.url().includes('/i/grok'));

    if (!grokPage) {
      console.log('❌ 未找到 Grok 页面');
      await browser.close();
      return;
    }

    console.log('✅ 找到 Grok 页面\n');

    // 分析对话结构
    const result = await grokPage.evaluate(() => {
      // 滚动到顶部
      window.scrollTo(0, 0);

      // 查找所有可能的用户消息容器
      const allElements = Array.from(document.querySelectorAll('*'));

      // 查找包含提示词的元素
      const promptElements = allElements.filter(el => {
        const text = el.innerText || '';
        return text.includes('二级子类：从以下完整列表中选最贴合的');
      });

      // 查找所有消息容器（通过特定属性）
      const messageContainers = allElements.filter(el => {
        const attrs = el.getAttributeNames();
        return attrs.some(attr =>
          attr.includes('data-testid') ||
          el.getAttribute('role') === 'article' ||
          el.className?.includes('tweet') ||
          el.className?.includes('message')
        );
      });

      // 分析这些消息容器的内容
      const analyzedMessages = messageContainers.map(container => {
        const text = container.innerText || '';

        return {
          tagName: container.tagName,
          dataTestId: container.getAttribute('data-testid') || '',
          role: container.getAttribute('role') || '',
          className: container.className?.substring(0, 100) || '',
          textLength: text.length,
          containsPrompt: text.includes('二级子类：从以下完整列表中选最贴合的'),
          containsJson: text.includes('"post_id"'),
          textPreview: text.substring(0, 200)
        };
      });

      // 统计
      const stats = {
        totalPromptElements: promptElements.length,
        totalMessageContainers: analyzedMessages.length,
        userMessagesCount: analyzedMessages.filter(m => m.containsPrompt).length,
        aiResponsesCount: analyzedMessages.filter(m => m.containsJson).length
      };

      return {
        stats,
        promptElements: promptElements.map(el => ({
          tagName: el.tagName,
          textLength: el.innerText?.length || 0,
          textPreview: el.innerText?.substring(0, 100) || ''
        })),
        messages: analyzedMessages
      };
    });

    console.log('📊 对话统计:\n');

    console.log(`   提示词元素数: ${result.stats.totalPromptElements}`);
    console.log(`   消息容器数: ${result.stats.totalMessageContainers}`);
    console.log(`   用户消息数: ${result.stats.userMessagesCount}`);
    console.log(`   AI 响应数: ${result.stats.aiResponsesCount}\n`);

    console.log('📋 所有消息容器:\n');

    result.messages.forEach((msg, idx) => {
      const type = msg.containsPrompt ? '用户消息' : (msg.containsJson ? 'AI 响应' : '其他');
      console.log(`[${idx}] ${type} (${msg.textLength} 字符)`);
      console.log(`    标签: ${msg.tagName}`);
      console.log(`    data-testid: ${msg.dataTestId}`);
      console.log(`    内容预览: ${msg.textPreview}...`);
      console.log('');
    });

    console.log('💡 分析结果:\n');

    if (result.stats.userMessagesCount > 1) {
      console.log('⚠️ 警告：检测到多条用户消息！');
      console.log('   这说明我们可能在重复发送提示词，而不是编辑原消息\n');
    } else if (result.stats.userMessagesCount === 1) {
      console.log('✅ 只有 1 条用户消息，看起来正常\n');
    } else {
      console.log('❌ 没有找到用户消息\n');
    }

    if (result.stats.aiResponsesCount > 1) {
      console.log(`ℹ️ 检测到 ${result.stats.aiResponsesCount} 条 AI 响应，说明对话有多轮交互\n`);
    }

    await browser.close();
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    process.exit(1);
  }
}

main();
