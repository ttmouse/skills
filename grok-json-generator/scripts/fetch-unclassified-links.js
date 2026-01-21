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

    // 步骤 1：确认默认值
    console.log('🔍 步骤 1/4：检查默认值...\n');

    const limitValue = await importPage.$eval('#limitInput', input => input.value);

    console.log(`📋 默认获取数量: ${limitValue}\n`);

    // 步骤 2：点击"获取待分类链接"按钮
    console.log('🔍 步骤 2/4：点击"获取待分类链接"按钮...');
    console.log('⚠️ 注意：这将从数据库获取待分类的链接\n');

    const fetchButton = await importPage.$('#fetchUnclassifiedBtn');

    if (!fetchButton) {
      console.log('❌ 未找到"获取待分类链接"按钮');
      await browser.close();
      process.exit(1);
    }

    await fetchButton.click();
    console.log('✅ 按钮点击完成');

    console.log('⏳ 等待获取链接...');
    await importPage.waitForTimeout(3000);

    // 步骤 3：读取获取到的链接
    console.log('\n🔍 步骤 3/4：读取获取到的链接...\n');

    const linksContent = await importPage.$eval('#unclassifiedOutput', textarea => textarea.value);

    const links = linksContent.split('\n').filter(link => link.trim());

    console.log(`✅ 成功获取 ${links.length} 条链接\n`);

    if (links.length === 0) {
      console.log('⚠️ 没有获取到链接');
      await browser.close();
      process.exit(1);
    }

    // 显示前 5 条链接
    console.log('📋 链接预览（前 5 条）:\n');
    links.slice(0, 5).forEach((link, idx) => {
      console.log(`[${idx + 1}] ${link}`);
    });

    if (links.length > 5) {
      console.log(`\n... 还有 ${links.length - 5} 条链接\n`);
    }

    // 步骤 4：保存链接到文件
    console.log('🔍 步骤 4/4：保存链接到文件...\n');

    const timestamp = new Date().toISOString().split('T')[0];
    const outputDir = '/Users/douba/twitter-output';
    const fileName = `unclassified-links-${timestamp}.txt`;
    const filePath = path.join(outputDir, fileName);

    fs.writeFileSync(filePath, links.join('\n'), 'utf-8');

    console.log(`💾 链接已保存: ${filePath}`);
    console.log(`   文件大小: ${linksContent.length} 字节\n`);

    // 生成统计信息
    console.log('📊 获取统计:\n');
    console.log(`   获取时间: ${new Date().toLocaleString('zh-CN')}`);
    console.log(`   链接数量: ${links.length}`);
    console.log(`   请求数量: ${limitValue}`);
    console.log(`   保存文件: ${fileName}\n`);

    console.log('✅ 获取流程完成！\n');
    console.log('💡 下一步：将链接发送给 Grok 生成标签');
    console.log('⚠️ 注意：这将需要更新 Grok 对话内容\n');

    await browser.close();
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
