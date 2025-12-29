/**
 * 自动采集 designprompts.dev 所有设计风格
 *
 * 使用方法：
 * 1. 在浏览器打开 https://www.designprompts.dev/
 * 2. 打开浏览器控制台（F12）
 * 3. 复制粘贴这个脚本并运行
 * 4. 脚本会自动采集所有风格并下载为 JSON 文件
 */

async function fetchAllStyles() {
  console.log('🚀 开始采集所有设计风格...');

  // 获取所有风格按钮
  const styleButtons = Array.from(document.querySelectorAll('button'))
    .filter(btn => btn.textContent.match(/Light \d+$|Dark \d+$/));

  console.log(`📋 找到 ${styleButtons.length} 个风格`);

  const styles = [];

  for (let i = 0; i < styleButtons.length; i++) {
    const button = styleButtons[i];
    const text = button.textContent.trim();
    const match = text.match(/^(.+?)\s+(Light|Dark)\s+(\d+)$/);

    if (!match) continue;

    const styleName = match[1];
    const mode = match[2];
    const id = match[3];

    console.log(`\n📝 [${i + 1}/${styleButtons.length}] 处理: ${styleName} (${mode})`);

    // 点击风格按钮
    button.click();

    // 等待UI更新
    await sleep(500);

    // 查找描述
    const descriptionElement = document.querySelector('h2[class*="text-2xl"] + p');
    const description = descriptionElement ? descriptionElement.textContent.trim() : '';

    // 查找字体类型标签
    const fontTypeElements = Array.from(document.querySelectorAll('[class*="text-sm"]'));
    const fontTypeElement = fontTypeElements.find(el =>
      ['Sans-serif', 'Serif', 'Mono'].includes(el.textContent.trim())
    );
    const fontType = fontTypeElement ? fontTypeElement.textContent.trim() : 'Sans-serif';

    // 点击 "Get Prompt" 按钮
    const getPromptButton = Array.from(document.querySelectorAll('button'))
      .find(btn => btn.textContent.includes('Get Prompt'));

    if (getPromptButton) {
      getPromptButton.click();
      await sleep(500);

      // 获取提示词内容
      const promptElement = document.querySelector('[class*="whitespace-pre-wrap"]') ||
                           document.querySelector('pre') ||
                           document.querySelector('[class*="font-mono"]');

      const prompt = promptElement ? promptElement.textContent : '';

      if (prompt) {
        console.log(`✅ 成功获取提示词 (${prompt.length} 字符)`);

        styles.push({
          id: id.padStart(2, '0'),
          name: styleName,
          mode: mode.toLowerCase(),
          fontType: fontType.toLowerCase(),
          description,
          prompt,
          filename: `${styleName.toLowerCase().replace(/\s+/g, '-')}.md`
        });
      } else {
        console.warn(`⚠️  未找到提示词内容`);
      }

      // 关闭提示词面板
      const closeButton = Array.from(document.querySelectorAll('button'))
        .find(btn => btn.textContent.includes('Close') || btn.getAttribute('aria-label')?.includes('Close'));

      if (closeButton) {
        closeButton.click();
        await sleep(300);
      }
    } else {
      console.warn(`⚠️  未找到 "Get Prompt" 按钮`);
    }
  }

  console.log('\n✨ 采集完成！');
  console.log(`📊 成功采集 ${styles.length}/${styleButtons.length} 个风格`);

  // 下载为 JSON 文件
  downloadJSON(styles, 'design-styles.json');

  // 显示统计信息
  console.log('\n📈 统计信息：');
  console.log(`- Light Mode: ${styles.filter(s => s.mode === 'light').length} 个`);
  console.log(`- Dark Mode: ${styles.filter(s => s.mode === 'dark').length} 个`);
  console.log(`- Sans-serif: ${styles.filter(s => s.fontType === 'sans-serif').length} 个`);
  console.log(`- Serif: ${styles.filter(s => s.fontType === 'serif').length} 个`);
  console.log(`- Mono: ${styles.filter(s => s.fontType === 'mono').length} 个`);

  return styles;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function downloadJSON(data, filename) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  console.log(`💾 已下载: ${filename}`);
}

// 运行脚本
fetchAllStyles().then(styles => {
  console.log('\n🎉 所有完成！你可以将 design-styles.json 文件传给 Claude 进行处理。');
});
