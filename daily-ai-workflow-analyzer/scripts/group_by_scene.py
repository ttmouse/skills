#!/usr/bin/env python3
"""
按场景分类语音记录，生成 AI 友好的分析格式

第一层：按 App 类型分类到不同场景
输出：JSON + Markdown（供 AI 分析）
"""

import json
import os
from datetime import datetime
from pathlib import Path
from collections import defaultdict

# Configuration
INPUT_FILE = os.path.expanduser(
    "~/Library/Application Support/alma/workspaces/temp-voice-extraction/analysis_input.json"
)
OUTPUT_DIR = os.path.expanduser(
    "~/Library/Application Support/alma/workspaces/temp-voice-extraction/by_scene"
)

# 场景分类映射
SCENE_MAP = {
    "编程": [
        "Alma",
        "Antigravity",
        "Ghostty",
        "VS Code",
        "Visual Studio Code",
        "Xcode",
        "Terminal",
        "iTerm2",
        "CodeBuddy",
        "CodeBuddy CN",
        "Conductor",
        "Dia",
        "Cursor",
        "Windsurf",
    ],
    "聊天": [
        "微信",
        "WeChat",
        "钉钉",
        "DingTalk",
        "飞书",
        "Lark",
        "Telegram",
        "WhatsApp",
        "Slack",
        "Discord",
        "Messages",
        "QQ",
    ],
    "浏览": [
        "Google Chrome",
        "Chrome",
        "Safari",
        "Arc",
        "Firefox",
        "Edge",
        "Brave",
    ],
    "文档": [
        "Obsidian",
        "Notion",
        "Typora",
        "Bear",
        "Ulysses",
        "Pages",
        "Word",
        "Google Docs",
        "Craft",
        "Logseq",
    ],
    "设计": [
        "Figma",
        "Sketch",
        "Adobe XD",
        "Photoshop",
        "Illustrator",
        "Canva",
    ],
    "效率": [
        "Finder",
        "Things",
        "Todoist",
        "Reminders",
        "Calendar",
        "Notes",
        "Raycast",
        "Alfred",
    ],
}


def get_scene_for_app(app_name):
    """根据 App 名称返回场景分类"""
    if not app_name:
        return "其他"
    
    for scene, apps in SCENE_MAP.items():
        if app_name in apps:
            return scene
    
    # 模糊匹配
    app_lower = app_name.lower()
    for scene, apps in SCENE_MAP.items():
        for app in apps:
            if app.lower() in app_lower or app_lower in app.lower():
                return scene
    
    return "其他"


def load_records(json_path):
    """加载语音记录"""
    with open(json_path, "r", encoding="utf-8") as f:
        return json.load(f)


def group_by_scene(records):
    """
    按场景分组记录
    
    返回结构：
    {
        "编程": {
            "Alma": [records...],
            "Antigravity": [records...]
        },
        "聊天": {
            "微信": [records...]
        }
    }
    """
    grouped = defaultdict(lambda: defaultdict(list))
    
    for record in records:
        app = record.get("focused_app_name", "Unknown")
        scene = get_scene_for_app(app)
        grouped[scene][app].append(record)
    
    return grouped


def generate_markdown_for_ai(grouped_data, date_range=""):
    """
    生成 AI 友好的 Markdown 格式
    
    目标：让 AI 一眼看懂边界和上下文
    """
    lines = []
    
    # 标题
    lines.append("# 语音记录分析数据")
    lines.append("")
    if date_range:
        lines.append(f"> 数据范围：{date_range}")
        lines.append("")
    
    # 统计概览
    total_records = sum(
        len(records)
        for apps in grouped_data.values()
        for records in apps.values()
    )
    lines.append("## 概览")
    lines.append("")
    lines.append(f"- **总记录数**：{total_records} 条")
    lines.append(f"- **场景数**：{len(grouped_data)} 个")
    lines.append("")
    
    # 场景统计表
    lines.append("| 场景 | App 数量 | 记录数 |")
    lines.append("|------|----------|--------|")
    for scene in sorted(grouped_data.keys(), key=lambda s: sum(len(r) for r in grouped_data[s].values()), reverse=True):
        apps = grouped_data[scene]
        record_count = sum(len(r) for r in apps.values())
        lines.append(f"| {scene} | {len(apps)} | {record_count} |")
    lines.append("")
    lines.append("---")
    lines.append("")
    
    # 按场景输出详细内容
    scene_order = ["编程", "聊天", "浏览", "文档", "设计", "效率", "其他"]
    
    for scene in scene_order:
        if scene not in grouped_data:
            continue
        
        apps = grouped_data[scene]
        scene_total = sum(len(r) for r in apps.values())
        
        lines.append(f"## {scene}场景（{scene_total} 条）")
        lines.append("")
        
        # 按记录数排序 App
        sorted_apps = sorted(apps.items(), key=lambda x: len(x[1]), reverse=True)
        
        for app_name, records in sorted_apps:
            lines.append(f"### {app_name}（{len(records)} 条）")
            lines.append("")
            
            # 按时间排序记录
            sorted_records = sorted(
                records,
                key=lambda r: r.get("created_at", ""),
            )
            
            # 输出表格
            lines.append("| 时间 | 内容 |")
            lines.append("|------|------|")
            
            for record in sorted_records:
                time_str = record.get("time", "")
                date_str = record.get("date", "")
                text = record.get("refined_text") or record.get("edited_text") or ""
                
                # 清理文本（去除换行，截断过长内容）
                if text:
                    text = text.replace("\n", " ").replace("|", "\\|").strip()
                else:
                    text = "(空)"
                if len(text) > 200:
                    text = text[:200] + "..."
                
                # 显示日期+时间
                datetime_str = f"{date_str} {time_str}" if date_str else time_str
                
                lines.append(f"| {datetime_str} | {text} |")
            
            lines.append("")
        
        lines.append("---")
        lines.append("")
    
    return "\n".join(lines)


