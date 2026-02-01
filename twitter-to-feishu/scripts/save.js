#!/usr/bin/env node

/**
 * Twitter to Feishu - 将 Twitter 文章保存到飞书文档
 *
 * 用法:
 *   node save.js <twitter-url> --cdp-port <port>
 *
 * 示例:
 *   node save.js "https://x.com/user/status/123" --cdp-port 9224
 */

const { chromium } = require('playwright');

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    url: null,
    cdpPort: 9222,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--cdp-port' && args[i + 1]) {
      options.cdpPort = parseInt(args[i + 1]);
      i++;
    } else if (args[i].startsWith('http')) {
      options.url = args[i];
    }
  }

  return options;
}

// 主流程
async function main() {
  const options = parseArgs();

  if (!options.url) {
    console.error('错误: 请提供 Twitter URL');
    console.error('用法: node save.js <twitter-url> --cdp-port <port>');
    process.exit(1);
  }

  console.log('🚀 开始执行...');
  console.log(`   Twitter URL: ${options.url}`);
  console.log(`   CDP 端口: ${options.cdpPort}`);

  let browser;
  try {
    // 1. 连接浏览器
    console.log('\n[1/7] 连接浏览器...');
    browser = await chromium.connectOverCDP(`http://localhost:${options.cdpPort}`);
    const context = browser.contexts()[0];
    const pages = context.pages();

    // 2. 找到或打开 Twitter 页面
    console.log('[2/7] 定位 Twitter 页面...');
    let twitterPage = pages.find(p => p.url().includes(options.url.split('/status/')[1]));

    if (!twitterPage) {
      // 如果没有找到对应页面，打开新页面
      twitterPage = await context.newPage();
      await twitterPage.goto(options.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await twitterPage.waitForTimeout(3000);
    }

    await twitterPage.bringToFront();
    await twitterPage.waitForTimeout(500);

    // 3. 提取标题和内容
    console.log('[3/7] 提取文章内容...');
    const articleData = await twitterPage.evaluate(() => {
      let title = '';
      let contentEl = null;

      // 优先使用 Twitter Article 专用选择器
      // twitterArticleRichTextView 是纯正文（不含标题）
      const richTextView = document.querySelector('[data-testid="twitterArticleRichTextView"]');
      // twitterArticleReadView 包含标题
      const readView = document.querySelector('[data-testid="twitterArticleReadView"]');

      if (richTextView) {
        contentEl = richTextView;
        // 从 readView 提取标题（第一行通常是标题）
        if (readView) {
          const lines = readView.innerText.split('\n').filter(l => l.trim());
          // 标题通常是第一个较长的行（排除数字、@用户名等）
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.length > 10 && trimmed.length < 100 &&
                !trimmed.startsWith('@') && !/^\d+$/.test(trimmed)) {
              title = trimmed;
              break;
            }
          }
        }
      } else {
        // 回退：查找包含正文的元素
        const allElements = document.querySelectorAll('div, span, p');
        for (const el of allElements) {
          const text = el.innerText || '';
          if (text.length > 3000 && (text.includes('引子') || text.includes('第一部分') || text.includes('前言'))) {
            contentEl = el;
            const lines = text.split('\n').filter(l => l.trim());
            for (const line of lines) {
              if (line.length > 10 && line.length < 100 && !line.startsWith('@')) {
                title = line.trim();
                break;
              }
            }
            break;
          }
        }
      }

      // 如果还没找到，尝试 tweetText
      if (!contentEl) {
        const tweetText = document.querySelector('article [data-testid="tweetText"]');
        if (tweetText) {
          contentEl = tweetText;
          const text = tweetText.innerText || '';
          const lines = text.split('\n').filter(l => l.trim());
          title = lines[0]?.substring(0, 80) || '未命名文章';
        }
      }

      if (contentEl) {
        // 精确选中正文内容
        const range = document.createRange();
        range.selectNodeContents(contentEl);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        return { success: true, title, length: contentEl.innerText.length };
      }

      return { success: false, title: '', length: 0 };
    });

    if (!articleData.success) {
      throw new Error('无法提取文章内容');
    }

    console.log(`   标题: ${articleData.title.substring(0, 50)}...`);
    console.log(`   内容长度: ${articleData.length} 字符`);

    // 4. 复制内容
    console.log('[4/7] 复制内容...');
    await twitterPage.keyboard.press('Meta+c');
    await twitterPage.waitForTimeout(500);

    // 5. 在飞书新建文档
    console.log('[5/7] 新建飞书文档...');
    let feishuPage = pages.find(p => p.url().includes('feishu.cn'));

    if (!feishuPage) {
      throw new Error('请先打开飞书页面并登录');
    }

    await feishuPage.bringToFront();
    await feishuPage.waitForTimeout(500);

    // 步骤1: 点击知识库区域的 + 按钮
    await feishuPage.click('.workspace-area-root-create-btn');
    await feishuPage.waitForTimeout(800);

    // 步骤2: 点击 文档
    await feishuPage.click('[data-menu-id*="new_docx"]');
    await feishuPage.waitForTimeout(800);

    // 步骤3: 点击 新建空白文档
    await feishuPage.click('text=新建空白文档');
    await feishuPage.waitForTimeout(3000);

    // 6. 找到新文档页面并粘贴
    console.log('[6/7] 粘贴到新文档...');
    const updatedPages = context.pages();
    const newDocPage = updatedPages[updatedPages.length - 1]; // 最新的页面

    await newDocPage.bringToFront();
    await newDocPage.waitForTimeout(3000); // 等待新文档页面完全加载

    // 新建文档后光标已在标题位置，直接输入标题
    console.log('   - 输入标题...');
    await newDocPage.keyboard.type(articleData.title, { delay: 2 });
    await newDocPage.waitForTimeout(300);

    // Tab 进入正文区域
    console.log('   - 进入正文区域...');
    await newDocPage.keyboard.press('Tab');
    await newDocPage.waitForTimeout(300);

    // 粘贴正文
    console.log('   - 粘贴正文...');
    await newDocPage.keyboard.press('Meta+v');

    // 7. 获取新文档 URL 并立即输出结果
    console.log('[7/7] 完成！');
    const newDocUrl = newDocPage.url();

    console.log('\n✅ 保存成功！');
    console.log(`   文档标题: ${articleData.title}`);
    console.log(`   文档地址: ${newDocUrl}`);

    // 输出 JSON 结果供程序解析
    console.log('\n--- JSON ---');
    console.log(JSON.stringify({
      success: true,
      title: articleData.title,
      url: newDocUrl,
      contentLength: articleData.length
    }));

  } catch (error) {
    console.error('\n❌ 执行失败:', error.message);
    console.log('\n--- JSON ---');
    console.log(JSON.stringify({
      success: false,
      error: error.message
    }));
    process.exit(1);
  }
}

main();
