#!/usr/bin/env python3
"""
Generate Summary Report for All Apps
"""

import json
import os
from pathlib import Path

REPORT_DIR = os.getcwd()


def get_report_files():
    """Get all analysis report files."""
    files = list(Path(REPORT_DIR).glob("*_Analysis_*.md"))
    return sorted(files, key=lambda f: f.stat().st_mtime, reverse=True)


def extract_key_info(filepath):
    """Extract key information from report."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    app_name = filepath.stem.split('_Analysis')[0].replace('_', ' ')

    # Extract basic stats
    lines = content.split('\n')
    stats = {}

    for line in lines:
        if '记录数量：' in line:
            stats['records'] = line.split('记录数量：')[1].strip()
        elif '时间范围：' in line:
            stats['time_range'] = line.split('时间范围：')[1].strip()
        elif '高峰时段' in line:
            for next_line in lines[lines.index(line)+1:]:
                if '|' in next_line and '18:00' in next_line:
                    stats['peak_hour'] = next_line.split('|')[2].strip()
                    break

    return {'name': app_name, 'file': filepath.name, 'stats': stats}


def generate_summary():
    """Generate summary report."""
    files = get_report_files()

    if not files:
        print("未找到分析报告文件")
        return

    print("=" * 80)
    print(f"📊 语音记录分析汇总 - {len(files)} 个APP")
    print("=" * 80)
    print()

    for i, info in enumerate(extract_key_info(f) for f in files):
        print(f"{i+1}. {info['name']}")
        print(f"   文件: {info['file']}")
        if info['stats']:
            print(f"   记录: {info['stats'].get('records', 'N/A')} 条")
            print(f"   时间: {info['stats'].get('time_range', 'N/A')}")
        print()

    print("=" * 80)
    print("💡 提示：使用 Read 工具查看具体报告内容")
    print("=" * 80)


if __name__ == "__main__":
    generate_summary()
