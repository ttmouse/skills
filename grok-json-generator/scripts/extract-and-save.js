const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    console.log('🚀 提取 JSON 并保存...\n');

    // 连接浏览器
    console.log('🔍 连接浏览器...');
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const context = browser.contexts()[0];
    const pages = context.pages();

    // 找到 Grok 页面
    const grokPage = pages.find(page => page.url().includes('/i/grok'));

    if (!grokPage) {
      console.log('❌ 未找到 Grok 页面');
      await browser.close();
      process.exit(1);
    }

    console.log('✅ 找到 Grok 页面\n');

    // 提取 JSON
    console.log('🔍 步骤 1：提取 JSON...');

    const result = await grokPage.evaluate(() => {
      // 滚动到底部
      window.scrollTo(0, document.body.scrollHeight);

      const allText = document.body.innerText;
      const jsonMatches = allText.match(/\[\s*\{[\s\S]*?\}\s*\]/g);

      if (!jsonMatches || jsonMatches.length === 0) {
        return { found: false, content: '' };
      }

      // 找到最长的 JSON
      const longestJson = jsonMatches.reduce((max, current) => {
        return current.length > max.length ? current : max;
      }, '');

      return {
        found: true,
        content: longestJson,
        length: longestJson.length
      };
    });

    if (!result.found) {
      console.log('❌ 未找到 JSON');
      await browser.close();
      process.exit(1);
    }

    console.log(`✅ 找到 JSON，长度: ${result.content.length} 字符\n`);

    // 验证 JSON
    console.log('🔍 步骤 2：验证 JSON...');

    let parsedJson;
    let jsonContent = result.content;

    try {
      parsedJson = JSON.parse(jsonContent);
      console.log(`✅ JSON 格式正确，包含 ${parsedJson.length} 个对象\n`);
    } catch (error) {
      console.log(`⚠️ JSON 解析失败: ${error.message}`);

      try {
        const fixedJson = jsonContent
          .replace(/,\s*]/g, ']')
          .replace(/,\s*}/g, '}')
          .replace(/\/\*[\s\S]*?\*\//g, '');

        parsedJson = JSON.parse(fixedJson);
        console.log(`✅ JSON 修复成功，包含 ${parsedJson.length} 个对象\n`);
        jsonContent = fixedJson;
      } catch (error2) {
        console.log(`❌ JSON 修复失败，将保存原始内容\n`);
      }
    }

    // 保存 JSON
    console.log('🔍 步骤 3：保存 JSON...');

    const timestamp = new Date().toISOString().split('T')[0];
    const outputDir = '/Users/douba/twitter-output';
    const jsonFileName = `grok-json-output-${timestamp}.json`;
    const jsonFilePath = path.join(outputDir, jsonFileName);
    const formattedJson = JSON.stringify(parsedJson || jsonContent, null, 2);

    fs.writeFileSync(jsonFilePath, formattedJson, 'utf-8');

    console.log(`💾 JSON 已保存: ${jsonFileName}`);
    console.log(`   文件大小: ${formattedJson.length} 字节\n`);

    // 粘贴到导入页面
    console.log('🔍 步骤 4：粘贴 JSON 到导入页面...');

    let importPage = pages.find(page => page.url().includes('ttmouse.com/import_classifications.html'));

    if (!importPage) {
      console.log('❌ 导入页面已关闭，无法粘贴 JSON');
      console.log('JSON 已保存到文件，可以手动粘贴\n');
    } else {
      const jsonInput = await importPage.$('#jsonInput');
      await jsonInput.fill(formattedJson);
      console.log('✅ JSON 已粘贴到输入框\n');
    }

    // 完成
    console.log('🔍 步骤 5：完成总结...\n');

    console.log('🎉 提取和保存完成！\n');

    console.log('📊 总结:');
    console.log(`   JSON 长度: ${formattedJson.length} 字节`);
    console.log(`   对象数量: ${Array.isArray(parsedJson) ? parsedJson.length : 'N/A'}`);
    console.log(`   完成时间: ${new Date().toLocaleString('zh-CN')}\n`);

    console.log('💾 生成的文件:');
    console.log(`   1. ${path.join(outputDir, `unclassified-links-${timestamp}.txt`)} - 待分类链接`);
    console.log(`   2. ${jsonFileName} - 标签 JSON\n`);

    console.log('⚠️ 重要提示:');
    console.log('   JSON 已粘贴到导入页面的输入框中');
    console.log('   👆 请手动点击"📥 导入数据库"按钮完成导入\n');

    // 显示前 500 字符
    console.log('📋 JSON 预览（前 500 字符）:');
    console.log(formattedJson.substring(0, 500) + '...\n');

    await browser.close();
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
