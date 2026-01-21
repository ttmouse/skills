import json
import os
import sys
import argparse
from datetime import datetime

# 配置：目标 Snippets 文件路径
TARGET_FILE = "/Users/douba/Downloads/Snippets 2026-01-11 21.15.35.json"
# 备份路径
BACKUP_FILE = os.path.join(os.path.dirname(__file__), "snippets_backup.json")

def load_snippets(filepath):
    if not os.path.exists(filepath):
        return []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading snippets: {e}")
        return []

def save_snippets(filepath, snippets):
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(snippets, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"Error saving snippets: {e}")
        return False

def add_snippet(name, text, keyword=None):
    snippets = load_snippets(TARGET_FILE)
    
    # 查找是否存在同名 snippet
    existing = None
    for s in snippets:
        if s.get('name') == name:
            existing = s
            break
            
    new_data = {"name": name, "text": text}
    if keyword:
        new_data["keyword"] = keyword
        
    if existing:
        existing.update(new_data)
        action = "Updated"
    else:
        snippets.append(new_data)
        action = "Added"
        
    if save_snippets(TARGET_FILE, snippets):
        print(f"SUCCESS: {action} snippet '{name}'")
        print(f"File path: {TARGET_FILE}")
    else:
        print("FAILURE: Could not save snippet")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Manage Raycast Snippets')
    parser.add_argument('--name', required=True, help='Snippet Name')
    parser.add_argument('--text', required=True, help='Snippet Content')
    parser.add_argument('--keyword', help='Snippet Keyword')
    
    args = parser.parse_args()
    
    add_snippet(args.name, args.text, args.keyword)
