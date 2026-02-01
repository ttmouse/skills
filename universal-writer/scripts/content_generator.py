"""
Content Generator - 内容生成模块
生成文章大纲、章节内容和完整文章
"""

import json
from pathlib import Path
from typing import Dict, List, Any


class ContentGenerator:
    """内容生成器"""

    def __init__(self, template_engine):
        """初始化内容生成器

        Args:
            template_engine: 模板引擎实例
        """
        self.template_engine = template_engine

    def generate_outline(self, topic, template_name, data=None):
        """生成文章大纲

        Args:
            topic: 主题
            template_name: 模板名称
            data: 额外数据

        Returns:
            大纲字典
        """
        # 获取模板内容
        template_content = self.template_engine.get_template_content(template_name)
        variables = self.template_engine.extract_variables(template_content)

        # 生成基础大纲
        outline = {
            'topic': topic,
            'template': template_name,
            'required_variables': variables,
            'sections': self._extract_sections_from_template(template_content)
        }

        return outline

    def _extract_sections_from_template(self, template_content):
        """从模板中提取章节结构

        Args:
            template_content: 模板内容

        Returns:
            章节列表
        """
        import re
        # 匹配 Markdown 标题（# ## ###）
        pattern = r'^(#{1,3})\s+(.+)$'
        sections = []

        for line in template_content.split('\n'):
            match = re.match(pattern, line)
            if match:
                level = len(match.group(1))
                title = match.group(2)
                sections.append({
                    'level': level,
                    'title': title
                })

        return sections

    def generate_section(self, section_type, data):
        """生成章节内容

        Args:
            section_type: 章节类型
            data: 数据

        Returns:
            章节内容
        """
        # 这里可以集成 LLM API 来生成更智能的内容
        # 当前版本返回基础占位内容

        generators = {
            'intro': f"# {data.get('topic', '')}\n\n{data.get('description', '')}",
            'analysis': f"## 分析\n\n基于以下数据进行分析：\n\n{json.dumps(data, ensure_ascii=False, indent=2)}",
            'summary': "## 总结\n\n以上是对主题的完整分析。",
        }

        return generators.get(section_type, "## 待生成内容\n\n[此处需要填充内容]")

    def generate_full_article(self, outline, data):
        """生成完整文章

        Args:
            outline: 文章大纲
            data: 模板变量数据

        Returns:
            完整文章内容
        """
        template_name = outline['template']
        content = self.template_engine.render_by_name(template_name, data)
        return content

    def generate_interactive_outline(self, template_name):
        """生成交互式大纲

        Args:
            template_name: 模板名称

        Returns:
            交互式大纲字典
        """
        template_content = self.template_engine.get_template_content(template_name)
        sections = self._extract_sections_from_template(template_content)
        variables = self.template_engine.extract_variables(template_content)

        return {
            'template': template_name,
            'sections': sections,
            'variables': variables
        }

    def prepare_template_data(self, interactive_data):
        """准备模板数据

        Args:
            interactive_data: 交互式收集的数据

        Returns:
            模板变量字典
        """
        # 将交互式数据转换为模板变量
        data = {}

        # 基础变量
        data['topic'] = interactive_data.get('topic', '')
        data['description'] = interactive_data.get('description', '')
        data['author'] = interactive_data.get('author', '')
        data['date'] = interactive_data.get('date', '')

        # 章节内容
        for key, value in interactive_data.items():
            if key not in ['topic', 'description', 'author', 'date']:
                data[key] = value

        return data
