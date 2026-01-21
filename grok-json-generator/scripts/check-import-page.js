const { chromium } = require('playwright');

async function main() {
  try {
    console.log('🔍 连接浏览器...');
    const browser = await chromium.connectOverCDP('http://localhost:9222');

    // 检查是否已打开目标页面
    let pages = browser.contexts()[0].pages();
    let importPage = pages.find(page => page.url().includes('ttmouse.com/import_classifications.html'));

    if (!importPage) {
      console.log('🔍 打开导入页面...');
      const context = browser.contexts()[0];
      importPage = await context.newPage();
      await importPage.goto('https://ttmouse.com/import_classifications.html');
      await importPage.waitForLoadState('networkidle');
    } else {
      console.log('✅ 找到已打开的导入页面');
    }

    console.log('✅ 导入页面已打开\n');

    // 分析页面结构
    console.log('🔍 分析页面结构...\n');

    const pageStructure = await importPage.evaluate(() => {
      // 查找所有按钮和输入框
      const buttons = Array.from(document.querySelectorAll('button'))
        .map(btn => ({
          text: btn.textContent?.substring(0, 50) || '',
          className: btn.className,
          visible: btn.offsetParent !== null,
          id: btn.id
        }))
        .filter(btn => btn.visible);

      const inputs = Array.from(document.querySelectorAll('input, textarea, select'))
        .map(input => ({
          type: input.type,
          placeholder: input.placeholder,
          id: input.id,
          className: input.className,
          visible: input.offsetParent !== null
        }))
        .filter(input => input.visible);

      // 查找顶部区域
      const headerArea = document.querySelector('header, .header, .top, #top, [class*="top"]');
      const headerInfo = headerArea ? {
        tagName: headerArea.tagName,
        className: headerArea.className,
        id: headerArea.id,
        innerHTML: headerArea.innerHTML.substring(0, 500)
      } : null;

      return {
        buttons,
        inputs,
        headerArea: headerInfo
      };
    });

    console.log('📋 页面按钮:\n');
    pageStructure.buttons.forEach((btn, idx) => {
      console.log(`[${idx}] ${btn.text}`);
      console.log(`    id: ${btn.id || 'N/A'}`);
      console.log(`    class: ${btn.className || 'N/A'}`);
      console.log('');
    });

    console.log('\n📋 页面输入框:\n');
    pageStructure.inputs.forEach((input, idx) => {
      console.log(`[${idx}] type: ${input.type}`);
      console.log(`    id: ${input.id || 'N/A'}`);
      console.log(`    placeholder: ${input.placeholder || 'N/A'}`);
      console.log('');
    });

    if (pageStructure.headerArea) {
      console.log('\n📋 顶部区域:\n');
      console.log(`标签: ${pageStructure.headerArea.tagName}`);
      console.log(`class: ${pageStructure.headerArea.className}`);
      console.log(`内容: ${pageStructure.headerArea.innerHTML.substring(0, 200)}...\n`);
    }

    // 查找获取链接相关的元素
    console.log('🔍 查找"获取链接"相关元素...\n');

    const linkRelatedElements = await importPage.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));

      return elements
        .filter(el => {
          const text = el.innerText || '';
          const attributes = el.outerHTML || '';
          return (
            text.toLowerCase().includes('获取链接') ||
            text.toLowerCase().includes('get link') ||
            text.toLowerCase().includes('fetch link') ||
            text.toLowerCase().includes('获取') ||
            text.toLowerCase().includes('链接') ||
            attributes.toLowerCase().includes('getlink') ||
            attributes.toLowerCase().includes('fetchlink')
          );
        })
        .map(el => ({
          tagName: el.tagName,
          id: el.id,
          className: el.className?.substring(0, 100),
          text: el.textContent?.substring(0, 100),
          outerHTML: el.outerHTML.substring(0, 300),
          visible: el.offsetParent !== null
        }))
        .filter(el => el.visible)
        .slice(0, 10);
    });

    console.log(`📋 找到 ${linkRelatedElements.length} 个相关元素:\n`);

    linkRelatedElements.forEach((el, idx) => {
      console.log(`[${idx}] ${el.tagName}`);
      console.log(`    id: ${el.id || 'N/A'}`);
      console.log(`    class: ${el.className || 'N/A'}`);
      console.log(`    text: ${el.text || 'N/A'}`);
      console.log('');
    });

    console.log('✅ 分析完成\n');
    console.log('💡 请告诉我：顶部获取链接的方式具体是什么？');
    console.log('   1. 是点击某个按钮？');
    console.log('   2. 还是填写某个输入框？');
    console.log('   3. 还是其他方式？\n');

    await browser.close();
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
