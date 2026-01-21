#!/usr/bin/env python3
"""
AI深度分析 + 导出到Obsidian
整合脚本

修改说明：不再生成每个App单独的报告，只生成综合分析报告
"""

import os
import sys
import json
import glob
from pathlib import Path

# 导入自己的模块
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from ai_deep_analyze import analyze_voice_records
from export_to_obsidian import export_comprehensive_analysis

# 配置
BY_APP_DIR = os.path.expanduser(
    "~/Library/Application Support/alma/workspaces/temp-voice-extraction/by_app"
)
OBSIDIAN_VAULT = "/Users/douba/Library/Mobile Documents/com~apple~CloudDocs/douba-OB"


def analyze_all_apps():
    """分析所有App，返回综合数据"""
    json_files = glob.glob(os.path.join(BY_APP_DIR, "*.json"))

    print(f"找到 {len(json_files)} 个应用\n")

    all_results = []
    total_records = 0

    for json_file in json_files:
        app_name = os.path.splitext(os.path.basename(json_file))[0]

        print(f"\n{'=' * 60}")
        print(f"处理应用: {app_name}")
        print(f"{'=' * 60}\n")

        # 1. 查找数据文件
        if not os.path.exists(json_file):
            print(f"❌ 找不到数据文件: {json_file}")
            continue

        # 2. AI深度分析
        try:
            analysis_result = analyze_voice_records(app_name, json_file)
            all_results.append(analysis_result)
            total_records += analysis_result['total_records']

            print(f"✓ 分析完成")
            print(f"  - 总记录: {analysis_result['total_records']}条")
            print(f"  - 重复问题: {len(analysis_result.get('repeated_issues', []))}类")
            print(f"  - 新原则: {len(analysis_result.get('new_principles', []))}条")
        except Exception as e:
            print(f"❌ 分析失败: {e}")
            import traceback
            traceback.print_exc()
            continue

    # 3. 生成综合分析
    comprehensive_data = {
        "date": Path(__file__).stem.split('_')[0] if '_' in Path(__file__).stem else "",
        "total_records": total_records,
        "total_apps": len(all_results),
        "app_analyses": all_results,
        "summary": generate_summary(all_results)
    }

    return comprehensive_data


def generate_summary(all_results):
    """生成跨App的综合摘要"""
    summary = {
        "cross_app_issues": {},  # 跨App的重复问题
        "top_patterns": [],     # TOP行为模式
        "key_insights": []      # 关键洞察
    }

    # 统计跨App重复问题
    issue_counter = {}
    for result in all_results:
        for issue in result.get("repeated_issues", []):
            category = issue["category"]
            count = issue["count"]
            issue_counter[category] = issue_counter.get(category, 0) + count

    # 按出现次数排序
    summary["cross_app_issues"] = sorted(
        issue_counter.items(),
        key=lambda x: x[1],
        reverse=True
    )

    # 提取TOP行为模式
    all_habits = []
    for result in all_results:
        all_habits.extend(result.get("user_habits", []))
    summary["top_patterns"] = all_habits[:10]

    return summary


def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(description="AI深度分析 + Obsidian导出（综合版）")
    parser.add_argument("--all", action="store_true", help="分析所有App并生成综合报告")

    args = parser.parse_args()

    if not args.all:
        print("错误：请使用 --all 参数进行综合分析")
        print("说明：已取消单个App分析，只支持综合分析")
        return 1

    # 分析所有App
    comprehensive_data = analyze_all_apps()

    # 导出综合报告到Obsidian
    print(f"\n{'=' * 60}")
    print(f"📝 生成综合分析报告")
    print(f"{'=' * 60}\n")

    try:
        note_path = export_comprehensive_analysis(comprehensive_data, OBSIDIAN_VAULT)
        print(f"✓ 已保存综合报告")
        print(f"  路径: {note_path}\n")
    except Exception as e:
        print(f"❌ 导出失败: {e}")
        import traceback
        traceback.print_exc()
        return 1

    # 显示关键发现摘要
    print(f"💡 关键发现摘要:")
    print(f"{'─' * 60}\n")

    # 跨App重复问题
    cross_issues = comprehensive_data["summary"]["cross_app_issues"]
    if cross_issues:
        print(f"\n🔄 跨App重复问题TOP5:")
        for category, count in cross_issues[:5]:
            print(f"  • {category}: 总共出现 {count} 次")

    # 总体统计
    print(f"\n📊 总体统计:")
    print(f"  - 总记录数: {comprehensive_data['total_records']}条")
    print(f"  - 涉及应用: {comprehensive_data['total_apps']}个")

    print(f"\n{'=' * 60}")
    print(f"✅ 综合分析完成")
    print(f"笔记位置: {OBSIDIAN_VAULT}/知识体系/个人工作模式/")
    print(f"{'=' * 60}\n")

    return 0


if __name__ == "__main__":
    sys.exit(main())
