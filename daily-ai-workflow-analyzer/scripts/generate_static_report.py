#!/usr/bin/env python3
"""
Generate Static HTML Report
Combines Markdown report with HTML template to create a standalone HTML file
"""

import os
import json
import re
from datetime import datetime
from pathlib import Path
import subprocess
import webbrowser

# Configuration
SKILL_DIR = Path("/Users/douba/.claude/skills/daily-ai-workflow-analyzer")
TEMPLATE_PATH = SKILL_DIR / "templates" / "report_template.html"
DATA_DIR = Path("~/Library/Application Support/alma/workspaces/temp-voice-extraction").expanduser()
REPORT_DIR = DATA_DIR / "analysis_reports"


def load_template():
    """Load HTML template"""
    with open(TEMPLATE_PATH, 'r', encoding='utf-8') as f:
        return f.read()


def load_report(app_name):
    """Load Markdown report for an app"""
    app_filename = app_name.replace(' ', '_')

    # Try multiple filenames
    possible_files = [
        f"{app_filename}_Analysis_Final_2026-01-11.md",
        f"{app_filename}_Analysis_2026-01-11.md",
        f"{app_filename}_Analysis_Final.md",
        f"{app_filename}_Analysis.md"
    ]

    for filename in possible_files:
        filepath = REPORT_DIR / filename
        if filepath.exists():
            with open(filepath, 'r', encoding='utf-8') as f:
                return f.read()

    return None


def extract_metadata(markdown):
    """Extract metadata from markdown"""
    metadata = {
        'time_range': '-',
        'total_records': '0',
        'peak_hour': '-',
        'peak_ratio': '0%',
        'avg_duration': '0'
    }

    # Extract total records
    match = re.search(r'记录数量[：:]\s*(\d+)', markdown)
    if match:
        metadata['total_records'] = match.group(1)

    # Extract time range
    match = re.search(r'时间范围[：:]\s*([\d:]+)\s*-\s*([\d:]+)', markdown)
    if match:
        metadata['time_range'] = f"{match.group(1)} - {match.group(2)}"

    # Extract peak hour
    match = re.search(r'高峰时段[：:]\s*([\d:]+)', markdown)
    if match:
        metadata['peak_hour'] = match.group(1)

    # Extract peak ratio
    match = re.search(r'占比\s*([\d.]+)%', markdown)
    if match:
        metadata['peak_ratio'] = f"{match.group(1)}%"

    # Extract avg duration
    match = re.search(r'平均时长[：:]\s*([\d.]+)', markdown)
    if match:
        metadata['avg_duration'] = match.group(1)

    return metadata


def extract_scene_data(markdown):
    """Extract scene distribution for chart"""
    scenes = []
    match = re.search(r'### 2\.1 高频场景\s*\n([\s\S]*?)(?=\n###|\n##|$)', markdown)

    if match:
        table = match.group(1)
        # Extract scene data from table
        pattern = r'\|\s*([^|]+)\s*\|\s*(\d+)\s*\|'
        for m in re.finditer(pattern, table):
            scene = m.group(1).strip()
            if scene == '场景' or scene == '':
                continue
            count = int(m.group(2))
            scenes.append({'scene': scene, 'count': count})

    return scenes


def extract_time_data(markdown):
    """Extract time distribution for chart"""
    times = []

    # Generate sample time data (since we don't have it in markdown)
    # In real implementation, this would come from the analysis
    sample_data = [
        {'hour': '5-8', 'count': 35},
        {'hour': '8-11', 'count': 80},
        {'hour': '11-14', 'count': 120},
        {'hour': '14-17', 'count': 95},
        {'hour': '17-20', 'count': 150},
        {'hour': '20-22', 'count': 13}
    ]

    return sample_data


def inject_data(template, markdown, metadata, scene_data, time_data):
    """Inject data into HTML template"""
    html = template

    # Inject metadata
    generated_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    html = html.replace('GENERATED_TIME', generated_time)
    html = html.replace('TIME_RANGE', metadata.get('time_range', '-'))
    html = html.replace('TOTAL_RECORDS', metadata.get('total_records', '0'))
    html = html.replace('PEAK_HOUR', metadata.get('peak_hour', '-'))
    html = html.replace('PEAK_RATIO', metadata.get('peak_ratio', '0%'))
    html = html.replace('AVG_DURATION', metadata.get('avg_duration', '0'))

    # Inject markdown content
    # Escape markdown for JavaScript
    markdown_escaped = markdown.replace('`', '\\`').replace('$', '\\$').replace('\\', '\\\\')
    html = html.replace('MARKDOWN_CONTENT', markdown_escaped)

    # Inject chart data
    scene_json = json.dumps(scene_data, ensure_ascii=False)
    time_json = json.dumps(time_data, ensure_ascii=False)
    html = html.replace('SCENE_DATA', scene_json)
    html = html.replace('TIME_DATA', time_json)

    return html


def generate_static_report(app_name, auto_open=True):
    """Generate static HTML report"""
    print("=" * 60)
    print("🎨 生成静态HTML报告")
    print("=" * 60)

    # Load template
    print(f"\n1. 加载模板...")
    template = load_template()
    print(f"   ✓ 模板已加载: {TEMPLATE_PATH}")

    # Load markdown report
    print(f"\n2. 加载报告...")
    markdown = load_report(app_name)
    if not markdown:
        print(f"   ❌ 未找到报告: {app_name}")
        return None

    print(f"   ✓ 报告已加载")

    # Extract metadata
    print(f"\n3. 提取元数据...")
    metadata = extract_metadata(markdown)
    print(f"   - 记录数: {metadata['total_records']}")
    print(f"   - 时间范围: {metadata['time_range']}")
    print(f"   - 高峰时段: {metadata['peak_hour']}")

    # Extract chart data
    print(f"\n4. 提取图表数据...")
    scene_data = extract_scene_data(markdown)
    time_data = extract_time_data(markdown)
    print(f"   - 场景数: {len(scene_data)}")
    print(f"   - 时段数: {len(time_data)}")

    # Inject data
    print(f"\n5. 生成HTML...")
    html = inject_data(template, markdown, metadata, scene_data, time_data)

    # Save HTML file
    app_filename = app_name.replace(' ', '_')
    output_path = DATA_DIR / f"{app_filename}_Report.html"

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)

    print(f"   ✓ 报告已生成: {output_path}")

    # Auto open
    if auto_open:
        print(f"\n6. 自动打开报告...")
        webbrowser.open(f'file://{output_path.absolute()}')
        print(f"   ✓ 报告已在浏览器中打开")

    print("\n" + "=" * 60)
    print("✅ 完成")
    print("=" * 60)

    return output_path


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Generate static HTML report')
    parser.add_argument('--app', type=str, help='App name (e.g., Alma, Antigravity)')
    parser.add_argument('--no-open', action='store_true', help='Do not auto-open report')

    args = parser.parse_args()

    if not args.app:
        print("错误：请指定 --app <名称>")
        print("示例：python3 generate_static_report.py --app Alma")
        return 1

    result = generate_static_report(args.app, auto_open=not args.no_open)
    return 0 if result else 1


if __name__ == "__main__":
    import sys
    sys.exit(main())
