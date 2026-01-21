#!/usr/bin/env python3
"""
Analyze Voice Records and Extract Valuable Knowledge

This script analyzes voice records from Typeless and extracts:
1. High-frequency scenarios (by app and content patterns)
2. Repetitive content patterns
3. Actionable knowledge principles
4. Optimizable prompts
5. SOP candidates
"""

import json
import os
import sys
import re
from datetime import datetime
from collections import defaultdict, Counter
from pathlib import Path

# Configuration
OUTPUT_DIR = os.path.expanduser("~/Library/Application Support/alma/workspaces/temp-voice-extraction")


def load_records(json_path):
    """Load voice records from JSON file."""
    with open(json_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def group_by_app(records):
    """Group records by focused_app_name."""
    grouped = defaultdict(list)
    for r in records:
        app = r.get('focused_app_name', 'Unknown')
        grouped[app].append(r)
    return grouped


def extract_patterns(records):
    """Extract content patterns from records."""
    patterns = {
        'prompts': [],           # 可优化的提示词
        'sop_candidates': [],    # SOP候选项
        'principles': [],        # 原则性知识点
        'tasks': [],            # 任务/行动项
        'questions': [],         # 问题
        'feedback': [],         # 反馈/修改意见
        'decisions': [],        # 决策
    }

    prompt_indicators = ['提示词', 'prompt', '你能否', '让', '希望']
    sop_indicators = ['流程', '步骤', '操作', 'sop', 'SOP', '先', '然后', '最后']
    principle_indicators = ['原则', '规范', '标准', '应该', '必须', '约定']
    task_indicators = ['完成', '实现', '添加', '修复', '优化', '更新', '创建']
    question_indicators = ['？', '?', '是否', '有没有', '如何', '怎么']
    feedback_indicators = ['改', '调整', '不对', '错误', '需要', '建议']
    decision_indicators = ['决定', '选择', '采用', '使用', '确定为']

    for record in records:
        text = record.get('refined_text', '') or record.get('edited_text', '')
        if not text:
            continue

        # 检测模式
        for pattern_list, category in [
            (prompt_indicators, 'prompts'),
            (sop_indicators, 'sop_candidates'),
            (principle_indicators, 'principles'),
            (task_indicators, 'tasks'),
            (question_indicators, 'questions'),
            (feedback_indicators, 'feedback'),
            (decision_indicators, 'decisions'),
        ]:
            if any(indicator in text for indicator in pattern_list):
                patterns[category].append({
                    'text': text,
                    'time': record.get('time', ''),
                    'app': record.get('focused_app_name', 'Unknown')
                })

    return patterns


def find_repetitive_content(records, threshold=3):
    """Find frequently repeated content patterns."""
    text_counter = Counter()
    text_map = {}

    for r in records:
        text = r.get('refined_text', '') or r.get('edited_text', '')
        if text and len(text) > 5:  # 过滤太短的内容
            # 简单的去重：首50字符作为key
            key = text[:50] if len(text) < 50 else text[:50]
            text_counter[key] += 1
            if key not in text_map:
                text_map[key] = []

            text_map[key].append({
                'full_text': text,
                'time': r.get('time', ''),
                'app': r.get('focused_app_name', 'Unknown')
            })

    # 找出重复的内容
    repetitive = {}
    for key, count in text_counter.items():
        if count >= threshold:
            repetitive[key] = {
                'count': count,
                'examples': text_map[key][:3],  # 只保留前3个例子
                'text': text_map[key][0]['full_text']
            }

    return repetitive


def identify_high_frequency_scenarios(records):
    """Identify high-frequency usage scenarios."""
    # 按时间窗口分析
    time_windows = defaultdict(list)
    for r in records:
        hour = r.get('time', '')[:2] if r.get('time') else '00'
        time_windows[hour].append(r)

    # 按内容关键词分析场景
    scenario_keywords = {
        'AI编程': ['代码', '编程', '函数', 'bug', 'debug', '修复', '实现'],
        '产品设计': ['设计', '交互', 'UI', '体验', '界面', '流程'],
        '任务管理': ['任务', 'todo', '完成', '进度', '状态'],
        '文档写作': ['文档', '写', '编辑', '更新', '内容'],
        '沟通协作': ['告诉', '确认', '同步', '沟通', '讨论'],
    }

    scenarios = defaultdict(int)
    for r in records:
        text = r.get('refined_text', '') or r.get('edited_text', '')
        if text:
            for scenario, keywords in scenario_keywords.items():
                if any(kw in text for kw in keywords):
                    scenarios[scenario] += 1

    return {
        'time_distribution': {hour: len(recs) for hour, recs in sorted(time_windows.items())},
        'content_scenarios': dict(scenarios)
    }


def generate_analysis_report(records_by_app):
    """Generate comprehensive analysis report."""
    report = {
        'summary': {},
        'by_app': {},
        'patterns': {},
        'repetitive': {},
        'insights': {}
    }

    all_records = []
    for app, records in records_by_app.items():
        all_records.extend(records)

    # 摘要统计
    report['summary'] = {
        'total_records': len(all_records),
        'total_apps': len(records_by_app),
        'date_range': extract_date_range(all_records),
        'top_apps': sorted([(app, len(recs)) for app, recs in records_by_app.items()], key=lambda x: x[1], reverse=True)
    }

    # 按APP分析
    for app, records in records_by_app.items():
        app_patterns = extract_patterns(records)
        app_repetitive = find_repetitive_content(records)
        app_scenarios = identify_high_frequency_scenarios(records)

        report['by_app'][app] = {
            'record_count': len(records),
            'patterns': {k: len(v) for k, v in app_patterns.items()},
            'repetitive_count': len(app_repetitive),
            'top_scenarios': sorted(app_scenarios['content_scenarios'].items(), key=lambda x: x[1], reverse=True)[:5]
        }

    # 全局模式分析
    global_patterns = extract_patterns(all_records)
    report['patterns'] = {
        k: {'count': len(v), 'examples': v[:5]} for k, v in global_patterns.items()
    }

    # 重复内容
    global_repetitive = find_repetitive_content(all_records)
    report['repetitive'] = global_repetitive

    # 高频场景
    scenarios = identify_high_frequency_scenarios(all_records)
    report['high_frequency_scenarios'] = scenarios

    # 生成洞察
    report['insights'] = generate_insights(report)

    return report


def extract_date_range(records):
    """Extract date range from records."""
    if not records:
        return {}

    dates = sorted([r.get('date', '') for r in records if r.get('date')])
    return {
        'start': dates[0] if dates else '',
        'end': dates[-1] if dates else ''
    }


def generate_insights(report):
    """Generate actionable insights from analysis."""
    insights = {
        'sop_candidates': [],
        'prompt_optimizations': [],
        'principles': [],
        'workflow_improvements': []
    }

    # SOP候选项：高频任务相关内容
    tasks = report['patterns'].get('tasks', {}).get('examples', [])
    for task in tasks[:5]:
        insights['sop_candidates'].append({
            'content': task['text'][:100],
            'app': task['app'],
            'type': 'task_flow'
        })

    # Prompt优化：包含"提示"相关的内容
    prompts = report['patterns'].get('prompts', {}).get('examples', [])
    for prompt in prompts[:5]:
        insights['prompt_optimizations'].append({
            'content': prompt['text'][:100],
            'app': prompt['app']
        })

    # 原则性知识点
    principles = report['patterns'].get('principles', {}).get('examples', [])
    for principle in principles[:5]:
        insights['principles'].append({
            'content': principle['text'][:100],
            'app': principle['app']
        })

    # 工作流改进：高频场景 + 重复内容
    if report['repetitive']:
        for key, data in list(report['repetitive'].items())[:3]:
            insights['workflow_improvements'].append({
                'content': data['text'][:100],
                'frequency': data['count'],
                'suggestion': '考虑自动化或模板化'
            })

    return insights


def save_markdown_report(report, output_path):
    """Save analysis report as Markdown."""
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("# 语音记录分析报告\n\n")
        f.write(f"**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")

        # 摘要
        f.write("## 📊 摘要\n\n")
        f.write(f"- **总记录数**: {report['summary']['total_records']}\n")
        f.write(f"- **涉及应用**: {report['summary']['total_apps']} 个\n")
        f.write(f"- **日期范围**: {report['summary']['date_range'].get('start', '')} 至 {report['summary']['date_range'].get('end', '')}\n\n")

        f.write("### 按应用统计\n\n")
        for app, count in report['summary']['top_apps']:
            f.write(f"- **{app}**: {count} 条\n")

        # 高频场景
        f.write("\n## 🎯 高频场景分析\n\n")
        scenarios = report.get('high_frequency_scenarios', {}).get('content_scenarios', {})
        for scenario, count in sorted(scenarios.items(), key=lambda x: x[1], reverse=True):
            if count > 0:
                f.write(f"- **{scenario}**: {count} 条\n")

        # 按APP详细分析
        f.write("\n## 📱 按应用详细分析\n\n")
        for app, data in report['by_app'].items():
            f.write(f"### {app}\n\n")
            f.write(f"**记录数**: {data['record_count']}\n\n")

            if data.get('top_scenarios'):
                f.write("**主要场景**:\n")
                for scenario, count in data['top_scenarios']:
                    f.write(f"- {scenario}: {count}\n")
                f.write("\n")

            # 内容模式
            patterns = data.get('patterns', {})
            if patterns:
                f.write("**内容类型**:\n")
                for ptype, count in patterns.items():
                    if count > 0:
                        f.write(f"- {ptype}: {count}\n")
                f.write("\n")

        # 可优化内容
        f.write("\n## 💡 可优化的内容\n\n")

        # SOP候选项
        sop_candidates = report.get('insights', {}).get('sop_candidates', [])
        if sop_candidates:
            f.write("### 📋 SOP 候选项\n\n")
            for item in sop_candidates:
                f.write(f"- {item['content']} (来源: {item['app']})\n")
            f.write("\n")

        # Prompt优化
        prompts = report.get('insights', {}).get('prompt_optimizations', [])
        if prompts:
            f.write("### 🎯 Prompt 优化建议\n\n")
            for item in prompts:
                f.write(f"- {item['content']} (来源: {item['app']})\n")
            f.write("\n")

        # 原则性知识点
        principles = report.get('insights', {}).get('principles', [])
        if principles:
            f.write("### 📖 原则性知识点\n\n")
            for item in principles:
                f.write(f"- {item['content']} (来源: {item['app']})\n")
            f.write("\n")

        # 工作流改进
        workflow_improvements = report.get('insights', {}).get('workflow_improvements', [])
        if workflow_improvements:
            f.write("### 🔄 工作流改进建议\n\n")
            for item in workflow_improvements:
                f.write(f"- {item['content']} (出现 {item['frequency']} 次) - {item['suggestion']}\n")
            f.write("\n")

        # 重复内容
        repetitive = report.get('repetitive', {})
        if repetitive:
            f.write("### 🔁 高频重复内容\n\n")
            for key, data in list(repetitive.items())[:5]:
                f.write(f"**重复 {data['count']} 次**:\n")
                f.write(f"- {data['text'][:150]}...\n\n")

        f.write("\n---\n\n")
        f.write("*此报告由 DailyAIWorkflowAnalyzer 自动生成*\n")

    print(f"✓ Markdown 报告已保存到 {output_path}")


def save_json_report(report, output_path):
    """Save analysis report as JSON."""
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(f"✓ JSON 报告已保存到 {output_path}")


def main():
    """Main execution function."""
    import argparse

    parser = argparse.ArgumentParser(description='Analyze voice records and extract valuable knowledge')
    parser.add_argument('--input', type=str, required=True, help='Path to voice records JSON file')
    parser.add_argument('--output-dir', type=str, default=None, help='Output directory')

    args = parser.parse_args()

    print(f"🔍 分析语音记录...")
    print(f"输入文件: {args.input}")

    # Load records
    records = load_records(args.input)
    print(f"✓ 加载了 {len(records)} 条记录")

    # Group by app
    records_by_app = group_by_app(records)
    print(f"✓ 按应用分组: {len(records_by_app)} 个应用")

    # Generate analysis
    print(f"📊 生成分析报告...")
    report = generate_analysis_report(records_by_app)

    # Save reports
    if args.output_dir:
        output_dir = args.output_dir
    else:
        output_dir = OUTPUT_DIR
        os.makedirs(output_dir, exist_ok=True)

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    json_path = os.path.join(output_dir, f'analysis_report_{timestamp}.json')
    md_path = os.path.join(output_dir, f'analysis_report_{timestamp}.md')

    save_json_report(report, json_path)
    save_markdown_report(report, md_path)

    print(f"\n✅ 分析完成！")
    print(f"   - JSON: {json_path}")
    print(f"   - Markdown: {md_path}")


if __name__ == "__main__":
    main()
