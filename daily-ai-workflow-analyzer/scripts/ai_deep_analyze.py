#!/usr/bin/env python3
"""
AI深度分析模块
从语音记录中提取可沉淀的知识
"""

import json
from collections import Counter
from datetime import datetime
import re
from pathlib import Path


USER_PREFS_PATH = Path(
    "/Users/douba/.claude/skills/daily-ai-workflow-analyzer/knowledge/user_preferences.json"
)


class VoiceDeepAnalyzer:
    """语音记录深度分析器"""

    def __init__(self, app_name, records):
        self.app_name = app_name
        self.records = records
        self.texts = [
            r.get("refined_text", "") for r in records if r.get("refined_text")
        ]
        self.user_preferences = self._load_user_preferences()

    def _load_user_preferences(self):
        if not USER_PREFS_PATH.exists():
            return {"user_habits": {}}

        with open(USER_PREFS_PATH, "r", encoding="utf-8") as f:
            return json.load(f)

    def _save_user_preferences(self):
        with open(USER_PREFS_PATH, "w", encoding="utf-8") as f:
            json.dump(self.user_preferences, f, ensure_ascii=False, indent=2)

    def analyze(self):
        return {
            "app_name": self.app_name,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "total_records": len(self.records),
            "repeated_issues": self.extract_repeated_issues(),
            "user_habits": self.extract_user_habits(),
            "actionable_items": self.extract_actionable_items(),
            "communication_patterns": self.extract_communication_patterns(),
            "knowledge_insights": self.extract_knowledge_insights(),
            "workflow_preferences": self.extract_workflow_preferences(),
        }

    def extract_repeated_issues(self):
        """提取重复出现的问题（需要沉淀为规则）"""
        issues = []

        # 质量验证相关
        quality_keywords = [
            "基础",
            "验证",
            "走查",
            "测试",
            "检查",
            "无法打开",
            "报错",
            "失效",
        ]
        quality_issues = [
            text for text in self.texts if any(k in text for k in quality_keywords)
        ]
        if len(quality_issues) >= 2:
            issues.append(
                {
                    "category": "质量验证缺口",
                    "count": len(quality_issues),
                    "pattern": "基础功能问题未提前发现",
                    "examples": quality_issues[:3],
                    "should_become_rule": "提交前自检清单：基础可用性、核心功能验证",
                }
            )

        # 交互一致性相关
        consistency_keywords = ["一致", "统一", "相同", "不同", "混淆", "冲突"]
        consistency_issues = [
            text for text in self.texts if any(k in text for k in consistency_keywords)
        ]
        if len(consistency_issues) >= 2:
            issues.append(
                {
                    "category": "交互一致性",
                    "count": len(consistency_issues),
                    "pattern": "不同场景下行为不一致",
                    "examples": consistency_issues[:3],
                    "should_become_rule": "交互设计规范：相同功能在不同场景保持一致",
                }
            )

        # 性能问题
        performance_keywords = ["慢", "等待", "加载", "刷新", "5秒", "卡", "延迟"]
        perf_issues = [
            text for text in self.texts if any(k in text for k in performance_keywords)
        ]
        if len(perf_issues) >= 2:
            issues.append(
                {
                    "category": "性能体验",
                    "count": len(perf_issues),
                    "pattern": "加载等待时间过长",
                    "examples": perf_issues[:3],
                    "should_become_rule": "渐进式加载策略：先响应再优化",
                }
            )

        # 国际化问题
        i18n_keywords = ["中英文", "国内", "中文", "英文", "翻译", "语言"]
        i18n_issues = [
            text for text in self.texts if any(k in text for k in i18n_keywords)
        ]
        if len(i18n_issues) >= 2:
            issues.append(
                {
                    "category": "国际化",
                    "count": len(i18n_issues),
                    "pattern": "中英文功能不同步",
                    "examples": i18n_issues[:3],
                    "should_become_rule": "国际化验证：中英文功能同步检查",
                }
            )

        return issues

    def extract_user_habits(self):
        habits = []

        habit_patterns = [
            (r"(希望|期待|要求|需要).*?(自动|每次|都)", "自动化习惯"),
            (r"(喜欢|习惯|倾向).*?(用|使用)", "使用偏好"),
            (r"(通常|一般|习惯).*?(会|做)", "行为模式"),
            (r"(不喜欢|不要|避免).*?(这样|那样)", "避讳事项"),
        ]

        existing_habits = self.user_preferences.get("user_habits", {})

        for pattern, category in habit_patterns:
            if category in existing_habits:
                continue

            matches = [text for text in self.texts if re.search(pattern, text)]

            if matches:
                habit = {
                    "category": category,
                    "count": len(matches),
                    "examples": matches[:3],
                    "habit": matches[0][:50] + "..."
                    if len(matches[0]) > 50
                    else matches[0],
                }
                habits.append(habit)
                existing_habits[category] = habit

        self._save_user_preferences()
        return habits

    def extract_communication_patterns(self):
        patterns = []

        comm_patterns = [
            (r"(我觉得|我认为)", "观点表达", "直接表达观点和想法"),
            (r"(有没有可能|能不能|可不可以)", "试探性提问", "委婉地提出建议或询问"),
            (r"(我想知道|我想了解)", "求知倾向", "主动寻求信息和知识"),
            (r"(这个|这样|那样)不(行|好|对)", "否定方式", "委婉地表达不同意见"),
            (r"我觉得.+(可以|不错|好)", "肯定方式", "积极肯定他人的观点"),
        ]

        for pattern, category, description in comm_patterns:
            matches = [text for text in self.texts if re.search(pattern, text)]

            if matches:
                patterns.append(
                    {
                        "category": category,
                        "count": len(matches),
                        "description": description,
                        "examples": matches[:3],
                    }
                )

        return patterns

    def extract_knowledge_insights(self):
        insights = []

        insight_patterns = [
            (r"(我发现|我注意到|我意识到)", "发现和洞察", "从实践中得出的观察"),
            (r"原来.+(是|这样)", "认知更新", "对事物的重新理解"),
            (r"(学会|学到|掌握).+?了", "学习成果", "获取的新知识和技能"),
            (r"(建议|建议用).+?来做", "经验建议", "基于经验的建议"),
        ]

        for pattern, category, description in insight_patterns:
            matches = [text for text in self.texts if re.search(pattern, text)]

            if matches:
                insights.append(
                    {
                        "category": category,
                        "count": len(matches),
                        "description": description,
                        "examples": matches[:3],
                    }
                )

        return insights

    def extract_actionable_items(self):
        items = []

        suggestion_keywords = [
            "建议",
            "应该",
            "可以考虑",
            "有没有可能",
            "能不能",
            "可以",
            "希望",
            "期待",
            "想要",
        ]

        for text in self.texts:
            if not any(k in text for k in suggestion_keywords):
                continue

            category = None
            description = None

            if "自动" in text or "配置" in text or "设置" in text:
                category = "配置建议"
                description = "长期有效的配置和自动化建议"
            elif "简化" in text or "优化" in text or "改进" in text:
                category = "优化方向"
                description = "可执行的改进和优化建议"
            elif "功能" in text or "实现" in text or "支持" in text:
                category = "功能期望"
                description = "可沉淀的功能需求和期望"

            if category:
                items.append(
                    {"category": category, "description": description, "example": text}
                )

        return items

    def extract_workflow_preferences(self):
        """提取工作流偏好"""
        preferences = []

        # 自动化相关
        automation_keywords = ["自动", "每次", "都", "记住", "习惯"]
        auto_texts = [
            text for text in self.texts if any(k in text for k in automation_keywords)
        ]

        if auto_texts:
            preferences.append(
                {
                    "category": "自动化期望",
                    "count": len(auto_texts),
                    "examples": auto_texts[:3],
                    "config": "配置AI默认行为：自动提交、自动文档更新、中文沟通",
                }
            )

        # 文档相关
        doc_keywords = ["文档", "更新", "记录", "同步"]
        doc_texts = [
            text for text in self.texts if any(k in text for k in doc_keywords)
        ]

        if doc_texts:
            preferences.append(
                {
                    "category": "文档同步",
                    "count": len(doc_texts),
                    "examples": doc_texts[:2],
                    "config": "提交代码后自动提示更新文档",
                }
            )

        return preferences


def analyze_voice_records(app_name, records_file):
    """分析语音记录的主函数"""
    # 读取记录
    with open(records_file, "r", encoding="utf-8") as f:
        records = json.load(f)

    # 执行分析
    analyzer = VoiceDeepAnalyzer(app_name, records)
    result = analyzer.analyze()

    return result


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 3:
        print("Usage: python ai_deep_analyze.py <app_name> <records_file>")
        sys.exit(1)

    app_name = sys.argv[1]
    records_file = sys.argv[2]

    result = analyze_voice_records(app_name, records_file)
    print(json.dumps(result, ensure_ascii=False, indent=2))
