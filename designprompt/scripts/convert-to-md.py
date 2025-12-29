#!/usr/bin/env python3
"""
将浏览器采集的 JSON 转换为 Markdown 文件

使用方法：
python3 convert-to-md.py <json-file>

示例：
python3 convert-to-md.py ~/Downloads/all-styles-complete.json
"""

import json
import os
import sys
from pathlib import Path

# 风格元数据扩展映射
METADATA_MAP = {
    "monochrome": {
        "scenes": ["高端时尚品牌", "建筑设计作品集", "艺术展览网站", "奢侈品电商"],
        "emotions": "优雅、权威、永恒、戏剧化、精致",
        "industries": "时尚、建筑、艺术、设计"
    },
    "bauhaus": {
        "scenes": ["创意设计机构", "艺术工作室", "现代品牌", "设计教育平台"],
        "emotions": "大胆、艺术、功能性、建筑感、现代",
        "industries": "设计、艺术、教育、创意产业"
    },
    "modern-dark": {
        "scenes": ["开发工具平台", "SaaS产品", "技术文档", "设计工具", "代码编辑器"],
        "emotions": "精准、深度、流畅、高级、技术感、电影感",
        "industries": "科技、软件开发、设计工具、开发者服务"
    },
    "academia": {
        "scenes": ["大学官网", "在线教育平台", "学术出版物", "图书馆系统", "研究机构网站"],
        "emotions": "博学、传统、权威、温暖、学术",
        "industries": "教育、学术、出版、研究机构"
    },
    "art-deco": {
        "scenes": ["奢侈品牌", "高端酒店", "珠宝展示", "精品零售", "历史博物馆"],
        "emotions": "奢华、优雅、几何美、复古时尚、精致",
        "industries": "奢侈品、酒店、珠宝、时尚、文化"
    },
    "bold-typography": {
        "scenes": ["创意机构官网", "音乐活动宣传", "艺术展览", "品牌发布会", "视觉设计工作室"],
        "emotions": "大胆、冲击力、戏剧化、极简、艺术",
        "industries": "创意产业、音乐、艺术、品牌设计、广告"
    },
    "botanical": {
        "scenes": ["有机产品电商", "健康养生品牌", "植物护肤品", "瑜伽工作室", "自然主题博客"],
        "emotions": "自然、温暖、柔和、优雅、宁静",
        "industries": "健康、美容、有机产品、养生、环保"
    },
    "claymorphism": {
        "scenes": ["儿童产品", "游戏应用", "创意玩具品牌", "互动教育", "趣味社交应用"],
        "emotions": "趣味、触感、玩趣、高端、活力",
        "industries": "游戏、儿童产品、玩具、互动娱乐、创意应用"
    },
    "cyberpunk": {
        "scenes": ["游戏官网", "科幻主题活动", "技术会议", "电竞平台", "创新科技产品"],
        "emotions": "未来感、叛逆、科技、霓虹、赛博",
        "industries": "游戏、科技、电竞、娱乐、科幻IP"
    },
    "enterprise": {
        "scenes": ["B2B SaaS平台", "企业协作工具", "商业智能", "项目管理", "企业服务"],
        "emotions": "专业、现代、可靠、友好、高效",
        "industries": "企业软件、SaaS、商业服务、协作工具"
    },
    "flat-design": {
        "scenes": ["移动应用", "简洁官网", "仪表板", "工具类产品", "现代品牌"],
        "emotions": "简洁、清晰、现代、直接、高效",
        "industries": "移动应用、软件、互联网产品、品牌设计"
    },
    "industrial": {
        "scenes": ["硬件产品", "音频设备", "专业工具", "制造业", "工程软件"],
        "emotions": "精密、专业、触感、实用、品质",
        "industries": "硬件、音频、制造、工程、专业工具"
    },
    "kinetic": {
        "scenes": ["创意机构", "视觉艺术", "动态展示", "品牌活动", "实验性项目"],
        "emotions": "动感、能量、野性、大胆、律动",
        "industries": "创意、艺术、品牌、动态媒体、实验设计"
    },
    "luxury": {
        "scenes": ["奢侈品电商", "高端时尚", "精品酒店", "珠宝品牌", "艺术画廊"],
        "emotions": "奢华、优雅、精致、永恒、高端",
        "industries": "奢侈品、时尚、珠宝、艺术、高端服务"
    },
    "material-design": {
        "scenes": ["Android应用", "Google生态", "移动优先产品", "社交应用", "内容平台"],
        "emotions": "活力、友好、动态、现代、包容",
        "industries": "移动应用、社交、内容、互联网产品"
    },
    "maximalism": {
        "scenes": ["艺术项目", "实验性品牌", "文化活动", "独立设计", "视觉艺术"],
        "emotions": "丰富、大胆、混乱、表现力、叛逆",
        "industries": "艺术、文化、实验设计、独立品牌"
    },
    "minimal-dark": {
        "scenes": ["高端应用", "创意作品集", "设计工作室", "夜间模式产品", "专业工具"],
        "emotions": "优雅、深邃、温暖、沉浸、高级",
        "industries": "设计、创意、专业软件、数字产品"
    },
    "neo-brutalism": {
        "scenes": ["年轻品牌", "创意工作室", "文化活动", "独立产品", "设计社区"],
        "emotions": "原始、对比、DIY、朋克、鲜明",
        "industries": "创意、设计、文化、独立品牌、青年市场"
    },
    "neumorphism": {
        "scenes": ["触控界面", "移动应用", "智能家居", "仪表盘", "现代UI"],
        "emotions": "柔和、触感、现代、精致、实体",
        "industries": "移动应用、智能硬件、UI设计、交互产品"
    },
    "newsprint": {
        "scenes": ["新闻媒体", "编辑内容", "博客平台", "出版物", "信息密集网站"],
        "emotions": "权威、清晰、传统、专业、直接",
        "industries": "媒体、新闻、出版、内容平台"
    },
    "organic": {
        "scenes": ["可持续品牌", "自然产品", "健康生活", "环保组织", "手工艺品"],
        "emotions": "自然、温暖、朴实、治愈、和谐",
        "industries": "环保、可持续、健康、手工、自然产品"
    },
    "playful-geometric": {
        "scenes": ["儿童教育", "创意品牌", "趣味应用", "年轻市场", "互动产品"],
        "emotions": "活力、乐观、友好、玩趣、简单",
        "industries": "教育、儿童、创意、娱乐、年轻品牌"
    },
    "professional": {
        "scenes": ["商业咨询", "专业服务", "高端内容", "企业官网", "编辑平台"],
        "emotions": "优雅、专业、克制、文学、精致",
        "industries": "咨询、专业服务、出版、商务、高端品牌"
    },
    "retro": {
        "scenes": ["怀旧品牌", "复古产品", "文化活动", "趣味项目", "创意实验"],
        "emotions": "怀旧、趣味、混乱、反讽、丑萌",
        "industries": "文化、创意、娱乐、怀旧品牌、艺术"
    },
    "saas": {
        "scenes": ["SaaS产品", "科技创业", "B2B平台", "营销工具", "云服务"],
        "emotions": "现代、自信、专业、清晰、创新",
        "industries": "SaaS、科技、B2B、云服务、创业"
    },
    "sketch": {
        "scenes": ["创意工作室", "手工品牌", "儿童产品", "插画作品集", "艺术项目"],
        "emotions": "玩趣、亲切、手工、个性、温暖",
        "industries": "创意、手工、插画、儿童、独立设计"
    },
    "swiss-minimalist": {
        "scenes": ["设计机构", "现代品牌", "建筑事务所", "高端产品", "艺术画廊"],
        "emotions": "精准、客观、现代、克制、优雅",
        "industries": "设计、建筑、现代品牌、艺术、高端服务"
    },
    "terminal": {
        "scenes": ["开发者工具", "技术文档", "代码编辑器", "命令行工具", "技术博客"],
        "emotions": "极客、复古未来、功能、原始、技术",
        "industries": "开发者工具、技术、软件、IT、程序员社区"
    },
    "vaporwave": {
        "scenes": ["音乐项目", "艺术展览", "复古主题", "创意活动", "文化IP"],
        "emotions": "怀旧、梦幻、霓虹、超现实、合成",
        "industries": "音乐、艺术、文化、娱乐、创意项目"
    },
    "web3": {
        "scenes": ["加密货币", "区块链项目", "NFT平台", "去中心化应用", "DeFi产品"],
        "emotions": "未来、去中心化、精密、创新、科技",
        "industries": "区块链、加密货币、Web3、金融科技、去中心化"
    }
}

