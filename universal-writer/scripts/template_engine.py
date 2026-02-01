"""
Template Engine - 模板引擎模块
加载、解析和渲染 Markdown 模板
"""

import os
from pathlib import Path
from jinja2 import Template, Environment, FileSystemLoader


class TemplateEngine:
    """模板引擎"""

    def __init__(self, templates_dir=None):
        """初始化模板引擎

        Args:
            templates_dir: 模板目录路径
        """
        if templates_dir is None:
            # 默认模板目录
            self.templates_dir = Path(__file__).parent.parent / "templates"
        else:
            self.templates_dir = Path(templates_dir)

        # 创建 Jinja2 环境
        self.env = Environment(
            loader=FileSystemLoader(str(self.templates_dir)),
            trim_blocks=True,
            lstrip_blocks=True
        )

    def list_templates(self):
        """列出所有可用模板

        Returns:
            模板名称列表
        """
        if not self.templates_dir.exists():
            return []

        templates = []
        for file in self.templates_dir.glob("*.md"):
            templates.append(file.stem)
        return sorted(templates)

    def load_template(self, template_name):
        """加载模板

        Args:
            template_name: 模板名称（不带扩展名）

        Returns:
            Template 对象
        """
        try:
            return self.env.get_template(f"{template_name}.md")
        except Exception as e:
            raise ValueError(f"模板 '{template_name}' 不存在: {e}")

    def render(self, template, data):
        """渲染模板

        Args:
            template: Template 对象
            data: 模板变量字典

        Returns:
            渲染后的内容
        """
        return template.render(**data)

    def render_by_name(self, template_name, data):
        """通过模板名渲染

        Args:
            template_name: 模板名称
            data: 模板变量字典

        Returns:
            渲染后的内容
        """
        template = self.load_template(template_name)
        return self.render(template, data)

    def get_template_content(self, template_name):
        """获取模板原始内容

        Args:
            template_name: 模板名称

        Returns:
            模板原始内容
        """
        template_file = self.templates_dir / f"{template_name}.md"
        if not template_file.exists():
            raise ValueError(f"模板 '{template_name}' 不存在")

        return template_file.read_text(encoding='utf-8')

    def extract_variables(self, template_content):
        """提取模板中的变量

        Args:
            template_content: 模板内容

        Returns:
            变量列表
        """
        import re
        # 匹配 {{ variable }} 格式
        pattern = r'\{\{\s*(\w+)\s*\}\}'
        variables = set(re.findall(pattern, template_content))
        return sorted(list(variables))
