const { chromium } = require('playwright');

(async () => {
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

    // 步骤 1：找到包含目标文本的用户消息
    console.log('🔍 步骤 1/5：查找用户消息...');
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

    // 步骤 2：悬停到消息
    console.log('\n🔍 步骤 2/5：悬停到消息...');
    await targetMessage.asElement().hover();
    await grokPage.waitForTimeout(2000);
    console.log('✅ 悬停完成');

    // 步骤 3：点击编辑按钮
    console.log('\n🔍 步骤 3/5：点击编辑按钮...');

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
      console.log('❌ 未找到可见的编辑按钮');
      await browser.close();
      process.exit(1);
    }

    await editButton.click();
    console.log('✅ 点击编辑按钮');
    await grokPage.waitForTimeout(2000);

    // 步骤 4：修改内容
    console.log('\n🔍 步骤 4/5：修改内容...');

    const textareas = await grokPage.$$('textarea >> visible=true');

    if (textareas.length === 0) {
      console.log('❌ 未找到可编辑的 textarea');
      await browser.close();
      process.exit(1);
    }

    const textarea = textareas[0];

    // 获取当前内容
    const currentContent = await textarea.inputValue();

    console.log(`当前内容长度: ${currentContent.length} 字符`);

    // 添加修改标记
    const editMarker = '\n\n【已由自动化脚本编辑 ' + new Date().toLocaleString('zh-CN') + '】';

    const newContent = currentContent + editMarker;

    await textarea.fill(newContent);

    console.log('✅ 内容修改完成');
    await grokPage.waitForTimeout(1000);

    // 验证修改（检查是否包含标记）
    const updatedContent = await textarea.inputValue();

    if (!updatedContent.includes(editMarker)) {
      console.log('❌ 修改验证失败');
      console.log('提示：内容可能已被自动保存或格式化');
      await browser.close();
      process.exit(1);
    }

    // 步骤 5：保存
    console.log('\n🔍 步骤 5/5：保存...');

    await grokPage.keyboard.press('Enter');

    console.log('⏳ 等待保存完成...');
    await grokPage.waitForTimeout(3000);

    console.log('✅ 保存完成\n');

    console.log('🎉 整个编辑流程成功完成！');

    await browser.close();
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
})();
