const { chromium } = require('playwright');

async function main() {
  try {
    console.log('🔍 检查当前的编辑流程...\n');

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

    // 检查用户消息的结构
    const result = await grokPage.evaluate(() => {
      // 查找包含提示词的所有元素
      const allElements = Array.from(document.querySelectorAll('*'));

      // 查找包含"二级子类：从以下完整列表中选"的元素
      const targetElements = allElements.filter(el => {
        const text = el.innerText || '';
        return text.includes('二级子类：从以下完整列表中选最贴合的');
      });

      // 找到这些元素的父容器（应该是用户消息）
      const messageContainers = targetElements.map(el => {
        let parent = el.parentElement;
        let depth = 0;
        while (parent && depth < 10) {
          // 检查是否是消息容器（有特定的 class 或结构）
          const hasMessageClass = parent.className?.includes('message') ||
                                  parent.className?.includes('tweet') ||
                                  parent.className?.includes('post') ||
                                  parent.getAttribute('data-testid')?.includes('tweet');

          if (hasMessageClass) {
            break;
          }
          parent = parent.parentElement;
          depth++;
        }

        return {
          element: el.tagName,
          depth: depth,
          parentClass: parent?.className?.substring(0, 100) || 'null',
          parentTestid: parent?.getAttribute('data-testid') || 'null',
          text: el.innerText.substring(0, 200),
          textLength: el.innerText.length
        };
      });

      return messageContainers;
    });

    console.log('📋 找到包含提示词的元素:\n');

    result.forEach((msg, idx) => {
      console.log(`[${idx}] ${msg.element} (${msg.textLength} 字符)`);
      console.log(`    深度: ${msg.depth}`);
      console.log(`    父容器 class: ${msg.parentClass}`);
      console.log(`    父容器 testid: ${msg.parentTestid}`);
      console.log(`    内容: ${msg.text.substring(0, 100)}...`);
      console.log('');
    });

    console.log('💡 请确认：');
    console.log('   1. 我们找到的元素是否是用户消息？');
    console.log('   2. 编辑按钮是否在这些元素附近？');
    console.log('   3. 点击编辑按钮后，是编辑原消息还是发送回复？\n');

    await browser.close();
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    process.exit(1);
  }
}

main();
