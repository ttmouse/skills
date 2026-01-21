const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const PRESETS = {
  'nano-banana-pro': {
    query: '(#NanoBananaPro OR #NanoBanana OR "Nano Banana" OR "prompt") AND -female -woman -hair -GEMINIFOURTH',
    since: '24h',
    minLikes: 50,
    filterContent: 'media',
    excludeReplies: true,
    excludeRetweets: false
  }
};

const DEFAULT_CONFIG = {
  maxTweets: 100,
  scrollWaitTime: 2000,
  scrollAttempts: 50,
  headless: false,
  scoreKeywords: ['nano', 'banana', 'prompt'],
  minScore: 0,
  outputDir: '/Users/douba/twitter-output',
  filterUrl: 'https://twitterhot.vercel.app/tweet-filter.html'
};

function buildSearchUrl(params) {
  const queryParts = [];

  if (params.query) {
    queryParts.push(params.query);
  }

  if (params.since) {
    const now = Math.floor(Date.now() / 1000);
    if (params.since === '24h') {
      queryParts.push(`since_time:${now - 86400}`);
    } else if (params.since === '7d') {
      queryParts.push(`since_time:${now - 604800}`);
    } else if (params.since === '30d') {
      queryParts.push(`since_time:${now - 2592000}`);
    }
  }

  if (params.minLikes && params.minLikes > 0) {
    queryParts.push(`min_faves:${params.minLikes}`);
  }

  if (params.filterContent) {
    queryParts.push(`filter:${params.filterContent}`);
  }

  if (params.excludeReplies) {
    queryParts.push('-filter:replies');
  }

  if (params.excludeRetweets) {
    queryParts.push('-filter:retweets');
  }

  if (params.exclude) {
    const excludeWords = params.exclude.split(' ');
    excludeWords.forEach(word => {
      const trimmed = word.trim();
      if (trimmed) {
        queryParts.push(`-${trimmed}`);
      }
    });
  }

  const queryString = queryParts.join(' ');
  const encodedQuery = encodeURIComponent(queryString);

  return `https://x.com/search?q=${encodedQuery}&src=typed_query&vertical=default`;
}

async function scrollAndCollect(page, config, maxTweets) {
  const tweetMap = new Map();
  let noChangeCount = 0;
  const maxNoChange = 5;
  const scrollAmount = 1200;

  console.log('📊 开始采集...');

  while (noChangeCount < maxNoChange && tweetMap.size < maxTweets) {
    const currentTweets = await scrapeCurrentPage(page);
    let added = 0;

    for (const tweet of currentTweets) {
      if (!tweetMap.has(tweet.id)) {
        tweetMap.set(tweet.id, tweet);
        added += 1;
      }
    }

    console.log(`📊 进度: ${tweetMap.size}/${maxTweets} (新增: ${added})`);

    const isAtBottom = await checkIfAtBottom(page);

    if (added === 0 && isAtBottom) {
      noChangeCount += 1;
      console.log(`⏸️ 无新内容，尝试 ${noChangeCount}/${maxNoChange}`);
    } else {
      noChangeCount = 0;
    }

    if (tweetMap.size < maxTweets) {
      await page.evaluate(amount => {
        window.scrollBy({ top: amount, behavior: 'smooth' });
      }, scrollAmount);
      await page.waitForTimeout(config.scrollWaitTime);
    }
  }

  console.log(`✅ 采集完成，总计: ${tweetMap.size} 条推文`);

  return Array.from(tweetMap.values()).slice(0, maxTweets);
}

async function checkIfAtBottom(page) {
  const result = await page.evaluate(() => {
    const scrollHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY;
    const clientHeight = window.innerHeight;
    return Math.abs(scrollHeight - scrollTop - clientHeight) < 50;
  });
  return result;
}

