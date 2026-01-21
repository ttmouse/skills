#!/usr/bin/env python3
"""
Generate Analysis Report from Grouped Voice Records

This script analyzes voice records by app and generates structured reports.
"""

import json
import os
from datetime import datetime, timedelta
from pathlib import Path
from collections import Counter, defaultdict

# Configuration
INPUT_DIR = os.path.expanduser("~/Library/Application Support/alma/workspaces/temp-voice-extraction/by_app")
OUTPUT_DIR = os.getcwd()  # 输出到当前工作目录
TEMPLATE_PATH = "/Users/douba/.claude/skills/daily-ai-workflow-analyzer/templates/analysis_report_template.md"
FRAMEWORK_PATH = "/Users/douba/.claude/skills/daily-ai-workflow-analyzer/templates/analysis_framework.json"


def load_framework():
    """Load analysis framework from JSON."""
    with open(FRAMEWORK_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)


def load_template():
    """Load report template."""
    with open(TEMPLATE_PATH, 'r', encoding='utf-8') as f:
        return f.read()


def load_records(app_name):
    """Load records for a specific app."""
    safe_name = app_name.replace(' ', '_').replace('/', '_')
    filepath = os.path.join(INPUT_DIR, f"{safe_name}.json")

    if not os.path.exists(filepath):
        return []

    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def analyze_records(records, framework):
    """Analyze records based on framework."""
    if not records:
        return {}

    analysis = {}

    # Basic stats
    analysis['total_records'] = len(records)
    analysis['time_range'] = get_time_range(records)
    analysis['peak_hour'] = get_peak_hour(records)
    analysis['peak_ratio'] = get_peak_ratio(records)
    analysis['avg_duration'] = get_avg_duration(records)

    # Pattern recognition
    analysis['scenes'] = recognize_scenes(records, framework['scene_recognition'])
    analysis['workflow_stages'] = recognize_workflow_stages(records, framework['workflow_stages'])
    analysis['collaboration_patterns'] = recognize_collaboration_patterns(records, framework['collaboration_patterns'])

    # Sample records
    analysis['sample_records'] = get_sample_records(records, 10)

    return analysis


def get_time_range(records):
    """Get time range in hours."""
    if not records:
        return "N/A"

    times = [r.get('time', '') for r in records if r.get('time')]
    if not times:
        return "N/A"

    hours = [int(t[:2]) for t in times if t[:2].isdigit()]
    if not hours:
        return "N/A"

    return f"{min(hours)}:00 - {max(hours)}:00"


def get_peak_hour(records):
    """Get peak hour."""
    hour_counter = Counter()
    for r in records:
        time = r.get('time', '')
        hour = time[:2] if time else 'unknown'
        hour_counter[hour] += 1

    if not hour_counter:
        return "N/A"

    return hour_counter.most_common(1)[0][0]


def get_peak_ratio(records):
    """Get peak hour ratio."""
    hour_counter = Counter()
    for r in records:
        time = r.get('time', '')
        hour = time[:2] if time else 'unknown'
        hour_counter[hour] += 1

    if not hour_counter or len(records) == 0:
        return 0

    peak_count = hour_counter.most_common(1)[0][1]
    return round((peak_count / len(records)) * 100, 1)


def get_avg_duration(records):
    """Get average duration."""
    durations = [r.get('duration', 0) for r in records if r.get('duration')]
    if not durations:
        return "N/A"

    return round(sum(durations) / len(durations), 2)


def recognize_scenes(records, scene_rules):
    """Recognize scenes based on keywords."""
    scene_counter = Counter()
    scene_examples = defaultdict(list)

    for r in records:
        text = r.get('refined_text', '')
        matched = False
        for scene, keywords in scene_rules.items():
            for keyword in keywords:
                if keyword in text:
                    scene_counter[scene] += 1
                    if len(scene_examples[scene]) < 2:
                        scene_examples[scene].append(text)
                    matched = True
                    break
            if matched:
                break

    return {
        'counts': dict(scene_counter),
        'examples': dict(scene_examples)
    }


def recognize_workflow_stages(records, stage_rules):
    """Recognize workflow stages based on keywords."""
    stage_counter = Counter()

    for r in records:
        text = r.get('refined_text', '')
        matched = False
        for stage, keywords in stage_rules.items():
            for keyword in keywords:
                if keyword in text:
                    stage_counter[stage] += 1
                    matched = True
                    break
            if matched:
                break

    return dict(stage_counter)


def recognize_collaboration_patterns(records, pattern_rules):
    """Recognize collaboration patterns based on keywords."""
    pattern_counter = Counter()

    for r in records:
        text = r.get('refined_text', '')
        matched = False
        for pattern, keywords in pattern_rules.items():
            for keyword in keywords:
                if keyword in text:
                    pattern_counter[pattern] += 1
                    matched = True
                    break
            if matched:
                break

    return dict(pattern_counter)


