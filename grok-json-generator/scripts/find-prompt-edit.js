const { chromium } = require('playwright');

(async () => {
  try {
    console.log('🔍 正在连接到浏览器...\n');
    const browser = await chromium.connectOverCDP('http://localhost:9222');

    const contexts = browser.contexts();
    const context = contexts[0];
    const pages = context.pages();

    const grokPage = pages.find(page => page.url().includes('conversation=2011046911403573376'));

    if (!grokPage) {
      console.log('❌ 未找到 Grok 对话页面');
      await browser.close();
      process.exit(1);
    }

    console.log('✅ 找到 Grok 对话页面\n');

    // 查找包含目标文本的元素及其对应的编辑按钮
    const result = await grokPage.evaluate(() => {
      const targetText = '直接在代码块中输出JSON数组';

      // 查找所有包含目标文本的元素
      const allElements = Array.from(document.querySelectorAll('*'));
      const results = [];

      for (const el of allElements) {
        const innerText = el.innerText || '';

        if (innerText.includes(targetText) && innerText.length < 10000) {
          // 查找该元素及其父级中的编辑按钮
          let editBtn = null;
          let container = el;

          // 向上查找 5 层
          for (let i = 0; i < 5; i++) {
            if (!container || container === document.body) break;

            // 查找 cls-btn-edit 按钮或 aria-label 包含 edit 的按钮
            const buttons = container.querySelectorAll('button');
            for (const btn of buttons) {
              const ariaLabel = btn.getAttribute('aria-label') || '';
              const btnText = btn.textContent || '';
              const className = btn.className || '';

              if (className.includes('cls-btn-edit') ||
                  ariaLabel.toLowerCase().includes('edit') ||
                  btnText.includes('编辑')) {
                editBtn = btn;
                break;
              }
            }

            if (editBtn) break;
            container = container.parentElement;
          }

          // 查找这个提示词的标题
          let titleElement = null;
          let titleContainer = el;

          for (let i = 0; i < 10; i++) {
            if (!titleContainer || titleContainer === document.body) break;

            const titleCandidates = titleContainer.querySelectorAll('.script-item-title, [class*="title"]');
            for (const candidate of titleCandidates) {
              if (candidate.textContent && candidate.textContent.trim() && !candidate.textContent.includes(targetText)) {
                titleElement = candidate;
                break;
              }
            }

            if (titleElement) break;
            titleContainer = titleContainer.parentElement;
          }

          results.push({
            elementTag: el.tagName,
            elementClass: el.className?.substring(0, 100),
            text: innerText.substring(0, 150),
            hasEditButton: !!editBtn,
            editButtonClass: editBtn ? editBtn.className?.substring(0, 100) : null,
            editButtonText: editBtn ? editBtn.textContent : null,
            title: titleElement ? titleElement.textContent?.substring(0, 50) : null
          });
        }
      }

      return results;
    });

    console.log(`📋 找到 ${result.length} 个匹配的元素:\n`);

    result.forEach((item, idx) => {
      console.log(`[${idx + 1}] ${item.elementTag}`);
      console.log(`    标题: ${item.title || 'N/A'}`);
      console.log(`    文本: ${item.text}...`);
      console.log(`    有编辑按钮: ${item.hasEditButton ? '✅' : '❌'}`);
      if (item.hasEditButton) {
        console.log(`    编辑按钮 class: ${item.editButtonClass}`);
        console.log(`    编辑按钮文本: ${item.editButtonText}`);
      }
      console.log('');
    });

    await browser.close();
    console.log('✅ 完成');
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    process.exit(1);
  }
})();
