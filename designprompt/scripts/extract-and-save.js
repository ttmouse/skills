/**
 * 完整的风格采集脚本 - 在浏览器控制台运行
 *
 * 使用方法：
 * 1. 打开 https://www.designprompts.dev/
 * 2. 打开浏览器控制台 (F12)
 * 3. 复制粘贴这整个脚本并运行
 * 4. 等待所有风格采集完成
 * 5. 下载生成的 all-styles-complete.json 文件
 * 6. 运行: python3 convert-to-md.py all-styles-complete.json
 */

async function extractAllStylesWithPrompts() {
  console.log('🚀 开始完整采集所有设计风格...\n');

  // 获取所有风格按钮（匹配 "MonochromeLight01" 或 "Modern DarkDark03" 等格式）
  const styleButtons = Array.from(document.querySelectorAll('button'))
    .filter(btn => btn.textContent.match(/(Light|Dark)\d+$/));

  console.log(`📋 找到 ${styleButtons.length} 个风格\n`);

  const styles = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < styleButtons.length; i++) {
    const button = styleButtons[i];
    const buttonText = button.textContent.trim();
    // 匹配 "MonochromeLight01" 或 "Modern DarkDark03" 等格式
    const match = buttonText.match(/^(.+?)(Light|Dark)(\d+)$/);

    if (!match) {
      console.warn(`⚠️  跳过无效按钮: ${buttonText}`);
      continue;
    }

    const styleName = match[1];
    const mode = match[2];
    const id = match[3];

    console.log(`\n📝 [${i + 1}/${styleButtons.length}] 处理: ${styleName} (${mode})`);

    try {
      // 1. 点击风格按钮
      button.click();
      await sleep(800);

      // 2. 获取描述和元数据
      const descriptionElements = document.querySelectorAll('p');
      let description = '';
      for (const el of descriptionElements) {
        const text = el.textContent.trim();
        if (text.length > 50 && text.length < 500 && !text.includes('Drop these prompts')) {
          description = text;
          break;
        }
      }

      // 获取字体类型
      const labels = Array.from(document.querySelectorAll('[class*="text-sm"]'));
      const fontElement = labels.find(el =>
        ['Sans-serif', 'Serif', 'Mono'].includes(el.textContent.trim())
      );
      const fontType = fontElement ? fontElement.textContent.trim() : 'Sans-serif';

      // 3. 点击 "Get Prompt" 按钮
      const getPromptBtn = Array.from(document.querySelectorAll('button'))
        .find(btn => btn.textContent.includes('Get Prompt'));

      if (!getPromptBtn) {
        throw new Error('未找到 Get Prompt 按钮');
      }

      getPromptBtn.click();
      await sleep(1000);

      // 4. 提取完整提示词
      const promptElement = document.querySelector('[class*="whitespace-pre-wrap"]');
      if (!promptElement) {
        throw new Error('未找到提示词元素');
      }

      const prompt = promptElement.textContent;

      if (!prompt || prompt.length < 100) {
        throw new Error('提示词内容为空或过短');
      }

      console.log(`   ✅ 成功 - ${prompt.length} 字符`);

      // 5. 保存数据
      styles.push({
        id: id.padStart(2, '0'),
        name: styleName,
        mode: mode.toLowerCase(),
        fontType: fontType.toLowerCase(),
        description: description || '待补充',
        prompt: prompt,
        promptLength: prompt.length,
        filename: `${styleName.toLowerCase().replace(/\s+/g, '-')}.md`
      });

      successCount++;

      // 6. 关闭提示词面板
      const closeBtn = Array.from(document.querySelectorAll('button'))
        .find(btn =>
          btn.textContent === 'Close' ||
          btn.getAttribute('aria-label')?.includes('Close')
        );

      if (closeBtn) {
        closeBtn.click();
        await sleep(500);
      }

    } catch (error) {
      console.error(`   ❌ 失败: ${error.message}`);
      failCount++;

      // 尝试关闭可能打开的面板
      const closeBtn = Array.from(document.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Close');
      if (closeBtn) closeBtn.click();
      await sleep(500);
    }
  }

  console.log(`\n\n✨ 采集完成！`);
  console.log(`📊 统计:`);
  console.log(`   - 成功: ${successCount}/${styleButtons.length}`);
  console.log(`   - 失败: ${failCount}/${styleButtons.length}`);
  console.log(`   - Light Mode: ${styles.filter(s => s.mode === 'light').length} 个`);
  console.log(`   - Dark Mode: ${styles.filter(s => s.mode === 'dark').length} 个`);

  // 下载 JSON 文件
  downloadJSON(styles, 'all-styles-complete.json');

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
  console.log(`\n💾 已下载: ${filename}`);
  console.log(`📂 文件大小: ${(json.length / 1024).toFixed(2)} KB`);
}

// 执行采集
console.log('⏳ 准备开始采集，3秒后开始...\n');
setTimeout(() => {
  extractAllStylesWithPrompts().then(styles => {
    console.log('\n🎉 全部完成！');
    console.log('\n📋 下一步：');
    console.log('   1. 找到下载的 all-styles-complete.json 文件');
    console.log('   2. 运行: cd ~/.claude/skills/designprompt/scripts');
    console.log('   3. 运行: python3 convert-to-md.py ~/Downloads/all-styles-complete.json');
  });
}, 3000);
