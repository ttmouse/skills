const { chromium } = require('playwright');

async function main() {
  try {
    console.log('🔍 评估待处理数据的整体完成时间\n');

    // 连接浏览器
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const context = browser.contexts()[0];
    const pages = context.pages();

    // 打开导入页面
    console.log('🔍 步骤 1：打开导入页面...');
    let importPage = pages.find(page => page.url().includes('ttmouse.com/import_classifications.html'));

    if (!importPage) {
      importPage = await context.newPage();
      await importPage.goto('https://ttmouse.com/import_classifications.html');
      await importPage.waitForLoadState('networkidle');
    }
    console.log('✅ 导入页面已打开\n');

    // 获取待分类链接总数
    console.log('🔍 步骤 2：获取待分类链接总数...');
    const fetchButton = await importPage.$('#fetchUnclassifiedBtn');
    await fetchButton.click();
    console.log('✅ 点击"获取待分类链接"按钮');

    await importPage.waitForTimeout(3000);

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
    console.log(`✅ 总共有 ${links.length} 条待分类链接\n`);

    // 计算批次
    const batchSize = 20; // 每批处理 20 条
    const totalBatches = Math.ceil(links.length / batchSize);

    console.log('=' .repeat(60));
    console.log('📊 时间评估（生产模式）\n');

    console.log('📋 数据统计:');
    console.log(`   待处理链接总数: ${links.length}`);
    console.log(`   每批处理数量: ${batchSize}`);
    console.log(`   总批次: ${totalBatches}\n`);

    // 时间评估
    const avgTimePerBatch = 10; // 平均每批 10 秒（包含 Grok 生成时间）
    const estimatedTotalTime = totalBatches * avgTimePerBatch;

    console.log('⏱️ 时间评估:');
    console.log(`   平均每批时间: ${avgTimePerBatch} 秒`);
    console.log(`   预计总时间: ${estimatedTotalTime} 秒 (${(estimatedTotalTime / 60).toFixed(2)} 分钟)\n`);

    // 不同场景的时间估算
    console.log('📈 不同场景的时间估算:\n');

    const scenarios = [
      { name: '乐观', multiplier: 0.7, desc: 'Grok 响应快速，网络稳定' },
      { name: '正常', multiplier: 1.0, desc: 'Grok 正常响应，网络稳定' },
      { name: '保守', multiplier: 1.5, desc: 'Grok 响应较慢，有重试' },
      { name: '悲观', multiplier: 2.0, desc: 'Grok 响应很慢，多次重试' }
    ];

    scenarios.forEach(scenario => {
      const estimatedTime = estimatedTotalTime * scenario.multiplier;
      const minutes = (estimatedTime / 60).toFixed(2);

      console.log(`   ${scenario.name}场景:`);
      console.log(`     预计时间: ${estimatedTime} 秒 (${minutes} 分钟)`);
      console.log(`     说明: ${scenario.desc}`);
      console.log('');
    });

    // 优化建议
    console.log('💡 优化建议:\n');

    if (totalBatches > 5) {
      console.log('   1. 考虑批量并行处理（如果 Grok 支持多个对话）');
      console.log('   2. 实现自动重试机制（处理失败批次）');
    }

    if (totalBatches > 10) {
      console.log('   3. 考虑分时段执行（避免 Grok 限流）');
      console.log('   4. 实现进度保存（支持断点续传）');
    }

    if (totalBatches > 20) {
      console.log('   5. 考虑使用其他 AI 工具分担负载');
      console.log('   6. 实现任务队列和调度系统');
    }

    console.log('');

    // 完成时间预估
    const now = new Date();
    const normalFinishTime = new Date(now.getTime() + estimatedTotalTime * 1000);
    const optimisticFinishTime = new Date(now.getTime() + estimatedTotalTime * 0.7 * 1000);
    const pessimisticFinishTime = new Date(now.getTime() + estimatedTotalTime * 2.0 * 1000);

    console.log('🕐 完成时间预估:\n');
    console.log(`   乐观: ${optimisticFinishTime.toLocaleString('zh-CN')}`);
    console.log(`   正常: ${normalFinishTime.toLocaleString('zh-CN')}`);
    console.log(`   悲观: ${pessimisticFinishTime.toLocaleString('zh-CN')}\n`);

    console.log('=' .repeat(60));

    await browser.close();
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    process.exit(1);
  }
}

main();
