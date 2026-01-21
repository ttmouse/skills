#!/usr/bin/env python3
"""
Generate Records Viewer - Create static HTML page for viewing voice records
"""

import os
import json
from datetime import datetime
from pathlib import Path
import webbrowser

# Configuration
SKILL_DIR = Path("/Users/douba/.claude/skills/daily-ai-workflow-analyzer")
TEMPLATE_PATH = SKILL_DIR / "templates" / "records_viewer.html"
DATA_DIR = Path("~/Library/Application Support/alma/workspaces/temp-voice-extraction").expanduser()


def load_template():
    """Load HTML template"""
    with open(TEMPLATE_PATH, 'r', encoding='utf-8') as f:
        return f.read()


def load_app_records(app_name):
    """Load voice records for an app"""
    app_filename = app_name.replace(' ', '_')
    filepath = DATA_DIR / "by_app" / f"{app_filename}.json"

    if not filepath.exists():
        return None

    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def prepare_records(records, limit=None):
    """Prepare records for display"""
    prepared = []

    for record in records[:limit] if limit else records:
        time = record.get('time', '')
        content = record.get('refined_text', '') or record.get('message', '')
        duration = record.get('duration', 0)
        timestamp = record.get('created_at', '')

        # Parse timestamp
        if 'T' in timestamp:
            try:
                ts = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                timestamp = int(ts.timestamp())
            except:
                timestamp = 0

        prepared.append({
            'time': time[:5] if time else '',
            'content': content,
            'duration': duration,
            'timestamp': timestamp,
            'refined': 'refined_text' in record
        })

    return prepared


def inject_data(template, app_name, records, time_range):
    """Inject data into HTML template"""
    html = template

    # Escape JSON for JavaScript
    records_json = json.dumps(records, ensure_ascii=False)

    # Inject data
    html = html.replace('APP_NAME', app_name)
    html = html.replace('RECORDS_DATA', records_json)
    html = html.replace('TIME_RANGE', time_range)

    return html


def generate_viewer(app_name, auto_open=True):
    """Generate records viewer HTML"""
    print("=" * 60)
    print("👁️  生成语音记录查看器")
    print("=" * 60)

    # Load template
    print(f"\n1. 加载模板...")
    template = load_template()
    print(f"   ✓ 模板已加载")

    # Load records
    print(f"\n2. 加载记录: {app_name}")
    records = load_app_records(app_name)

    if not records:
        print(f"   ❌ 未找到记录: {app_name}")
        return None

    print(f"   ✓ 已加载 {len(records)} 条记录")

    # Prepare records
    print(f"\n3. 准备数据...")
    prepared = prepare_records(records)
    print(f"   ✓ 数据已准备")

    # Calculate time range
    if len(prepared) > 1:
        times = [r['time'] for r in prepared if r['time']]
        if times:
            time_range = f"{min(times)} - {max(times)}"
        else:
            time_range = "全天"
    else:
        time_range = "全天"

    # Inject data
    print(f"\n4. 生成HTML...")
    html = inject_data(template, app_name, prepared, time_range)

    # Save HTML file
    app_filename = app_name.replace(' ', '_')
    output_path = DATA_DIR / f"{app_filename}_Records.html"

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)

    print(f"   ✓ 查看器已生成: {output_path}")

    # Auto open
    if auto_open:
        print(f"\n5. 自动打开查看器...")
        webbrowser.open(f'file://{output_path.absolute()}')
        print(f"   ✓ 查看器已在浏览器中打开")

    print("\n" + "=" * 60)
    print("✅ 完成")
    print("=" * 60)

    return output_path


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Generate records viewer')
    parser.add_argument('--app', type=str, help='App name (e.g., 微信, Alma)')
    parser.add_argument('--no-open', action='store_true', help='Do not auto-open')

    args = parser.parse_args()

    if not args.app:
        print("错误：请指定 --app <名称>")
        print("示例：python3 generate_records_viewer.py --app 微信")
        return 1

    result = generate_viewer(args.app, auto_open=not args.no_open)
    return 0 if result else 1


if __name__ == "__main__":
    import sys
    sys.exit(main())
