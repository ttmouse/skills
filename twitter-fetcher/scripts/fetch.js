#!/usr/bin/env node

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const AUTH_FILE = path.join(__dirname, '..', 'auth.json');

async function fetchTweet(url, options = {}) {
  const {
    format = 'json',
    timeout = 30000,
    useCDP = false,
    useAuth = false,
  } = options;

  let browser;
  let context;

  try {
    if (useCDP) {
      browser = await chromium.connectOverCDP('http://localhost:9222');
      context = browser.contexts()[0] || await browser.newContext();
    } else {
      browser = await chromium.launch({ headless: true });
      
      const contextOptions = {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      };
      
      if (useAuth && fs.existsSync(AUTH_FILE)) {
        contextOptions.storageState = AUTH_FILE;
      }
      
      context = await browser.newContext(contextOptions);
    }

    const page = await context.newPage();
    
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout 
    });
    
    await page.waitForTimeout(6000);

    const data = await page.evaluate(() => {
      const result = {
        url: window.location.href,
        author: { name: '', handle: '' },
        content: '',
        timestamp: '',
        metrics: { views: '', likes: '', retweets: '', replies: '' },
        images: [],
        quotedTweet: null
      };

      // 提取作者信息
      const authorEl = document.querySelector('article [data-testid="User-Name"]');
      if (authorEl) {
        const spans = authorEl.querySelectorAll('span');
        if (spans.length > 0) result.author.name = spans[0]?.innerText || '';
        const handleMatch = authorEl.innerText.match(/@(\w+)/);
        if (handleMatch) result.author.handle = handleMatch[1];
      }

      // 提取推文内容 - 多选择器策略
      const selectors = [
        'article [data-testid="tweetText"]',
        'article div[lang]',
        '[data-testid="tweet"] [lang]'
      ];
      
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el && el.innerText && el.innerText.trim().length > 10) {
          result.content = el.innerText.trim();
          break;
        }
      }

      // 如果上面都失败，获取整个 article 内容
      if (!result.content) {
        const article = document.querySelector('article');
        if (article) {
          result.content = article.innerText;
        }
      }

      // 提取时间
      const timeEl = document.querySelector('article time');
      if (timeEl) {
        result.timestamp = timeEl.getAttribute('datetime') || timeEl.innerText;
      }

      // 提取互动数据
      const metricsEl = document.querySelector('article [role="group"]');
      if (metricsEl) {
        const text = metricsEl.innerText;
        const viewsMatch = text.match(/([\d.]+[KMB]?)\s*Views?/i);
        const likesMatch = text.match(/([\d.]+[KMB]?)\s*Likes?/i);
        const retweetsMatch = text.match(/([\d.]+[KMB]?)\s*Repost/i);
        const repliesMatch = text.match(/([\d.]+[KMB]?)\s*Repl/i);
        
        if (viewsMatch) result.metrics.views = viewsMatch[1];
        if (likesMatch) result.metrics.likes = likesMatch[1];
        if (retweetsMatch) result.metrics.retweets = retweetsMatch[1];
        if (repliesMatch) result.metrics.replies = repliesMatch[1];
      }

      // 提取图片
      const images = document.querySelectorAll('article img[src*="pbs.twimg.com/media"]');
      result.images = Array.from(images).map(img => img.src);

      return result;
    });

    data.extractedAt = new Date().toISOString();

    if (!useCDP) {
      await browser.close();
    }

    return formatOutput({ success: true, data }, format);

  } catch (error) {
    if (browser && !useCDP) {
      await browser.close();
    }
    return formatOutput({ 
      success: false, 
      error: error.message,
      url 
    }, format);
  }
}

async function fetchTweets(urls, options = {}) {
  const results = [];
  for (const url of urls) {
    const result = await fetchTweet(url, { ...options, format: 'json' });
    results.push(JSON.parse(result));
    await new Promise(r => setTimeout(r, 2000));
  }
  return formatOutput({ success: true, data: results }, options.format || 'json');
}

function formatOutput(result, format) {
  if (format === 'json') {
    return JSON.stringify(result, null, 2);
  }
  
  if (format === 'text') {
    if (!result.success) return `Error: ${result.error}`;
    return result.data.content || '';
  }
  
  if (format === 'markdown') {
    if (!result.success) return `**Error:** ${result.error}`;
    const d = result.data;
    return `# @${d.author.handle} - ${d.author.name}

> ${d.timestamp}

${d.content}

${d.images.length > 0 ? d.images.map(img => `![](${img})`).join('\n') : ''}

---
Views: ${d.metrics.views} | Likes: ${d.metrics.likes} | Retweets: ${d.metrics.retweets} | Replies: ${d.metrics.replies}
Source: ${d.url}
`;
  }
  
  return JSON.stringify(result, null, 2);
}

async function saveAuth() {
  console.log('请在打开的浏览器中登录 Twitter...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('https://x.com/login');
  
  console.log('登录完成后，按 Enter 键保存登录态...');
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });
  
  await context.storageState({ path: AUTH_FILE });
  console.log(`登录态已保存到 ${AUTH_FILE}`);
  
  await browser.close();
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--save-auth')) {
    await saveAuth();
    return;
  }
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Twitter Fetcher - 统一的推文内容获取工具

用法:
  node fetch.js <url>                    获取单条推文
  node fetch.js --file <urls.txt>        批量获取
  node fetch.js --save-auth              保存登录态

选项:
  --format <json|markdown|text>  输出格式 (默认: json)
  --output <file>                保存到文件
  --cdp                          连接已打开的 Chrome (需要 --remote-debugging-port=9222)
  --use-auth                     使用保存的登录态
  --timeout <ms>                 超时时间 (默认: 30000)

示例:
  node fetch.js "https://x.com/user/status/123"
  node fetch.js "https://x.com/user/status/123" --format markdown
  node fetch.js --file urls.txt --output results.json
`);
    return;
  }

  const options = {
    format: 'json',
    timeout: 30000,
    useCDP: args.includes('--cdp'),
    useAuth: args.includes('--use-auth'),
  };

  const formatIdx = args.indexOf('--format');
  if (formatIdx !== -1 && args[formatIdx + 1]) {
    options.format = args[formatIdx + 1];
  }

  const timeoutIdx = args.indexOf('--timeout');
  if (timeoutIdx !== -1 && args[timeoutIdx + 1]) {
    options.timeout = parseInt(args[timeoutIdx + 1]);
  }

  let result;
  
  const fileIdx = args.indexOf('--file');
  if (fileIdx !== -1 && args[fileIdx + 1]) {
    const urls = fs.readFileSync(args[fileIdx + 1], 'utf-8')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && l.startsWith('http'));
    result = await fetchTweets(urls, options);
  } else {
    const url = args.find(a => a.startsWith('http'));
    if (!url) {
      console.error('请提供推文 URL');
      process.exit(1);
    }
    result = await fetchTweet(url, options);
  }

  const outputIdx = args.indexOf('--output');
  if (outputIdx !== -1 && args[outputIdx + 1]) {
    fs.writeFileSync(args[outputIdx + 1], result);
    console.log(`已保存到 ${args[outputIdx + 1]}`);
  } else {
    console.log(result);
  }
}

// 导出供其他模块使用
module.exports = { fetchTweet, fetchTweets };

// 直接运行时执行 CLI
if (require.main === module) {
  main().catch(console.error);
}
