const { chromium } = require('playwright');

async function main() {
  try {
    console.log('🔍 检查 Grok 页面 DOM 结构...\n');

    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const pages = browser.contexts()[0].pages();
    const grokPage = pages.find(page => page.url().includes('/i/grok'));

    if (!grokPage) {
      console.log('❌ 未找到 Grok 页面');
      await browser.close();
      return;
    }

    console.log('✅ 找到 Grok 页面\n');

    // 滚动到顶部
    await grokPage.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await grokPage.waitForTimeout(1000);

    // 检查 DOM 结构
    const result = await grokPage.evaluate(() => {
      // 查找所有可能的用户消息容器
      const tweetElements = Array.from(document.querySelectorAll('[data-testid="cellInnerDiv"], [role="article"], [data-testid="tweet"]'));

      // 检查前 10 条消息
      const firstFive = tweetElements.slice(0, 10).map(el => {
        const text = el.innerText || '';

        return {
          textLength: text.length,
          hasPrompt: text.includes('二级子类：从以下完整列表中选最贴合的'),
          hasHierarchical: text.includes('hierarchical'),
          hasFlatTags: text.includes('flat_tags'),
          textPreview: text.substring(0, 200)
        };
      });

      // 统计
      const stats = {
        totalTweets: tweetElements.length,
        hasPrompt: firstFive.filter(m => m.hasPrompt).length
      };

      return {
        stats,
        firstFive
      };
    });

    console.log('📊 DOM 结构统计:\n');
    console.log(`   总消息数: ${result.stats.totalTweets}`);
    console.log(`   包含提示词的消息: ${result.stats.hasPrompt}\n`);

    console.log('📋 前 5 条消息:\n');

    result.firstFive.forEach((msg, idx) => {
      console.log(`[${idx}] ${msg.textLength} 字符`);
      console.log(`    包含提示词: ${msg.hasPrompt}`);
      console.log(`    内容: ${msg.textPreview}...`);
      console.log('');
    });

    console.log('💡 分析:\n');

    if (result.stats.hasPrompt === 0) {
      console.log('❌ 前 5 条消息中没有包含提示词的消息');
      console.log('💡 可能原因：');
      console.log('   1. 提示词在更后面的消息中');
      console.log('   2. DOM 结构不同，需要其他选择器\n');
    } else if (result.stats.hasPrompt > 1) {
      console.log('⚠️ 多条消息包含提示词，可能有重复\n');
    } else {
      console.log('✅ 找到包含提示词的消息\n');
    }

    await browser.close();
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    process.exit(1);
  }
}

main();
