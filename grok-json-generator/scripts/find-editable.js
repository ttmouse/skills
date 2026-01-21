const { chromium } = require('playwright');

(async () => {
  try {
    console.log('🔍 正在连接到浏览器...\n');
    const browser = await chromium.connectOverCDP('http://localhost:9222');

    const contexts = browser.contexts();
    const context = contexts[0];
    const pages = context.pages();

    // 找到 Grok 对话页面
    const grokPage = pages.find(page => page.url().includes('conversation=2011046911403573376'));

    if (!grokPage) {
      console.log('❌ 未找到 Grok 对话页面');
      await browser.close();
      process.exit(1);
    }

    console.log('✅ 找到 Grok 对话页面\n');

    // 查找页面上所有包含 "直接在代码块中输出JSON数组" 的元素
    const editableInfo = await grokPage.evaluate(() => {
      const results = [];

      // 查找所有文本节点包含目标文本的元素
      const targetText = '直接在代码块中输出JSON数组';
      const allElements = Array.from(document.querySelectorAll('*'));

      allElements.forEach(el => {
        const text = el.innerText;
        if (text && text.includes(targetText) && text.length < 5000) {
          // 检查这个元素是否有可编辑功能
          const isEditable = el.isContentEditable || el.getAttribute('contenteditable') === 'true';

          // 查找附近的按钮
          const parent = el.parentElement;
          const buttons = parent ? parent.querySelectorAll('button') : [];
          const hasEditButton = Array.from(buttons).some(btn => {
            const label = btn.getAttribute('aria-label') || '';
            return label.toLowerCase().includes('edit') ||
                   label.toLowerCase().includes('编辑') ||
                   label.toLowerCase().includes('more') ||
                   label.toLowerCase().includes('更多');
          });

          results.push({
            tagName: el.tagName,
            isEditable,
            hasEditButton,
            text: text.substring(0, 200),
            buttonCount: buttons.length,
            className: el.className?.substring(0, 100),
            dataTestId: el.getAttribute('data-testid')
          });
        }
      });

      // 查找输入框
      const inputBoxes = Array.from(document.querySelectorAll(
        'div[contenteditable="true"], textarea[role="textbox"], input[type="text"]'
      )).map(box => ({
        tagName: box.tagName,
        type: box.getAttribute('type'),
        role: box.getAttribute('role'),
        placeholder: box.getAttribute('placeholder'),
        className: box.className?.substring(0, 100)
      }));

      return { results, inputBoxes };
    });

    console.log(`📋 找到 ${editableInfo.results.length} 个包含目标文本的元素:\n`);

    editableInfo.results.forEach((item, i) => {
      console.log(`[${i + 1}] ${item.tagName}`);
      console.log(`    可编辑: ${item.isEditable ? '✅' : '❌'}`);
      console.log(`    有编辑按钮: ${item.hasEditButton ? '✅' : '❌'}`);
      console.log(`    按钮数: ${item.buttonCount}`);
      console.log(`    文本: ${item.text}...`);
      console.log('');
    });

    console.log('--- 输入框 ---\n');
    console.log(`找到 ${editableInfo.inputBoxes.length} 个输入框:\n`);
    editableInfo.inputBoxes.forEach((box, i) => {
      console.log(`[${i + 1}] ${box.tagName}`);
      console.log(`    type: ${box.type || 'N/A'}`);
      console.log(`    role: ${box.role || 'N/A'}`);
      console.log(`    placeholder: ${box.placeholder || 'N/A'}`);
      console.log('');
    });

    await browser.close();
    console.log('✅ 检查完成');
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
})();
