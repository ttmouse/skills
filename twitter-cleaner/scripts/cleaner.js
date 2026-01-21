const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  filterUrl: 'https://twitterhot.vercel.app/tweet-filter.html',
  outputDir: '/Users/douba/twitter-output',
  browserPort: 9222,
  timeout: 30000,
  waitTime: 2000,
  maxWaitTime: 120000
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function parseLinksFromFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return content.split('\n')
    .map(line => line.trim())
    .filter(line => line && line.startsWith('https://'));
}

function parseLinksFromPreview(previewPath) {
  if (!fs.existsSync(previewPath)) {
    throw new Error(`预览文件不存在: ${previewPath}`);
  }
  const content = fs.readFileSync(previewPath, 'utf-8');
  const urlMatches = content.match(/data-url="([^"]+)"/g) || [];
  return urlMatches.map(match => match.replace('data-url="', '').replace('"', ''));
}

async function connectToBrowser() {
  console.log('🌐 连接到浏览器 (端口 9222)...');
  const browser = await chromium.connectOverCDP(`http://localhost:${CONFIG.browserPort}`).catch(e => {
    throw new Error(`无法连接到浏览器调试端口 (9222)。\n💡 修复方法：\n1. 请确保 Chrome 已启动并开启调试端口：/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222\n2. 或者，如果您正在与 AI 对话，请直接指令 AI “使用 MCP 模式执行清洗”以跳过端口要求。`);
  });
  
  const contexts = browser.contexts();
  if (contexts.length === 0) {
    throw new Error('未找到已打开的浏览器上下文，请确保 Chrome 已启动并开启远程调试');
  }
  
  const context = contexts[0];
  const pages = context.pages();
  if (pages.length === 0) {
    throw new Error('未找到已打开的页面，请确保 Chrome 中至少有一个标签页');
  }
  
  console.log(`📋 找到 ${pages.length} 个已打开的页面`);
  
  // 查找筛选页面
  let filterPage = pages.find(p => p.url().includes('twitterhot.vercel.app'));
  
  if (!filterPage) {
    console.log('💬 正在导航到筛选页面，使用第一个标签页...');
    filterPage = pages[0];
    await filterPage.goto(CONFIG.filterUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await filterPage.waitForTimeout(CONFIG.waitTime);
  } else {
    console.log('✅ 找到已打开的筛选页面');
  }
  
  return { browser, filterPage };
}

async function pasteLinksAndWait(filterPage, links) {
  console.log(`📝 正在粘贴 ${links.length} 条链接...`);
  
  // 定位输入框
  const textarea = filterPage.locator('textarea, input[type="text"], div[contenteditable="true"]').first();
  await textarea.fill(links.join('\n'));
  
  console.log('✅ 链接已粘贴');
  
  // 点击预览按钮
  const previewButton = filterPage.locator('button:has-text("Preview"), button:has-text("预览")').first();
  await previewButton.click();
  
  console.log('⏳ 等待第三方解析...');
  console.log('   (最长等待 180 秒)');
  
  // 等待数据生成 - 更严格的检查
  const startTime = Date.now();
  let lastCount = 0;
  let waitCount = 0;
  
  while (Date.now() - startTime < CONFIG.maxWaitTime) {
    const pageState = await filterPage.evaluate(() => {
      const elements = document.querySelectorAll('[data-url]');
      if (elements.length === 0) return { count: 0, hasData: false, hasText: false, sampleText: '', rawDataSample: '' };
      
      // 检查是否有 tweet-data 和文本内容
      let hasData = false;
      let hasText = false;
      let sampleText = '';
      let rawDataSample = '';
      
      elements.forEach(el => {
        const rawData = el.dataset.tweetData;
        if (rawData && rawData.length > 10) {
          hasData = true;
          if (!rawDataSample) {
            rawDataSample = rawData.substring(0, 200);
          }
        }
        
        // 检查是否有文本内容 - 尝试多种选择器
        const textSelectors = [
          '[data-testid="tweet-text"]',
          '.tweet-text',
          '.text',
          'p',
          'div[dir="auto"]',
          'div[data-testid="tweetText"]',
          'article div[lang]',
          'div[class*="text"]',
          'span[class*="text"]'
        ];
        
        for (const selector of textSelectors) {
          const textElement = el.querySelector(selector);
          if (textElement && textElement.innerText.trim().length > 5) {
            hasText = true;
            if (!sampleText) {
              sampleText = textElement.innerText.trim().substring(0, 100);
            }
            break;
          }
        }
      });
      
      return {
        count: elements.length,
        hasData,
        hasText,
        sampleText,
        rawDataSample
      };
    });
    
    if (pageState.count > lastCount) {
      console.log(`   📊 检测到 ${pageState.count} 个推文元素`);
      lastCount = pageState.count;
    }
    
    // 同时检查 tweet-data 和文本内容
    if (pageState.hasData && pageState.hasText) {
      console.log('✅ 解析完成 (包含完整文本)');
      if (pageState.sampleText) {
        console.log(`   📄 示例文本: "${pageState.sampleText}..."`);
      }
      return true;
    }
    
    // 如果只有 tweet-data 但没有文本，继续等待
    if (pageState.hasData && !pageState.hasText) {
      waitCount++;
      if (waitCount % 5 === 0) { // 每15秒输出一次
        console.log(`⚠️ 有 tweet-data 但文本为空，等待 ${waitCount * 3} 秒...`);
        if (pageState.rawDataSample) {
          console.log(`   📄 raw-data 示例: "${pageState.rawDataSample}..."`);
        }
      }
    }
    
    // 如果等待超过30秒还没有文本，尝试强制提取一次看看
    if (waitCount >= 10 && !pageState.hasText) { // 30秒后
      console.log('🔍 等待超时，尝试强制提取数据...');
      const extracted = await filterPage.evaluate(() => {
        const elements = document.querySelectorAll('[data-url]');
        if (elements.length === 0) return null;
        
        const firstEl = elements[0];
        const rawData = firstEl.dataset.tweetData;
        if (!rawData) return null;
        
        try {
          const parsed = JSON.parse(rawData);
          return {
            keys: Object.keys(parsed),
            hasText: 'text' in parsed,
            textValue: parsed.text ? parsed.text.substring(0, 100) : '无text字段',
            parsed: parsed
          };
        } catch (e) {
          return { error: e.message };
        }
      });
      
      if (extracted) {
        console.log(`   🔍 第一个元素的 rawData 分析:`);
        console.log(`   📄 字段: ${extracted.keys.join(', ')}`);
        console.log(`   📄 是否有text字段: ${extracted.hasText}`);
        console.log(`   📄 text值: "${extracted.textValue}..."`);
        
        // 如果 rawData 中有 text 字段，但页面元素没有显示，可能是 CSS 隐藏了
        if (extracted.hasText && extracted.textValue !== '无text字段') {
          console.log('💡 发现: rawData 中有文本，但页面元素可能被隐藏');
          console.log('💡 解决方案: 直接使用 rawData 中的 text 字段');
          return true; // 认为解析完成
        }
      }
    }
    
    await filterPage.waitForTimeout(3000); // 每 3 秒检查一次
  }
  
  console.log('⚠️ 等待超时，可能解析未完成');
  console.log('💡 建议: 手动刷新筛选页面，确认文本是否正常显示');
  return false;
}

async function extractTweetData(filterPage) {
  console.log('📦 提取推文数据...');
  
  const tweetData = await filterPage.evaluate(() => {
    const items = [];
    const elements = document.querySelectorAll('[data-url]');
    
    elements.forEach(el => {
      const url = el.dataset.url;
      const rawData = el.dataset.tweetData;
      
      let parsedData = null;
      let fullText = '';
      
      if (rawData) {
        try {
          parsedData = JSON.parse(rawData);
          // 从 parsedData 中提取文本 - 尝试多个可能的字段
          if (parsedData) {
            const possibleTextFields = ['text', 'full_text', 'content', 'body', 'tweet_text'];
            for (const field of possibleTextFields) {
              if (parsedData[field] && typeof parsedData[field] === 'string') {
                fullText = parsedData[field];
                break;
              }
            }
            
            // 如果没有找到标准字段，尝试遍历所有字段
            if (!fullText) {
              for (const key in parsedData) {
                if (typeof parsedData[key] === 'string' && parsedData[key].length > 20) {
                  fullText = parsedData[key];
                  break;
                }
              }
            }
          }
        } catch (e) {
          // JSON 解析失败
        }
      }
      
      // 如果 parsedData 中没有文本，尝试从页面元素提取
      if (!fullText) {
        // 尝试多种选择器获取完整文本
        const textSelectors = [
          '[data-testid="tweet-text"]',
          '.tweet-text',
          '.text',
          'p',
          'div[dir="auto"]',
          'div[data-testid="tweetText"]',
          'article div[lang]',
          'div[class*="text"]',
          'span[class*="text"]',
          'div[class*="content"]',
          'div[class*="body"]'
        ];
        
        for (const selector of textSelectors) {
          const textElement = el.querySelector(selector);
          if (textElement && textElement.innerText.trim().length > 0) {
            fullText = textElement.innerText.trim();
            break;
          }
        }
      }
      
      // 提取图片
      const images = [];
      const imgElements = el.querySelectorAll('img');
      imgElements.forEach(img => {
        const src = img.src;
        if (src && (src.includes('pbs.twimg.com') || src.includes('twitter.com/media'))) {
          images.push(src);
        }
      });
      
      // 提取作者
      const authorSelectors = [
        '[data-testid="user-name"]',
        '.author',
        '.username',
        'span[data-testid="User-Name"]',
        'div[data-testid="User-Name"]'
      ];
      
      let author = '';
      for (const selector of authorSelectors) {
        const authorElement = el.querySelector(selector);
        if (authorElement && authorElement.innerText.trim().length > 0) {
          author = authorElement.innerText.trim();
          break;
        }
      }
      
      // 提取互动数据
      const likes = (parsedData && parsedData.likes) || 0;
      const replies = (parsedData && parsedData.replies) || 0;
      const retweets = (parsedData && parsedData.retweets) || 0;
      const totalEngagement = likes + replies + retweets;
      const engagementRate = totalEngagement; // 后续可以除以粉丝数

      items.push({
        url,
        text: fullText,
        author,
        images: [...new Set(images)], // 去重
        rawData: rawData,
        parsedData: parsedData,
        hasText: fullText.length > 0,
        // 新增互动数据
        likes,
        replies,
        retweets,
        totalEngagement,
        engagementRate
      });
    });
    
    return items;
  });
  
  // 统计有文本的推文数量
  const withTextCount = tweetData.filter(item => item.hasText).length;
  console.log(`✅ 提取到 ${tweetData.length} 条推文数据 (${withTextCount} 条有文本)`);
  
  // 如果有 rawData 但没有文本，显示调试信息
  if (withTextCount === 0 && tweetData.length > 0) {
    console.log('🔍 调试信息:');
    const sampleItem = tweetData[0];
    if (sampleItem.rawData) {
      try {
        const parsed = JSON.parse(sampleItem.rawData);
        console.log('   📄 rawData 结构:', Object.keys(parsed).join(', '));
        // 显示前几个字段的值
        for (const key in parsed) {
          if (typeof parsed[key] === 'string' && parsed[key].length > 0) {
            console.log(`   📄 ${key}: "${parsed[key].substring(0, 100)}..."`);
          }
        }
      } catch (e) {
        console.log(`   📄 rawData 无法解析: ${e.message}`);
      }
    }
  }
  
  return tweetData;
}

// Prompt类型分类
function detectPromptDomain(text) {
  const lowerText = text.toLowerCase();

  // 目标领域：文本生成、图像生成、照片生成、广告生成
  const targetDomains = {
    'text_gen': [
      'text generation', 'writing', 'story', 'article', 'copywriting',
      '文案', '写作', '故事', '小说', '博客', '文本', '写作助手',
      'generate text', 'writing assistant', 'content writing'
    ],
    'image_gen': [
      'image', 'photo', 'visual', 'style', 'composition', 'artistic',
      '图像', '照片', '视觉', '风格', '构图', '艺术', '插画',
      'generate image', 'create image', 'art style', 'photography'
    ],
    'ad_gen': [
      'advertisement', 'marketing', 'product', 'branding', 'commercial',
      '广告', '营销', '产品', '品牌', '商业', '推广',
      'ad creative', 'product photography', 'brand content'
    ]
  };

  // 排除领域：编程类Prompt
  const excludeDomains = {
    'code_gen': [
      'code', 'programming', 'api', 'development', 'debug', 'script',
      '代码', '编程', '开发', '调试', '脚本',
      'generate code', 'programming assistant', 'api development',
      'debug code', 'code snippet'
    ],
    'workflow': [
      'workflow', 'automation', 'integration', 'pipeline',
      '工作流', '自动化', '集成', '流水线',
      'automation workflow', 'integration pipeline', 'task automation'
    ]
  };

  // 优先检测排除领域（如果匹配，直接返回排除类型）
  for (const [type, keywords] of Object.entries(excludeDomains)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return { type, label: '💻编程类', exclude: true };
      }
    }
  }

  // 检测目标领域
  for (const [type, keywords] of Object.entries(targetDomains)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        const labels = {
          'text_gen': '📝文本生成',
          'image_gen': '🖼️图像生成',
          'ad_gen': '📢广告生成'
        };
        return { type, label: labels[type], exclude: false };
      }
    }
  }

  return { type: 'unknown', label: '❓未知领域', exclude: false };
}

