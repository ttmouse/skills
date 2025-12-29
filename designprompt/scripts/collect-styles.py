#!/usr/bin/env python3
"""
自动采集所有设计风格并生成 Markdown 文件

使用方法：
python3 collect-styles.py <json-file>

其中 json-file 是从浏览器导出的风格数据 JSON 文件
"""

import json
import os
import sys
import re
from pathlib import Path

# 风格元数据映射
STYLE_METADATA = {
    "monochrome": {
        "适用场景": ["高端时尚品牌", "建筑设计作品集", "艺术展览网站", "奢侈品电商", "设计师个人网站", "专业摄影作品集"],
        "情感调性": "优雅、权威、永恒、戏剧化、精致、沉稳、专业",
        "适用行业": "时尚、建筑、艺术、设计、奢侈品"
    },
    "bauhaus": {
        "适用场景": ["创意设计机构", "艺术工作室", "现代品牌", "设计教育平台", "文化创意产品", "展览活动网站"],
        "情感调性": "大胆、艺术、功能性、建筑感、现代、创新",
        "适用行业": "设计、艺术、教育、创意产业、文化"
    },
    "modern-dark": {
        "适用场景": ["科技产品", "开发工具", "SaaS平台", "创新应用", "数字产品", "技术服务"],
        "情感调性": "专业、现代、科技、酷炫、高效、前沿",
        "适用行业": "科技、软件、数字产品、互联网"
    },
    "newsprint": {
        "适用场景": ["新闻媒体", "博客平台", "内容聚合", "出版物", "在线杂志", "信息网站"],
        "情感调性": "传统、权威、信息密集、经典、可信",
        "适用行业": "媒体、出版、新闻、内容平台"
    },
    "saas": {
        "适用场景": ["B2B软件", "管理工具", "协作平台", "企业应用", "生产力工具", "云服务"],
        "情感调性": "专业、友好、高效、可信赖、简洁",
        "适用行业": "SaaS、企业服务、生产力工具、云计算"
    },
    "luxury": {
        "适用场景": ["奢侈品品牌", "高端酒店", "珠宝首饰", "精品时装", "豪华汽车", "高端房地产"],
        "情感调性": "优雅、奢华、精致、尊贵、品质、永恒",
        "适用行业": "奢侈品、时尚、珠宝、酒店、高端服务"
    },
    "terminal": {
        "适用场景": ["开发工具", "技术文档", "极客社区", "编程平台", "命令行工具", "开源项目"],
        "情感调性": "技术、极客、复古、实用、直接、专业",
        "适用行业": "开发工具、技术社区、编程教育、开源"
    },
    "swiss-minimalist": {
        "适用场景": ["设计工作室", "品牌机构", "专业服务", "精品电商", "咨询公司", "创意展示"],
        "情感调性": "精准、理性、清晰、专业、优雅、简洁",
        "适用行业": "设计、品牌、专业服务、咨询"
    },
    "kinetic": {
        "适用场景": ["游戏平台", "娱乐应用", "创意展示", "互动体验", "动画作品", "视觉艺术"],
        "情感调性": "动感、现代、酷炫、互动、沉浸、活力",
        "适用行业": "游戏、娱乐、创意、互动媒体"
    },
    "flat-design": {
        "适用场景": ["移动应用", "网页应用", "教育平台", "工具产品", "消费应用", "简单服务"],
        "情感调性": "友好、清晰、现代、简洁、直观、亲和",
        "适用行业": "移动应用、Web应用、消费产品、教育"
    }
}

def slugify(text):
    """将文本转换为 slug 格式"""
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    text = text.strip('-')
    return text

def generate_markdown(style):
    """生成风格的 Markdown 文档"""
    name = style['name']
    slug = slugify(name)
    mode = style['mode']
    font_type = style.get('fontType', 'sans-serif')
    description = style.get('description', '')
    prompt = style.get('prompt', '')

    # 获取元数据
    metadata = STYLE_METADATA.get(slug, {
        "适用场景": ["待补充"],
        "情感调性": "待补充",
        "适用行业": "待补充"
    })

    # 生成 Markdown 内容
    md_content = f"""# {name} Design System

**风格ID**: {slug}
**模式**: {mode.capitalize()}
**字体类型**: {font_type.capitalize()}
**简短描述**: {description}

## 适用场景
"""

    for scene in metadata["适用场景"]:
        md_content += f"- {scene}\n"

    md_content += f"""
## 情感调性
{metadata["情感调性"]}

## 适用行业
{metadata["适用行业"]}

## 设计系统提示词

{prompt}
"""

    return md_content

def main():
    if len(sys.argv) < 2:
        print("用法: python3 collect-styles.py <json-file>")
        print("")
        print("示例:")
        print("  python3 collect-styles.py design-styles.json")
        sys.exit(1)

    json_file = sys.argv[1]

    if not os.path.exists(json_file):
        print(f"❌ 文件不存在: {json_file}")
        sys.exit(1)

    # 读取 JSON 数据
    print(f"📖 读取文件: {json_file}")
    with open(json_file, 'r', encoding='utf-8') as f:
        styles = json.load(f)

    if not isinstance(styles, list):
        print("❌ JSON 文件格式错误，应该是一个数组")
        sys.exit(1)

    print(f"✅ 找到 {len(styles)} 个风格")

    # 确定输出目录
    script_dir = Path(__file__).parent
    styles_dir = script_dir.parent / 'styles'
    styles_dir.mkdir(exist_ok=True)

    print(f"📂 输出目录: {styles_dir}")
    print("")

    # 生成文件
    success_count = 0
    for i, style in enumerate(styles, 1):
        name = style.get('name', f'Unknown-{i}')
        filename = style.get('filename')

        if not filename:
            slug = slugify(name)
            filename = f"{slug}.md"

        filepath = styles_dir / filename

        try:
            md_content = generate_markdown(style)

            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(md_content)

            print(f"✅ [{i}/{len(styles)}] {name} → {filename}")
            success_count += 1

        except Exception as e:
            print(f"❌ [{i}/{len(styles)}] {name} - 失败: {e}")

    print("")
    print(f"🎉 完成！成功生成 {success_count}/{len(styles)} 个文件")
    print(f"📁 文件位置: {styles_dir}")

if __name__ == '__main__':
    main()
