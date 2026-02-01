"""
Data Parser - 数据解析模块
解析 JSON/CSV 数据，提取关键信息
"""

import json
import csv
from pathlib import Path
from typing import Dict, List, Any


class DataParser:
    """数据解析器"""

    def parse_json(self, file_path):
        """解析 JSON 文件

        Args:
            file_path: JSON 文件路径

        Returns:
            解析后的数据字典
        """
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"文件不存在: {file_path}")

        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def parse_csv(self, file_path):
        """解析 CSV 文件

        Args:
            file_path: CSV 文件路径

        Returns:
            数据列表
        """
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"文件不存在: {file_path}")

        data = []
        with open(path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                data.append(dict(row))
        return data

    def parse_twitter_cases(self, data):
        """解析 Twitter 案例

        Args:
            data: Twitter 采集数据

        Returns:
            提取的关键信息
        """
        if isinstance(data, str):
            data = self.parse_json(data)

        # 假设 Twitter 数据结构
        cases = []
        if isinstance(data, dict) and 'cases' in data:
            for case in data['cases']:
                cases.append({
                    'id': case.get('id', ''),
                    'content': case.get('content', ''),
                    'author': case.get('author', ''),
                    'date': case.get('date', ''),
                    'media': case.get('media', [])
                })
        elif isinstance(data, list):
            for item in data:
                cases.append({
                    'id': item.get('id', ''),
                    'content': item.get('content', ''),
                    'author': item.get('author', ''),
                    'date': item.get('date', ''),
                    'media': item.get('media', [])
                })

        return cases

    def extract_key_info(self, data, keys=None):
        """提取关键信息

        Args:
            data: 原始数据
            keys: 要提取的键列表，None 表示提取所有

        Returns:
            提取后的数据
        """
        if keys is None:
            return data

        if isinstance(data, dict):
            return {k: data.get(k) for k in keys if k in data}
        elif isinstance(data, list):
            return [{k: item.get(k) for k in keys if k in item} for item in data]
        else:
            return data

    def analyze_data(self, data):
        """分析数据结构

        Args:
            data: 要分析的数据

        Returns:
            数据分析结果
        """
        if isinstance(data, dict):
            return {
                'type': 'dict',
                'keys': list(data.keys()),
                'count': len(data),
                'sample': {k: str(v)[:50] for k, v in list(data.items())[:3]}
            }
        elif isinstance(data, list):
            if len(data) > 0:
                sample = data[0]
                return {
                    'type': 'list',
                    'item_type': type(sample).__name__,
                    'count': len(data),
                    'sample_keys': list(sample.keys()) if isinstance(sample, dict) else [],
                    'sample': str(sample)[:100]
                }
            else:
                return {'type': 'list', 'count': 0}
        else:
            return {'type': type(data).__name__, 'value': str(data)[:100]}
