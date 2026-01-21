#!/usr/bin/env python3
"""
Extract Voice Records from Typeless.app

This script queries the Typeless SQLite database and extracts voice transcription records.
Output is structured JSON that can be organized into Obsidian notes.
"""

import sqlite3
import json
import sys
import os
from datetime import datetime, timedelta
from pathlib import Path

# Configuration
TYPELESS_DB_PATH = os.path.expanduser("~/Library/Application Support/Typeless/typeless.db")
OUTPUT_DIR = os.path.expanduser("~/Library/Application Support/alma/workspaces/temp-voice-extraction")


def get_db_connection():
    """Connect to Typeless SQLite database."""
    if not os.path.exists(TYPELESS_DB_PATH):
        print(f"Error: Typeless database not found at {TYPELESS_DB_PATH}")
        sys.exit(1)
    return sqlite3.connect(TYPELESS_DB_PATH)


def extract_voice_records(days=None, status='transcript', limit=None):
    """
    Extract voice records from Typeless database.

    Args:
        days: Number of recent days to extract (None for all)
        status: Filter by status (default: 'transcript')
        limit: Maximum number of records to extract (None for all)

    Returns:
        List of voice record dictionaries
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Build query
    query = """
        SELECT
            id,
            refined_text,
            edited_text,
            status,
            created_at,
            updated_at,
            duration,
            languages,
            detected_language,
            mic_device,
            focused_app_name,
            focused_app_window_title,
            focused_app_window_web_domain,
            focused_app_window_web_url,
            mode,
            mode_meta
        FROM history
        WHERE mode = 'voice_transcript'
    """

    params = []
    if status:
        query += " AND status = ?"
        params.append(status)

    if days:
        cutoff_date = (datetime.utcnow() - timedelta(days=days)).isoformat() + 'Z'
        query += " AND created_at >= ?"
        params.append(cutoff_date)

    query += " ORDER BY created_at DESC"

    if limit:
        query += " LIMIT ?"
        params.append(limit)

    cursor.execute(query, params)
    rows = cursor.fetchall()

    columns = [
        'id', 'refined_text', 'edited_text', 'status', 'created_at', 'updated_at',
        'duration', 'languages', 'detected_language', 'mic_device', 'focused_app_name',
        'focused_app_window_title', 'focused_app_window_web_domain', 'focused_app_window_web_url',
        'mode', 'mode_meta'
    ]

    records = []
    for row in rows:
        record = dict(zip(columns, row))

        # Parse and format datetime
        try:
            dt = datetime.fromisoformat(record['created_at'].replace('Z', '+00:00'))
            record['date'] = dt.strftime('%Y-%m-%d')
            record['time'] = dt.strftime('%H:%M:%S')
            record['iso_date'] = dt.strftime('%Y-%m-%dT%H:%M:%SZ')
        except:
            record['date'] = record['created_at'][:10]
            record['time'] = record['created_at'][11:19]

        # Add metadata
        record['audio_path'] = f"Recordings/{record['id']}.m4a"
        record['audio_exists'] = os.path.exists(os.path.expanduser(f"~/Library/Application Support/Typeless/Recordings/{record['id']}.m4a"))

        records.append(record)

    conn.close()
    return records


def group_by_date(records):
    """Group records by date for organized output."""
    grouped = {}
    for record in records:
        date = record['date']
        if date not in grouped:
            grouped[date] = []
        grouped[date].append(record)
    return grouped


def save_to_json(records, output_path):
    """Save records to JSON file."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    print(f"✓ Saved {len(records)} records to {output_path}")


def save_grouped_to_json(grouped, output_path):
    """Save grouped records to JSON file."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(grouped, f, ensure_ascii=False, indent=2)
    print(f"✓ Saved grouped records to {output_path}")


def main():
    """Main execution function."""
    import argparse

    parser = argparse.ArgumentParser(description='Extract voice records from Typeless')
    parser.add_argument('--days', type=int, default=None, help='Number of recent days')
    parser.add_argument('--status', type=str, default='transcript', help='Filter by status')
    parser.add_argument('--limit', type=int, default=None, help='Max records to extract')
    parser.add_argument('--output', type=str, default=None, help='Output file path')

    args = parser.parse_args()

    print("Extracting voice records from Typeless...")
    print(f"Database: {TYPELESS_DB_PATH}")

    records = extract_voice_records(days=args.days, status=args.status, limit=args.limit)

    print(f"\nExtracted {len(records)} records")

    if args.output:
        output_path = args.output
    else:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_path = os.path.join(OUTPUT_DIR, f'voice_records_{timestamp}.json')

    # Save records
    save_to_json(records, output_path)

    # Also save grouped by date
    grouped = group_by_date(records)
    grouped_path = output_path.replace('.json', '_grouped.json')
    save_grouped_to_json(grouped, grouped_path)

    # Print summary
    print(f"\n📊 Summary:")
    print(f"  Total records: {len(records)}")
    print(f"  Total dates: {len(grouped)}")

    for date in sorted(grouped.keys())[:5]:
        print(f"    {date}: {len(grouped[date])} records")

    if len(grouped) > 5:
        print(f"    ... and {len(grouped) - 5} more dates")


if __name__ == "__main__":
    main()
