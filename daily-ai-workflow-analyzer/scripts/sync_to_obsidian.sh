#!/usr/bin/env bash
#
# Sync voice records to Obsidian vault
# Usage: ./sync_to_obsidian.sh [source_dir] [options]
#
# Arguments:
#   source_dir      Source directory containing voice records
#
# Options:
#   --dry-run        Show what would be copied without actually copying
#   --delete         Delete files in vault that don't exist in source
#   --vault PATH     Custom vault path (default: iCloud vault)
#

set -e

# Default values
OBSIDIAN_VAULT="$HOME/Library/Mobile Documents/com~apple~CloudDocs/douba-OB"
VOICE_RECORDS_DIR="$OBSIDIAN_VAULT/Voice Records"
SOURCE_DIR=""
DRY_RUN=false
DELETE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --delete)
            DELETE=true
            shift
            ;;
        --vault)
            OBSIDIAN_VAULT="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 <source_dir> [options]"
            echo "Arguments:"
            echo "  source_dir      Source directory containing voice records"
            echo ""
            echo "Options:"
            echo "  --dry-run        Show what would be copied without actually copying"
            echo "  --delete         Delete files in vault that don't exist in source"
            echo "  --vault PATH     Custom vault path"
            exit 0
            ;;
        -*)
            echo "Unknown option: $1"
            exit 1
            ;;
        *)
            if [[ -z "$SOURCE_DIR" ]]; then
                SOURCE_DIR="$1"
            else
                echo "Error: Too many arguments"
                exit 1
            fi
            shift
            ;;
    esac
done

# Check source directory
if [[ -z "$SOURCE_DIR" ]]; then
    echo "Error: Source directory is required"
    echo "Usage: $0 <source_dir> [options]"
    exit 1
fi

if [[ ! -d "$SOURCE_DIR" ]]; then
    echo "Error: Source directory not found: $SOURCE_DIR"
    exit 1
fi

# Check vault exists
if [[ ! -d "$OBSIDIAN_VAULT" ]]; then
    echo "Error: Obsidian vault not found at $OBSIDIAN_VAULT"
    exit 1
fi

# Create voice records directory structure
mkdir -p "$VOICE_RECORDS_DIR"

echo "📂 Syncing voice records to Obsidian vault..."
echo "   Source: $SOURCE_DIR"
echo "   Destination: $VOICE_RECORDS_DIR"
echo ""

# Counter for statistics
COPIED=0
SKIPPED=0
UPDATED=0

# Process each file
for source_file in "$SOURCE_DIR"/*.md; do
    if [[ ! -f "$source_file" ]]; then
        continue
    fi

    filename=$(basename "$source_file")
    dest_file="$VOICE_RECORDS_DIR/$filename"

    # Check if file exists and compare
    if [[ -f "$dest_file" ]]; then
        # Compare files
        if ! cmp -s "$source_file" "$dest_file"; then
            echo "🔄 Updating: $filename"
            if [[ "$DRY_RUN" == false ]]; then
                cp "$source_file" "$dest_file"
            fi
            ((UPDATED++))
        else
            echo "⏭️  Skipping: $filename (unchanged)"
            ((SKIPPED++))
        fi
    else
        echo "📝 Copying: $filename"
        if [[ "$DRY_RUN" == false ]]; then
            cp "$source_file" "$dest_file"
        fi
        ((COPIED++))
    fi
done

# Handle delete option
if [[ "$DELETE" == true ]]; then
    echo ""
    echo "🗑️  Checking for files to delete..."

    for vault_file in "$VOICE_RECORDS_DIR"/*.md; do
        if [[ ! -f "$vault_file" ]]; then
            continue
        fi

        filename=$(basename "$vault_file")
        source_file="$SOURCE_DIR/$filename"

        if [[ ! -f "$source_file" ]]; then
            echo "🗑️  Deleting: $filename"
            if [[ "$DRY_RUN" == false ]]; then
                rm "$vault_file"
            fi
        fi
    done
fi

# Summary
echo ""
echo "📊 Summary:"
echo "   Copied:  $COPIED"
echo "   Updated: $UPDATED"
echo "   Skipped: $SKIPPED"
echo "   Total:   $((COPIED + UPDATED + SKIPPED))"

if [[ "$DRY_RUN" == true ]]; then
    echo ""
    echo "⚠️  Dry run mode - no files were actually modified"
fi

echo "✓ Sync complete!"
