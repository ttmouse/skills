#!/usr/bin/env python3
"""
Universal Writer - 主脚本
通用写作技能命令行接口
"""

import click
import json
import sys
from pathlib import Path
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

from template_engine import TemplateEngine
from data_parser import DataParser
from content_generator import ContentGenerator


console = Console()


def print_banner():
    """打印欢迎信息"""
    console.print(Panel.fit(
        "[bold cyan]Universal Writer[/bold cyan] - 通用写作技能\n"
        "[dim]从数据到文章的自动化写作工作流[/dim]",
        border_style="cyan"
    ))


@click.group()
def cli():
    """Universal Writer - 通用写作技能"""
    print_banner()


@cli.command()
@click.option('--template', '-t', required=True, help='模板名称')
@click.option('--topic', help='文章主题')
@click.option('--data', '-d', help='数据文件路径（JSON/CSV）')
@click.option('--output', '-o', required=True, help='输出文件路径')
@click.option('--interactive', '-i', is_flag=True, help='交互式模式')
@click.option('--auto-generate', is_flag=True, help='自动生成内容')
def generate(template, topic, data, output, interactive, auto_generate):
    """生成文章"""
    try:
        # 初始化组件
        template_engine = TemplateEngine()
        data_parser = DataParser()
        content_generator = ContentGenerator(template_engine)

        # 检查模板是否存在
        templates = template_engine.list_templates()
        if template not in templates:
            console.print(f"[red]错误: 模板 '{template}' 不存在[/red]")
            console.print(f"\n可用模板:")
            for t in templates:
                console.print(f"  • {t}")
            sys.exit(1)

        # 交互式模式
        if interactive:
            return generate_interactive(template_engine, content_generator, template, output)

        # 数据驱动模式
        if data:
            return generate_from_data(template_engine, data_parser, content_generator,
                                      template, data, output, auto_generate)

        # 直接生成模式
        if not topic:
            console.print("[red]错误: 必须提供 --topic 参数[/red]")
            sys.exit(1)

        # 生成文章
        generate_simple(template_engine, content_generator, template, topic, output)

    except Exception as e:
        console.print(f"[red]错误: {str(e)}[/red]")
        sys.exit(1)


@cli.command()
def list_templates():
    """列出所有可用模板"""
    template_engine = TemplateEngine()
    templates = template_engine.list_templates()

    console.print("\n[bold]可用模板:[/bold]\n")

    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("模板名称", style="cyan")
    table.add_column("描述", style="dim")

    template_descriptions = {
        "专题深度拆解": "designprompt 专题文章",
        "技术教程": "技能使用、工具教程",
        "案例分析": "Twitter 案例研究",
        "经验总结": "工作复盘、方法论",
        "产品文档": "技能文档、使用指南"
    }

    for t in templates:
        description = template_descriptions.get(t, "")
        table.add_row(t, description)

    console.print(table)


@cli.command()
@click.option('--template', '-t', required=True, help='模板名称')
def show_template(template):
    """显示模板内容"""
    try:
        template_engine = TemplateEngine()
        content = template_engine.get_template_content(template)

        console.print(Panel(content, title=f"[cyan]{template}.md[/cyan]"))

        # 显示变量
        variables = template_engine.extract_variables(content)
        if variables:
            console.print(f"\n[bold]模板变量:[/bold] {', '.join(variables)}")

    except ValueError as e:
        console.print(f"[red]错误: {str(e)}[/red]")
        sys.exit(1)


def generate_simple(template_engine, content_generator, template, topic, output):
    """简单生成模式"""
    console.print(f"[cyan]正在生成文章...[/cyan]")

    # 准备数据
    data = {
        'topic': topic,
        'description': f"关于 {topic} 的深度分析",
        'author': 'AI Assistant',
        'date': '2026-02-01',
        'sections': []
    }

    # 生成文章
    content = content_generator.generate_full_article(
        {'template': template},
        data
    )

    # 写入文件
    output_path = Path(output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(content, encoding='utf-8')

    console.print(f"[green]✅ 文章已生成: {output}[/green]")


def generate_from_data(template_engine, data_parser, content_generator,
                        template, data_path, output, auto_generate):
    """数据驱动生成模式"""
    console.print(f"[cyan]正在读取数据: {data_path}[/cyan]")

    # 解析数据
    data = data_parser.parse_json(data_path)
    console.print(f"[green]✅ 数据已加载 ({data_parser.analyze(data)['count']} 条记录)[/green]")

    # 自动生成模式
    if auto_generate:
        # 从数据中提取主题和描述
        if isinstance(data, dict):
            data['topic'] = data.get('topic', '未命名主题')
            data['description'] = data.get('description', '基于数据自动生成')
        elif isinstance(data, list) and len(data) > 0:
            data['topic'] = data[0].get('topic', '未命名主题')
            data['description'] = f"基于 {len(data)} 条记录自动生成"

    # 生成文章
    console.print(f"[cyan]正在生成文章...[/cyan]")
    content = content_generator.generate_full_article(
        {'template': template},
        data
    )

    # 写入文件
    output_path = Path(output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(content, encoding='utf-8')

    console.print(f"[green]✅ 文章已生成: {output}[/green]")


def generate_interactive(template_engine, content_generator, template, output):
    """交互式生成模式"""
    console.print(f"[cyan]交互式模式: {template}[/cyan]\n")

    # 获取交互式大纲
    outline = content_generator.generate_interactive_outline(template)

    # 收集主题
    topic = click.prompt("文章主题", type=str)

    # 收集描述
    description = click.prompt("简要描述", type=str, default=f"关于 {topic} 的深度分析")

    # 收集其他变量
    interactive_data = {
        'topic': topic,
        'description': description,
        'author': click.prompt("作者", type=str, default="AI Assistant"),
        'date': click.prompt("日期", type=str, default="2026-02-01")
    }

    # 收集章节内容
    console.print("\n[cyan]现在开始填写章节内容（留空跳过）:[/cyan]\n")

    for section in outline['sections']:
        if section['level'] == 2:  # 主要章节
            section_key = section['title'].replace(' ', '_')
            content_text = click.prompt(
                f"[dim]{section['title']}[/dim]",
                type=str,
                default="",
                show_default=False
            )
            if content_text:
                interactive_data[section_key] = content_text

    # 准备模板数据
    data = content_generator.prepare_template_data(interactive_data)

    # 生成文章
    console.print("\n[cyan]正在生成文章...[/cyan]")
    content = content_generator.generate_full_article(outline, data)

    # 写入文件
    output_path = Path(output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(content, encoding='utf-8')

    console.print(f"[green]✅ 文章已生成: {output}[/green]")


if __name__ == '__main__':
    cli()
