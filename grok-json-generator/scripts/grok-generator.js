const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  grokBaseUrl: 'https://x.com/i/grok',
  defaultSearchText: '下面是一批新的链接：',
  timeout: 60000,
  waitTime: 2000,
  editWaitTime: 3000,
  generationTimeout: 120000,
  browserPort: 9222,
  outputDir: '/Users/douba/twitter-output'
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function openGrokConversation(conversationId) {
  console.log('🌐 正在连接到浏览器...');
  const browser = await chromium.connectOverCDP(`http://localhost:${CONFIG.browserPort}`);

  const contexts = browser.contexts();
  if (contexts.length === 0) {
    throw new Error('未找到已打开的浏览器上下文，请确保Chrome已启动并开启远程调试');
  }

  const context = contexts[0];
  const pages = context.pages();
  if (pages.length === 0) {
    throw new Error('未找到已打开的页面，请确保Chrome中至少有一个标签页');
  }

  console.log(`📋 找到 ${pages.length} 个已打开的页面`);

  // 查找或创建 Grok 对话页面
  let grokPage = pages.find(page => page.url().includes('grok'));

  if (conversationId) {
    const targetUrl = `${CONFIG.grokBaseUrl}?conversation=${conversationId}`;
    console.log(`💬 目标对话URL: ${targetUrl}`);

    grokPage = pages.find(page => page.url().includes(`conversation=${conversationId}`));

    if (!grokPage) {
      console.log('⚠️ 未找到目标对话，使用第一个页面跳转');
      grokPage = pages[0];
      await grokPage.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    } else {
      console.log('✅ 找到目标对话页面');
    }
  } else if (!grokPage) {
    console.log('⚠️ 未找到 Grok 页面，使用第一个页面跳转');
    grokPage = pages[0];
    await grokPage.goto(CONFIG.grokBaseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  } else {
    console.log('✅ 找到已打开的 Grok 页面');
  }

  await grokPage.waitForTimeout(CONFIG.waitTime);
  return { browser, grokPage };
}

async function findUserMessage(grokPage, searchText) {
  console.log(`🔍 正在查找包含 "${searchText}" 的用户消息...`);

  try {
    const messageElement = await grokPage.evaluateHandle((text) => {
      // 查找所有对话消息
      const messages = Array.from(document.querySelectorAll('[data-testid^="tweet"], [role="article"]'));

      for (const msg of messages) {
        // 获取消息文本内容
        const textContent = msg.innerText || '';

        // 检查是否包含目标文本
        if (textContent.includes(text)) {
          return msg;
        }
      }

      return null;
    }, searchText);

    if (messageElement) {
      console.log('✅ 找到目标消息');
      return messageElement;
    }

    console.log('⚠️ 未找到目标消息');
    return null;
  } catch (error) {
    console.log(`⚠️ 查找消息失败: ${error.message}`);
    return null;
  }
}

async function clickEditButton(grokPage, messageElement) {
  console.log('✏️ 正在查找并点击编辑按钮...');

  try {
    // 在消息元素内查找编辑按钮
    const editButton = await grokPage.evaluateHandle((msgEl) => {
      // 常见的编辑按钮选择器
      const selectors = [
        'button[aria-label*="Edit"]',
        'button[aria-label*="编辑"]',
        '[data-testid="edit"]',
        'svg[aria-label="Edit"]'
      ];

      for (const selector of selectors) {
        const btn = msgEl.querySelector(selector);
        if (btn) return btn;
      }

      // 查找消息右上角的菜单按钮
      const menuButton = msgEl.parentElement?.querySelector('button[aria-label*="More"], [aria-label*="更多"]');
      return menuButton;
    }, messageElement);

    if (editButton) {
      await editButton.click();
      await grokPage.waitForTimeout(CONFIG.editWaitTime);
      console.log('✅ 编辑按钮点击成功');
      return true;
    }

    console.log('⚠️ 未找到编辑按钮');
    return false;
  } catch (error) {
    console.log(`⚠️ 点击编辑按钮失败: ${error.message}`);
    return false;
  }
}

async function editMessageContent(grokPage, newLinks) {
  console.log('📝 正在编辑消息内容...');

  try {
    // 查找编辑区域的输入框
    const editArea = await grokPage.waitForSelector('div[contenteditable="true"][role="textbox"], textarea[role="textbox"]', {
      timeout: 5000
    });

    if (editArea) {
      // 获取当前内容
      const currentContent = await editArea.innerText();

      console.log(`📄 当前内容长度: ${currentContent.length} 字符`);

      // 替换链接部分（保留提示词）
      const parts = currentContent.split('https://');
      if (parts.length > 1) {
        const promptPart = parts[0];
        const newContent = promptPart + newLinks.join('\nhttps://');

        // 清空并填入新内容
        await editArea.fill('');
        await editArea.fill(newContent);

        console.log(`✅ 内容已更新，包含 ${newLinks.length} 条新链接`);
        return true;
      }

      // 如果无法识别结构，直接追加
      const newContent = currentContent + '\n' + newLinks.join('\n');
      await editArea.fill('');
      await editArea.fill(newContent);

      console.log(`✅ 已追加 ${newLinks.length} 条新链接`);
      return true;
    }

    console.log('⚠️ 未找到编辑区域');
    return false;
  } catch (error) {
    console.log(`⚠️ 编辑内容失败: ${error.message}`);
    return false;
  }
}

async function submitEdit(grokPage) {
  console.log('📤 正在提交编辑...');

  try {
    // 查找提交/发送按钮
    const submitButton = await grokPage.waitForSelector(
      'button[aria-label*="Send"], button[aria-label*="发送"], button[type="submit"], [data-testid="send"]',
      { timeout: 5000 }
    );

    if (submitButton) {
      await submitButton.click();
      console.log('✅ 编辑已提交');
      return true;
    }

    console.log('⚠️ 未找到提交按钮');
    return false;
  } catch (error) {
    console.log(`⚠️ 提交编辑失败: ${error.message}`);
    return false;
  }
}

async function waitForGeneration(grokPage) {
  console.log('⏳ 等待 Grok 生成回复...');
  console.log('   (最长等待 120 秒)');

  const startTime = Date.now();
  const maxWaitTime = CONFIG.generationTimeout;

  try {
    // 等待最后一条消息更新
    await grokPage.waitForFunction(
      () => {
        const messages = Array.from(document.querySelectorAll('[data-testid^="tweet"], [role="article"]'));
        if (messages.length === 0) return false;

        // 检查最后一条是否为 AI 回复（非用户消息）
        const lastMessage = messages[messages.length - 1];
        const isUserMessage = lastMessage.querySelector('[data-testid="UserAvatar"]');

        return !isUserMessage && lastMessage.innerText.length > 0;
      },
      { timeout: maxWaitTime }
    );

    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    console.log(`✅ 生成完成 (耗时 ${elapsed} 秒)`);
    return true;
  } catch (error) {
    console.log('⚠️ 等待超时，尝试提取已有内容');
    return false;
  }
}

async function extractJSON(grokPage) {
  console.log('📦 正在提取 JSON 数据...');

  try {
    const jsonText = await grokPage.evaluate(() => {
      // 获取最后一条消息
      const messages = Array.from(document.querySelectorAll('[data-testid^="tweet"], [role="article"]'));
      const lastMessage = messages[messages.length - 1];

      if (!lastMessage) return null;

      // 获取消息文本
      const textContent = lastMessage.innerText || '';

      // 尝试提取 JSON
      const jsonMatches = textContent.match(/\{[\s\S]*\}/g) ||
                         textContent.match(/\[[\s\S]*\]/g);

      if (jsonMatches) {
        // 返回最长的 JSON 字符串
        return jsonMatches.sort((a, b) => b.length - a.length)[0];
      }

      return null;
    });

    if (jsonText) {
      try {
        const jsonData = JSON.parse(jsonText);
        console.log(`✅ 成功解析 JSON 数据`);
        return jsonData;
      } catch (error) {
        console.log(`⚠️ JSON 解析失败: ${error.message}`);
        console.log(`📄 原始内容: ${jsonText.substring(0, 200)}...`);
        return null;
      }
    }

    console.log('⚠️ 未找到 JSON 数据');
    return null;
  } catch (error) {
    console.log(`⚠️ 提取 JSON 失败: ${error.message}`);
    return null;
  }
}

async function saveJSON(jsonData, outputDir, linkCount) {
  ensureDir(outputDir);

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `grok-data-${timestamp}.json`;
  const filePath = path.join(outputDir, filename);

  const outputData = {
    generated_at: new Date().toISOString(),
    total_links: linkCount,
    data: jsonData
  };

  fs.writeFileSync(filePath, JSON.stringify(outputData, null, 2));

  console.log(`💾 JSON 已保存: ${filename}`);
  console.log(`📁 文件路径: ${filePath}`);

  return filePath;
}

async function generateGrokJSON(links, conversationId, outputDir, searchText) {
  console.log('\n🚀 Grok JSON 生成器启动\n');

  const { browser, grokPage } = await openGrokConversation(conversationId);

  try {
    // 查找用户消息
    const messageElement = await findUserMessage(grokPage, searchText);

    if (!messageElement) {
      throw new Error('未找到目标消息，请检查搜索文本或手动创建');
    }

    // 点击编辑按钮
    const editSuccess = await clickEditButton(grokPage, messageElement);

    if (!editSuccess) {
      throw new Error('无法进入编辑模式');
    }

    // 编辑消息内容
    const editSuccess2 = await editMessageContent(grokPage, links);

    if (!editSuccess2) {
      throw new Error('无法编辑消息内容');
    }

    // 提交编辑
    await submitEdit(grokPage);

    // 等待生成
    await waitForGeneration(grokPage);

    // 提取 JSON
    const jsonData = await extractJSON(grokPage);

    if (!jsonData) {
      throw new Error('未能提取到 JSON 数据');
    }

    // 保存到文件
    await saveJSON(jsonData, outputDir, links.length);

    console.log('\n✅ 全部流程完成！');

    return jsonData;
  } catch (error) {
    console.error(`\n❌ 处理失败: ${error.message}`);
    throw error;
  } finally {
    await browser.close();
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    links: [],
    conversationId: null,
    searchText: CONFIG.defaultSearchText,
    outputDir: CONFIG.outputDir
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--links':
        config.links = nextArg.split(/\n| /).filter(link => link.trim()).filter(Boolean);
        i += 1;
        break;
      case '--input-file':
        const filePath = nextArg;
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          config.links = content.split('\n').filter(link => link.trim()).filter(Boolean);
        } else {
          console.error(`❌ 文件不存在: ${filePath}`);
          process.exit(1);
        }
        i += 1;
        break;
      case '--conversation-id':
        config.conversationId = nextArg;
        i += 1;
        break;
      case '--search-text':
        config.searchText = nextArg;
        i += 1;
        break;
      case '--output-dir':
        config.outputDir = nextArg;
        i += 1;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
      default:
        if (!arg.startsWith('--')) {
          console.error(`❌ 未知参数: ${arg}`);
          process.exit(1);
        }
    }
  }

  return config;
}

