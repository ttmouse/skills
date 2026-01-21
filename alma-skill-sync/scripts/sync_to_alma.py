import os
import re
import requests
import argparse

BASE_URL = "http://localhost:23001/api/prompts"

def get_skill_names(skills_dir):
    skill_names = set()
    if not os.path.exists(skills_dir):
        return skill_names
    
    for root, dirs, files in os.walk(skills_dir):
        skill_files = [f for f in files if f.lower() == "skill.md"]
        for sf in skill_files:
            file_path = os.path.join(root, sf)
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                match = re.search(r'^name:\s*(?:"([^"]+)"|\'([^\']+)\'|([^\n\r]+))', content, re.MULTILINE)
                if match:
                    name = match.group(1) or match.group(2) or match.group(3)
                    name = name.strip().strip('"').strip("'")
                    skill_names.add(name)
                else:
                    dir_name = os.path.basename(root)
                    skill_names.add(dir_name)
            except Exception as e:
                print(f"Error reading {file_path}: {e}")
    return skill_names

def get_existing_prompts():
    try:
        response = requests.get(BASE_URL)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error fetching prompts: {e}")
        return []

def create_prompt(name, content):
    try:
        data = {
            "name": name,
            "content": content
        }
        response = requests.post(BASE_URL, json=data)
        response.raise_for_status()
        print(f"Created: /{name}")
    except Exception as e:
        print(f"Failed: /{name} - {e}")

def delete_prompt(prompt_id, name):
    try:
        response = requests.delete(f"{BASE_URL}/{prompt_id}")
        response.raise_for_status()
        print(f"Deleted orphan prompt: /{name}")
    except Exception as e:
        print(f"Failed to delete /{name}: {e}")

def main():
    parser = argparse.ArgumentParser(description="Sync Alma Skills to Slash Command Prompts")
    parser.add_argument("--clean", action="store_true", help="Remove prompts that no longer have a corresponding skill")
    args = parser.parse_args()

    skills_paths = [
        os.path.expanduser("~/.claude/skills"),
        os.path.expanduser("~/.claude/plugins"),
    ]
    
    all_skill_names = set()
    for path in skills_paths:
        print(f"Scanning {path}...")
        all_skill_names.update(get_skill_names(path))
    
    print(f"Total distinct skills found: {len(all_skill_names)}")

    existing_prompts = get_existing_prompts()
    existing_map = {p['name']: p['id'] for p in existing_prompts}

    # Create missing prompts
    for name in all_skill_names:
        if name not in existing_map:
            create_prompt(name, f"@{name}")
        else:
            # Optionally update content if needed, but for now skip
            pass

    # Clean up orphan prompts
    if args.clean:
        for name, p_id in existing_map.items():
            if name not in all_skill_names:
                # Basic protection: only delete if content starts with @
                # (meaning it was likely created by this script)
                prompt_data = next((p for p in existing_prompts if p['id'] == p_id), None)
                if prompt_data and prompt_data.get('content', '').startswith('@'):
                    # Skip some core ones if any
                    if name in ["fy", "MK", "agent"]:
                        continue
                    delete_prompt(p_id, name)

if __name__ == "__main__":
    main()
