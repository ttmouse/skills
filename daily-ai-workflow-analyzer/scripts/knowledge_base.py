#!/usr/bin/env python3
"""
Knowledge Base Module
加载和查询知识库，支持热更新
"""

import os
import re
import json
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime


class KnowledgeBase:
    """知识库管理类"""

    def __init__(self, skill_dir: Optional[str] = None):
        """
        初始化知识库

        Args:
            skill_dir: 技能目录路径，如果为None则自动检测
        """
        if skill_dir is None:
            skill_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

        self.skill_dir = Path(skill_dir)
        self.knowledge_dir = self.skill_dir / 'knowledge'
        self.template_dir = self.skill_dir / 'templates'

        # 缓存知识库（热更新时重新加载）
        self._cache = {}
        self._last_load_time = None

    def load_all(self) -> Dict:
        """
        加载所有知识库内容

        Returns:
            知识库字典，按分类组织
        """
        knowledge = {
            'communication-analysis': self._load_category('01-communication-analysis'),
            'process-optimization': self._load_category('02-process-optimization'),
            'communication-tools': self._load_category('03-communication-tools'),
            'troubleshooting': self._load_category('04-troubleshooting')
        }

        self._cache = knowledge
        self._last_load_time = datetime.now()

        return knowledge

    def _load_category(self, category: str) -> Dict:
        """
        加载指定分类的知识

        Args:
            category: 分类名称

        Returns:
            该分类的知识字典
        """
        category_dir = self.knowledge_dir / category
        if not category_dir.exists():
            return {'_base': [], 'community': []}

        result = {
            '_base': [],
            'community': []
        }

        # 加载 _base/ 目录
        base_dir = category_dir / '_base'
        if base_dir.exists():
            for file in sorted(base_dir.glob('*.md')):
                knowledge = self._parse_knowledge_file(file)
                if knowledge:
                    result['_base'].append(knowledge)

        # 加载 community/ 目录
        community_dir = category_dir / 'community'
        if community_dir.exists():
            for file in sorted(community_dir.glob('*.md')):
                knowledge = self._parse_knowledge_file(file)
                if knowledge:
                    result['community'].append(knowledge)

        return result

    def _parse_knowledge_file(self, file_path: Path) -> Optional[Dict]:
        """
        解析知识文件

        Args:
            file_path: 知识文件路径

        Returns:
            知识字典或None
        """
        try:
            content = file_path.read_text(encoding='utf-8')

            # 解析 frontmatter
            frontmatter_match = re.match(r'^---\n(.*?)\n---\n', content, re.DOTALL)
            if not frontmatter_match:
                return None

            frontmatter_text = frontmatter_match.group(1)
            frontmatter = self._parse_frontmatter(frontmatter_text)

            # 提取正文
            body = content[frontmatter_match.end():].strip()

            return {
                'file_path': str(file_path.relative_to(self.skill_dir)),
                'filename': file_path.name,
                **frontmatter,
                'body': body
            }

        except Exception as e:
            print(f"⚠️  解析知识文件失败: {file_path} - {e}")
            return None

    def _parse_frontmatter(self, text: str) -> Dict:
        """
        解析 frontmatter YAML

        Args:
            text: frontmatter 文本

        Returns:
            字典
        """
        frontmatter = {}

        for line in text.split('\n'):
            if ':' in line:
                key, value = line.split(':', 1)
                key = key.strip()
                value = value.strip()

                # 处理列表
                if value.startswith('[') and value.endswith(']'):
                    value = [v.strip().strip('"\'') for v in value[1:-1].split(',')]
                # 去除引号
                elif value.startswith('"') and value.endswith('"'):
                    value = value[1:-1]
                elif value.startswith("'") and value.endswith("'"):
                    value = value[1:-1]

                frontmatter[key] = value

        return frontmatter

    def query(self, category: str = None, keywords: List[str] = None,
              level: str = None, type_: str = None) -> List[Dict]:
        """
        查询知识库

        Args:
            category: 分类名称
            keywords: 关键词列表
            level: 难度级别
            type_: 类型

        Returns:
            匹配的知识列表
        """
        # 加载知识库（热更新）
        knowledge = self.load_all()

        results = []

        # 确定查询范围
        if category:
            categories_to_search = {category: knowledge[category]}
        else:
            categories_to_search = knowledge

        # 遍历查询
        for cat_name, cat_data in categories_to_search.items():
            for source in ['_base', 'community']:
                for item in cat_data[source]:
                    # 检查是否匹配所有条件
                    if level and item.get('level') != level:
                        continue
                    if type_ and item.get('type') != type_:
                        continue

                    # 关键词匹配
                    if keywords:
                        searchable_text = f"{item.get('name', '')} {item.get('body', '')} {' '.join(item.get('tags', []))}"
                        if not all(kw.lower() in searchable_text.lower() for kw in keywords):
                            continue

                    results.append(item)

        return results

    def get_by_name(self, name: str) -> Optional[Dict]:
        """
        根据名称获取知识

        Args:
            name: 知识名称

        Returns:
            知识字典或None
        """
        knowledge = self.load_all()

        for cat_name, cat_data in knowledge.items():
            for source in ['_base', 'community']:
                for item in cat_data[source]:
                    if item.get('name') == name:
                        return item

        return None

    def format_for_ai(self, category: str = None) -> str:
        """
        格式化知识库为AI可读的文本

        Args:
            category: 分类名称，如果为None则格式化所有分类

        Returns:
            格式化后的文本
        """
        knowledge = self.load_all()

        output_parts = []

        categories_to_format = [category] if category else knowledge.keys()

        for cat_name in sorted(categories_to_format):
            if cat_name not in knowledge:
                continue

            cat_data = knowledge[cat_name]
            output_parts.append(f"\n## {cat_name}\n")

            # _base 知识
            if cat_data['_base']:
                output_parts.append("### 官方知识 (_base/)")
                for item in cat_data['_base']:
                    output_parts.append(f"- [{item.get('name', 'Untitled')}]({item.get('file_path')})")
                    output_parts.append(f"  标签: {', '.join(item.get('tags', []))}")
                    output_parts.append(f"  难度: {item.get('level', 'N/A')}\n")

            # community 知识
            if cat_data['community']:
                output_parts.append("### 社区贡献 (community/)")
                for item in cat_data['community']:
                    output_parts.append(f"- [{item.get('name', 'Untitled')}]({item.get('file_path')}) - 作者: {item.get('author', 'unknown')}\n")

        return '\n'.join(output_parts)

    def get_template(self, template_name: str) -> Optional[str]:
        """
        获取模板内容

        Args:
            template_name: 模板名称（如 'issue-template'）

        Returns:
            模板内容或None
        """
        template_file = self.template_dir / f"{template_name}.md"

        if not template_file.exists():
            return None

        return template_file.read_text(encoding='utf-8')

    def is_hot_update_needed(self) -> bool:
        """
        检查是否需要热更新

        Returns:
            如果需要更新返回True
        """
        if self._last_load_time is None:
            return True

        # 检查知识库目录的修改时间
        knowledge_dir_mtime = self.knowledge_dir.stat().st_mtime

        return knowledge_dir_mtime > self._last_load_time.timestamp()


def main():
    """测试代码"""
    kb = KnowledgeBase()

    print("📚 加载知识库...")
    knowledge = kb.load_all()
    print(f"✓ 已加载 {sum(len(cat['_base']) + len(cat['community']) for cat in knowledge.values())} 个知识点\n")

    print("🔍 查询测试:")
    results = kb.query(keywords=['指令'], type_='issue-diagnosis')
    print(f"找到 {len(results)} 个结果")
    for r in results[:3]:
        print(f"  - {r.get('name', 'Untitled')}\n")

    print("📄 格式化测试:")
    print(kb.format_for_ai('communication-analysis'))


if __name__ == '__main__':
    main()
