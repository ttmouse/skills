const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    console.log('🚀 开始完整的自动化流程...\n');

    // 连接浏览器
    console.log('🔍 步骤 0：连接浏览器...');
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const context = browser.contexts()[0];
    const pages = context.pages();

    // 找到或打开导入页面
    console.log('🔍 步骤 1/7：打开导入页面...');
    let importPage = pages.find(page => page.url().includes('ttmouse.com/import_classifications.html'));

    if (!importPage) {
      importPage = await context.newPage();
      await importPage.goto('https://ttmouse.com/import_classifications.html');
      await importPage.waitForLoadState('networkidle');
    }
    console.log('✅ 导入页面已打开\n');

    // 步骤 1：获取待分类链接
    console.log('🔍 步骤 2/7：获取待分类链接...');
    const fetchButton = await importPage.$('#fetchUnclassifiedBtn');
    await fetchButton.click();
    console.log('✅ 点击"获取待分类链接"按钮');

    console.log('⏳ 等待获取链接...');

    // 等待输入框有内容，最多等待 10 秒
    let linksContent = '';
    let retries = 10;

    while (retries > 0) {
      await importPage.waitForTimeout(1000);
      linksContent = await importPage.$eval('#unclassifiedOutput', textarea => textarea.value);

      if (linksContent.trim().length > 0) {
        break;
      }

      retries--;
      console.log(`⏳ 等待中... (${10 - retries}/10)`);
    }

    const links = linksContent.split('\n').filter(link => link.trim());

    console.log(`✅ 成功获取 ${links.length} 条链接\n`);

    // 检查是否获取到链接
    if (links.length === 0) {
      console.log('⚠️ 没有获取到待分类链接！');
      console.log('数据库可能没有待分类的数据，或者已经全部处理完成。\n');
      console.log('💡 建议：');
      console.log('   1. 检查数据库是否有待分类的链接');
      console.log('   2. 或者使用之前收集的 Twitter 数据\n');
      await browser.close();
      process.exit(0);
    }

    // 保存链接到文件
    const timestamp = new Date().toISOString().split('T')[0];
    const outputDir = '/Users/douba/twitter-output';
    const linksFile = path.join(outputDir, `unclassified-links-${timestamp}.txt`);
    fs.writeFileSync(linksFile, links.join('\n'), 'utf-8');
    console.log(`💾 链接已保存: ${linksFile}\n`);

    // 步骤 2：更新 Grok 对话
    console.log('🔍 步骤 3/7：更新 Grok 对话...');

    // 找到 Grok 页面
    let grokPage = pages.find(page => page.url().includes('/i/grok?conversation='));

    if (!grokPage) {
      // 如果没有 Grok 页面，可能需要手动打开
      console.log('⚠️ 未找到 Grok 对话页面');
      console.log('请手动打开 Grok 对话页面，然后重新运行脚本\n');
      await browser.close();
      process.exit(1);
    }

    console.log('✅ 找到 Grok 对话页面');

    // 查找并编辑用户消息
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

    console.log('✅ 找到用户消息');

    // 悬停并点击编辑
    console.log('🖱️ 悬停到消息...');
    await targetMessage.asElement().hover();
    await grokPage.waitForTimeout(2000);
    console.log('✅ 悬停完成');

    // 查找并点击编辑按钮
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
          break;
        }
      }
    }

    await editButton.click();
    console.log('✅ 点击编辑按钮');
    await grokPage.waitForTimeout(2000);

    // 更新内容（使用新的提示词）
    console.log('📝 更新提示词和链接列表...');

    const textareas = await grokPage.$$('textarea >> visible=true');
    const textarea = textareas[0];

    // 新的提示词
    const newPrompt = `请严格按照以下格式输出，结果都必须完整包裹在 \`\`\`json ... \`\`\` 代码块中。
禁止输出任何解释、文字、前缀、后缀、问候语或其他任何非JSON内容。

分类规则：
- hierarchical: 对象形式，一级大类作为key（只出现一次），value为二级子类数组。
  必须从以下完整一级大类中选（支持多个大类，选最匹配的，不必全用）：
  - 人物肖像
  - 艺术与幻想
  - 产品与营销
  - 可视化与分解
  - 幽默与Meme
  - 自然与环境
  - 视频与动态
  - 其他/实验
- 二级子类：从以下完整列表中选最贴合的（可多选，不必全用）：
  人物肖像: 名人/现实主义, 性感/时尚, 自定义角色, 个人品牌, 身份编辑, 工作室肖像
  艺术与幻想: 动漫/Kawaii, 卡通/插图, 科幻/超现实, Chibi风格, 信息图/Infographic, 抽象/实验
  产品与营销: 产品摄影, 广告/海报, 包装设计, 时尚品牌, 奢华护肤, 食物广告, 成分可视化, 小红书风格
  可视化与分解: 成分环绕, 成分悬浮, 浮动构图, 解剖/生物, 教育图表
  幽默与Meme: 政治/讽刺, 混合/编辑, 搞笑场景
  自然与环境: 季节/景观, 城市/氛围, 治愈/梦幻, 地图/3D视图
  视频与动态: 文本到视频, 动画效果, 产品旋转
  其他/实验: 伦理/争议, 工具比较
- flat_tags: 平面数组，捕捉独特风格、技巧、关键词、氛围、材质等（5-8个左右，中文+英文混合优先，突出帖子独特点）。
- 每个post对象必须包含: post_id, author, hierarchical, flat_tags



现在请为以下帖子生成标签（直接在代码块中输出JSON数组）：

${links.join('\n')}
`;

    await textarea.fill(newPrompt);


    console.log('✅ 链接列表更新完成');

    // 保存编辑
    console.log('💾 保存编辑...');
    await grokPage.keyboard.press('Enter');
    console.log('✅ 编辑已保存\n');

    // 步骤 3：监控 Grok JSON 生成
    console.log('🔍 步骤 4/7：监控 Grok JSON 生成...');

    let lastJsonContent = '';
    let stableCount = 0;
    const maxStableCount = 10;
    const checkInterval = 1000;
    const maxWaitTime = 300000; // 最多等待 5 分钟
    const startTime = Date.now();

    console.log('⏳ 等待 JSON 生成中...\n');
    console.log('⚠️ 注意：如果暂停按钮消失或连续 10 秒内容不变，认为生成完成\n');

    while (stableCount < maxStableCount && (Date.now() - startTime) < maxWaitTime) {
      // 检查暂停按钮是否存在
      const hasPauseButton = await grokPage.evaluate(() => {
        const pauseButtons = Array.from(document.querySelectorAll('button, [role="button"]'));
        return pauseButtons.some(btn => {
          const text = btn.textContent?.toLowerCase() || '';
          const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
          return (
            text.includes('pause') ||
            text.includes('暂停') ||
            text.includes('stop') ||
            text.includes('停止') ||
            ariaLabel.includes('pause') ||
            ariaLabel.includes('暂停')
          );
        });
      });

      // 如果没有暂停按钮，说明生成完成
      if (!hasPauseButton) {
        console.log('✅ 暂停按钮消失，生成已完成！');
        break;
      }

      const result = await grokPage.evaluate(() => {
        // 查找所有文本
        const allText = document.body.innerText;

        // 查找 JSON 数组（支持多层嵌套）
        const jsonMatches = allText.match(/\[\s*\{[\s\S]*?\}\s*\]/g);

        // 查找代码块中的 JSON
        const codeBlockMatches = allText.match(/```json[\s\S]*?```/g);

        // 优先使用代码块中的 JSON
        if (codeBlockMatches && codeBlockMatches.length > 0) {
          return {
            found: true,
            content: codeBlockMatches[0],
            length: codeBlockMatches[0].length,
            source: 'codeblock'
          };
        }

        // 如果没有代码块，使用最长的 JSON 数组
        if (jsonMatches && jsonMatches.length > 0) {
          const longestJson = jsonMatches.reduce((max, current) => {
            return current.length > max.length ? current : max;
          }, '');

          if (longestJson.length > 100) {
            return {
              found: true,
              content: longestJson,
              length: longestJson.length,
              source: 'array'
            };
          }
        }

        return { found: false, content: '', length: 0 };
      });

      if (result.found && result.content.length > 100) {
        if (result.content === lastJsonContent) {
          stableCount++;
          if (stableCount <= 3) {
            console.log(`📝 生成中... (${result.content.length} 字符) [稳定 ${stableCount}/${maxStableCount}] [来源: ${result.source}] [暂停按钮: 存在]`);
          }
        } else {
          stableCount = 0;
          lastJsonContent = result.content;
          console.log(`📝 生成中... (${result.content.length} 字符) [新内容] [来源: ${result.source}] [暂停按钮: 存在]`);
        }
      } else {
        stableCount = 0;
        console.log('⏳ 等待生成... [暂停按钮: 存在]');
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    // 检查是否超时
    if ((Date.now() - startTime) >= maxWaitTime) {
      console.log('\n⚠️ 等待超时（5 分钟），JSON 可能生成失败或被中断');
      console.log('💡 建议：');
      console.log('   1. 检查 Grok 对话是否正在生成');
      console.log('   2. 手动检查是否有错误信息\n');
      console.log('⚠️ 脚本将退出，但已保存获取的链接文件\n');

      await browser.close();
      process.exit(1);
    }

    if (lastJsonContent.length === 0) {
      console.log('\n⚠️ 没有检测到 JSON 内容！');
      console.log('💡 建议：');
      console.log('   1. 检查 Grok 对话是否生成了 JSON');
      console.log('   2. 检查是否有错误信息\n');

      await browser.close();
      process.exit(1);
    }

    console.log(`\n✅ JSON 生成完成！总长度: ${lastJsonContent.length} 字符\n`);

    // 步骤 4：验证并保存 JSON
    console.log('🔍 步骤 5/7：验证并保存 JSON...');

    let parsedJson;

    try {
      parsedJson = JSON.parse(lastJsonContent);
      console.log(`✅ JSON 格式正确，包含 ${parsedJson.length} 个对象\n`);
    } catch (error) {
      console.log(`⚠️ JSON 解析失败，尝试修复...`);

      try {
        const fixedJson = lastJsonContent
          .replace(/,\s*]/g, ']')
          .replace(/,\s*}/g, '}')
          .replace(/\/\*[\s\S]*?\*\//g, '');

        parsedJson = JSON.parse(fixedJson);
        console.log(`✅ JSON 修复成功，包含 ${parsedJson.length} 个对象\n`);
        lastJsonContent = fixedJson;
      } catch (error2) {
        console.log(`❌ JSON 修复失败，将保存原始内容\n`);
      }
    }

    // 保存 JSON
    const jsonFileName = `grok-json-output-${timestamp}.json`;
    const jsonFilePath = path.join(outputDir, jsonFileName);
    const formattedJson = JSON.stringify(parsedJson || lastJsonContent, null, 2);

    fs.writeFileSync(jsonFilePath, formattedJson, 'utf-8');

    console.log(`💾 JSON 已保存: ${jsonFileName}`);
    console.log(`   文件大小: ${formattedJson.length} 字节\n`);

    // 步骤 5：粘贴到导入页面
    console.log('🔍 步骤 6/7：粘贴 JSON 到导入页面...');

    // 重新获取导入页面的引用（防止页面已刷新）
    pages = context.pages();
    let currentImportPage = pages.find(page => page.url().includes('ttmouse.com/import_classifications.html'));

    if (!currentImportPage) {
      console.log('❌ 导入页面已关闭，无法粘贴 JSON');
      console.log('JSON 已保存到文件，可以手动粘贴\n');
    } else {
      const jsonInput = await currentImportPage.$('#jsonInput');
      await jsonInput.fill(formattedJson);
      console.log('✅ JSON 已粘贴到输入框\n');
    }

    // 完成
    console.log('🔍 步骤 7/7：完成总结...\n');

    console.log('🎉 完整自动化流程完成！\n');

    console.log('📊 流程统计:');
    console.log(`   获取链接数: ${links.length}`);
    console.log(`   JSON 长度: ${formattedJson.length} 字节`);
    console.log(`   对象数量: ${Array.isArray(parsedJson) ? parsedJson.length : 'N/A'}`);
    console.log(`   完成时间: ${new Date().toLocaleString('zh-CN')}\n`);

    console.log('💾 生成的文件:');
    console.log(`   1. ${linksFile} - 待分类链接`);
    console.log(`   2. ${jsonFileName} - 标签 JSON\n`);

    console.log('⚠️ 重要提示:');
    console.log('   JSON 已粘贴到导入页面的输入框中');
    console.log('   👆 请手动点击"📥 导入数据库"按钮完成导入\n');

    await browser.close();
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
