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

    // 在话术助手管理器中查找包含目标文本的项目
    const result = await grokPage.evaluate(() => {
      const targetText = '直接在代码块中输出JSON数组';

      // 查找所有提示词项目
      const scriptItems = Array.from(document.querySelectorAll('.script-item, [class*="script"]'));

      const matches = [];

      scriptItems.forEach(item => {
        const text = item.innerText || '';

        if (text.includes(targetText)) {
          // 查找该项目的编辑按钮
          const editButton = item.querySelector('.cls-btn-edit, button[class*="edit"]');

          matches.push({
            text: text.substring(0, 200),
            hasEditButton: !!editButton,
            editButtonClass: editButton ? editButton.className : null
          });
        }
      });

      return matches;
    });

    console.log(`📋 话术助手里找到 ${result.length} 个匹配项:\n`);

    result.forEach((item, idx) => {
      console.log(`[${idx}] ${item.hasEditButton ? '✅ 有编辑按钮' : '❌ 无编辑按钮'}`);
      console.log(`    文本: ${item.text}...`);
      console.log(`    编辑按钮 class: ${item.editButtonClass || 'N/A'}`);
      console.log('');
    });

    if (result.length === 0) {
      console.log('❌ 话术助手里没有找到匹配项');
      await browser.close();
      process.exit(1);
    }

    // 找到第一个有编辑按钮的项目并点击
    const hasEdit = result.find(item => item.hasEditButton);

    if (hasEdit) {
      console.log('✅ 找到有编辑按钮的项目，点击编辑...');

      const editButton = await grokPage.$('.script-item .cls-btn-edit');

      if (editButton) {
        await editButton.click();
        await grokPage.waitForTimeout(3000);

        console.log('✅ 编辑按钮点击成功');

        // 检查可编辑区域
        const editables = await grokPage.$$('div[contenteditable="true"]');

        console.log(`\n📋 可编辑区域: ${editables.length > 0 ? '✅' : '❌'}`);

        if (editables.length > 0) {
          const text = await editables[0].textContent();
          console.log(`    文本: ${text?.substring(0, 200)}...`);
        }
      }
    } else {
      console.log('⚠️ 没有找到有编辑按钮的项目');
    }

    console.log('\n✅ 完成');
    await browser.close();
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
})();
