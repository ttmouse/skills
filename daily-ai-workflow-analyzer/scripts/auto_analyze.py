#!/usr/bin/env python3
"""
Auto Analysis - Automated voice record analysis with auto-start server

Usage: python3 auto_analyze.py --app <name> | --all
"""

import subprocess
import time
import os
import sys
from pathlib import Path

# Configuration
SKILL_DIR = Path("/Users/douba/.claude/skills/daily-ai-workflow-analyzer")
DATA_DIR = Path("~/Library/Application Support/alma/workspaces/temp-voice-extraction").expanduser()
REPORT_DIR = DATA_DIR / "analysis_reports"
SERVER_SCRIPT = SKILL_DIR / "scripts" / "analysis_server.py"
PID_FILE = DATA_DIR / "server.pid"
PORT = 8080


def check_server():
    """Check if Flask server is running"""
    try:
        result = subprocess.run(
            ['lsof', '-i', f':{PORT}'],
            capture_output=True,
            text=True
        )
        return result.returncode == 0
    except:
        return False


def start_server():
    """Start Flask server in background"""
    if check_server():
        print("✓ Flask服务器已在运行")
        return True

    print("🚀 启动Flask服务器...")

    # Start server in background
    process = subprocess.Popen(
        ['python3', str(SERVER_SCRIPT)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True
    )

    # Save PID
    with open(PID_FILE, 'w') as f:
        f.write(str(process.pid))

    # Wait for server to start
    max_wait = 10
    for i in range(max_wait):
        time.sleep(1)
        if check_server():
            print(f"✓ Flask服务器已启动 (PID: {process.pid})")
            return True

    print("❌ Flask服务器启动失败")
    return False


def run_analysis(app_name=None):
    """Run analysis workflow"""
    cmd = ['python3', str(SKILL_DIR / 'scripts' / 'analyze_voice_workflow.py')]

    if app_name:
        cmd.extend(['--app', app_name])
    else:
        cmd.append('--all')

    print(f"🔍 开始分析...")

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode == 0:
        print("✓ 分析完成")
        print(result.stdout)
        return True
    else:
        print("❌ 分析失败")
        print(result.stderr)
        return False


def get_report_files():
    """Get list of generated report files"""
    if not REPORT_DIR.exists():
        return []

    files = list(REPORT_DIR.glob("*_Analysis_*.md"))
    return sorted(files, key=lambda f: f.stat().st_mtime, reverse=True)


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Automated voice record analysis')
    parser.add_argument('--app', type=str, help='Analyze specific app')
    parser.add_argument('--all', action='store_true', help='Analyze all apps')
    parser.add_argument('--skip-analysis', action='store_true', help='Skip analysis, just start server')

    args = parser.parse_args()

    print("=" * 60)
    print("🤖 自动化语音记录分析")
    print("=" * 60)

    # Step 1: Start server
    print("\n步骤1: 启动服务")
    if not start_server():
        print("无法启动Flask服务器，退出")
        return 1

    # Step 2: Run analysis
    if not args.skip_analysis:
        print("\n步骤2: 执行分析")
        if not run_analysis(args.app):
            print("分析失败，退出")
            return 1

    # Step 3: Output report paths
    print("\n步骤3: 报告文件")
    report_files = get_report_files()

    if report_files:
        print(f"\n✓ 生成了 {len(report_files)} 份报告")
        print("\n报告文件：")
        for f in report_files:
            print(f"  - {f.name}")
        print(f"\n报告目录: {REPORT_DIR}")
    else:
        print("\n⚠️  未找到报告文件")

    print("\n" + "=" * 60)
    print("✅ 完成")
    print("=" * 60)

    # Return report files for AI to read
    if report_files:
        print("\n[报告文件路径]")
        for f in report_files[:3]:  # Return top 3 reports
            print(str(f))

    return 0


if __name__ == "__main__":
    sys.exit(main())
