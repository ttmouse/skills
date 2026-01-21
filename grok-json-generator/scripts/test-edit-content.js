const { chromium } = require('playwright');

(async () => {
  try {
    console.log('🔍 连接浏览器...');
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const pages = browser.contexts()[0].pages();
    const grokPage = pages.find(page => page.url().includes('conversation=2011046911403573376'));

    if (!grokPage) {
      console.log('❌ 未找到 Grok 对话');
      await browser.close();
      process.exit(1);
    }

    console.log('✅ 找到 Grok 对话\n');

    // 查找所有可见的 textarea
    const textareas = await grokPage.$$('textarea >> visible=true');

    console.log(`📋 找到 ${textareas.length} 个可见的 textarea\n`);

    for (let i = 0; i < textareas.length; i++) {
      const textarea = textareas[i];

      const value = await textarea.inputValue();
      const isFocused = await textarea.evaluate(t => document.activeElement === t);

      console.log(`[${i}] ${isFocused ? '⭐ 聚焦' : ''}`);
      console.log(`    内容（前 80 字符）: ${value.substring(0, 80)}...`);
      console.log('');
    }

    if (textareas.length === 0) {
      console.log('❌ 没有找到可见的 textarea');
      await browser.close();
      process.exit(1);
    }

    // 选择第一个（聚焦的）textarea
    const textarea = textareas[0];

    // 获取当前内容
    const currentContent = await textarea.inputValue();

    console.log('✅ 选择第一个 textarea\n');

    console.log('📄 当前内容:');
    console.log(currentContent.substring(0, 200) + '...\n');

    // 修改内容
    const testText = '【自动化测试编辑】';
    const newContent = testText + currentContent;

    console.log(`✏️  添加 "${testText}"...`);

    // 清空并输入新内容
    await textarea.click();
    await grokPage.keyboard.press('Control+A');
    await grokPage.keyboard.type(newContent);

    console.log('⏳ 等待 1 秒...');
    await grokPage.waitForTimeout(1000);

    // 验证
    const updatedContent = await textarea.inputValue();

    if (updatedContent.startsWith(testText)) {
      console.log('✅ 修改成功！\n');

      // 尝试按 Enter 保存
      console.log('🖱️ 按 Enter 保存...');
      await grokPage.keyboard.press('Enter');

      console.log('⏳ 等待 2 秒...');
      await grokPage.waitForTimeout(2000);

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