// 智能筛选和打分函数
function analyzeAndScoreTweets(data) {
  console.log('🤖 开始智能分析和筛选...');

  // 先计算互动数据的统计，用于归一化
  const engagementRates = data.map(item => item.engagementRate || 0);
  const maxEngagement = Math.max(...engagementRates, 1);
  const minEngagement = Math.min(...engagementRates);
  const avgEngagement = engagementRates.reduce((a, b) => a + b, 0) / engagementRates.length;

  console.log(`📊 互动数据统计:`);
  console.log(`   最高互动: ${maxEngagement}`);
  console.log(`   最低互动: ${minEngagement}`);
  console.log(`   平均互动: ${Math.round(avgEngagement)}`);

  const scoredData = data.map(item => {
    const text = item.text || '';
    const totalEngagement = item.totalEngagement || 0;
    const engagementRate = item.engagementRate || 0;

    const result = {
      ...item,
      score: 0,
      tags: [],
      quality: 'medium',
      category: 'other',
      language: 'unknown',
      hasPrompt: false,
      isMarketing: false,
      isTechShare: false,
      isUseful: false,
      textLength: text.length,
      // 新增领域相关字段
      promptDomain: 'unknown',
      promptDomainLabel: '',
      isTargetDomain: false,
      isExcludeDomain: false,
      // 新增互动相关字段
      engagementLevel: 'medium'
    };

    // 1. 语言检测
    if (/[\u4e00-\u9fa5]/.test(text)) {
      result.language = 'zh';
      result.tags.push('中文');
    } else if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) {
      result.language = 'ja';
      result.tags.push('日文');
    } else if (/[a-zA-Z]/.test(text)) {
      result.language = 'en';
      result.tags.push('英文');
    }

    // 2. Prompt领域检测（新增）
    const domainInfo = detectPromptDomain(text);
    result.promptDomain = domainInfo.type;
    result.promptDomainLabel = domainInfo.label;
    result.isExcludeDomain = domainInfo.exclude;
    result.isTargetDomain = !domainInfo.exclude && domainInfo.type !== 'unknown';

    result.tags.push(domainInfo.label);

    // 领域评分（核心权重）
    if (result.isExcludeDomain) {
      result.score -= 20; // 排除编程类
      result.category = 'exclude';
    } else if (result.isTargetDomain) {
      result.score += 25; // 目标领域（文本/图像/广告生成）
      result.tags.push('🎯目标领域');
      result.category = 'target';
    }

    // 3. 互动率评分（归一化到0-15分）
    if (maxEngagement > minEngagement) {
      const normalizedEngagement = ((engagementRate - minEngagement) / (maxEngagement - minEngagement)) * 15;
      result.score += Math.round(normalizedEngagement);

      if (engagementRate >= avgEngagement * 1.5) {
        result.engagementLevel = 'high';
        result.tags.push('🔥高互动');
      } else if (engagementRate <= avgEngagement * 0.5) {
        result.engagementLevel = 'low';
        result.tags.push('💤低互动');
      }
    }

    // 4. 检测是否包含prompt
    const promptKeywords = ['prompt', '提示词', '咒语', 'project_manifest', 'scene_graph'];
    const hasPrompt = promptKeywords.some(keyword =>
      text.toLowerCase().includes(keyword.toLowerCase())
    );
    result.hasPrompt = hasPrompt;
    if (hasPrompt) {
      result.tags.push('含Prompt');
      result.score += 20;
      result.category = result.category === 'exclude' ? 'exclude' : 'prompt';
    }

    // 5. 检测营销推广
    const marketingKeywords = ['unlimited', 'free', 'offer', '限时', '优惠', '折扣', 'credits', 'all-in'];
    const isMarketing = marketingKeywords.some(keyword =>
      text.toLowerCase().includes(keyword.toLowerCase())
    );
    result.isMarketing = isMarketing;
    if (isMarketing) {
      result.tags.push('营销推广');
      result.score -= 15;
      result.category = 'marketing';
    }

    // 6. 检测技术分享
    const techKeywords = ['quality of life', 'how to', 'tutorial', '技巧', '教程', 'edit image', 'workflow'];
    const isTechShare = techKeywords.some(keyword =>
      text.toLowerCase().includes(keyword.toLowerCase())
    );
    result.isTechShare = isTechShare;
    if (isTechShare) {
      result.tags.push('技术分享');
      result.score += 15;
      result.category = result.category === 'exclude' ? 'exclude' : 'tech';
    }

    // 7. 文本长度评分
    if (text.length > 500) {
      result.tags.push('长内容');
      result.score += 10;
    } else if (text.length < 50) {
      result.tags.push('短内容');
      result.score -= 5;
    }

    // 8. 检测结构化内容（JSON、列表等）
    const isStructured = text.includes('{') && text.includes('}') ||
                        text.match(/^\s*-\s+/m);
    if (isStructured) {
      result.tags.push('结构化');
      result.score += 15;
    }

    // 9. 检测限流或错误
    const isError = text.includes('Too many requests') ||
                   text.includes('error') ||
                   text.includes('限流');
    if (isError) {
      result.tags.push('错误/限流');
      result.score = -100;
      result.quality = 'low';
    }

    // 10. 质量评级（调整阈值）
    if (result.score >= 45) {
      result.quality = 'high';
      result.tags.push('⭐高价值');
      result.isUseful = true;
    } else if (result.score >= 25) {
      result.quality = 'medium';
      result.isUseful = true;
    } else {
      result.quality = 'low';
    }

    return result;
  });

  // 统计
  const stats = {
    total: scoredData.length,
    high: scoredData.filter(t => t.quality === 'high').length,
    medium: scoredData.filter(t => t.quality === 'medium').length,
    low: scoredData.filter(t => t.quality === 'low').length,
    withPrompt: scoredData.filter(t => t.hasPrompt).length,
    marketing: scoredData.filter(t => t.isMarketing).length,
    tech: scoredData.filter(t => t.isTechShare).length,
    useful: scoredData.filter(t => t.isUseful).length,
    highEngagement: scoredData.filter(t => t.engagementLevel === 'high').length,
    lowEngagement: scoredData.filter(t => t.engagementLevel === 'low').length,
    avgEngagement: Math.round(avgEngagement),
    // 新增领域统计
    targetDomain: scoredData.filter(t => t.isTargetDomain).length,
    excludeDomain: scoredData.filter(t => t.isExcludeDomain).length
  };

  console.log('\n📊 筛选统计:');
  console.log(`   总计: ${stats.total} 条`);
  console.log(`   ⭐高价值: ${stats.high} 条`);
  console.log(`   中等: ${stats.medium} 条`);
  console.log(`   低价值: ${stats.low} 条`);
  console.log(`   含Prompt: ${stats.withPrompt} 条`);
  console.log(`   技术分享: ${stats.tech} 条`);
  console.log(`   营销推广: ${stats.marketing} 条`);
  console.log(`   🔥高互动: ${stats.highEngagement} 条`);
  console.log(`   💤低互动: ${stats.lowEngagement} 条`);
  console.log(`   🎯目标领域: ${stats.targetDomain} 条`);
  console.log(`   💻编程类（排除）: ${stats.excludeDomain} 条`);
  console.log(`   可用内容: ${stats.useful} 条`);

  return { data: scoredData, stats };
}

