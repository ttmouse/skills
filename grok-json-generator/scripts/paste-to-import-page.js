const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

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

    // 读取最新的 JSON 文件
    console.log('📂 读取 JSON 文件...');

    const outputDir = '/Users/douba/twitter-output';
    const jsonFiles = fs.readdirSync(outputDir)
      .filter(f => f.startsWith('grok-json-output') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (jsonFiles.length === 0) {
      console.log('❌ 未找到 JSON 文件');
      await browser.close();
      process.exit(1);
    }

    const jsonFilePath = path.join(outputDir, jsonFiles[0]);
    const jsonContent = fs.readFileSync(jsonFilePath, 'utf-8');

    console.log(`✅ 读取成功: ${jsonFiles[0]}`);
    console.log(`   内容长度: ${jsonContent.length} 字符\n`);

    // 查找页面中的输入框
    console.log('🔍 查找 JSON 输入框...\n');

    const inputFields = await importPage.$$eval('*', (elements) => {
      const inputs = [];

      elements.forEach(el => {
        const tagName = el.tagName.toLowerCase();
        const type = el.getAttribute('type');
        const role = el.getAttribute('role');
        const contenteditable = el.getAttribute('contenteditable');
        const placeholder = el.getAttribute('placeholder') || el.getAttribute('aria-placeholder');

        // 查找各种可能的输入框
        if (
          tagName === 'textarea' ||
          (tagName === 'input' && type === 'text') ||
          (tagName === 'input' && type === 'url') ||
          role === 'textbox' ||
          contenteditable === 'true'
        ) {
          inputs.push({
            tagName,
            type,
            role,
            contenteditable,
            placeholder,
            visible: el.offsetParent !== null,
            id: el.id,
            className: el.className?.substring(0, 100),
            hasJsonPlaceholder: placeholder && placeholder.toLowerCase().includes('json')
          });
        }
      });

      return inputs;
    });

    console.log(`📋 找到 ${inputFields.length} 个输入框:\n`);

    const visibleInputs = inputFields.filter(input => input.visible);

    visibleInputs.forEach((input, idx) => {
      const jsonMarker = input.hasJsonPlaceholder ? ' ✅ JSON 占位符' : '';
      console.log(`[${idx}] ${input.tagName}${jsonMarker}`);
      console.log(`    placeholder: "${input.placeholder || 'N/A'}"`);
      console.log(`    type: ${input.type || 'N/A'}`);
      console.log(`    role: ${input.role || 'N/A'}`);
      console.log(`    id: ${input.id || 'N/A'}`);
      console.log('');
    });

    if (visibleInputs.length === 0) {
      console.log('❌ 未找到可见的输入框');
      await browser.close();
      process.exit(1);
    }

    // 选择最合适的输入框（优先选择有 JSON 占位符的）
    let targetInput = visibleInputs.find(input => input.hasJsonPlaceholder);

    if (!targetInput) {
      // 如果没有 JSON 占位符，选择第一个 textarea
      targetInput = visibleInputs.find(input => input.tagName === 'textarea');
    }

    if (!targetInput) {
      // 如果没有 textarea，选择第一个输入框
      targetInput = visibleInputs[0];
    }

    console.log(`✅ 选择输入框: ${targetInput.tagName}\n`);

    // 填充 JSON
    console.log('📝 填充 JSON 内容...');

    if (targetInput.tagName === 'textarea') {
      const textarea = await importPage.$(`textarea${targetInput.id ? '#' + targetInput.id : ''}`);
      await textarea.fill(jsonContent);
    } else if (targetInput.role === 'textbox' || targetInput.contenteditable === 'true') {
      // 查找对应的元素
      const selector = targetInput.id
        ? `#${targetInput.id}`
        : targetInput.contenteditable === 'true'
        ? `div[contenteditable="true"]`
        : `[role="textbox"]`;

      const element = await importPage.$(selector);
      await element.fill(jsonContent);
    } else {
      console.log('❌ 不支持的输入框类型');
      await browser.close();
      process.exit(1);
    }

    console.log('✅ JSON 填充完成\n');

    console.log('⚠️ 注意：JSON 已粘贴到输入框中，导入操作需要手动完成！');
    console.log(`\n📊 粘贴统计:`);
    console.log(`   数据源: ${jsonFiles[0]}`);
    console.log(`   JSON 长度: ${jsonContent.length} 字符`);
    console.log(`   目标页面: https://ttmouse.com/import_classifications.html`);
    console.log(`   粘贴时间: ${new Date().toLocaleString('zh-CN')}`);
    console.log(`\n👆 请手动点击"导入数据库"按钮完成导入\n`);

    await browser.close();
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
