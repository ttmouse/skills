#!/usr/bin/env bash
#
# Extract voice records from Typeless.app database
# Usage: ./extract_voice_records.sh [options]
#
# Options:
#   --days N         Extract records from last N days (default: 1)
#   --date YYYY-MM-DD Extract records from specific date
#   --all            Extract all voice records
#   --output DIR     Output directory (default: ./voice_records)
#   --format FORMAT  Output format: json, csv, or markdown (default: json)
#

set -e

# Default values
TYPELESS_DB="$HOME/Library/Application Support/Typeless/typeless.db"
OUTPUT_DIR="./voice_records"
FORMAT="json"
DAYS=1

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --days)
            DAYS="$2"
            shift 2
            ;;
        --date)
            SPECIFIC_DATE="$2"
            shift 2
            ;;
        --all)
            DAYS=0
            shift
            ;;
        --output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --format)
            FORMAT="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --days N         Extract records from last N days (default: 1)"
            echo "  --date YYYY-MM-DD Extract records from specific date"
            echo "  --all            Extract all voice records"
            echo "  --output DIR     Output directory (default: ./voice_records)"
            echo "  --format FORMAT  Output format: json, csv, or markdown (default: json)"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Check if database exists
if [[ ! -f "$TYPELESS_DB" ]]; then
    echo "Error: Typeless database not found at $TYPELESS_DB"
    exit 1
fi

# Build query
if [[ -n "$SPECIFIC_DATE" ]]; then
    DATE_FILTER="AND DATE(created_at) = DATE('$SPECIFIC_DATE')"
elif [[ "$DAYS" -eq 0 ]]; then
    DATE_FILTER=""
else
    DATE_FILTER="AND DATE(created_at) >= DATE('now', '-$DAYS days')"
fi

QUERY="
SELECT
    id,
    refined_text,
    status,
    created_at,
    updated_at,
    duration,
    detected_language,
    mic_device,
    focused_app_name,
    focused_app_window_title,
    focused_app_window_web_domain,
    focused_app_window_web_url
FROM history
WHERE mode = 'voice_transcript' AND status = 'transcript'
    $DATE_FILTER
ORDER BY created_at ASC;
"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Execute query based on format
case "$FORMAT" in
    json)
        sqlite3 "$TYPELESS_DB" "$QUERY" | awk -F'|' '
        BEGIN { print "["; first=1 }
        {
            gsub(/\\/, "\\\\", $1); gsub(/"/, "\\\"", $1)
            gsub(/\\/, "\\\\", $2); gsub(/"/, "\\\"", $2)
            gsub(/\\/, "\\\\", $3); gsub(/"/, "\\\"", $3)
            gsub(/\\/, "\\\\", $4); gsub(/"/, "\\\"", $4)
            gsub(/\\/, "\\\\", $5); gsub(/"/, "\\\"", $5)
            if (!first) print ","
            first=0
            printf "  {\n"
            printf "    \"id\": \"%s\",\n", $1
            printf "    \"refined_text\": \"%s\",\n", $2
            printf "    \"status\": \"%s\",\n", $3
            printf "    \"created_at\": \"%s\",\n", $4
            printf "    \"updated_at\": \"%s\",\n", $5
            printf "    \"duration\": %s,\n", ($6 == "" ? "null" : $6)
            printf "    \"detected_language\": \"%s\",\n", $7
            printf "    \"mic_device\": \"%s\",\n", $8
            printf "    \"focused_app_name\": \"%s\",\n", $9
            printf "    \"focused_app_window_title\": \"%s\",\n", $10
            printf "    \"focused_app_window_web_domain\": \"%s\",\n", $11
            printf "    \"focused_app_window_web_url\": \"%s\"\n", $12
            printf "  }"
        }
        END { print "\n]" }
        ' > "$OUTPUT_DIR/voice_records.json"
        echo "Extracted voice records to $OUTPUT_DIR/voice_records.json"
        ;;

    csv)
        echo "id,refined_text,status,created_at,updated_at,duration,detected_language,mic_device,focused_app_name,focused_app_window_title,focused_app_window_web_domain,focused_app_window_web_url" > "$OUTPUT_DIR/voice_records.csv"
        sqlite3 -header -csv "$TYPELESS_DB" "$QUERY" >> "$OUTPUT_DIR/voice_records.csv"
        echo "Extracted voice records to $OUTPUT_DIR/voice_records.csv"
        ;;

    markdown)
        sqlite3 "$TYPELESS_DB" "$QUERY" | while IFS='|' read -r id refined_text status created_at updated_at duration detected_language mic_device app_name window_title web_domain web_url; do
            # Format date for filename
            date_suffix=$(echo "$created_at" | cut -dT -f1)
            time_suffix=$(echo "$created_at" | cut -dT -f2 | cut -d: -f1,2 | tr -d ':')

            # Create markdown file
            filename="${OUTPUT_DIR}/${date_suffix}-Voice-Record-${time_suffix}.md"

            cat > "$filename" <<EOF
---
created: ${created_at}
type: voice-record
source: typeless
id: ${id}
app: ${app_name}
tags: [voice/transcript]
---

# Voice Record - ${created_at}

## Transcription
${refined_text}

## Metadata
- **Created**: ${created_at}
- **Updated**: ${updated_at}
- **Duration**: ${duration}s
- **Language**: ${detected_language}
- **Microphone**: ${mic_device}
- **Status**: ${status}

## Context
EOF

            if [[ -n "$app_name" ]]; then
                echo "- **App**: ${app_name}" >> "$filename"
            fi
            if [[ -n "$window_title" ]]; then
                echo "- **Window Title**: ${window_title}" >> "$filename"
            fi
            if [[ -n "$web_domain" ]]; then
                echo "- **Website**: ${web_domain}" >> "$filename"
            fi
            if [[ -n "$web_url" ]]; then
                echo "- **URL**: ${web_url}" >> "$filename"
            fi

            cat >> "$filename" <<EOF

## Links
- [[Daily Note ${date_suffix}]]

---
*Extracted from Typeless.app on $(date -u +"%Y-%m-%dT%H:%M:%SZ")*
EOF

            echo "Created: $filename"
        done
        echo "Extracted $(ls -1 "$OUTPUT_DIR"/*.md 2>/dev/null | wc -l) voice records to $OUTPUT_DIR/"
        ;;

    *)
        echo "Error: Unknown format '$FORMAT'. Use json, csv, or markdown."
        exit 1
        ;;
esac

# Display summary
RECORD_COUNT=$(sqlite3 "$TYPELESS_DB" "SELECT COUNT(*) FROM history WHERE mode = 'voice_transcript' AND status = 'transcript' $DATE_FILTER;")
echo "✓ Extracted $RECORD_COUNT voice record(s)"