async function scrapeCurrentPage(page) {
  const tweets = await page.evaluate(() => {
    const articles = document.querySelectorAll('article, li div[data-testid="cellInnerDiv"], li');
    return Array.from(articles).map(article => {
      const links = article.querySelectorAll('a[href*="/status/"], a[href*="/content/"]');
      let tweetUrl = null;
      let tweetId = null;

      for (const link of links) {
        const href = link.getAttribute('href');
        if (!href) continue;

        const statusMatch = href.match(/\/status\/(\d+)/);
        const contentMatch = href.match(/\/content\/(\d+)/);
        const id = statusMatch ? statusMatch[1] : (contentMatch ? contentMatch[1] : null);

        if (id) {
          tweetId = id;
          tweetUrl = href.startsWith('http') ? href : `https://x.com${href}`;
          break;
        }
      }

      const textNode = article.querySelector('div[dir="auto"], div[data-testid="tweetText"]');
      const text = textNode ? textNode.innerText.trim() : '';

      const images = [];
      const imageNodes = article.querySelectorAll('img');
      imageNodes.forEach(img => {
        const src = img.src;
        if (src && src.includes('pbs.twimg.com/media')) {
          images.push(src);
        }
      });

      const likesText = article.querySelector('[data-testid="like"]')?.innerText || '0';
      const likes = parseInt(likesText.replace(/,/g, ''), 10) || 0;

      return {
        id: tweetId,
        url: tweetUrl,
        text,
        images: [...new Set(images)],
        likes
      };
    });
  });

  return tweets.filter(tweet => tweet.id && tweet.url);
}

