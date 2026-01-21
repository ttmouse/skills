const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  importUrl: 'https://ttmouse.com/import_classifications.html',
  batchSize: 10,
  delay: 1000,
  browserPort: 9222,
  timeout: 30000
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function openBrowser() {
  console.log('🌐 连接到浏览器...');
  const browser = await chromium.connectOverCDP(`http://localhost:${CONFIG.browserPort}`);
  const contexts = browser.contexts();
  if (contexts.length === 0) {
    throw new Error('未找到已打开的浏览器上下文，请确保Chrome已启动并开启远程调试');
  }
  const context = contexts[0];
  return { browser, context };
}

async function openImportPage(browser, context) {
  console.log('📄 使用第一个标签页打开导入页面...');
  const pages = context.pages();
  if (pages.length === 0) {
    throw new Error('未找到已打开的页面');
  }
  const page = pages[0];
  await page.goto(CONFIG.importUrl, { waitUntil: 'domcontentloaded', timeout: CONFIG.timeout });
  await page.waitForTimeout(CONFIG.delay);
  return page;
}

async function importData(browser, context, jsonData, startIndex, config) {
  console.log(`\n📤 开始录入，从第 ${startIndex + 1} 条开始...`);
  
  const page = await openImportPage(browser, context);
  const input = page.locator('textarea, input[type="text"]').first();
  
  const jsonString = JSON.stringify(jsonData, null, 2);
  await input.fill(jsonString);
  console.log('✅ 已粘贴 JSON 数据');
  
  await page.waitForTimeout(config.delay);
  
  const submitButton = page.locator('button[type="submit"]').first();
  await submitButton.click();
  console.log('✅ 已点击提交');
  
  await page.waitForTimeout(CONFIG.delay * 3);
  
  const successMessage = page.locator('.success-message, [class*="success"], .alert-success').first();
  const errorMessage = page.locator('.error-message, [class*="error"], .alert-danger').first();
  
  const successText = await successMessage.textContent().catch(() => '');
  const errorText = await errorMessage.textContent().catch(() => '');
  
  if (successText.includes('成功') || successText.includes('成功导入')) {
    console.log('✅ 录入成功');
    return { success: true };
  } else if (errorText && errorText.length > 0) {
    console.log(`⚠️  录入可能有问题: ${errorText}`);
    return { success: false, message: errorText };
  }
  
  await page.waitForTimeout(config.delay);
  return { success: false };
}

async function processBatch(browser, context, data, startIndex, config) {
  const endIndex = Math.min(startIndex + CONFIG.batchSize, data.length);
  const batchData = data.slice(startIndex, endIndex);
  
  const result = await importData(browser, context, batchData, startIndex, config);
  
  if (result.success) {
    return endIndex;
  }
  
  console.log(`⚠️ 录入未成功，重试...`);
  await context.pages().forEach(page => page.close().catch(() => {}));
  await new Promise(resolve => setTimeout(resolve, CONFIG.delay));
  
  const retryContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const retryResult = await importData(retryContext, batchData, startIndex, config);
  await retryContext.close();
  
  if (retryResult.success) {
    return endIndex;
  }
  
  return startIndex;
}

async function saveProgress(data, outputDir, currentIndex) {
  const progress = {
    total: data.length,
    processed: currentIndex,
    generated_at: new Date().toISOString()
  };
  
  const filePath = path.join(outputDir, 'importer-progress.json');
  fs.writeFileSync(filePath, JSON.stringify(progress, null, 2));
  
  console.log(`📊 进度: ${progress.processed}/${progress.total}`);
  console.log(`📁 进度文件: ${filePath}`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const config = { ...CONFIG };
  
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const nextArg = args[i + 1];
    
    switch (arg) {
      case '--input-file':
        config.inputFile = nextArg;
        i += 1;
        break;
      case '--batch-size':
        config.batchSize = parseInt(nextArg, 10);
        i += 1;
        break;
      case '--delay':
        config.delay = parseInt(nextArg, 10);
        i += 1;
        break;
      case '--timeout':
        config.timeout = parseInt(nextArg, 10);
        i += 1;
        break;
      case '--output-dir':
        config.outputDir = nextArg;
        i += 1;
        break;
      case '--start-index':
        config.startIndex = parseInt(nextArg, 10) || 0;
        break;
      case '--browser':
        config.browserPort = parseInt(nextArg, 10);
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
    }
  }
  
  return config;
}

function showHelp() {
  console.log(`
📤 数据库录入器

使用方式:
  node scripts/importer.js [选项]

选项:
  --input-file <文件>  JSON 文件路径
  --start-index <数字>    起始索引 (默认: 0)
  --batch-size <数字>    每批处理数量 (默认: 10)
  --delay <毫秒>         延迟时间 (默认: 1000)
  --timeout <秒>         单次超时 (默认: 30)
  --output-dir <目录>     输出目录 (默认: /Users/douba/twitter-output)
  --browser <端口>        浏览器端口 (默认: 9222)

示例:
  # 基础使用
  node scripts/importer.js --input-file /Users/douba/twitter-output/grok-data.json

  # 断点续跑（从第 20 条开始）
  node scripts/importer.js --input-file /Users/douba/twitter-output/grok-data.json --start-index 20
`);
}

async function main() {
  console.log('🚀 数据库录入器启动...\n');
  
  const config = parseArgs();
  ensureDir(config.outputDir);
  
  const { browser, context } = await openBrowser();
  
  let data = [];
  
  try {
    const fileContent = fs.readFileSync(config.inputFile, 'utf8');
    data = JSON.parse(fileContent);
    console.log(`📄 已读取文件: ${config.inputFile}`);
    console.log(`📊 总计记录: ${data.length} 条`);
  } catch (error) {
    console.error(`❌ 读取文件失败: ${error.message}`);
    await browser.close();
    process.exit(1);
  }
  
  if (!Array.isArray(data) || data.length === 0) {
    console.error('❌ JSON 数据为空或格式错误');
    await browser.close();
    process.exit(1);
  }
  
  if (!data[0].data) {
    console.error('❌ JSON 数据结构不正确');
    await browser.close();
    process.exit(1);
  }
  
  const startIndex = config.startIndex || 0;
  
  try {
    let currentIndex = startIndex;
    
    while (currentIndex < data.length) {
      currentIndex = await processBatch(browser, context, data, currentIndex, config);
      saveProgress(data, config.outputDir, currentIndex);
    }
    
    console.log('\n✅ 录入完成');
    console.log(`📊 总计处理: ${data.length} 条`);
  } catch (error) {
    console.error(`❌ 录入失败: ${error.message}`);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

main();