// 规则学习函数
function learnFromFeedback(feedbackData) {
  console.log('🧠 开始从反馈中学习规则...');
  
  const selected = feedbackData.selected_urls;
  const rejected = feedbackData.rejected_urls;
  
  if (selected.length === 0) {
    console.log('⚠️ 没有选中样本，无法学习规则');
    return null;
  }
  
  // 计算特征平均值
  const calcFeatureStats = (items) => {
    if (items.length === 0) return null;
    return {
      avgScore: items.reduce((sum, i) => sum + i.score, 0) / items.length,
      avgTextLength: items.reduce((sum, i) => sum + i.textLength, 0) / items.length,
      avgTotalEngagement: items.reduce((sum, i) => sum + (i.totalEngagement || 0), 0) / items.length,
      hasPromptRate: items.filter(i => i.hasPrompt).length / items.length,
      isMarketingRate: items.filter(i => i.isMarketing).length / items.length,
      isTechRate: items.filter(i => i.isTech).length / items.length,
      languageDist: items.reduce((acc, i) => {
        acc[i.language] = (acc[i.language] || 0) + 1;
        return acc;
      }, {}),
      engagementDist: items.reduce((acc, i) => {
        const level = i.engagementLevel || 'unknown';
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      }, {})
    };
  };
  
  const selectedStats = calcFeatureStats(selected);
  const rejectedStats = calcFeatureStats(rejected);
  
  // 提取差异化规则
  const rules = [];
  
  // 1. 分数规则
  if (rejectedStats && selectedStats.avgScore > rejectedStats.avgScore + 10) {
    rules.push({
      feature: 'score',
      type: 'threshold',
      operator: '>=',
      value: Math.round(selectedStats.avgScore - 5),
      importance: 'high',
      description: `推荐分数 >= ${Math.round(selectedStats.avgScore - 5)} 的内容 (选中平均: ${Math.round(selectedStats.avgScore)}, 拒绝平均: ${Math.round(rejectedStats.avgScore)})`
    });
  }
  
  // 2. 文本长度规则
  if (rejectedStats && selectedStats.avgTextLength > rejectedStats.avgTextLength + 50) {
    rules.push({
      feature: 'textLength',
      type: 'threshold',
      operator: '>=',
      value: Math.round(selectedStats.avgTextLength - 20),
      importance: 'medium',
      description: `推荐文本长度 >= ${Math.round(selectedStats.avgTextLength - 20)} 字 (选中平均: ${Math.round(selectedStats.avgTextLength)}, 拒绝平均: ${Math.round(rejectedStats.avgTextLength)})`
    });
  }
  
  // 3. Prompt含量规则
  if (selectedStats.hasPromptRate > 0.7 && rejectedStats && rejectedStats.hasPromptRate < 0.3) {
    rules.push({
      feature: 'hasPrompt',
      type: 'boolean',
      operator: '==',
      value: true,
      importance: 'high',
      description: `优先选择含Prompt的内容 (选中含Prompt率: ${(selectedStats.hasPromptRate * 100).toFixed(0)}%, 拒绝: ${(rejectedStats.hasPromptRate * 100).toFixed(0)}%)`
    });
  }
  
  // 4. 排除营销内容
  if (selectedStats.isMarketingRate < 0.1 && rejectedStats && rejectedStats.isMarketingRate > 0.5) {
    rules.push({
      feature: 'isMarketing',
      type: 'boolean',
      operator: '==',
      value: false,
      importance: 'high',
      description: `排除营销推广内容 (选中营销率: ${(selectedStats.isMarketingRate * 100).toFixed(0)}%, 拒绝: ${(rejectedStats.isMarketingRate * 100).toFixed(0)}%)`
    });
  }
  
  // 5. 技术分享偏好
  if (selectedStats.isTechRate > 0.5 && rejectedStats && rejectedStats.isTechRate < 0.2) {
    rules.push({
      feature: 'isTech',
      type: 'boolean',
      operator: '==',
      value: true,
      importance: 'medium',
      description: `偏好技术分享内容 (选中技术率: ${(selectedStats.isTechRate * 100).toFixed(0)}%, 拒绝: ${(rejectedStats.isTechRate * 100).toFixed(0)}%)`
    });
  }
  
  // 6. 语言偏好
  if (Object.keys(selectedStats.languageDist).length > 0) {
    const topLang = Object.entries(selectedStats.languageDist)
      .sort((a, b) => b[1] - a[1])[0];
    
    const topLangRate = topLang[1] / selected.length;
    
    if (topLangRate > 0.5) {
      rules.push({
        feature: 'language',
        type: 'equals',
        operator: '==',
        value: topLang[0],
        importance: 'low',
        description: `偏好${topLang[0] === 'zh' ? '中文' : topLang[0] === 'en' ? '英文' : '日文'}内容 (占比: ${(topLangRate * 100).toFixed(0)}%)`
      });
    }
  }
  
  console.log('\\n📋 学习到的规则:');
  rules.forEach((rule, i) => {
    console.log(`   ${i + 1}. [${rule.importance.toUpperCase()}] ${rule.description}`);
  });
  
  return {
    rules,
    selectedStats,
    rejectedStats,
    feedbackCount: feedbackData.selected + feedbackData.rejected
  };
}

