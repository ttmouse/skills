#!/usr/bin/env python3
"""
心跳任务完成脚本 (Heartbeat Task Completion)

职责：
1. 调用 API 标记任务为完成
2. 发送 TG 通知
3. 归档已完成任务

使用方式：
    python3 task_completion.py --task-id abc123 --title "完成任务"

或：
    export TASK_ID="abc123"
    export TASK_TITLE="完成任务"
    python3 task_completion.py
"""

import os
import sys
from pathlib import Path

PROJECT_ROOT = Path("/Users/douba/Projects/XM")

os.chdir(PROJECT_ROOT / "telegram_ops_bot")

import argparse
import json
from datetime import datetime
import urllib.request
import urllib.error

API_BASE = "http://localhost:18920"
ARCHIVE_SCRIPT = PROJECT_ROOT / "scripts/archive_completed_todos.sh"
TG_NOTIFIER = PROJECT_ROOT / "scripts/tg_notifier.py"

sys.path.insert(0, str(PROJECT_ROOT / "scripts"))

try:
    import tg_notifier
except ImportError as e:
    print(f"[ERROR] 无法导入依赖模块: {e}")
    sys.exit(1)


def get_task_status(task_id: str) -> dict:
    """通过 API 获取任务状态"""
    try:
        req = urllib.request.Request(
            f"{API_BASE}/api/todos/{task_id}/status",
            method="GET",
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        print(f"[ERROR] 获取任务状态失败: {e}")
        return None


def validate_task(task_id: str) -> bool:
    """验证任务状态"""
    task = get_task_status(task_id)

    if not task:
        print("[ERROR] 任务不存在")
        return False

    if task.get("completed"):
        print(f"[WARN] 任务已完成")
        return False

    return True


def complete_task(task_id: str, summary: str = None) -> bool:
    """通过 API 标记任务完成"""
    print(f"\n[1/4] 标记任务完成...")
    print(f"    任务ID: {task_id}")

    # 先获取任务信息用于显示
    task = get_task_status(task_id)
    if task:
        print(f"    任务标题: {task.get('title', '未知')[:60]}")

    try:
        data = {}
        if summary:
            data["summary"] = summary

        req = urllib.request.Request(
            f"{API_BASE}/api/todos/{task_id}/complete",
            method="POST",
            headers={"Content-Type": "application/json"},
            data=json.dumps(data).encode() if data else b""
        )

        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode())
            if result.get("status") == "ok":
                print(f"    ✅ 已标记完成 (完成时间: {result.get('completed_at')})")
                return True
            else:
                print(f"    ❌ API 返回错误: {result}")
                return False
    except urllib.error.HTTPError as e:
        print(f"    ❌ API 请求失败: HTTP {e.code}")
        try:
            error_body = e.read().decode()
            print(f"       {error_body}")
        except:
            pass
        return False
    except Exception as e:
        print(f"    ❌ 请求失败: {e}")
        return False


def send_notification(task_id: str, args):
    """发送 TG 通知"""
    if args.no_notify:
        print(f"\n[2/4] TG 通知: 跳过 (--no-notify)")
        return True

    print(f"\n[2/4] 发送 TG 通知...")

    # 获取任务信息
    task = get_task_status(task_id)
    title = args.title or (task.get("title") if task else "无标题")
    description = args.description or f"任务 `{task_id}` 已完成"

    files = None
    if args.files:
        files = [f.strip() for f in args.files.split(",")]

    success = tg_notifier.send_task_completion_notification(
        task_id=task_id,
        title=title,
        description=description,
        files=files,
    )

    if success:
        print(f"    ✅ 已发送")
        return True
    else:
        print(f"    ⚠️  发送失败（将继续归档）")
        return False


def archive_completed_tasks():
    """归档已完成任务"""
    print(f"\n[3/4] 归档已完成任务...")

    if not ARCHIVE_SCRIPT.exists():
        print(f"    ❌ 归档脚本不存在: {ARCHIVE_SCRIPT}")
        return False

    import subprocess

    result = subprocess.run(
        [str(ARCHIVE_SCRIPT)],
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
    )

    if result.returncode == 0:
        print(f"    ✅ 归档完成")
        print(f"\n{result.stdout}")
        return True
    else:
        print(f"    ❌ 归档失败")
        print(f"    {result.stderr}")
        return False


def print_summary(task_id: str, task_title: str, notify_ok: bool, archive_ok: bool):
    """打印完成摘要"""
    completed_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    print(f"\n{'=' * 60}")
    print(f"✅ 任务完成")
    print(f"{'=' * 60}")
    print(f"任务ID:     {task_id}")
    print(f"任务标题:   {task_title[:60] if task_title else '未知'}")
    print(f"完成时间:   {completed_at}")
    print(f"\nTG 通知:    {'✅ 已发送' if notify_ok else '❌ 失败/跳过'}")
    print(f"归档:        {'✅ 已完成' if archive_ok else '❌ 失败'}")
    print(f"{'=' * 60}\n")


def test_notify():
    """测试 TG 通知"""
    print("[TEST] 发送测试通知...")

    success = tg_notifier.send_task_completion_notification(
        task_id="test_001",
        title="测试通知",
        description="这是一条测试消息，用于验证 TG 通知是否正常工作。",
        files=["scripts/task_completion.py"],
    )

    if success:
        print("[TEST] ✅ 测试通知发送成功")
        return 0
    else:
        print("[TEST] ❌ 测试通知发送失败")
        return 1


def test_completion():
    """测试完整完成流程（使用虚拟任务）"""
    print("[TEST] 测试完整完成流程...")
    print("[TEST] ⚠️  此测试需要手动创建测试任务")
    print("[TEST] 建议使用真实任务测试: ./execute.sh --task-id <真实任务ID>")
    return 0


def main():
    parser = argparse.ArgumentParser(description="标记任务完成并发送通知")

    # 正常使用参数
    parser.add_argument("--task-id", type=str, help="任务 ID")
    parser.add_argument("--title", type=str, help="任务标题（用于 TG 通知）")
    parser.add_argument("--description", type=str, help="完成内容描述")
    parser.add_argument("--files", type=str, help="影响文件列表（逗号分隔）")
    parser.add_argument("--no-notify", action="store_true", help="跳过 TG 通知")

    # 测试参数
    parser.add_argument("--test-notify", action="store_true", help="测试 TG 通知")
    parser.add_argument(
        "--test-completion", action="store_true", help="测试完整完成流程"
    )

    args = parser.parse_args()

    if args.test_notify:
        return test_notify()

    if args.test_completion:
        return test_completion()

    # 从环境变量读取（如果命令行未提供）
    task_id = args.task_id or sys.environ.get("TASK_ID")

    if not task_id:
        parser.print_help()
        print("\n[ERROR] 必须提供 task-id")
        return 1

    title = args.title or os.environ.get("TASK_TITLE")
    description = args.description or os.environ.get("TASK_DESCRIPTION")
    files = args.files or os.environ.get("TASK_FILES")

    # 验证任务
    if not validate_task(task_id):
        return 1

    # 标记完成
    if not complete_task(task_id, summary=description):
        return 1

    # 获取任务标题用于摘要
    task = get_task_status(task_id)
    task_title = task.get("title") if task else title

    # 发送通知
    notify_ok = send_notification(task_id, args)

    # 归档
    archive_ok = archive_completed_tasks()

    # 打印摘要
    print_summary(task_id, task_title, notify_ok, archive_ok)

    return 0 if (notify_ok or args.no_notify) and archive_ok else 1


if __name__ == "__main__":
    sys.exit(main())