def generate_markdown(style):
    """生成单个风格的 Markdown 文档"""
    name = style['name']
    slug = style['filename'].replace('.md', '')
    mode = style['mode'].capitalize()
    font_type = style['fontType'].capitalize()
    description = style.get('description', '待补充')
    prompt = style.get('prompt', '')

    # 获取或使用默认元数据
    metadata = METADATA_MAP.get(slug, {
        "scenes": ["待补充"],
        "emotions": "待补充",
        "industries": "待补充"
    })

    # 生成 Markdown 内容
    md_content = f"""# {name} Design System

**风格ID**: {slug}
**模式**: {mode}
**字体类型**: {font_type}
**简短描述**: {description}

## 适用场景
"""

    scenes = metadata["scenes"] if isinstance(metadata["scenes"], list) else ["待补充"]
    for scene in scenes:
        md_content += f"- {scene}\n"

    md_content += f"""
## 情感调性
{metadata["emotions"]}

## 适用行业
{metadata["industries"]}

## 设计系统提示词

{prompt}
"""

    return md_content

def main():
    if len(sys.argv) < 2:
        print("❌ 错误：缺少 JSON 文件参数")
        print("\n用法:")
        print(f"  python3 {sys.argv[0]} <json-file>")
        print("\n示例:")
        print(f"  python3 {sys.argv[0]} ~/Downloads/all-styles-complete.json")
        sys.exit(1)

    json_file = os.path.expanduser(sys.argv[1])

    if not os.path.exists(json_file):
        print(f"❌ 文件不存在: {json_file}")
        sys.exit(1)

    # 读取 JSON 数据
    print(f"📖 读取文件: {json_file}")
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            styles = json.load(f)
    except json.JSONDecodeError as e:
        print(f"❌ JSON 格式错误: {e}")
        sys.exit(1)

    if not isinstance(styles, list):
        print("❌ JSON 文件格式错误，应该是一个数组")
        sys.exit(1)

    print(f"✅ 找到 {len(styles)} 个风格\n")

    # 确定输出目录
    script_dir = Path(__file__).parent
    styles_dir = script_dir.parent / 'styles'
    styles_dir.mkdir(exist_ok=True)

    print(f"📂 输出目录: {styles_dir}\n")

    # 生成文件
    success_count = 0
    error_count = 0

    for i, style in enumerate(styles, 1):
        name = style.get('name', f'Unknown-{i}')
        filename = style.get('filename', f'style-{i}.md')
        filepath = styles_dir / filename

        try:
            md_content = generate_markdown(style)

            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(md_content)

            prompt_len = style.get('promptLength', len(style.get('prompt', '')))
            print(f"✅ [{i:2d}/{len(styles)}] {name:30s} → {filename:35s} ({prompt_len:,} 字符)")
            success_count += 1

        except Exception as e:
            print(f"❌ [{i:2d}/{len(styles)}] {name:30s} - 失败: {e}")
            error_count += 1

    print(f"\n{'='*80}")
    print(f"🎉 转换完成！")
    print(f"   ✅ 成功: {success_count}/{len(styles)}")
    if error_count > 0:
        print(f"   ❌ 失败: {error_count}/{len(styles)}")
    print(f"   📁 文件位置: {styles_dir}")
    print(f"{'='*80}\n")

    # 显示统计信息
    if styles:
        light_count = sum(1 for s in styles if s.get('mode') == 'light')
        dark_count = sum(1 for s in styles if s.get('mode') == 'dark')
        total_chars = sum(s.get('promptLength', 0) for s in styles)

        print("📊 统计信息：")
        print(f"   - Light Mode: {light_count} 个")
        print(f"   - Dark Mode: {dark_count} 个")
        print(f"   - 总字符数: {total_chars:,} 字符")
        print(f"   - 平均长度: {total_chars//len(styles):,} 字符/风格")

if __name__ == '__main__':
    main()
