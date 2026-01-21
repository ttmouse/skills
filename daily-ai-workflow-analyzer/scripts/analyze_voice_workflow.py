#!/usr/bin/env python3
"""
Main Workflow: Analyze Voice Records and Generate Reports

This is the main entry point for voice record analysis workflow.

流程：
1. 提取语音记录（从 Typeless.app 数据库）
2. 按场景分类（编程/聊天/浏览/文档等）
3. 生成 AI 友好格式（Markdown + JSON）
4. [可选] 程序化预分析
5. [可选] 导出到 Obsidian
"""

import subprocess
import sys
import os
from datetime import datetime

# Configuration
SKILL_DIR = "/Users/douba/.claude/skills/daily-ai-workflow-analyzer"
OUTPUT_DIR = os.path.expanduser("~/Library/Application Support/alma/workspaces/temp-voice-extraction")


def run_step(name, script, args=None):
    """Run a workflow step."""
    print(f"\n{'='*50}")
    print(f"步骤: {name}")
    print(f"{'='*50}")

    cmd = ["python3", script]
    if args:
        cmd.extend(args)

    result = subprocess.run(cmd, capture_output=True, text=True)

    print(result.stdout)
    if result.stderr:
        print("错误:", result.stderr)

    if result.returncode != 0:
        print(f"❌ {name} 失败")
        return False

    print(f"✓ {name} 完成")
    return True


def main():
    """Main workflow execution."""
    import argparse

    parser = argparse.ArgumentParser(description='Analyze voice records workflow')
    parser.add_argument('--days', type=int, default=1, help='Number of recent days to analyze')
    parser.add_argument('--app', type=str, help='Analyze specific app')
    parser.add_argument('--scene', type=str, help='Analyze specific scene (编程/聊天/浏览/文档)')
    parser.add_argument('--all', action='store_true', help='Analyze all apps/scenes')
    parser.add_argument('--skip-extract', action='store_true', help='Skip extraction step')
    parser.add_argument('--skip-group', action='store_true', help='Skip grouping step')
    parser.add_argument('--for-ai', action='store_true', help='Only generate AI-friendly format (skip program analysis)')
    parser.add_argument('--output', type=str, default=OUTPUT_DIR, help='Output directory')

    args = parser.parse_args()

    start_time = datetime.now()
    print(f"🚀 开始语音记录分析流程")
    print(f"时间: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"范围: 最近 {args.days} 天")

    # Step 1: Extract voice records
    if not args.skip_extract:
        extract_script = os.path.join(SKILL_DIR, "scripts/extract_voice_records.py")
        extract_args = ["--days", str(args.days)]
        
        # 设置输出文件路径
        output_file = os.path.join(args.output, "analysis_input.json")
        extract_args.extend(["--output", output_file])
        
        if not run_step("提取语音记录", extract_script, extract_args):
            return 1

    # Step 2: Group by scene (NEW - AI friendly format)
    if not args.skip_group:
        group_scene_script = os.path.join(SKILL_DIR, "scripts/group_by_scene.py")
        group_args = ["--output", os.path.join(args.output, "by_scene")]
        
        if not run_step("按场景分类（AI友好格式）", group_scene_script, group_args):
            return 1

    # 如果只需要 AI 友好格式，到这里就结束
    if args.for_ai:
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        print(f"\n{'='*50}")
        print(f"✅ AI 友好格式生成完成")
        print(f"耗时: {duration:.1f} 秒")
        print(f"")
        print(f"📄 输出文件:")
        print(f"   Markdown: {args.output}/by_scene/voice_records_for_ai.md")
        print(f"   JSON: {args.output}/by_scene/voice_records_structured.json")
        print(f"   分场景: {args.output}/by_scene/scenes/")
        print(f"{'='*50}")
        return 0

    # Step 3: Group by app (legacy, for backward compatibility)
    group_script = os.path.join(SKILL_DIR, "scripts/group_by_app.py")
    if not run_step("按APP分组", group_script):
        return 1

    # Step 4: AI深度分析 + 导出到Obsidian
    analyze_and_export_script = os.path.join(SKILL_DIR, "scripts/analyze_and_export.py")
    if args.app:
        if not run_step(f"AI深度分析 {args.app}", analyze_and_export_script, ["--app", args.app]):
            return 1
    elif args.scene:
        # TODO: 支持按场景分析
        print(f"按场景分析功能开发中，请使用 --app 或 --all")
        return 1
    elif args.all:
        if not run_step("AI深度分析所有APP", analyze_and_export_script, ["--all"]):
            return 1
    else:
        print("错误：请指定 --app <名称>、--scene <场景> 或 --all")
        return 1

    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()

    print(f"\n{'='*50}")
    print(f"✅ 工作流完成")
    print(f"耗时: {duration:.1f} 秒")
    print(f"")
    print(f"📄 输出文件:")
    print(f"   AI友好格式: {args.output}/by_scene/voice_records_for_ai.md")
    print(f"   分析报告: {args.output}/analysis_reports/")
    print(f"{'='*50}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
