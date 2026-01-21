#!/usr/bin/env python3
"""
Analysis Server - Provides API for voice record analysis

Usage: python3 analysis_server.py
"""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import subprocess
import os
import json
import threading
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Configuration
SKILL_DIR = "/Users/douba/.claude/skills/daily-ai-workflow-analyzer"
DATA_DIR = os.path.expanduser("~/Library/Application Support/alma/workspaces/temp-voice-extraction/by_app")
REPORT_DIR = os.path.expanduser("~/Library/Application Support/alma/workspaces/temp-voice-extraction/analysis_reports")

# Store analysis status
analysis_status = {}


@app.route('/')
def index():
    """Serve the dashboard HTML"""
    return send_from_directory(os.path.dirname(__file__), 'analysis_dashboard.html')


@app.route('/api/data')
def get_data():
    """Get all voice record data"""
    apps = []

    for filename in os.listdir(DATA_DIR):
        if filename.endswith('.json'):
            app_name = filename.replace('.json', '').replace('_', ' ')
            filepath = os.path.join(DATA_DIR, filename)

            with open(filepath, 'r', encoding='utf-8') as f:
                records = json.load(f)

            apps.append({
                'name': app_name,
                'records': len(records),
                'status': analysis_status.get(app_name, 'pending')
            })

    return jsonify(apps)


@app.route('/api/analyze', methods=['POST'])
def analyze():
    """Trigger AI analysis for an app"""
    data = request.json
    app_name = data.get('name')

    if not app_name:
        return jsonify({'error': 'App name required'}), 400

    # Convert spaces to underscores for filename
    app_filename = app_name.replace(' ', '_')
    filepath = os.path.join(DATA_DIR, f"{app_filename}.json")

    if not os.path.exists(filepath):
        return jsonify({'error': f'App data not found: {app_name}'}), 404

    # Check if already analyzing
    if analysis_status.get(app_name) == 'analyzing':
        return jsonify({'error': 'Already analyzing'}), 400

    # Update status
    analysis_status[app_name] = 'analyzing'

    # Run analysis in background thread
    def run_analysis():
        try:
            script = os.path.join(SKILL_DIR, "scripts/analyze_voice_workflow.py")
            result = subprocess.run(
                ['python3', script, '--app', app_name, '--skip-extract', '--skip-group'],
                capture_output=True,
                text=True,
                timeout=300  # 5 minutes timeout
            )

            if result.returncode == 0:
                analysis_status[app_name] = 'completed'
            else:
                analysis_status[app_name] = 'failed'
                print(f"Analysis failed: {result.stderr}")

        except Exception as e:
            analysis_status[app_name] = 'failed'
            print(f"Analysis error: {e}")

    thread = threading.Thread(target=run_analysis)
    thread.start()

    return jsonify({'status': 'started'})


@app.route('/api/report/<app_name>')
def get_report(app_name):
    """Get analysis report for an app"""
    # Convert spaces to underscores for filename
    app_filename = app_name.replace(' ', '_')

    # Try to find the report file
    # Priority: Final version > Standard version > Any matching file
    possible_files = [
        f"{app_filename}_Analysis_Final_2026-01-11.md",
        f"{app_filename}_Analysis_2026-01-11.md",
        f"{app_filename}_Analysis_Final.md",
        f"{app_filename}_Analysis.md"
    ]

    filepath = None
    for report_file in possible_files:
        possible_path = os.path.join(REPORT_DIR, report_file)
        if os.path.exists(possible_path):
            filepath = possible_path
            break

    if not filepath:
        # List all available report files for debugging
        if os.path.exists(REPORT_DIR):
            available = [f for f in os.listdir(REPORT_DIR) if f.endswith('.md')]
            print(f"Available reports: {available}")
        return jsonify({
            'error': 'Report not found',
            'tried_files': possible_files,
            'report_dir': REPORT_DIR
        }), 404

    with open(filepath, 'r', encoding='utf-8') as f:
        return f.read(), 200, {'Content-Type': 'text/markdown; charset=utf-8'}


@app.route('/api/status')
def get_status():
    """Get analysis status for all apps"""
    return jsonify(analysis_status)


if __name__ == '__main__':
    print("=" * 60)
    print("🚀 语音记录分析服务器")
    print("=" * 60)
    print(f"访问地址: http://localhost:8080")
    print(f"数据目录: {DATA_DIR}")
    print(f"报告目录: {REPORT_DIR}")
    print("=" * 60)
    print("按 Ctrl+C 停止服务器")
    print()

    app.run(host='0.0.0.0', port=8080, debug=True)