function showHelp() {
  console.log(`
🔍 Grok JSON 生成器

使用方式:
  node scripts/grok-generator.js [选项]

选项:
  --links <链接列表>        直接提供链接列表（空格或换行分隔）
  --input-file <文件路径>    从文件读取链接列表
  --conversation-id <ID>     Grok 对话 ID（必须）
  --search-text <文本>       查找用户消息的搜索文本（默认: "下面是一批新的链接："）
  --output-dir <目录>        输出目录（默认: /Users/douba/twitter-output）

示例:
  node scripts/grok-generator.js --conversation-id 2011046911403573376 --links "https://x.com/link1 https://x.com/link2"

  node scripts/grok-generator.js --conversation-id 2011046911403573376 --input-file /Users/douba/twitter-output/twitter-links-2026-01-14.txt

  node scripts/grok-generator.js --conversation-id 2011046911403573376 --input-file ./links.txt --search-text "请提取以下推文"
`);
}

async function main() {
  const config = parseArgs();

  if (config.links.length === 0) {
    console.error('❌ 错误: 未提供任何链接');
    console.log('使用 --links 或 --input-file 提供链接列表');
    console.log('使用 --help 查看帮助信息');
    process.exit(1);
  }

  if (!config.conversationId) {
    console.error('❌ 错误: 未提供对话 ID');
    console.log('使用 --conversation-id 提供目标对话 ID');
    console.log('使用 --help 查看帮助信息');
    process.exit(1);
  }

  console.log(`📊 输入链接: ${config.links.length} 条`);
  console.log(`💬 目标对话: ${config.conversationId}`);
  console.log(`🔍 搜索文本: "${config.searchText}"`);

  try {
    await generateGrokJSON(config.links, config.conversationId, config.outputDir, config.searchText);
  } catch (error) {
    console.error(`\n❌ 执行失败: ${error.message}`);
    process.exit(1);
  }
}

main();