def get_sample_records(records, count):
    """Get sample records."""
    total = len(records)
    step = max(1, total // count)
    samples = records[::step][:count]
    return samples


def generate_report_content(app_name, analysis, template):
    """Generate report content."""
    if not analysis:
        return f"# {app_name}\n\n无足够记录进行分析。"

    # Fill in the template
    content = template.replace('{APP_NAME}', app_name)
    content = content.replace('{GENERATED_TIME}', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    content = content.replace('{TIME_RANGE}', analysis.get('time_range', 'N/A'))
    content = content.replace('{TOTAL_RECORDS}', str(analysis.get('total_records', 0)))
    content = content.replace('{TIME_SPAN}', str(analysis.get('total_records', 0)))  # TODO: calculate actual hours
    content = content.replace('{PEAK_HOUR}', analysis.get('peak_hour', 'N/A'))
    content = content.replace('{PEAK_RATIO}', str(analysis.get('peak_ratio', 0)))
    content = content.replace('{AVG_DURATION}', str(analysis.get('avg_duration', 'N/A')))

    # Fill high frequency scenarios
    scenes = analysis.get('scenes', {}).get('counts', {})
    scenarios_table = ""
    for scene, count in sorted(scenes.items(), key=lambda x: x[1], reverse=True):
        ratio = round((count / analysis['total_records']) * 100, 1)
        examples = analysis.get('scenes', {}).get('examples', {}).get(scene, [])
        example = examples[0][:50] + "..." if examples else ""
        scenarios_table += f"| {scene} | {count} | {ratio}% | {example} |\n"
    content = content.replace('{HIGH_FREQUENCY_SCENARIOS}', scenarios_table)

    # Fill workflow stages
    stages = analysis.get('workflow_stages', {})
    workflow_table = ""
    for stage, count in sorted(stages.items(), key=lambda x: x[1], reverse=True):
        ratio = round((count / analysis['total_records']) * 100, 1)
        workflow_table += f"| {stage} | {count} | {ratio}% | |\n"
    content = content.replace('{WORKFLOW_STAGES}', workflow_table)

    # Fill collaboration patterns
    patterns = analysis.get('collaboration_patterns', {})
    collab_table = ""
    for pattern, count in sorted(patterns.items(), key=lambda x: x[1], reverse=True):
        collab_table += f"| {pattern} | {count} | |\n"
    content = content.replace('{COLLABORATION_PATTERNS}', collab_table)

    # Fill sample records
    sample_records = analysis.get('sample_records', [])
    samples_text = ""
    for r in sample_records:
        time = r.get('time', '')
        text = r.get('refined_text', '')
        samples_text += f"- **{time}**: {text}\n"
    content = content.replace('{SAMPLE_RECORDS}', samples_text)

    # Fill placeholders (to be filled by AI)
    content = content.replace('{CORE_PATTERN}', "待分析：主要工作模式")
    content = content.replace('{KEY_PROBLEMS}', "待分析：关键问题")
    content = content.replace('{VALUE_POINTS}', "待分析：可沉淀价值点")
    content = content.replace('{ACTION_SUGGESTION}', "待分析：行动建议")
    content = content.replace('{PROBLEMS_ANALYSIS}', "待AI分析：问题深度分析")
    content = content.replace('{PRINCIPLE_1}', "待提取")
    content = content.replace('{PRINCIPLE_1_SCENE}', "待确定")
    content = content.replace('{SOP_1}', "待提取")
    content = content.replace('{SOP_1_SCENE}', "待确定")
    content = content.replace('{PROMPT_1}', "待提取")
    content = content.replace('{PROMPT_1_SCENE}', "待确定")
    content = content.replace('{PATTERN_SUMMARY}', "待AI分析：模式总结")
    content = content.replace('{IMMEDIATE_ACTION_1}', "待确定")
    content = content.replace('{IMMEDIATE_ACTION_2}', "待确定")
    content = content.replace('{SHORT_TERM_ACTION_1}', "待确定")
    content = content.replace('{SHORT_TERM_ACTION_2}', "待确定")
    content = content.replace('{LONG_TERM_ACTION_1}', "待确定")
    content = content.replace('{ASSUMPTIONS_TO_VALIDATE}', "待确定")

    return content


def save_report(app_name, content, output_dir):
    """Save analysis report."""
    os.makedirs(output_dir, exist_ok=True)

    safe_name = app_name.replace(' ', '_').replace('/', '_')
    date_str = datetime.now().strftime('%Y-%m-%d')
    filename = f"{safe_name}_Analysis_{date_str}.md"
    filepath = os.path.join(output_dir, filename)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    return filepath


def analyze_app(app_name, framework, template):
    """Analyze a single app."""
    print(f"\n分析 {app_name}...")

    records = load_records(app_name)

    if not records:
        print(f"  跳过：无记录")
        return None

    print(f"  记录数: {len(records)}")

    analysis = analyze_records(records, framework)
    content = generate_report_content(app_name, analysis, template)
    filepath = save_report(app_name, content, OUTPUT_DIR)

    print(f"  ✓ 报告已生成: {filepath}")

    return filepath


def main():
    """Main execution function."""
    import argparse

    parser = argparse.ArgumentParser(description='Generate analysis reports from voice records')
    parser.add_argument('--app', type=str, help='Analyze specific app')
    parser.add_argument('--all', action='store_true', help='Analyze all apps')

    args = parser.parse_args()

    if not args.app and not args.all:
        print("错误：请指定 --app <名称> 或 --all")
        return

    print("加载分析框架...")
    framework = load_framework()

    print("加载报告模板...")
    template = load_template()

    print(f"输出目录: {OUTPUT_DIR}")

    if args.app:
        analyze_app(args.app, framework, template)
    elif args.all:
        # Get all app files
        app_files = [f for f in os.listdir(INPUT_DIR) if f.endswith('.json')]
        app_names = [f.replace('.json', '') for f in app_files]

        print(f"\n找到 {len(app_names)} 个应用")
        generated_reports = []

        for app_name in sorted(app_names):
            result = analyze_app(app_name, framework, template)
            if result:
                generated_reports.append(result)

        print(f"\n✓ 完成！生成 {len(generated_reports)} 份分析报告")
        print(f"  目录: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
