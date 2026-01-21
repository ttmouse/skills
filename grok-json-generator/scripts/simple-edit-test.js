const { chromium } = require('playwright');

(async () => {
  try {
    console.log('🔍 连接浏览器...\n');
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const pages = browser.contexts()[0].pages();
    const grokPage = pages.find(page => page.url().includes('conversation=2011046911403573376'));

    if (!grokPage) {
      console.log('❌ 未找到 Grok 对话');
      await browser.close();
      process.exit(1);
    }

    console.log('✅ 找到 Grok 对话\n');

    // 找到包含目标文本的元素
    const targetText = '直接在代码块中输出JSON数组';
    const messageElement = await grokPage.$(`*:text-is("${targetText}")`);

    if (!messageElement) {
      console.log('❌ 未找到目标消息');
      await browser.close();
      process.exit(1);
    }

    console.log('✅ 找到目标消息');

    // 悬停
    console.log('🖱️ 悬停...');
    await messageElement.hover();
    await grokPage.waitForTimeout(2000);

    // 查找并点击编辑按钮
    console.log('🔍 查找编辑按钮...');

    // 尝试找到包含"编辑"文本的按钮
    const editButton = await messageElement.$('button:has-text("编辑")');

    if (!editButton) {
      console.log('❌ 未找到编辑按钮');
      await browser.close();
      process.exit(1);
    }

    console.log('✅ 找到编辑按钮');

    console.log('🖱️ 点击...');
    await editButton.click();

    console.log('⏳ 等待 5 秒...');
    await grokPage.waitForTimeout(5000);

    console.log('\n✅ 测试完成');

    await browser.close();
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    process.exit(1);
  }
})();