def generate_json_for_ai(grouped_data):
    """
    生成结构化 JSON 格式
    """
    result = {
        "meta": {
            "generated_at": datetime.now().isoformat(),
            "total_scenes": len(grouped_data),
            "total_records": sum(
                len(records)
                for apps in grouped_data.values()
                for records in apps.values()
            ),
        },
        "scenes": {},
    }
    
    for scene, apps in grouped_data.items():
        scene_data = {
            "total_records": sum(len(r) for r in apps.values()),
            "apps": {},
        }
        
        for app_name, records in apps.items():
            # 简化记录，只保留 AI 分析需要的字段
            simplified_records = []
            for r in sorted(records, key=lambda x: x.get("created_at", "")):
                simplified_records.append({
                    "datetime": f"{r.get('date', '')} {r.get('time', '')}".strip(),
                    "text": r.get("refined_text", "") or r.get("edited_text", ""),
                    "duration": r.get("duration"),
                })
            
            scene_data["apps"][app_name] = {
                "count": len(records),
                "records": simplified_records,
            }
        
        result["scenes"][scene] = scene_data
    
    return result


def save_outputs(grouped_data, output_dir):
    """保存输出文件"""
    os.makedirs(output_dir, exist_ok=True)
    
    # 保存 Markdown（供 AI 分析）
    md_content = generate_markdown_for_ai(grouped_data)
    md_path = os.path.join(output_dir, "voice_records_for_ai.md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md_content)
    print(f"✓ 已保存 Markdown: {md_path}")
    
    # 保存 JSON（供程序使用）
    json_data = generate_json_for_ai(grouped_data)
    json_path = os.path.join(output_dir, "voice_records_structured.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(json_data, f, ensure_ascii=False, indent=2)
    print(f"✓ 已保存 JSON: {json_path}")
    
    # 按场景单独保存（便于分场景分析）
    scenes_dir = os.path.join(output_dir, "scenes")
    os.makedirs(scenes_dir, exist_ok=True)
    
    for scene, apps in grouped_data.items():
        scene_md = generate_markdown_for_scene(scene, apps)
        safe_name = scene.replace(" ", "_")
        scene_path = os.path.join(scenes_dir, f"{safe_name}.md")
        with open(scene_path, "w", encoding="utf-8") as f:
            f.write(scene_md)
    
    print(f"✓ 已保存分场景文件: {scenes_dir}/")
    
    return md_path, json_path


def generate_markdown_for_scene(scene, apps):
    """为单个场景生成 Markdown"""
    lines = []
    
    total = sum(len(r) for r in apps.values())
    lines.append(f"# {scene}场景语音记录")
    lines.append("")
    lines.append(f"> 共 {total} 条记录，{len(apps)} 个应用")
    lines.append("")
    
    sorted_apps = sorted(apps.items(), key=lambda x: len(x[1]), reverse=True)
    
    for app_name, records in sorted_apps:
        lines.append(f"## {app_name}（{len(records)} 条）")
        lines.append("")
        
        sorted_records = sorted(records, key=lambda r: r.get("created_at", ""))
        
        lines.append("| 时间 | 内容 |")
        lines.append("|------|------|")
        
        for record in sorted_records:
            time_str = record.get("time", "")
            date_str = record.get("date", "")
            text = record.get("refined_text") or record.get("edited_text") or ""
            if text:
                text = text.replace("\n", " ").replace("|", "\\|").strip()
            else:
                text = "(空)"
            if len(text) > 200:
                text = text[:200] + "..."
            datetime_str = f"{date_str} {time_str}" if date_str else time_str
            lines.append(f"| {datetime_str} | {text} |")
        
        lines.append("")
    
    return "\n".join(lines)


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description="按场景分类语音记录")
    parser.add_argument("--input", type=str, default=INPUT_FILE, help="输入 JSON 文件路径")
    parser.add_argument("--output", type=str, default=OUTPUT_DIR, help="输出目录")
    
    args = parser.parse_args()
    
    print("📂 加载语音记录...")
    records = load_records(args.input)
    print(f"   共 {len(records)} 条记录")
    
    print("\n🏷️  按场景分类...")
    grouped = group_by_scene(records)
    
    print("\n📊 场景统计:")
    for scene in sorted(grouped.keys(), key=lambda s: sum(len(r) for r in grouped[s].values()), reverse=True):
        apps = grouped[scene]
        total = sum(len(r) for r in apps.values())
        app_list = ", ".join(f"{a}({len(r)})" for a, r in sorted(apps.items(), key=lambda x: len(x[1]), reverse=True)[:3])
        if len(apps) > 3:
            app_list += f" 等{len(apps)}个"
        print(f"   {scene}: {total} 条 [{app_list}]")
    
    print("\n💾 保存输出文件...")
    md_path, json_path = save_outputs(grouped, args.output)
    
    print("\n✅ 完成！")
    print(f"   Markdown（供 AI 分析）: {md_path}")
    print(f"   JSON（供程序使用）: {json_path}")


if __name__ == "__main__":
    main()
