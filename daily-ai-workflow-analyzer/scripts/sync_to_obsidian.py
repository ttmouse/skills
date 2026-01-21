#!/usr/bin/env python3
"""
Sync Voice Records to Obsidian

This script takes extracted voice records and converts them into
structured Obsidian Markdown notes, then syncs to the vault.
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path

# Configuration
OBSIDIAN_VAULT_PATH = os.path.expanduser("~/Library/Mobile Documents/com~apple~CloudDocs/douba-OB")
VOICE_OUTPUT_DIR = os.path.expanduser("~/Library/Application Support/alma/workspaces/temp-voice-extraction")
OBSIDIAN_VOICE_DIR = os.path.join(OBSIDIAN_VAULT_PATH, "Voice_Notes")


def load_voice_records(json_path):
    """Load voice records from JSON file."""
    if not os.path.exists(json_path):
        print(f"Error: Voice records file not found at {json_path}")
        sys.exit(1)

    with open(json_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def generate_obsidian_note(record):
    """Generate Obsidian Markdown note from a voice record."""
    date = record['date']
    time = record['time']
    text = record['refined_text'] or record['edited_text'] or ''

    if not text:
        return None

    # Generate note content
    content = f"""# Voice Note: {date}

> Created: {date} {time}
> Duration: {record.get('duration', 'N/A')}s
> Language: {record.get('detected_language', 'N/A')}

## Transcription

{text}

## Context

| Field | Value |
|-------|-------|
| App | {record.get('focused_app_name', 'N/A')} |
| Window | {record.get('focused_app_window_title', 'N/A')} |
| Web Domain | {record.get('focused_app_window_web_domain', 'N/A')} |
| Status | {record.get('status', 'N/A')} |

## Metadata

```yaml
id: {record['id']}
created_at: {record['created_at']}
mode: {record.get('mode', 'voice_transcript')}
audio_path: {record.get('audio_path', 'N/A')}
```

---

#VoiceNote #VoiceTranscript #Typeless
"""
    return content


def save_obsidian_note(content, date, record_id, output_dir):
    """Save note to Obsidian vault."""
    os.makedirs(output_dir, exist_ok=True)

    # Generate filename: YYYY-MM-DD-TIME.md
    time_str = record_id[:8]  # Use part of ID for uniqueness
    filename = f"{date}-{time_str}.md"
    filepath = os.path.join(output_dir, filename)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    return filepath


def generate_daily_summary(records_by_date):
    """Generate a daily summary note with all voice records."""
    summaries = {}

    for date, records in records_by_date.items():
        if not records:
            continue

        # Group by hour for better organization
        hourly = {}
        for record in records:
            hour = record['time'][:2]
            if hour not in hourly:
                hourly[hour] = []
            hourly[hour].append(record)

        # Build summary content
        content = f"""# Voice Notes Summary: {date}

> Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
> Total Records: {len(records)}

## Daily Overview

"""

        # Add hourly breakdown
        for hour in sorted(hourly.keys()):
            hour_records = hourly[hour]
            content += f"### {hour}:00 ({len(hour_records)} records)\n\n"

            for i, record in enumerate(hour_records, 1):
                text = record['refined_text'] or record['edited_text'] or ''
                if text:
                    content += f"{i}. {text}\n"
                    if record.get('focused_app_name'):
                        content += f"   - App: {record['focused_app_name']}\n"
                    content += "\n"

        content += """
---

## Notes

- Records are extracted from Typeless.app voice transcription
- Individual notes are saved in this directory with detailed context
- Audio files are available in Typeless recordings folder

#VoiceNotes #DailySummary #Typeless
"""
        summaries[date] = content

    return summaries


def sync_to_obsidian(json_path, generate_daily_summaries=True):
    """Main sync function."""
    print(f"Loading voice records from {json_path}...")

    # Load records
    records = load_voice_records(json_path)
    if not records:
        print("No records to sync.")
        return

    # Create output directory
    os.makedirs(OBSIDIAN_VOICE_DIR, exist_ok=True)

    # Group by date
    records_by_date = {}
    for record in records:
        date = record['date']
        if date not in records_by_date:
            records_by_date[date] = []
        records_by_date[date].append(record)

    # Generate individual notes
    print(f"\nGenerating individual notes...")
    notes_created = 0

    for record in records:
        content = generate_obsidian_note(record)
        if content:
            filepath = save_obsidian_note(content, record['date'], record['id'], OBSIDIAN_VOICE_DIR)
            notes_created += 1

    print(f"✓ Created {notes_created} individual notes")

    # Generate daily summaries
    if generate_daily_summaries:
        print(f"\nGenerating daily summaries...")
        summaries = generate_daily_summary(records_by_date)

        summary_dir = os.path.join(OBSIDIAN_VOICE_DIR, "Summaries")
        os.makedirs(summary_dir, exist_ok=True)

        for date, content in summaries.items():
            filename = f"{date}-Summary.md"
            filepath = os.path.join(summary_dir, filename)

            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)

        print(f"✓ Created {len(summaries)} daily summaries")

    # Print summary
    print(f"\n📦 Sync complete!")
    print(f"  Vault path: {OBSIDIAN_VOICE_DIR}")
    print(f"  Dates processed: {len(records_by_date)}")
    print(f"  Individual notes: {notes_created}")
    if generate_daily_summaries:
        print(f"  Daily summaries: {len(records_by_date)}")


def main():
    """Main execution function."""
    import argparse

    parser = argparse.ArgumentParser(description='Sync voice records to Obsidian')
    parser.add_argument('--input', type=str, required=True, help='Path to voice records JSON file')
    parser.add_argument('--no-summaries', action='store_true', help='Skip generating daily summaries')

    args = parser.parse_args()

    sync_to_obsidian(args.input, generate_daily_summaries=not args.no_summaries)


if __name__ == "__main__":
    main()
