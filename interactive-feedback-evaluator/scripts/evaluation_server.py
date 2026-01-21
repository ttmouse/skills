#!/usr/bin/env python3
"""
Interactive Feedback Evaluator Server
轻量级Flask服务器，用于处理交互式评估表单的生成和提交
"""

from flask import Flask, request, jsonify, send_from_directory
import json
import os
from datetime import datetime
import subprocess

# 配置
SERVER_PORT = 5002
SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(SKILL_DIR, 'data')
FEEDBACK_FILE = os.path.join(DATA_DIR, 'feedback.json')
FEEDBACK_HISTORY_DIR = os.path.join(DATA_DIR, 'feedback_history')
TEMPLATES_DIR = os.path.join(SKILL_DIR, 'templates')

app = Flask(__name__)

# 添加CORS支持
@app.after_request
def add_cors_headers(response):
    """添加CORS响应头以支持跨域请求"""
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Expose-Headers'] = 'Access-Control-Allow-Origin, Access-Control-Allow-Methods, Access-Control-Allow-Headers'
    return response

@app.route('/<path:path>', methods=['OPTIONS'])
def handle_options(path):
    """处理OPTIONS预检请求"""
    response = app.response_class('', status=200)
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Max-Age'] = '86400'
    return response

# 确保目录存在
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(FEEDBACK_HISTORY_DIR, exist_ok=True)
os.makedirs(TEMPLATES_DIR, exist_ok=True)


# 评估模板
EVALUATION_TEMPLATES = {
    'direction-selection': {
        'title': '下一步方向选择',
        'options': [
            {'value': 'component_library', 'title': 'A) 完善组件库', 'desc': '添加更多组件、优化样式、创建更多预设模板'},
            {'value': 'skill_integration', 'title': 'B) 技能集成', 'desc': '集成到技能、添加自动生成表单的接口'},
            {'value': 'simplify', 'title': 'C) 简化反馈流程', 'desc': '缩短表单、添加快速反馈选项、支持渐进式信息收集'},
            {'value': 'realtime', 'title': 'D) 实时反馈机制', 'desc': '探索自动触发AI读取反馈、减少手动通知'}
        ]
    },
    'analysis-report': {
        'title': '分析报告评估',
        'dimensions': [
            {'name': 'overall', 'label': '整体价值', 'min': 1, 'max': 5},
            {'name': 'usefulness', 'label': '有用性', 'min': 1, 'max': 5},
            {'name': 'actionability', 'label': '可执行性', 'min': 1, 'max': 5}
        ],
        'multi_select': {
            'most_valuable': [
                'behavior_pattern',
                'cognitive_bias',
                'strategy_blind_spot',
                'truth_questions',
                'negative_guidance',
                'core_knowledge'
            ]
        },
        'multi_select_labels': {
            'behavior_pattern': '行为模式识别',
            'cognitive_bias': '认知偏见诊断',
            'strategy_blind_spot': '战略盲点揭示',
            'truth_questions': '真相检验问题',
            'negative_guidance': '否定性指导',
            'core_knowledge': '可沉淀知识'
        }
    },
    'skill-evaluation': {
        'title': '技能效果评估',
        'dimensions': [
            {'name': 'overall', 'label': '整体价值', 'min': 1, 'max': 5},
            {'name': 'functionality', 'label': '功能完整性', 'min': 1, 'max': 5},
            {'name': 'reliability', 'label': '可靠性', 'min': 1, 'max': 5},
            {'name': 'usability', 'label': '易用性', 'min': 1, 'max': 5}
        ],
        'multi_select': {
            'most_useful': [
                'automation',
                'error_handling',
                'logging',
                'integration'
            ]
        },
        'multi_select_labels': {
            'automation': '自动化功能',
            'error_handling': '错误处理',
            'logging': '日志记录',
            'integration': '系统集成'
        }
    }
}


