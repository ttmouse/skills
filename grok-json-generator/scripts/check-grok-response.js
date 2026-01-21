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

    // 检查页面上的所有内容
    const result = await grokPage.evaluate(() => {
      const allText = document.body.innerText;

      // 查找所有可能的 JSON
      const jsonMatches = allText.match(/\[\s*\{[\s\S]*?\}\s*\]/g);

      // 查找 ```json 代码块
      const codeBlocks = allText.match(/```json[\s\S]*?```/g);

      // 查找最后的 AI 响应
      const allElements = Array.from(document.querySelectorAll('*'));
      const aiResponses = allElements.filter(el => {
        const text = el.innerText || '';
        return text.length > 100 && text.length < 10000 && el.offsetParent !== null;
      });

      // 找到最长的元素（可能是 AI 响应）
      const sorted = aiResponses
        .sort((a, b) => (b.innerText || '').length - (a.innerText || '').length)
        .slice(0, 3);

      return {
        totalTextLength: allText.length,
        jsonCount: jsonMatches ? jsonMatches.length : 0,
        codeBlockCount: codeBlocks ? codeBlocks.length : 0,
        jsonMatches: jsonMatches || [],
        codeBlocks: codeBlocks || [],
        topResponses: sorted.map(el => ({
          tagName: el.tagName,
          text: el.innerText.substring(0, 500),
          length: el.innerText.length
        }))
      };
    });

    console.log('📋 页面内容分析:\n');

    console.log(`   总文本长度: ${result.totalTextLength} 字符`);
    console.log(`   JSON 匹配数: ${result.jsonCount}`);
    console.log(`   代码块数: ${result.codeBlockCount}\n`);

    if (result.codeBlockCount > 0) {
      console.log('📋 找到代码块:\n');
      result.codeBlocks.forEach((block, idx) => {
        console.log(`[${idx}] 长度: ${block.length} 字符`);
        console.log(`     前 200 字符: ${block.substring(0, 200)}...`);
        console.log('');
      });
    }

    if (result.jsonCount > 0) {
      console.log('📋 找到 JSON:\n');
      result.jsonMatches.forEach((json, idx) => {
        console.log(`[${idx}] 长度: ${json.length} 字符`);
        console.log(`     前 200 字符: ${json.substring(0, 200)}...`);
        console.log('');
      });
    }

    console.log('📋 最长的 3 条响应:\n');
    result.topResponses.forEach((resp, idx) => {
      console.log(`[${idx}] ${resp.tagName} (${resp.length} 字符)`);
      console.log(`     ${resp.text.substring(0, 300)}...`);
      console.log('');
    });

    await browser.close();
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    process.exit(1);
  }
}

main();
