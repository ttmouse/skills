#!/usr/bin/env python3
"""
任务拆解验证器
验证任务卡是否符合所有规范和约束
"""

import re
import json
from typing import List, Dict, Tuple

class TaskBreakdownValidator:
    """任务拆解质量验证器"""

    def __init__(self):
        self.blacklist_words = [
            '优化', '完善', '健壮性', '体验更好', '通用化',
            '抽象封装', '重构以提升质量', '提升性能'
        ]

    def validate_task_card(self, card_content: str) -> Dict:
        """验证单张任务卡"""
        result = {
            'valid': True,
            'errors': [],
            'warnings': [],
            'details': {}
        }

        # 1. 基础格式检查
        if not card_content.strip().startswith('[任务卡]'):
            result['valid'] = False
            result['errors'].append('任务卡必须以 "[任务卡]" 开头')
            return result

        # 2. 必填字段检查
        required_fields = ['标题:', '切片:', '验证点:', 'DoD:', '约束:', '演示点:']
        for field in required_fields:
            if field not in card_content:
                result['valid'] = False
                result['errors'].append(f'缺少必填字段: {field}')

        # 3. 黑名单词汇检查
        for word in self.blacklist_words:
            if word in card_content:
                result['valid'] = False
                result['errors'].append(f'包含黑名单词汇: {word}')

        # 4. 切片格式验证
        slice_pattern = r'切片: DB\(([^)]+)\) / API\(([^)]+)\) / UI\(([^)]+)\)'
        slice_match = re.search(slice_pattern, card_content)
        if not slice_match:
            result['valid'] = False
            result['errors'].append('切片格式不符合规范')
        else:
            db_part, api_part, ui_part = slice_match.groups()
            result['details']['db'] = db_part.strip()
            result['details']['api'] = api_part.strip()
            result['details']['ui'] = ui_part.strip()

        # 5. API部分验证
        if slice_match:
            api_part = slice_match.group(2)
            # 检查是否包含 METHOD 和 ROUTE
            if not re.search(r'(GET|POST|PUT|DELETE|PATCH)\s+/', api_part):
                result['valid'] = False
                result['errors'].append('API部分必须包含 METHOD 和 ROUTE')
            # 检查是否只有一种数据变化
            changes = ['创建', '更新', '删除', '新增', '修改', '删除']
            change_count = sum(1 for change in changes if change in api_part)
            if change_count != 1:
                result['valid'] = False
                result['errors'].append('API部分必须仅包含一种数据变化操作')

        # 6. 数量限制检查
        route_count = len(re.findall(r'\b(GET|POST|PUT|DELETE|PATCH)\s+/', card_content))
        if route_count > 1:
            result['valid'] = False
            result['errors'].append(f'路由数量超限: {route_count} > 1')

        # 7. DoD完整性检查
        dod_section = self._extract_section(card_content, 'DoD:')
        if dod_section:
            required_checks = [
                '页面可开', '数据可见', '日志可定位',
                '测试可写', 'README', '可演示'
            ]
            for check in required_checks:
                if check not in dod_section:
                    result['warnings'].append(f'DoD部分可能缺少检查项: {check}')

        # 8. 演示时间检查
        demo_section = self._extract_section(card_content, '演示点:')
        if demo_section:
            # 检查是否提到具体时间
            if not re.search(r'\d+[-–]\d+秒', demo_section):
                result['warnings'].append('演示点未明确时间范围')

        return result

    def _extract_section(self, content: str, section_prefix: str) -> str:
        """提取指定部分的内容"""
        lines = content.split('\n')
        in_section = False
        section_lines = []

        for line in lines:
            if line.startswith(section_prefix):
                in_section = True
                section_lines.append(line)
            elif in_section:
                # 如果遇到下一个部分的开头，停止收集
                if any(line.startswith(prefix) for prefix in ['标题:', '切片:', '验证点:', 'DoD:', '约束:', '演示点:']):
                    break
                section_lines.append(line)

        return '\n'.join(section_lines) if section_lines else ""

    def validate_breakdown(self, breakdown_content: str) -> Dict:
        """验证完整的拆解结果"""
        result = {
            'valid': True,
            'cards': [],
            'overall_errors': [],
            'summary': {}
        }

        # 提取所有任务卡
        card_pattern = r'\[任务卡\][\s\S]*?(?=\[任务卡\]|$)'
        cards = re.findall(card_pattern, breakdown_content)

        result['summary']['total_cards'] = len(cards)
        result['summary']['valid_cards'] = 0
        result['summary']['invalid_cards'] = 0

        for i, card in enumerate(cards, 1):
            card_result = self.validate_task_card(card)
            card_info = {
                'card_number': i,
                'valid': card_result['valid'],
                'errors': card_result['errors'],
                'warnings': card_result['warnings'],
                'details': card_result.get('details', {})
            }

            result['cards'].append(card_info)

            if card_result['valid']:
                result['summary']['valid_cards'] += 1
            else:
                result['summary']['invalid_cards'] += 1
                result['valid'] = False

        # 检查整体逻辑
        if len(cards) == 0:
            result['valid'] = False
            result['overall_errors'].append('未找到任何任务卡')

        # 检查卡片间依赖关系
        if len(cards) > 1:
            self._check_dependencies(cards, result)

        return result

    def _check_dependencies(self, cards: List[str], result: Dict):
        """检查卡片间的依赖关系"""
        # 这里可以实现更复杂的依赖关系检查
        # 目前只做简单的提示
        result['summary']['dependency_check'] = '基础检查通过'

    def generate_fix_suggestions(self, validation_result: Dict) -> List[str]:
        """生成修复建议"""
        suggestions = []

        for card in validation_result['cards']:
            if not card['valid']:
                card_num = card['card_number']
                for error in card['errors']:
                    suggestions.append(f"任务卡 {card_num}: {error}")

        # 通用建议
        if validation_result['summary'].get('invalid_cards', 0) > 0:
            suggestions.append("建议：重新检查不符合规范的任务卡，确保满足所有硬约束")
            suggestions.append("建议：使用自检清单逐卡检查，确保质量")

        return suggestions


def main():
    """命令行接口"""
    import sys

    if len(sys.argv) < 2:
        print("用法: python breakdown_validator.py <任务卡文件路径>")
        sys.exit(1)

    file_path = sys.argv[1]

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        validator = TaskBreakdownValidator()
        result = validator.validate_breakdown(content)

        print("=== 任务拆解验证结果 ===")
        print(f"总卡片数: {result['summary']['total_cards']}")
        print(f"有效卡片: {result['summary']['valid_cards']}")
        print(f"无效卡片: {result['summary']['invalid_cards']}")
        print(f"整体有效性: {'✅ 通过' if result['valid'] else '❌ 失败'}")

        if not result['valid']:
            print("\n=== 错误详情 ===")
            suggestions = validator.generate_fix_suggestions(result)
            for suggestion in suggestions:
                print(f"❌ {suggestion}")

        # 详细卡片信息
        print("\n=== 卡片详情 ===")
        for card in result['cards']:
            status = "✅" if card['valid'] else "❌"
            print(f"{status} 任务卡 {card['card_number']}")
            if card['warnings']:
                for warning in card['warnings']:
                    print(f"  ⚠️  {warning}")

        # 导出JSON报告
        report_file = file_path.replace('.md', '_validation_report.json')
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        print(f"\n📊 详细报告已保存到: {report_file}")

    except FileNotFoundError:
        print(f"错误: 文件 {file_path} 不存在")
        sys.exit(1)
    except Exception as e:
        print(f"错误: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()