def generate_html_form(evaluation_type, title, metadata=None):
    """生成交互式评估表单HTML"""
    if evaluation_type not in EVALUATION_TEMPLATES:
        return None

    template = EVALUATION_TEMPLATES[evaluation_type]
    metadata = metadata or {}

    # 方向选择类型使用不同的样式
    if evaluation_type == 'direction-selection':
        html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{title}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            padding: 10px;
            font-size: 13px;
            background: #fff;
            margin: 0;
        }}
        h3 {{
            margin: 0 0 10px 0;
            color: #333;
        }}
        .option {{
            margin: 15px 0;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }}
        .option:hover {{
            background: #f5f5f5;
        }}
        .option input {{
            margin-right: 8px;
        }}
        .option-title {{
            font-weight: 600;
            margin-bottom: 5px;
        }}
        .option-desc {{
            color: #666;
            line-height: 1.4;
        }}
        button {{
            width: 100%;
            background: #007bff;
            color: white;
            border: none;
            padding: 10px;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
            margin-top: 10px;
        }}
        .status {{
            margin-top: 15px;
            padding: 10px;
            border-radius: 4px;
            text-align: center;
        }}
        .status.success {{ background: #d4edda; }}
        .status.error {{ background: #f8d7da; }}
        .status.loading {{ background: #d1ecf1; }}
    </style>
</head>
<body>
    <h3>🎯 选择下一步方向</h3>
    <p style="color: #666; margin-bottom: 15px;">请选择一个方向：</p>

    <form id="directionForm">
"""
        # 生成选项
        for option in template['options']:
            html += f"""
        <div class="option">
            <input type="radio" name="direction" value="{option['value']}" id="opt-{option['value']}">
            <label for="opt-{option['value']}">
                <div class="option-title">{option['title']}</div>
                <div class="option-desc">{option['desc']}</div>
            </label>
        </div>
"""

        html += f"""
        <button type="submit" id="submitBtn">确认选择</button>
    </form>

    <div class="status loading" id="status">选择一个方向，然后点击确认</div>

    <script>
    (function() {{
        const form = document.getElementById('directionForm');
        const status = document.getElementById('status');
        const submitBtn = document.getElementById('submitBtn');

        form.addEventListener('submit', async function(e) {{
            e.preventDefault();

            const selected = document.querySelector('input[name="direction"]:checked');

            if (!selected) {{
                status.className = 'status error';
                status.textContent = '⚠️ 请先选择一个方向';
                return;
            }}

            submitBtn.disabled = true;
            submitBtn.textContent = '提交中...';
            status.className = 'status loading';
            status.textContent = '⏳ 正在提交...';

            const data = {{
                evaluation_type: 'direction-selection',
                title: '{title}',
                selected_direction: selected.value,
                timestamp: new Date().toISOString()
            }};

            try {{
                const response = await fetch('/submit', {{
                    method: 'POST',
                    headers: {{ 'Content-Type': 'application/json' }},
                    body: JSON.stringify(data)
                }});

                const result = await response.json();

                if (result.success) {{
                    status.className = 'status success';
                    status.innerHTML = '<strong>✅ 已选择方向</strong><br><br>请回到对话框告诉AI："我已经提交了"';
                    submitBtn.textContent = '已提交';
                }} else {{
                    throw new Error(result.message);
                }}
            }} catch (error) {{
                status.className = 'status error';
                status.textContent = '❌ 提交失败: ' + error.message;
                submitBtn.disabled = false;
                submitBtn.textContent = '重试';
            }}
        }});
    }})();
    </script>
</body>
</html>
"""
        return html

    # 评分评估类型
    html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{title}</title>
    <style>
        * {{
            box-sizing: border-box;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            padding: 20px;
            max-width: 600px;
            margin: 0 auto;
            background: #f5f5f5;
        }}
        .container {{
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        h1 {{
            color: #333;
            margin-bottom: 30px;
        }}
        .section {{
            margin-bottom: 25px;
        }}
        label {{
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #555;
        }}
        .score-input {{
            width: 80px;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 16px;
        }}
        .checkbox-group {{
            margin-bottom: 10px;
        }}
        .checkbox-item {{
            display: flex;
            align-items: center;
            margin-bottom: 8px;
        }}
        .checkbox-item input {{
            margin-right: 10px;
            width: 18px;
            height: 18px;
        }}
        textarea {{
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 14px;
            font-family: inherit;
            resize: vertical;
        }}
        button {{
            background: #007bff;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
            margin: 5px;
        }}
        button:hover {{
            background: #0056b3;
        }}
        button:disabled {{
            background: #ccc;
            cursor: not-allowed;
        }}
        .metadata {{
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            font-size: 14px;
            color: #666;
        }}
        .result {{
            display: none;
            margin-top: 20px;
            padding: 15px;
            background: #d4edda;
            border-radius: 5px;
            color: #155724;
        }}
        .error {{
            display: none;
            margin-top: 20px;
            padding: 15px;
            background: #f8d7da;
            border-radius: 5px;
            color: #721c24;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>{title}</h1>

        <div class="metadata">
            <strong>评估类型：</strong> {evaluation_type}<br>
            <strong>时间：</strong> {metadata.get('timestamp', datetime.now().isoformat())}
        </div>

        <form id="evaluationForm">
"""

    # 评分维度
    for dim in template['dimensions']:
        html += f"""
            <div class="section">
                <label>{dim['label']} (1-{dim['max']}):</label>
                <input type="number" class="score-input" name="{dim['name']}"
                       min="{dim['min']}" max="{dim['max']}" value="{(dim['min'] + dim['max']) // 2}" required>
            </div>
"""

    # 多选
    for select_name, options in template['multi_select'].items():
        labels = template['multi_select_labels']
        if select_name == 'most_valuable':
            label_text = '最有价值的部分 (选2-3个)'
        elif select_name == 'most_useful':
            label_text = '最有用的功能 (选1-2个)'
        else:
            label_text = select_name

        html += f"""
            <div class="section">
                <label>{label_text}:</label>
"""

        for option in options:
            option_label = labels.get(option, option)
            html += f"""
                <div class="checkbox-item">
                    <input type="checkbox" name="{select_name}" value="{option}">
                    <span>{option_label}</span>
                </div>
"""

        html += """
            </div>
"""

    # 文本输入
    html += """
            <div class="section">
                <label>改进建议:</label>
                <textarea name="suggestions" rows="3" placeholder="你有什么具体的改进建议？"></textarea>
            </div>

            <div class="section">
                <label>会采取的第一个行动:</label>
                <textarea name="first_action" rows="2" placeholder="基于这份评估，你会立即采取的第一个行动是什么？"></textarea>
            </div>

            <button type="submit" id="submitBtn">提交评估</button>
        </form>

        <div class="result" id="successResult">
            <strong>✅ 评估已提交！</strong><br>
            AI正在读取你的反馈...
        </div>

        <div class="error" id="errorResult"></div>
    </div>

    <script>
    document.getElementById('evaluationForm').addEventListener('submit', async function(e) {
        e.preventDefault();

        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = '提交中...';

        // 收集表单数据
        const formData = new FormData(this);
        const data = {{
            evaluation_type: '{evaluation_type}',
            title: '{title}',
            metadata: {json.dumps(metadata, ensure_ascii=False)},
            scores: {{}},
            multi_select: {{}},
            text_input: {{}},
            timestamp: new Date().toISOString()
        }};

        // 收集评分
        {', '.join([f"data.scores.{dim['name']} = formData.get('{dim['name']}');" for dim in template['dimensions']])}

        // 收集多选
        {', '.join([f"data.multi_select.{name} = Array.from(formData.getAll('{name}'));" for name in template['multi_select'].keys()])}

        // 收集文本输入
        data.text_input.suggestions = formData.get('suggestions') || '';
        data.text_input.first_action = formData.get('first_action') || '';

        try {{
            // 提交到服务器
            const response = await fetch('http://localhost:5002/submit', {{
                method: 'POST',
                headers: {{
                    'Content-Type': 'application/json'
                }},
                body: JSON.stringify(data)
            }});

            const result = await response.json();

            if (result.success) {{
                document.getElementById('successResult').style.display = 'block';
                submitBtn.textContent = '已提交';
            }} else {{
                throw new Error(result.message);
            }}
        }} catch (error) {{
            document.getElementById('errorResult').textContent = '❌ 提交失败: ' + error.message;
            document.getElementById('errorResult').style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = '重试';
        }}
    }});
    </script>
</body>
</html>
"""

    return html


@app.route('/generate', methods=['POST'])
def generate_form():
    """生成交互式评估表单"""
    try:
        data = request.json
        evaluation_type = data.get('evaluation_type', 'analysis-report')
        title = data.get('title', EVALUATION_TEMPLATES[evaluation_type]['title'])
        metadata = data.get('metadata', {})

        html = generate_html_form(evaluation_type, title, metadata)

        if html is None:
            return jsonify({'success': False, 'message': f'Unknown evaluation type: {evaluation_type}'}), 400

        return html, 200, {'Content-Type': 'text/html; charset=utf-8'}
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/submit', methods=['POST'])
def submit_feedback():
    """接收评估反馈"""
    try:
        feedback_data = request.json

        # 添加时间戳（如果客户端没有提供）
        if 'timestamp' not in feedback_data:
            feedback_data['timestamp'] = datetime.now().isoformat()

        # 生成反馈ID
        feedback_id = f"feedback_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        # 保存到最新反馈文件
        with open(FEEDBACK_FILE, 'w', encoding='utf-8') as f:
            json.dump(feedback_data, f, ensure_ascii=False, indent=2)

        # 保存到历史记录
        history_file = os.path.join(FEEDBACK_HISTORY_DIR, f'{feedback_id}.json')
        with open(history_file, 'w', encoding='utf-8') as f:
            json.dump(feedback_data, f, ensure_ascii=False, indent=2)

        return jsonify({
            'success': True,
            'message': '反馈已保存',
            'feedback_id': feedback_id
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/feedback', methods=['GET'])
def get_feedback():
    """获取最新反馈"""
    try:
        if os.path.exists(FEEDBACK_FILE):
            with open(FEEDBACK_FILE, 'r', encoding='utf-8') as f:
                feedback = json.load(f)
            return jsonify({'success': True, 'feedback': feedback})
        else:
            return jsonify({'success': True, 'feedback': None})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/status', methods=['GET'])
def get_status():
    """获取服务器状态"""
    try:
        latest_feedback = None
        if os.path.exists(FEEDBACK_FILE):
            with open(FEEDBACK_FILE, 'r', encoding='utf-8') as f:
                feedback = json.load(f)
                latest_feedback = feedback.get('timestamp')

        return jsonify({
            'running': True,
            'port': SERVER_PORT,
            'latest_feedback': latest_feedback,
            'skill_dir': SKILL_DIR
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/templates', methods=['GET'])
def list_templates():
    """列出可用的评估模板"""
    templates = []
    for name, template in EVALUATION_TEMPLATES.items():
        templates.append({
            'name': name,
            'title': template['title'],
            'dimensions': len(template['dimensions']),
            'multi_select': list(template['multi_select'].keys())
        })
    return jsonify({'success': True, 'templates': templates})


@app.route('/form', methods=['GET'])
def serve_form():
    """提供评估表单（通过HTTP，避免CORS问题）"""
    # 从请求参数获取评估类型和标题
    evaluation_type = request.args.get('type', 'analysis-report')
    title = request.args.get('title', 'Alma 深度洞察分析评估')
    metadata = request.args.get('metadata')

    # 解析metadata
    meta_dict = None
    if metadata:
        try:
            meta_dict = json.loads(metadata)
        except:
            meta_dict = {'metadata': metadata}

    # 生成HTML表单
    html_content = generate_html_form(evaluation_type, title, meta_dict)

    if html_content:
        return html_content, 200, {'Content-Type': 'text/html; charset=utf-8'}
    else:
        return jsonify({'success': False, 'message': 'Invalid evaluation type'}), 400


def check_server_running():
    """检查服务器是否已经在运行"""
    try:
        import urllib.request
        response = urllib.request.urlopen(f'http://localhost:{SERVER_PORT}/status', timeout=1)
        return True
    except:
        return False


if __name__ == '__main__':
    # 检查是否已经在运行
    if check_server_running():
        print(f"Server is already running on port {SERVER_PORT}")
    else:
        print(f"Starting Interactive Feedback Evaluator Server on port {SERVER_PORT}")
        print(f"Data directory: {DATA_DIR}")
        print(f"Feedback file: {FEEDBACK_FILE}")
        print(f"History directory: {FEEDBACK_HISTORY_DIR}")
        print("\nAvailable endpoints:")
        print(f"  - POST http://localhost:{SERVER_PORT}/generate")
        print(f"  - POST http://localhost:{SERVER_PORT}/submit")
        print(f"  - GET  http://localhost:{SERVER_PORT}/feedback")
        print(f"  - GET  http://localhost:{SERVER_PORT}/status")
        print(f"  - GET  http://localhost:{SERVER_PORT}/templates")
        print("\nPress Ctrl+C to stop the server")

        app.run(host='localhost', port=SERVER_PORT, debug=False)
