const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    console.log('🔍 最终状态检查\n');
    console.log('=' .repeat(60));

    // 连接浏览器
    console.log('\n🔍 步骤 1：连接浏览器...');
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const context = browser.contexts()[0];
    const pages = context.pages();

    // 检查链接文件
    console.log('\n🔍 步骤 2：检查链接文件...');

    const outputDir = '/Users/douba/twitter-output';
    const linkFiles = fs.readdirSync(outputDir)
      .filter(f => f.startsWith('unclassified-links') && f.endsWith('.txt'))
      .sort()
      .reverse();

    if (linkFiles.length > 0) {
      const latestLinkFile = path.join(outputDir, linkFiles[0]);
      const linksContent = fs.readFileSync(latestLinkFile, 'utf-8');
      const links = linksContent.split('\n').filter(link => link.trim());

      console.log(`✅ 找到链接文件: ${linkFiles[0]}`);
      console.log(`   链接数量: ${links.length}\n`);
    } else {
      console.log('⚠️ 没有找到链接文件\n');
    }

    // 检查 Grok 页面
    console.log('🔍 步骤 3：检查 Grok 页面...');
    const grokPage = pages.find(page => page.url().includes('/i/grok'));

    if (!grokPage) {
      console.log('❌ 未找到 Grok 页面\n');
      await browser.close();
      return;
    }

    console.log(`✅ 找到 Grok 页面: ${grokPage.url()}\n`);

    // 检查用户消息
    console.log('🔍 步骤 4：检查用户消息...');

    const userMessages = await grokPage.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('*'));

      const longTextElements = allElements.filter(el => {
        const text = el.innerText || '';
        const childrenText = Array.from(el.children).reduce((acc, child) => acc + (child.innerText || ''), '');

        return (
          el.offsetParent !== null &&
          text.length > 100 &&
          text.length < 5000 &&
          childrenText.length < text.length * 0.8
        );
      });

      return longTextElements
        .sort((a, b) => (b.innerText || '').length - (a.innerText || '').length)
        .slice(0, 3)
        .map(el => ({
          text: el.innerText.substring(0, 200),
          length: el.innerText.length
        }));
    });

    console.log(`📋 找到 ${userMessages.length} 条用户消息:\n`);

    userMessages.forEach((msg, idx) => {
      console.log(`[${idx}] ${msg.length} 字符`);
      console.log(`    ${msg.text}...`);
      console.log('');
    });

    // 滚动并检查 AI 响应
    console.log('🔍 步骤 5：检查 AI 响应...');

    await grokPage.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await grokPage.waitForTimeout(2000);

    const aiResponse = await grokPage.evaluate(() => {
      const allText = document.body.innerText;
      const jsonMatches = allText.match(/\[\s*\{[\s\S]*?\}\s*\]/g);
      const codeBlockMatches = allText.match(/```json[\s\S]*?```/g);

      return {
        jsonCount: jsonMatches ? jsonMatches.length : 0,
        codeBlockCount: codeBlockMatches ? codeBlockMatches.length : 0,
        jsonMatches: jsonMatches || [],
        codeBlocks: codeBlockMatches || []
      };
    });

    console.log(`   JSON 匹配数: ${aiResponse.jsonCount}`);
    console.log(`   代码块数: ${aiResponse.codeBlockCount}\n`);

    if (aiResponse.jsonCount > 0 || aiResponse.codeBlockCount > 0) {
      console.log('✅ 找到 JSON 响应！\n');

      if (aiResponse.codeBlockCount > 0) {
        console.log(`📋 代码块内容（前 200 字符）:\n`);
        console.log(`${aiResponse.codeBlocks[0].substring(0, 200)}...\n`);
      } else if (aiResponse.jsonCount > 0) {
        console.log(`📋 JSON 内容（前 200 字符）:\n`);
        console.log(`${aiResponse.jsonMatches[0].substring(0, 200)}...\n`);
      }
    } else {
      console.log('⚠️ 没有找到 JSON 响应\n');
    }

    // 总结
    console.log('=' .repeat(60));
    console.log('\n📊 总结:\n');

    if (aiResponse.jsonCount > 0 || aiResponse.codeBlockCount > 0) {
      console.log('✅ 状态：JSON 已生成');
      console.log('💡 建议：可以继续提取并保存 JSON\n');
    } else {
      console.log('⚠️ 状态：JSON 未生成');
      console.log('💡 可能的原因：\n');
      console.log('   1. 消息编辑后没有重新发送给 Grok');
      console.log('   2. Grok 还在生成中（需要等待更长时间）');
      console.log('   3. 页面需要刷新才能看到响应\n');
      console.log('👆 请手动检查 Grok 对话页面，确认 AI 是否在生成响应\n');
    }

    await browser.close();
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    process.exit(1);
  }
}

main();
