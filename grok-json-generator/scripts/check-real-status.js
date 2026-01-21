const { chromium } = require('playwright');

async function main() {
  try {
    console.log('🔍 检查 Grok 页面实际状态...\n');

    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const pages = browser.contexts()[0].pages();
    const grokPage = pages.find(page => page.url().includes('/i/grok'));

    if (!grokPage) {
      console.log('❌ 未找到 Grok 页面');
      await browser.close();
      return;
    }

    console.log('✅ 找到 Grok 页面\n');

    // 滚动到底部
    await grokPage.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await grokPage.waitForTimeout(1000);

    // 检查页面状态
    const result = await grokPage.evaluate(() => {
      // 统计用户消息和 AI 响应
      const allElements = Array.from(document.querySelectorAll('*'));

      // 查找包含提示词的元素（用户消息）
      const userMessages = allElements.filter(el => {
        const text = el.innerText || '';
        return text.includes('二级子类：从以下完整列表中选最贴合的');
      });

      // 查找包含 JSON 的元素（AI 响应）
      const aiResponses = allElements.filter(el => {
        const text = el.innerText || '';
        return text.includes('"post_id"');
      });

      // 检查是否有暂停按钮
      const pauseButtons = Array.from(document.querySelectorAll('button, [role="button"]'));
      const hasPauseButton = pauseButtons.some(btn => {
        const text = btn.textContent?.toLowerCase() || '';
        const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
        return (
          text.includes('pause') ||
          text.includes('暂停') ||
          text.includes('stop') ||
          text.includes('停止') ||
          ariaLabel.includes('pause') ||
          ariaLabel.includes('暂停')
        );
      });

      // 检查文本框是否有内容
      const textareas = Array.from(document.querySelectorAll('textarea'));
      const visibleTextarea = textareas.find(ta => ta.offsetParent !== null);
      const textareaValue = visibleTextarea?.value || '';

      // 统计消息数量
      const messageCount = userMessages.length;

      return {
        userMessagesCount: userMessages.length,
        aiResponsesCount: aiResponses.length,
        hasPauseButton,
        textareaValue,
        textareaLength: textareaValue.length,
        messageCount
      };
    });

    console.log('📊 页面状态:\n');
    console.log(`   用户消息数: ${result.userMessagesCount}`);
    console.log(`   AI 响应数: ${result.aiResponsesCount}`);
    console.log(`   暂停按钮: ${result.hasPauseButton ? '存在（正在生成）' : '不存在（已停止）'}`);
    console.log(`   文本框内容长度: ${result.textareaLength}`);
    console.log(`   文本框内容: ${result.textareaValue ? result.textareaValue.substring(0, 100) : '(空)'}\n`);

    console.log('💡 分析:\n');

    if (result.userMessagesCount > 1) {
      console.log('⚠️ 问题：有多条用户消息！');
      console.log('   说明：我们在发送新消息，而不是编辑原消息\n');
      console.log('   影响：每次都会增加新的对话轮次\n');
    } else if (result.userMessagesCount === 1) {
      console.log('✅ 正常：只有 1 条用户消息\n');
    } else {
      console.log('❌ 问题：没有用户消息\n');
    }

    if (result.hasPauseButton) {
      console.log('⚠️ 警告：Grok 还在生成中！');
      console.log('   我的脚本误以为已经完成\n');
    } else {
      console.log('✅ Grok 生成已完成\n');
    }

    if (result.textareaLength > 0) {
      console.log('⚠️ 问题：文本框中有内容！');
      console.log('   说明：我们可能在发送新消息，而不是编辑\n');
    }

    await browser.close();
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    process.exit(1);
  }
}

main();
