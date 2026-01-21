#!/usr/bin/env python3
"""
导出分析结果到Obsidian笔记
"""

import json
import os
from datetime import datetime
from pathlib import Path


class ObsidianExporter:
    """Obsidian笔记导出器"""

    def __init__(self, obsidian_vault_path):
        self.vault_path = Path(obsidian_vault_path)
        self.knowledge_base_path = self.vault_path / "知识体系" / "个人工作模式"

        self.knowledge_base_path.mkdir(parents=True, exist_ok=True)

        self.app_type_map = {
            "聊天": ["微信", "WeChat", "QQ", "钉钉", "飞书", "WhatsApp", "Telegram"],
            "编程": [
                "Antigravity",
                "Alma",
                "Dia",
                "Ghostty",
                "CodeBuddy CN",
                "Conductor",
                "CodeBuddy",
            ],
            "文档": ["Google Chrome", "Safari", "Finder"],
        }

    def export_analysis(self, analysis_data):
        """导出分析结果为Obsidian笔记"""
        app_name = analysis_data["app_name"]
        date = analysis_data["date"]

        note_content = self._generate_note_content(analysis_data)
        app_type = self._get_app_type(app_name)
        suffix = self._get_app_suffix(app_type)

        note_filename = f"{app_name}{suffix}_{date}.md"
        note_path = self.knowledge_base_path / note_filename

        with open(note_path, "w", encoding="utf-8") as f:
            f.write(note_content)

        print(f"✓ 已保存到: {note_path}")

        self._update_knowledge_base(analysis_data)

        return str(note_path)

    def _get_app_type(self, app_name):
        for app_type, apps in self.app_type_map.items():
            if app_name in apps:
                return app_type
        return "通用"

    def _get_app_suffix(self, app_type):
        suffix_map = {
            "聊天": "聊天记录",
            "编程": "开发记录",
            "文档": "使用记录",
            "通用": "记录",
        }
        return suffix_map.get(app_type, "记录")

    def _generate_note_content(self, data):
        app = data["app_name"]
        date = data["date"]
        total = data["total_records"]
        app_type = self._get_app_type(app)
        suffix = self._get_app_suffix(app_type)

        content = f"""# {app} {suffix} - {date}

> 💡 从{total}条语音记录中提取的可沉淀知识

---

## 🔄 重复出现的问题（需要沉淀为规则）

"""

        # 重复问题
        repeated = data.get("repeated_issues", [])
        if repeated:
            for issue in repeated:
                content += f"""### {issue["category"]} (出现{issue["count"]}次)

**模式**：{issue["pattern"]}

**示例**：
"""
                for example in issue["examples"]:
                    content += f"- {example}\n"

                content += f"""
**应该沉淀为**：✅ {issue["should_become_rule"]}

---

"""
        else:
            content += "暂无重复问题发现。\n\n"

        content += "## 🧠 用户习惯和偏好\n\n"
        habits = data.get("user_habits", [])
        if habits:
            for habit in habits:
                content += f"""### {habit["category"]} (出现{habit["count"]}次)

 **习惯描述**：{habit["habit"]}

 **示例**：
 """
                for example in habit["examples"]:
                    content += f"- {example}\n"

                content += "\n---\n\n"
        else:
            content += "暂无用户习惯发现。\n\n"

        content += "## ✅ 可执行的行动清单\n\n"
        actions = data.get("actionable_items", [])
        if actions:
            for action in actions:
                content += f"""### {action["category"]}

 **建议类型**：{action["description"]}

 **示例**：
 - {action["example"][:100]}...

---

"""
        else:
            content += "暂无行动清单发现。\n\n"

        content += "## 💬 沟通模式\n\n"
        comm = data.get("communication_patterns", [])
        if comm:
            for pattern in comm:
                content += f"""### {pattern["category"]} (出现{pattern["count"]}次)

 **模式描述**：{pattern["description"]}

 **示例**：
 """
                for example in pattern["examples"]:
                    content += f"- {example}\n"

                content += "\n---\n\n"
        else:
            content += "暂无沟通模式发现。\n\n"

        content += "## 🧠 知识洞察\n\n"
        insights = data.get("knowledge_insights", [])
        if insights:
            for insight in insights:
                content += f"""### {insight["category"]} (出现{insight["count"]}次)

 **洞察类型**：{insight["description"]}

 **示例**：
 """
                for example in insight["examples"]:
                    content += f"- {example}\n"

                content += "\n---\n\n"
        else:
            content += "暂无知识洞察发现。\n\n"

        workflow = data.get("workflow_preferences", [])
        if workflow:
            content += "## ⚙️ 工作流偏好\n\n"
            for pref in workflow:
                content += f"""### {pref["category"]} (出现{pref["count"]}次)

 **建议配置**：{pref["config"]}

 **示例**：
 """
                for example in pref["examples"]:
                    content += f"- {example}\n"

                content += "\n---\n\n"

        content += f"""## 🔗 相关链接

 - [[用户习惯清单]] - 你的工作习惯和偏好
 - [[工作模式配置]] - 自动化和流程配置
 - [[偏好设置]] - 个人化设置和期望

 ---

 tags: #AI协作 #{suffix} #{app}
 created: {date}
 """

        return content

    def export_comprehensive(self, data):
        """导出跨App综合分析报告（简化版）"""
        date = datetime.now().strftime("%Y-%m-%d")
        total_records = data["total_records"]
        total_apps = data["total_apps"]
        cross_issues = data["summary"]["cross_app_issues"]
        
        filename = f"综合分析报告_{date}.md"
        note_path = self.knowledge_base_path / filename
        
        with open(note_path, "w", encoding="utf-8") as f:
            f.write(f"# 综合深度洞察分析报告 - {date}\n\n")
            f.write(f"> 💡 从{total_records}条语音记录（{total_apps}个应用）中提取的可沉淀知识\n\n")
            f.write("---\n\n")
            f.write("## ⚡ 执行摘要\n\n")
            f.write(f"**核心发现**：跨App分析揭示了{len(cross_issues)}类重复出现的问题，需要立即解决。\n\n")
            f.write("**重复问题TOP3**：\n\n")
            
            for i, (category, count) in enumerate(cross_issues[:3], 1):
                emoji = "🔴" if i == 1 else "🟡" if i == 2 else "🟢"
                f.write(f"{i}. {emoji} **{category}**（{count}次）\n")
            
            f.write("\n**关键洞察**：\n")
            f.write("- 跨App分析揭示了系统性问题\n")
            f.write("- 需要将这些模式固化为可执行规则\n\n")
            
            f.write("---\n\n")
            f.write("## 🔄 跨App重复问题\n\n")
            
            for category, total_count in cross_issues[:5]:
                f.write(f"\n### {category}（共{total_count}次）\n\n")
                f.write("**应该沉淀为**：✅ 提交前自检清单或设计规范\n")
            
            f.write("\n---\n\n")
            f.write("## 📊 数据快照\n\n")
            f.write("| 应用 | 记录数 | 主要问题 |\n")
            f.write("|------|--------|---------|\n")
            
            for app_analysis in data.get("app_analyses", [])[:8]:
                app_name = app_analysis["app_name"]
                total = app_analysis["total_records"]
                issues = app_analysis.get("repeated_issues", [])
                if issues:
                    main_issue = f"{issues[0]['category']}({issues[0]['count']}次)"
                else:
                    main_issue = "-"
                f.write(f"| {app_name} | {total} | {main_issue} |\n")
            
            f.write("\n---\n\n")
            f.write("## 📝 附录\n\n")
            f.write(f"- 生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"- 分析工具：DailyAIWorkflowAnalyzer v2.1（综合版）\n")
            f.write(f"- 报告说明：不再生成单独的App开发记录，只生成综合分析报告\n")
            f.write("\n---\n")
            f.write(f"tags: #AI协作 #深度洞察 #综合分析\n")
            f.write(f"\ncreated: {date}\n")
        
        print(f"✓ 已保存综合报告到: {note_path}")
        return str(note_path)

def export_comprehensive_analysis(comprehensive_data, obsidian_path):
    """导出综合分析报告（跨App合并）"""
    exporter = ObsidianExporter(obsidian_path)
    note_path = exporter.export_comprehensive(comprehensive_data)
    return note_path
