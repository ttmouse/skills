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

    // 找到已聚焦的 textarea
    const textarea = await grokPage.$('textarea:has-text("请严格按照以下JSON结构")');

    if (!textarea) {
      console.log('❌ 未找到编辑中的 textarea');
      await browser.close();
      process.exit(1);
    }

    console.log('✅ 找到编辑中的 textarea\n');

    // 获取当前内容
    const currentContent = await textarea.inputValue();

    console.log('📄 当前内容（前 100 字符）:');
    console.log(currentContent.substring(0, 100) + '...\n');

    // 修改内容（在开头添加测试文字）
    const testText = '【测试编辑】';
    const newContent = testText + currentContent;

    console.log(`✏️  在开头添加 "${testText}"...`);

    // 清空并输入新内容
    await textarea.click();
    await grokPage.keyboard.press('Control+A');
    await grokPage.keyboard.type(newContent);

    console.log('⏳ 等待 1 秒...');
    await grokPage.waitForTimeout(1000);

    // 验证修改
    const updatedContent = await textarea.inputValue();

    console.log('\n📄 修改后的内容（前 150 字符）:');
    console.log(updatedContent.substring(0, 150) + '...\n');

    if (updatedContent.startsWith(testText)) {
      console.log('✅ 修改成功！\n');

      // 查找保存按钮
      console.log('🔍 查找保存按钮...');

      const saveButton = await grokPage.$('button:has-text("保存"), button:has-text("Save")');

      if (saveButton) {
        console.log('✅ 找到保存按钮');
        console.log('🖱️ 点击保存...');

        await saveButton.click();

        console.log('⏳ 等待 3 秒...');
        await grokPage.waitForTimeout(3000);

        console.log('\n✅ 保存完成');
      } else {
        console.log('⚠️ 未找到保存按钮，可能需要按 Enter 保存');
        console.log('尝试按 Enter...');

        await grokPage.keyboard.press('Enter');

        console.log('⏳ 等待 3 秒...');
        await grokPage.waitForTimeout(3000);

        console.log('\n✅ 完成');
      }
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