// 应用学习到的规则到新数据
function applyLearnedRules(data, learnedRules) {
  if (!learnedRules || !learnedRules.rules || learnedRules.rules.length === 0) {
    console.log('⚠️ 没有可应用的规则');
    return data;
  }
  
  console.log(`🎯 应用 ${learnedRules.rules.length} 条学习到的规则...`);
  
  const scoredWithRules = data.map(item => {
    let ruleScore = 0;
    let matchedRules = [];
    
    learnedRules.rules.forEach(rule => {
      let matched = false;
      
      switch (rule.feature) {
        case 'score':
          if (rule.operator === '>=' && item.score >= rule.value) matched = true;
          break;
        case 'textLength':
          if (rule.operator === '>=' && (item.text || '').length >= rule.value) matched = true;
          break;
        case 'hasPrompt':
          if (rule.operator === '==' && item.hasPrompt === rule.value) matched = true;
          break;
        case 'isMarketing':
          if (rule.operator === '==' && item.isMarketing === rule.value) matched = true;
          break;
        case 'isTech':
          if (rule.operator === '==' && item.isTechShare === rule.value) matched = true;
          break;
        case 'language':
          if (rule.operator === '==' && item.language === rule.value) matched = true;
          break;
      }
      
      if (matched) {
        const weight = rule.importance === 'high' ? 20 : rule.importance === 'medium' ? 10 : 5;
        ruleScore += weight;
        matchedRules.push(rule.description);
      }
    });
    
    return {
      ...item,
      ruleScore,
      matchedRules,
      autoRecommended: ruleScore >= 20 // 至少匹配一条高重要性规则
    };
  });
  
  const recommendedCount = scoredWithRules.filter(i => i.autoRecommended).length;
  console.log(`✅ 规则应用完成: ${recommendedCount}/${data.length} 条内容被自动推荐`);
  
  return scoredWithRules;
}

