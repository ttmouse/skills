const { chromium } = require('playwright');

(async () => {
  try {
    console.log('🔍 连接浏览器...');
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const pages = browser.contexts()[0].pages();

    // 找到 Grok 对话页面
    const grokPage = pages.find(page => page.url().includes('/i/grok?conversation='));

    if (!grokPage) {
      console.log('❌ 未找到 Grok 对话');
      await browser.close();
      process.exit(1);
    }

    console.log('✅ 找到 Grok 对话\n');

    // 查找所有可见的 textarea
    const textareas = await grokPage.$$('textarea >> visible=true');

    console.log(`📋 找到 ${textareas.length} 个可见的 textarea\n`);

    if (textareas.length === 0) {
      console.log('❌ 没有找到可编辑的 textarea');
      console.log('提示：需要先点击编辑按钮进入编辑模式');
      await browser.close();
      process.exit(1);
    }

    // 选择第一个
    const textarea = textareas[0];

    // 获取当前内容
    const currentContent = await textarea.inputValue();

    console.log('📄 当前内容（前 100 字符）:');
    console.log(currentContent.substring(0, 100) + '...\n');

    // 修改内容
    const testText = '【自动化测试编辑】';
    const newContent = testText + '\n\n' + currentContent;

    console.log(`✏️  添加 "${testText}"...`);

    await textarea.fill(newContent);

    console.log('⏳ 等待 1 秒...');
    await grokPage.waitForTimeout(1000);

    // 验证
    const updatedContent = await textarea.inputValue();

    if (updatedContent.startsWith(testText)) {
      console.log('✅ 修改成功！\n');

      // 按 Enter 保存
      console.log('🖱️ 按 Enter 保存...');
      await grokPage.keyboard.press('Enter');

      console.log('⏳ 等待 3 秒...');
      await grokPage.waitForTimeout(3000);

      console.log('✅ 保存完成');
    } else {
      console.log('❌ 修改失败');
    }

    console.log('\n✅ 测试完成');
    await browser.close();
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
})();
