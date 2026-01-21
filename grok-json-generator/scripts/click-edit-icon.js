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

    // 查找包含编辑图标的按钮
    const editButtons = await grokPage.$$('button');

    console.log(`📋 页面上有 ${editButtons.length} 个按钮\n`);

    // 遍历查找编辑图标
    for (let i = 0; i < editButtons.length; i++) {
      const btn = editButtons[i];

      // 检查是否包含编辑图标的 SVG
      const hasEditIcon = await btn.evaluate(button => {
        const svg = button.querySelector('svg');
        if (!svg) return false;

        const path = svg.querySelector('path');
        if (!path) return false;

        const d = path.getAttribute('d');

        // 检查是否是编辑图标的路径
        return d && d.includes('M21 18s-1.334 1.544') && d.includes('m7.414-15.13');
      });

      if (hasEditIcon) {
        const isVisible = await btn.evaluate(b => b.offsetParent !== null);

        if (isVisible) {
          console.log(`✅ 找到第 [${i}] 个编辑图标按钮（可见）`);

          console.log('🖱️ 点击编辑按钮...');
          await btn.click();

          console.log('⏳ 等待 3 秒...');
          await grokPage.waitForTimeout(3000);

          // 检查编辑模式
          const editables = await grokPage.$$('div[contenteditable="true"]');

          console.log(`\n📋 编辑模式激活: ${editables.length > 0 ? '✅' : '❌'}`);

          if (editables.length > 0) {
            for (let j = 0; j < Math.min(3, editables.length); j++) {
              const text = await editables[j].textContent();
              const isFocused = await editables[j].evaluate(e => document.activeElement === e);

              console.log(`\n  [${j}] ${isFocused ? '⭐ 聚焦' : ''}`);
              console.log(`      文本: ${text?.substring(0, 150)}...`);
            }

            // 如果找到可编辑区域，选择第一个
            if (editables.length > 0) {
              console.log('\n✅ 进入编辑模式');

              await browser.close();
              return;
            }
          } else {
            console.log('⚠️ 未检测到可编辑区域');
          }

          break;
        } else {
          console.log(`⚠️ 第 [${i}] 个编辑图标按钮（不可见）`);
        }
      }
    }

    console.log('\n❌ 未找到可见的编辑按钮');
    await browser.close();
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
})();