function saveAsJSON(data, outputDir, source) {
  ensureDir(outputDir);
  
  const { data: scoredData, stats } = analyzeAndScoreTweets(data);
  
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `twitter-clean-data-${timestamp}.json`;
  const filePath = path.join(outputDir, filename);
  
  const outputData = {
    generated_at: new Date().toISOString(),
    source: source,
    count: scoredData.length,
    stats: stats,
    items: scoredData.map(item => ({
      url: item.url,
      text: item.text,
      author: item.author,
      images: item.images,
      has_text: item.hasText,
      tags: item.tags,
      score: item.score,
      quality: item.quality,
      category: item.category,
      language: item.language,
      hasPrompt: item.hasPrompt,
      isMarketing: item.isMarketing,
      isTechShare: item.isTechShare,
      isUseful: item.isUseful
    }))
  };
  
  fs.writeFileSync(filePath, JSON.stringify(outputData, null, 2));
  console.log(`💾 JSON 已保存: ${filename}`);
  console.log(`📁 文件路径: ${filePath}`);
  
  return filePath;
}

async function saveAsPreviewHTML(data, outputDir, source, browser) {
  ensureDir(outputDir);
  
  const { data: scoredData, stats } = analyzeAndScoreTweets(data);
  
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `twitter-clean-preview-${timestamp}.html`;
  const filePath = path.join(outputDir, filename);
  
  // 构建卡片
  const cards = scoredData.map(item => {
    const image = item.images && item.images.length > 0 ? item.images[0] : '';
    const text = item.text || '';
    const url = item.url || '';
    const author = item.author || '';
    const quality = item.quality;
    const score = item.score;
    const tags = item.tags || [];
    const language = item.language || '';
    const engagementLevel = item.engagementLevel || 'medium';
    const totalEngagement = item.totalEngagement || 0;
    const likes = item.likes || 0;
    const replies = item.replies || 0;
    const retweets = item.retweets || 0;

    // 领域相关变量
    const promptDomainLabel = item.promptDomainLabel || '';
    const isExcludeDomain = item.isExcludeDomain || false;
    const isTargetDomain = item.isTargetDomain || false;

    // 质量等级颜色
    const qualityColors = {
      'high': '#10b981',    // 绿色
      'medium': '#f59e0b',  // 橙色
      'low': '#ef4444'      // 红色
    };
    const qualityLabels = {
      'high': '⭐高价值',
      'medium': '中等',
      'low': '低价值'
    };
    
    return `
      <div class="card" data-url="${url}" data-quality="${quality}" data-score="${score}" data-language="${language}" data-engagement="${engagementLevel}">
        <div class="card-header">
          <label class="select">
            <input type="checkbox" checked />
            <span>选中</span>
          </label>
          <span class="quality-badge" style="background: ${qualityColors[quality]}">${qualityLabels[quality]} (${score})</span>
          <span class="language-badge">${language}</span>
          <span class="domain-badge ${isExcludeDomain ? 'exclude' : isTargetDomain ? 'target' : 'unknown'}">${promptDomainLabel}</span>
          <span class="engagement-badge">💬 ${totalEngagement || 0}</span>
          <span class="meta">作者: ${author}</span>
          <a class="open" href="${url}" target="_blank">打开</a>
        </div>
        <div class="tags">
          ${tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
        <div class="content">
          <div class="image">
            ${image ? `<img src="${image}" alt="tweet" />` : '<div class="placeholder">No image</div>'}
          </div>
          <div class="text">${text || '<span class="muted">无文本</span>'}</div>
        </div>
        <div class="engagement-details">
          <span>❤️ ${likes || 0}</span>
          <span>💬 ${replies || 0}</span>
          <span>🔄 ${retweets || 0}</span>
        </div>
      </div>
    `;
  }).join('\n');
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Twitter Clean Preview - 智能筛选</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 24px; background: #0b0b0b; color: #f5f5f5; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 16px; }
    .toolbar button { background: #1f1f1f; color: #fff; border: 1px solid #2a2a2a; padding: 8px 12px; border-radius: 6px; cursor: pointer; }
    .toolbar button:hover { background: #2a2a2a; }
    .toolbar button.primary { background: #2563eb; border-color: #3b82f6; }
    .toolbar button.primary:hover { background: #3b82f6; }
    .toolbar span { color: #9f9f9f; }
    .filter-section { background: #141414; border: 1px solid #242424; border-radius: 10px; padding: 16px; margin-bottom: 16px; }
    .filter-title { font-weight: 600; margin-bottom: 12px; color: #f5f5f5; }
    .filter-group { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
    .filter-btn { background: #1f1f1f; color: #b8b8b8; border: 1px solid #2a2a2a; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 13px; }
    .filter-btn:hover { background: #2a2a2a; }
    .filter-btn.active { background: #2563eb; color: #fff; border-color: #3b82f6; }
    .stats { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
    .stat-item { background: #141414; padding: 8px 16px; border-radius: 6px; border: 1px solid #242424; }
    .stat-value { font-size: 18px; font-weight: 600; }
    .stat-label { font-size: 12px; color: #9f9f9f; }
    .grid { display: grid; gap: 16px; }
    .card { border: 1px solid #242424; border-radius: 10px; padding: 12px; background: #141414; transition: all 0.2s; }
    .card.hidden { display: none; }
    .card.highlighted { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.3); }
    .card-header { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 10px; }
    .select { display: inline-flex; gap: 6px; align-items: center; }
    .quality-badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .language-badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; background: #2a2a2a; color: #9f9f9f; }
    .engagement-badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; background: #1e3a5f; color: #88b7ff; }
    .domain-badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; }
    .domain-badge.target { background: #064e3b; color: #34d399; }
    .domain-badge.exclude { background: #7f1d1d; color: #f87171; }
    .domain-badge.unknown { background: #2a2a2a; color: #9f9f9f; }
    .meta { font-size: 12px; color: #b8b8b8; }
    .engagement-details { display: flex; gap: 12px; font-size: 11px; color: #777; margin-top: 8px; padding-top: 8px; border-top: 1px solid #242424; }
    .open { color: #88b7ff; text-decoration: none; font-size: 12px; }
    .tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
    .tag { padding: 2px 8px; border-radius: 4px; font-size: 11px; background: #2a2a2a; color: #9f9f9f; }
    .content { display: grid; grid-template-columns: 200px 1fr; gap: 12px; }
    .image img { width: 100%; border-radius: 8px; object-fit: cover; }
    .placeholder { width: 100%; height: 120px; background: #1f1f1f; display: flex; align-items: center; justify-content: center; color: #777; border-radius: 8px; }
    .text { white-space: pre-wrap; line-height: 1.5; font-size: 14px; }
    .muted { color: #777; }
  </style>
</head>
<body>
  <div class="filter-section">
    <div class="filter-title">🎯 智能筛选</div>
    <div class="filter-group">
      <button class="filter-btn primary" data-filter="useful">⭐ 高价值内容 (${stats.useful})</button>
      <button class="filter-btn" data-filter="prompt">含 Prompt (${stats.withPrompt})</button>
      <button class="filter-btn" data-filter="tech">技术分享 (${stats.tech})</button>
      <button class="filter-btn" data-filter="marketing">营销推广 (${stats.marketing})</button>
      <button class="filter-btn" data-filter="all">全部 (${stats.total})</button>
    </div>
    <div class="filter-group">
      <button class="filter-btn" data-filter="zh">中文</button>
      <button class="filter-btn" data-filter="en">英文</button>
      <button class="filter-btn" data-filter="ja">日文</button>
      <button class="filter-btn" data-filter="show-all-lang">全部语言</button>
    </div>
  </div>

  <div class="stats">
    <div class="stat-item">
      <div class="stat-value">${stats.total}</div>
      <div class="stat-label">总计</div>
    </div>
    <div class="stat-item">
      <div class="stat-value" style="color: #10b981;">${stats.high}</div>
      <div class="stat-label">⭐高价值</div>
    </div>
    <div class="stat-item">
      <div class="stat-value" style="color: #f59e0b;">${stats.medium}</div>
      <div class="stat-label">中等</div>
    </div>
    <div class="stat-item">
      <div class="stat-value" style="color: #ef4444;">${stats.low}</div>
      <div class="stat-label">低价值</div>
    </div>
  </div>

  <div class="toolbar">
    <button id="selectAll">全选</button>
    <button id="clearAll">清空</button>
    <button id="copySelected">复制选中链接</button>
    <button id="exportFiltered">导出筛选结果</button>
    <button id="confirmSelection" class="primary">✓ 确认筛选并学习</button>
    <span id="count"></span>
  </div>
  
  <div class="grid">
    ${cards}
  </div>

  <script>
    const cards = Array.from(document.querySelectorAll('.card'));
    const filterBtns = Array.from(document.querySelectorAll('.filter-btn'));
    const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
    
    let currentFilter = 'all';
    let currentLanguage = 'all';
    
    function applyFilter() {
      cards.forEach(card => {
        const quality = card.dataset.quality;
        const language = card.dataset.language;
        const text = card.querySelector('.text').textContent.toLowerCase();
        const tags = Array.from(card.querySelectorAll('.tag')).map(t => t.textContent);
        
        let isVisible = true;
        
        // 内容类型筛选
        if (currentFilter === 'useful' && quality !== 'high' && quality !== 'medium') {
          isVisible = false;
        } else if (currentFilter === 'prompt' && !tags.some(t => t.includes('Prompt'))) {
          isVisible = false;
        } else if (currentFilter === 'tech' && !tags.some(t => t.includes('技术'))) {
          isVisible = false;
        } else if (currentFilter === 'marketing' && !tags.some(t => t.includes('营销'))) {
          isVisible = false;
        }
        
        // 语言筛选
        if (currentLanguage !== 'all' && language !== currentLanguage) {
          isVisible = false;
        }
        
        card.classList.toggle('hidden', !isVisible);
      });
      
      updateCount();
    }
    
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;
        
        if (['zh', 'en', 'ja', 'show-all-lang'].includes(filter)) {
          // 语言筛选
          filterBtns.filter(b => ['zh', 'en', 'ja', 'show-all-lang'].includes(b.dataset.filter))
            .forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentLanguage = filter === 'show-all-lang' ? 'all' : filter;
        } else {
          // 内容筛选
          filterBtns.filter(b => !['zh', 'en', 'ja', 'show-all-lang'].includes(b.dataset.filter))
            .forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentFilter = filter;
        }
        
        applyFilter();
      });
    });
    
    const countEl = document.getElementById('count');
    function updateCount() {
      const visibleCards = cards.filter(card => !card.classList.contains('hidden'));
      const selected = checkboxes.filter(box => box.checked && !box.closest('.card').classList.contains('hidden')).length;
      countEl.textContent = '显示 ' + visibleCards.length + '/' + cards.length + ' | 选中 ' + selected;
    }
    
    document.getElementById('selectAll').onclick = () => { 
      cards.filter(c => !c.classList.contains('hidden')).forEach(card => {
        card.querySelector('input[type="checkbox"]').checked = true;
      });
      updateCount(); 
    };
    
    document.getElementById('clearAll').onclick = () => { 
      cards.filter(c => !c.classList.contains('hidden')).forEach(card => {
        card.querySelector('input[type="checkbox"]').checked = false;
      });
      updateCount(); 
    };
    
    document.getElementById('copySelected').onclick = async () => {
      const urls = checkboxes.filter(box => box.checked && !box.closest('.card').classList.contains('hidden'))
        .map(box => box.closest('.card').dataset.url);
      const text = urls.join('\\n');
      await navigator.clipboard.writeText(text);
      alert('已复制 ' + urls.length + ' 条链接');
    };
    
    document.getElementById('exportFiltered').onclick = async () => {
      const visibleCards = cards.filter(c => !c.classList.contains('hidden'));
      const selectedCards = visibleCards.filter(card => card.querySelector('input[type="checkbox"]').checked);
      const urls = selectedCards.map(card => card.dataset.url);
      const text = urls.join('\\n');
      await navigator.clipboard.writeText(text);
      alert('已导出筛选结果：' + selectedCards.length + ' 条链接');
    };

    document.getElementById('confirmSelection').onclick = async () => {
      const selection = {
        timestamp: new Date().toISOString(),
        total: cards.length,
        selected: 0,
        rejected: 0,
        selected_urls: [],
        rejected_urls: []
      };

      cards.forEach(card => {
        const checkbox = card.querySelector('input[type="checkbox"]');
        const url = card.dataset.url;
        const text = card.querySelector('.text').textContent;
        const quality = card.dataset.quality;
        const score = card.dataset.score;
        const language = card.dataset.language;
        const tags = Array.from(card.querySelectorAll('.tag')).map(t => t.textContent);
        const textLength = text.length;
        const hasPrompt = tags.some(t => t.includes('Prompt'));
        const isMarketing = tags.some(t => t.includes('营销'));
        const isTech = tags.some(t => t.includes('技术'));

        const itemData = {
          url,
          quality,
          score: parseInt(score),
          language,
          textLength,
          hasPrompt,
          isMarketing,
          isTech,
          tags,
          // 新增互动数据
          likes: parseInt(card.querySelector('.engagement-details span:nth-child(1)').textContent.replace(/[^\d]/g, '')) || 0,
          replies: parseInt(card.querySelector('.engagement-details span:nth-child(2)').textContent.replace(/[^\d]/g, '')) || 0,
          retweets: parseInt(card.querySelector('.engagement-details span:nth-child(3)').textContent.replace(/[^\d]/g, '')) || 0,
          totalEngagement: parseInt(card.querySelector('.engagement-badge').textContent.replace(/[^\d]/g, '')) || 0,
          engagementLevel: card.dataset.engagement || 'unknown'
        };

        if (checkbox.checked) {
          selection.selected_urls.push(itemData);
          selection.selected++;
        } else {
          selection.rejected_urls.push(itemData);
          selection.rejected++;
        }
      });

      // 下载JSON文件
      const blob = new Blob([JSON.stringify(selection, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'selection-feedback-' + new Date().toISOString().split('T')[0] + '.json';
      a.click();
      URL.revokeObjectURL(url);

      alert('✅ 筛选结果已记录！\\n\\n' +
            '选中: ' + selection.selected + ' 条\\n' +
            '拒绝: ' + selection.rejected + ' 条\\n\\n' +
            '已下载反馈文件，系统将基于此优化筛选规则。');
    };
    
    checkboxes.forEach(box => box.addEventListener('change', updateCount));
    
    // 初始化
    updateCount();
  </script>
</body>
</html>
  `;
  
  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`💾 预览页面已生成: ${filename}`);
  console.log(`📁 文件路径: ${filePath}`);
  
  // 在同一个 Chrome 浏览器中打开预览页面
  if (browser) {
    try {
      const contexts = browser.contexts();
      if (contexts.length > 0) {
        const context = contexts[0];
        const previewPage = await context.newPage();
        const fileUrl = `file://${filePath}`;
        await previewPage.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        console.log(`✅ 预览页面已在 Chrome 中打开: ${fileUrl}`);
      }
    } catch (error) {
      console.log(`⚠️ 无法在 Chrome 中打开预览页面: ${error.message}`);
      console.log(`💡 请手动在 Chrome 中打开: ${filePath}`);
    }
  }
  
  return filePath;
}

async function cleanTwitterData(links, outputFormat, outputDir, source, learnedRules = null, directExtract = false) {
  console.log('🚀 Twitter 数据清洗器启动\n');

  if (directExtract) {
    console.log('📋 直接提取模式：跳过粘贴步骤，直接从筛选页提取数据\n');
  } else {
    console.log(`📊 输入链接: ${links.length} 条`);
  }
  console.log(`📁 输出目录: ${outputDir}`);
  console.log(`🎯 输出格式: ${outputFormat}\n`);

  const { browser, filterPage } = await connectToBrowser();

  try {
    // 如果不是直接提取模式，先粘贴链接并等待解析
    if (!directExtract) {
      const success = await pasteLinksAndWait(filterPage, links);

      if (!success) {
        console.log('⚠️ 解析可能未完成，继续提取已有数据');
      }
    } else {
      // 直接提取模式，等待用户手动粘贴完成
      console.log('⏳ 等待筛选页数据...');
      console.log('💡 请确保已在筛选页粘贴链接并等待解析完成');
      await new Promise(resolve => setTimeout(resolve, 3000)); // 等待3秒让用户确认
    }

    // 提取数据
    let tweetData = await extractTweetData(filterPage);

    if (tweetData.length === 0) {
      throw new Error('未能提取到任何推文数据');
    }

    // 应用学习到的规则
    if (learnedRules) {
      tweetData = applyLearnedRules(tweetData, learnedRules);
    }

    // 保存输出
    let outputPath;
    if (outputFormat === 'json') {
      outputPath = saveAsJSON(tweetData, outputDir, source);
    } else if (outputFormat === 'preview-html') {
      outputPath = await saveAsPreviewHTML(tweetData, outputDir, source, browser);
    } else {
      // 默认两种都保存
      const jsonPath = saveAsJSON(tweetData, outputDir, source);
      const htmlPath = await saveAsPreviewHTML(tweetData, outputDir, source, browser);
      outputPath = { json: jsonPath, html: htmlPath };
    }

    console.log('\n✅ 数据清洗完成');
    console.log(`📊 处理推文: ${tweetData.length} 条`);

    return { success: true, data: tweetData, outputPath };

  } catch (error) {
    console.error(`❌ 清洗失败: ${error.message}`);
    throw error;
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    links: [],
    outputFormat: 'both',
    outputDir: CONFIG.outputDir,
    source: 'unknown',
    learnFrom: null,
    applyRules: false,
    directExtract: false
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--input':
        config.links = parseLinksFromFile(nextArg);
        config.source = `file:${nextArg}`;
        i += 1;
        break;
      case '--preview':
        config.links = parseLinksFromPreview(nextArg);
        config.source = `preview:${nextArg}`;
        i += 1;
        break;
      case '--output-dir':
        config.outputDir = nextArg;
        i += 1;
        break;
      case '--output':
        config.outputFormat = nextArg;
        i += 1;
        break;
      case '--filter-url':
        CONFIG.filterUrl = nextArg;
        i += 1;
        break;
      case '--learn-from':
        config.learnFrom = nextArg;
        i += 1;
        break;
      case '--apply-rules':
        config.applyRules = true;
        break;
      case '--direct-extract':
        config.directExtract = true;
        config.source = 'direct-extract';
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
🔍 Twitter 数据清洗器

使用方式:
  node scripts/cleaner.js [选项]

选项:
  --input <文件路径>       从文本文件读取链接（每行一个链接）
  --preview <HTML文件>     从预览 HTML 读取勾选的链接
  --output-dir <目录>      输出目录（默认: /Users/douba/twitter-output）
  --output <格式>         输出格式: json, preview-html, both（默认: both）
  --filter-url <URL>      筛选页地址（默认: https://twitterhot.vercel.app/tweet-filter.html）
  --learn-from <文件路径>  从反馈JSON文件学习规则
  --apply-rules            自动应用已学习的规则进行筛选
  --direct-extract         直接从筛选页提取数据（跳过粘贴步骤）

工作流:
  1. 清洗数据: node scripts/cleaner.js --input links.txt
     或直接提取: node scripts/cleaner.js --direct-extract
  2. 在预览页面手动筛选，点击"确认筛选并学习"
  3. 系统下载反馈文件，自动学习规则
  4. 下次使用规则: node scripts/cleaner.js --input new-links.txt --apply-rules

示例:
  # 基础清洗
  node scripts/cleaner.js --input /Users/douba/twitter-output/twitter-links-2026-01-14.txt

  # 直接从筛选页提取（需已手动粘贴链接）
  node scripts/cleaner.js --direct-extract

  # 从反馈学习规则
  node scripts/cleaner.js --input new-links.txt --learn-from feedback.json

  # 应用已学习的规则
  node scripts/cleaner.js --input new-links.txt --apply-rules
`);
}

async function main() {
  const config = parseArgs();

  if (config.links.length === 0 && !config.directExtract) {
    console.error('❌ 错误: 未提供任何链接');
    console.log('使用 --input 或 --preview 提供链接列表');
    console.log('使用 --direct-extract 从筛选页直接提取');
    console.log('使用 --help 查看帮助信息');
    process.exit(1);
  }

  try {
    await cleanTwitterData(config.links, config.outputFormat, config.outputDir, config.source);
  } catch (error) {
    console.error(`\n❌ 执行失败: ${error.message}`);
    process.exit(1);
  }
}

main();