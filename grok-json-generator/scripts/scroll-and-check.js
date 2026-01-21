const { chromium } = require('playwright');

async function main() {
  try {
    console.log('🔍 连接浏览器...');
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
    console.log('📜 滚动到底部...');
    await grokPage.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await grokPage.waitForTimeout(2000);

    // 检查页面内容
    const result = await grokPage.evaluate(() => {
      const allText = document.body.innerText;

      // 查找 JSON
      const jsonMatches = allText.match(/\[\s*\{[\s\S]*?\}\s*\]/g);
      const codeBlockMatches = allText.match(/```json[\s\S]*?```/g);

      return {
        jsonCount: jsonMatches ? jsonMatches.length : 0,
        codeBlockCount: codeBlockMatches ? codeBlockMatches.length : 0,
        jsonMatches: jsonMatches || [],
        codeBlocks: codeBlockMatches || []
      };
    });

    console.log(`📋 滚动后的内容分析:\n`);
    console.log(`   JSON 匹配数: ${result.jsonCount}`);
    console.log(`   代码块数: ${result.codeBlockCount}\n`);

    if (result.codeBlockCount > 0) {
      console.log('📋 找到代码块:\n');
      result.codeBlocks.forEach((block, idx) => {
        console.log(`[${idx}] 长度: ${block.length} 字符`);
        console.log(`     ${block.substring(0, 200)}...`);
        console.log('');
      });
    }

    if (result.jsonCount > 0) {
      console.log('📋 找到 JSON:\n');
      result.jsonMatches.forEach((json, idx) => {
        console.log(`[${idx}] 长度: ${json.length} 字符`);
        console.log(`     ${json.substring(0, 200)}...`);
        console.log('');
      });
    }

    await browser.close();
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    process.exit(1);
  }
}

main();
