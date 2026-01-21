const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    console.log('🔍 连接浏览器...');
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const pages = browser.contexts()[0].pages();
    const grokPage = pages.find(page => page.url().includes('/i/grok?conversation='));

    if (!grokPage) {
      console.log('❌ 未找到 Grok 对话');
      await browser.close();
      process.exit(1);
    }

    console.log('✅ 找到 Grok 对话\n');

    // 步骤 1：读取最新的 Twitter 数据
    console.log('🔍 步骤 1/6：读取 Twitter 数据...');

    const outputDir = '/Users/douba/twitter-output';
    const jsonFiles = fs.readdirSync(outputDir)
      .filter(f => f.startsWith('twitter-clean-data') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (jsonFiles.length === 0) {
      console.log('❌ 未找到 Twitter 数据文件');
      await browser.close();
      process.exit(1);
    }

    const latestJsonFile = path.join(outputDir, jsonFiles[0]);
    const twitterData = JSON.parse(fs.readFileSync(latestJsonFile, 'utf-8'));

    // 提取所有 Twitter 链接
    const newLinks = twitterData.items.map(item => item.url);

    console.log(`✅ 读取成功，共 ${newLinks.length} 条新链接`);
    console.log(`   数据文件: ${jsonFiles[0]}`);
    console.log(`   生成时间: ${twitterData.generated_at}\n`);

    // 步骤 2：找到用户消息
    console.log('🔍 步骤 2/6：查找用户消息...');

    const targetMessage = await grokPage.evaluateHandle(() => {
      const targetText = '请严格按照以下JSON结构，为我提供的每个X帖子生成标签。';

      const allElements = Array.from(document.querySelectorAll('*'));

      let bestMatch = null;
      let bestScore = Infinity;

      allElements.forEach(el => {
        const innerText = el.innerText || '';

        if (!innerText.includes(targetText)) return;
        if (innerText.length > 5000 || innerText.length < 50) return;

        const childrenText = Array.from(el.children).reduce((acc, child) => acc + (child.innerText || ''), '');
        if (childrenText.length > innerText.length * 0.8) return;

        if (innerText.length < bestScore) {
          bestMatch = el;
          bestScore = innerText.length;
        }
      });

      return bestMatch;
    });

    if (!targetMessage) {
      console.log('❌ 未找到用户消息');
      await browser.close();
      process.exit(1);
    }

    console.log('✅ 找到用户消息');

    // 步骤 3：悬停并点击编辑
    console.log('\n🔍 步骤 3/6：悬停到消息...');
    await targetMessage.asElement().hover();
    await grokPage.waitForTimeout(2000);
    console.log('✅ 悬停完成');

    console.log('\n🔍 步骤 4/6：点击编辑按钮...');

    const allButtons = await grokPage.$$('button');
    let editButton = null;

    for (let i = 0; i < allButtons.length; i++) {
      const btn = allButtons[i];

      const hasEditIcon = await btn.evaluate(button => {
        const svg = button.querySelector('svg');
        if (!svg) return false;

        const path = svg.querySelector('path');
        if (!path) return false;

        const d = path.getAttribute('d');
        return d && d.includes('M21 18s-1.334 1.544') && d.includes('m7.414-15.13');
      });

      if (hasEditIcon) {
        const isVisible = await btn.evaluate(b => b.offsetParent !== null);
        if (isVisible) {
          editButton = btn;
          console.log('✅ 找到编辑按钮');
          break;
        }
      }
    }

    if (!editButton) {
      console.log('❌ 未找到编辑按钮');
      await browser.close();
      process.exit(1);
    }

    await editButton.click();
    console.log('✅ 点击编辑按钮');
    await grokPage.waitForTimeout(2000);

    // 步骤 4：获取当前内容
    console.log('\n🔍 步骤 5/6：替换 Twitter 链接...');

    const textareas = await grokPage.$$('textarea >> visible=true');

    if (textareas.length === 0) {
      console.log('❌ 未找到可编辑的 textarea');
      await browser.close();
      process.exit(1);
    }

    const textarea = textareas[0];
    const currentContent = await textarea.inputValue();

    console.log(`   当前内容长度: ${currentContent.length} 字符`);

    // 找到包含旧链接的部分（以"现在请为以下帖子生成标签"开头的部分）
    const splitMarker = '现在请为以下帖子生成标签';

    if (!currentContent.includes(splitMarker)) {
      console.log('⚠️ 未找到"现在请为以下帖子生成标签"标记');
      console.log('   将在末尾添加新链接\n');
    }

    // 提取第一部分（标签规则）
    let newContent;
    if (currentContent.includes(splitMarker)) {
      const parts = currentContent.split(splitMarker);
      const rulesPart = parts[0];
      newContent = rulesPart + splitMarker + '（直接在代码块中输出JSON数组）：\n\n';
    } else {
      newContent = currentContent + '\n\n现在请为以下帖子生成标签（直接在代码块中输出JSON数组）：\n\n';
    }

    // 添加新链接
    newContent += newLinks.join('\n');

    console.log(`   新内容长度: ${newContent.length} 字符`);
    console.log(`   添加 ${newLinks.length} 条新链接\n`);

    // 步骤 6：保存
    console.log('🔍 步骤 6/6：保存内容...');

    await textarea.fill(newContent);

    console.log('⏳ 等待 1 秒...');
    await grokPage.waitForTimeout(1000);

    // 按 Enter 保存
    await grokPage.keyboard.press('Enter');

    console.log('⏳ 等待保存完成...');
    await grokPage.waitForTimeout(3000);

    console.log('✅ 保存完成\n');

    console.log('🎉 Twitter 链接更新成功！');
    console.log(`\n📊 更新统计:`);
    console.log(`   数据来源: ${jsonFiles[0]}`);
    console.log(`   旧链接数: (已替换)`);
    console.log(`   新链接数: ${newLinks.length}`);
    console.log(`   更新时间: ${new Date().toLocaleString('zh-CN')}\n`);

    await browser.close();
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
