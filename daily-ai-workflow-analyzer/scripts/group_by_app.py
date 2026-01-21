#!/usr/bin/env python3
"""
Group voice records by APP for analysis
"""

import json
import os
from pathlib import Path

# Configuration
INPUT_FILE = os.path.expanduser("~/Library/Application Support/alma/workspaces/temp-voice-extraction/analysis_input.json")
OUTPUT_DIR = os.path.expanduser("~/Library/Application Support/alma/workspaces/temp-voice-extraction/by_app")


def load_records(json_path):
    """Load voice records from JSON file."""
    with open(json_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def group_by_app(records):
    """Group records by focused_app_name."""
    grouped = {}
    for record in records:
        app = record.get('focused_app_name', 'Unknown')
        if app not in grouped:
            grouped[app] = []
        grouped[app].append(record)
    return grouped


def save_app_records(app_name, records, output_dir):
    """Save records for a specific app."""
    os.makedirs(output_dir, exist_ok=True)

    # Clean app name for filename
    safe_name = app_name.replace(' ', '_').replace('/', '_')
    filename = f"{safe_name}.json"
    filepath = os.path.join(output_dir, filename)

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    return filepath


def main():
    """Main execution."""
    print("Loading voice records...")
    records = load_records(INPUT_FILE)
    print(f"Loaded {len(records)} records")

    print("\nGrouping by APP...")
    grouped = group_by_app(records)

    print(f"\nFound {len(grouped)} apps:")
    for app in sorted(grouped.keys(), key=lambda x: len(grouped[x]), reverse=True):
        print(f"  {app}: {len(grouped[app])} records")

    print("\nSaving to individual files...")
    saved_files = []
    for app, app_records in sorted(grouped.items(), key=lambda x: len(x[1]), reverse=True):
        filepath = save_app_records(app, app_records, OUTPUT_DIR)
        saved_files.append(filepath)
        print(f"  ✓ Saved: {app} ({len(app_records)} records)")

    print(f"\n✓ Complete! Saved {len(saved_files)} files to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