function normalizeText(text) {
  return (text || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function computeLengthScore(length) {
  if (length <= 20) {
    return 0;
  }
  if (length >= 180) {
    return 1;
  }
  return (length - 20) / 160;
}

function computeKeywordScore(text, keywords) {
  if (!keywords.length) {
    return 0;
  }
  let hits = 0;
  for (const keyword of keywords) {
    if (text.includes(keyword)) {
      hits += 1;
    }
  }
  const divisor = Math.min(3, keywords.length);
  return Math.min(1, hits / divisor);
}

function applyScoring(tweets, config) {
  const keywords = (config.scoreKeywords || []).map(item => item.toLowerCase().trim()).filter(Boolean);
  return tweets
    .map(tweet => {
      const normalizedText = normalizeText(tweet.text);
      const lengthScore = computeLengthScore(normalizedText.length);
      const keywordScore = computeKeywordScore(normalizedText, keywords);
      const score = Number((keywordScore * 0.6 + lengthScore * 0.4).toFixed(4));
      return { ...tweet, score };
    })
    .filter(tweet => tweet.score >= (config.minScore || 0))
    .sort((a, b) => b.score - a.score);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildPreviewHtml(tweets) {
  const cards = tweets.map(tweet => {
    const image = tweet.images && tweet.images.length > 0 ? tweet.images[0] : '';
    const text = escapeHtml(tweet.text || '');
    const url = escapeHtml(tweet.url || '');
    const score = Number.isFinite(tweet.score) ? tweet.score.toFixed(2) : '0.00';
    const likes = Number.isFinite(tweet.likes) ? tweet.likes : 0;
    const length = (tweet.text || '').length;

    return `
      <div class="card" data-url="${url}">
        <div class="card-header">
          <label class="select">
            <input type="checkbox" checked />
            <span>选中</span>
          </label>
          <span class="meta">Score ${score}</span>
          <span class="meta">Likes ${likes}</span>
          <span class="meta">Len ${length}</span>
          <a class="open" href="${url}" target="_blank">打开</a>
        </div>
        <div class="content">
          <div class="image">
            ${image ? `<img src="${image}" alt="tweet" />` : '<div class="placeholder">No image</div>'}
          </div>
          <div class="text">${text || '<span class="muted">无文本</span>'}</div>
        </div>
      </div>
    `;
  }).join('\n');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Tweet Preview</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 24px; background: #0b0b0b; color: #f5f5f5; }
    .toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; }
    .toolbar button { background: #1f1f1f; color: #fff; border: 1px solid #2a2a2a; padding: 8px 12px; border-radius: 6px; cursor: pointer; }
    .toolbar span { color: #9f9f9f; }
    .grid { display: grid; gap: 16px; }
    .card { border: 1px solid #242424; border-radius: 10px; padding: 12px; background: #141414; }
    .card-header { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 10px; }
    .select { display: inline-flex; gap: 6px; align-items: center; }
    .meta { font-size: 12px; color: #b8b8b8; }
    .open { color: #88b7ff; text-decoration: none; font-size: 12px; }
    .content { display: grid; grid-template-columns: 200px 1fr; gap: 12px; }
    .image img { width: 100%; border-radius: 8px; object-fit: cover; }
    .placeholder { width: 100%; height: 120px; background: #1f1f1f; display: flex; align-items: center; justify-content: center; color: #777; border-radius: 8px; }
    .text { white-space: pre-wrap; line-height: 1.5; font-size: 14px; }
    .muted { color: #777; }
  </style>
</head>
<body>
  <div class="toolbar">
    <button id="selectAll">全选</button>
    <button id="clearAll">清空</button>
    <button id="copySelected">复制选中链接</button>
    <span id="count"></span>
  </div>
  <div class="grid">
    ${cards}
  </div>
  <script>
    const countEl = document.getElementById('count');
    const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
    const updateCount = () => {
      const selected = checkboxes.filter(box => box.checked).length;
      countEl.textContent = '选中 ' + selected + '/' + checkboxes.length;
    };
    updateCount();
    document.getElementById('selectAll').onclick = () => { checkboxes.forEach(box => box.checked = true); updateCount(); };
    document.getElementById('clearAll').onclick = () => { checkboxes.forEach(box => box.checked = false); updateCount(); };
    document.getElementById('copySelected').onclick = async () => {
      const urls = checkboxes.filter(box => box.checked).map(box => box.closest('.card').dataset.url);
      const text = urls.join('\n');
      await navigator.clipboard.writeText(text);
      alert('已复制 ' + urls.length + ' 条链接');
    };
    checkboxes.forEach(box => box.addEventListener('change', updateCount));
  </script>
</body>
</html>
  `;
}

async function extractFromFilterPage(browser, tweets, config) {
  const page = await browser.newPage();
  const urls = tweets.map(tweet => tweet.url).filter(Boolean);
  await page.goto(config.filterUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1000);
  const input = page.getByRole('textbox', { name: 'Paste Links' });
  await input.fill(urls.join('\n'));
  await page.getByRole('button', { name: 'Preview' }).click();
  await page.waitForFunction(() => {
    return document.querySelectorAll('[data-url]').length > 0;
  }, { timeout: 60000 });
  try {
    await page.waitForFunction(() => {
      return Array.from(document.querySelectorAll('[data-url]')).some(el => {
        return el.dataset && el.dataset.tweetData && el.dataset.tweetData.length > 0;
      });
    }, { timeout: 60000 });
  } catch (error) {
    await page.waitForTimeout(1000);
  }
  const data = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[data-url]')).map(el => {
      const raw = el.dataset ? el.dataset.tweetData : null;
      let parsed = null;
      if (raw) {
        try {
          parsed = JSON.parse(raw);
        } catch (error) {
          parsed = null;
        }
      }
      return {
        url: el.dataset ? el.dataset.url : null,
        tweetData: parsed,
        rawTweetData: raw
      };
    }).filter(item => item.url);
  });
  await page.close();
  return data;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function outputLinks(tweets, format, config, scoredTweets) {
  const links = tweets.map(tweet => tweet.url).filter(Boolean);
  const timestamp = new Date().toISOString().split('T')[0];

  if (format === 'console') {
    console.log('🔗 推文链接列表:\n');
    links.forEach(link => console.log(link));

    console.log(`\n✅ 采集完成`);
    console.log(`📊 总计: ${links.length} 条`);
    console.log(`🔗 链接已输出到控制台，可直接复制粘贴到筛选网页`);
  } else if (format === 'file') {
    const content = links.join('\n');
    const filename = `twitter-links-${timestamp}.txt`;
    ensureDir(config.outputDir);
    const filePath = path.join(config.outputDir, filename);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`\n✅ 链接已保存到: ${filename}`);
    console.log(`📁 文件路径: ${filePath}`);
  } else if (format === 'preview') {
    const filename = `twitter-preview-${timestamp}.html`;
    ensureDir(config.outputDir);
    const filePath = path.join(config.outputDir, filename);
    const html = buildPreviewHtml(tweets);
    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`\n✅ 预览页面已生成: ${filename}`);
    console.log(`📁 文件路径: ${filePath}`);
  } else if (format === 'filter-json') {
    const filename = `twitter-filter-data-${timestamp}.json`;
    ensureDir(config.outputDir);
    const filePath = path.join(config.outputDir, filename);
    const data = await extractFromFilterPage(browser, scoredTweets, config);
    fs.writeFileSync(filePath, JSON.stringify({
      count: data.length,
      items: data
    }, null, 2));
    console.log(`\n✅ 筛选页数据已导出: ${filename}`);
    console.log(`📁 文件路径: ${filePath}`);
  }
}

function showHelp() {
  console.log(`
🔍 Twitter 推文采集器

使用方式:
  node scripts/collector.js [选项]

选项:
  --preset <预设>        使用预设搜索配置
    可选值: nano-banana-pro

  --query <关键词>       自定义搜索关键词（AND/OR 逻辑）
  --since <时间>        时间范围
    可选值: 24h, 7d, 30d

  --min-likes <数字>  最小点赞数
  --max-tweets <数字>  最大采集数量 (默认: 100)
  --exclude <关键词>    排除关键词（空格分隔）

  --filter-content <类型>  内容类型
    可选值: media, videos, images

  --exclude-replies     排除回复
  --exclude-retweets    排除转发

  --output <格式>       输出格式
    可选值: console, file, preview, filter-json (默认: console)

  --score-keywords <词>  评分关键词，逗号分隔
  --min-score <数字>     最低评分阈值 (0-1)
  --filter-url <URL>     筛选页地址
  --output-dir <目录>    输出目录

  --headless             无头模式运行

示例:
  node scripts/collector.js --preset nano-banana-pro
  node scripts/collector.js --query "AI OR ChatGPT" --since 24h --min-likes 100 --max-tweets 50
  node scripts/collector.js --query "your keywords" --since 7d --exclude "spam bot"
  node scripts/collector.js --preset nano-banana-pro --output file
  node scripts/collector.js --preset nano-banana-pro --score-keywords "prompt,nano,banana" --min-score 0.3
  node scripts/collector.js --preset nano-banana-pro --output filter-json
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const nextArg = args[index + 1];

    switch (arg) {
      case '--preset':
        if (PRESETS[nextArg]) {
          Object.assign(config, PRESETS[nextArg]);
          index += 1;
          console.log(`✅ 使用预设配置: ${nextArg}`);
        } else {
          console.error(`❌ 预设配置不存在: ${nextArg}`);
          console.log(`可用预设: ${Object.keys(PRESETS).join(', ')}`);
          process.exit(1);
        }
        break;
      case '--query':
        config.query = nextArg;
        index += 1;
        break;
      case '--since':
        config.since = nextArg;
        index += 1;
        break;
      case '--min-likes':
        config.minLikes = parseInt(nextArg, 10);
        index += 1;
        break;
      case '--max-tweets':
        config.maxTweets = parseInt(nextArg, 10);
        index += 1;
        break;
      case '--exclude':
        config.exclude = nextArg;
        index += 1;
        break;
      case '--filter-content':
        config.filterContent = nextArg;
        index += 1;
        break;
      case '--exclude-replies':
        config.excludeReplies = true;
        break;
      case '--exclude-retweets':
        config.excludeRetweets = true;
        break;
      case '--output':
        config.output = nextArg;
        index += 1;
        break;
      case '--score-keywords':
        config.scoreKeywords = nextArg.split(',').map(item => item.trim()).filter(Boolean);
        index += 1;
        break;
      case '--min-score':
        config.minScore = parseFloat(nextArg);
        index += 1;
        break;
      case '--filter-url':
        config.filterUrl = nextArg;
        index += 1;
        break;
      case '--output-dir':
        config.outputDir = nextArg;
        index += 1;
        break;
      case '--headless':
        config.headless = true;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
      default:
        if (!arg.startsWith('--')) {
          console.error(`❌ 未知参数: ${arg}`);
          console.log('使用 --help 查看帮助信息');
          process.exit(1);
        }
    }
  }

  return config;
}

async function main() {
  console.log('🚀 Twitter 推文采集器启动...\n');

  const config = parseArgs();

  console.log('⚙️  采集配置:');
  console.log(`   搜索参数: ${config.query || '(使用预设)'}`);
  console.log(`   时间范围: ${config.since || '不限制'}`);
  console.log(`   最小点赞: ${config.minLikes || '不限制'}`);
  console.log(`   最大采集: ${config.maxTweets} 条`);
  console.log(`   无头模式: ${config.headless ? '是' : '否'}`);
  console.log('');

  let browser;

  try {
    console.log('🌐 连接到浏览器 (端口 9222)...');
    browser = await chromium.connectOverCDP('http://localhost:9222').catch(e => {
      throw new Error(`无法连接到浏览器调试端口 (9222)。\n💡 修复方法：\n1. 请确保 Chrome 已启动并开启调试端口：/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222\n2. 或者，如果您正在与 AI 对话，请直接指令 AI “使用 MCP 模式执行采集”以跳过端口要求。`);
    });
    const contexts = browser.contexts();

    if (contexts.length === 0) {
      throw new Error('未找到已打开的浏览器上下文，请确保Chrome已启动并开启远程调试');
    }

    const context = contexts[0];
    const pages = context.pages();

    if (pages.length === 0) {
      throw new Error('未找到已打开的页面，请确保Chrome中至少有一个标签页');
    }

    const searchUrl = buildSearchUrl(config);

    // 查找已有的 Twitter 页面并复用
    const twitterPage = pages.find(p => {
      const url = p.url();
      return url.includes('twitter.com') || url.includes('x.com');
    });

    let page;
    if (twitterPage) {
      console.log(`✅ 找到已有 Twitter 页面: ${twitterPage.url()}`);
      console.log(`🔄 复用这个页面，避免新建标签\n`);
      page = twitterPage;
    } else {
      console.log(`⚠️ 未找到 Twitter 页面，使用第一个页面\n`);
      page = pages[0];
    }

    console.log(`🔍 跳转到: ${searchUrl}\n`);

    try {
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    } catch (error) {
      await page.goto(searchUrl, { waitUntil: 'load', timeout: 90000 });
    }
    await page.waitForTimeout(2000);

    try {
      await page.waitForSelector('article', { timeout: 15000 });
    } catch (error) {
      console.log('⚠️ 未检测到推文内容，继续采集尝试');
    }

    const tweets = await scrollAndCollect(page, config, config.maxTweets);

    const scoredTweets = applyScoring(tweets, config);
    console.log(`🧹 文本评分后: ${scoredTweets.length}/${tweets.length} 条`);

    await outputLinks(scoredTweets, config.output || 'console', config, scoredTweets);
  } catch (error) {
    console.error(`❌ 采集失败: ${error.message}`);
    process.exit(1);
  }
}

main();
