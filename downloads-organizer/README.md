# Downloads Organizer Skill

Automatically organize and clean up your downloads folder with intelligent file categorization.

## Quick Start

### Analyze Downloads Folder
```bash
python3 scripts/organizer.py --analyze
```

### Organize Files (Preview)
```bash
python3 scripts/organizer.py --organize --dry-run
```

### Organize Files (Execute)
```bash
python3 scripts/organizer.py --organize
```

## Features

- **Automatic Categorization**: Sort files by type (documents, images, videos, installers, etc.)
- **File Analysis**: Detailed statistics on storage usage and file distribution
- **Dry-Run Mode**: Preview changes before executing
- **Safe Operations**: Non-destructive by default
- **Smart Detection**: Identify large files and organize efficiently

## File Categories

| Category | Extensions | Destination Folder |
|-----------|------------|-------------------|
| Documents | .pdf, .doc, .txt, .md, .json, .csv | Documents/ |
| Images | .png, .jpg, .jpeg, .gif, .svg | Images/ |
| Videos | .mp4, .mov, .avi, .mkv | Videos/ |
| Audio | .mp3, .wav, .m4a, .flac | Audio/ |
| Installers | .dmg, .pkg, .app, .zip | Installers/ |

## Example Usage

```bash
# Analyze current state
python3 scripts/organizer.py --analyze

# Preview organization
python3 scripts/organizer.py --organize --dry-run

# Execute organization
python3 scripts/organizer.py --organize
```

## Output Example

```
============================================================
DOWNLOADS FOLDER ANALYSIS
============================================================
[INFO] Location: /Users/douba/Downloads
[INFO] Total Size: 71.1 GB
[INFO] Total Files: 1,217,394

📊 File Distribution:
  Installers       141 files    12.7 GB
  Videos           637 files     9.4 GB
  Documents       95871 files     2.6 GB
  Images          18396 files     2.2 GB
  Audio            424 files     1.2 GB
```

## Integration

This skill works seamlessly with Claude's skill system:

1. **Skill Discovery**: Automatically detected by Claude
2. **Context Awareness**: Works with your downloads folder
3. **Safety First**: Preview mode for all operations
4. **Detailed Reporting**: Comprehensive analysis and recommendations

## Best Practices

1. **Run --analyze first** to understand current state
2. **Use --dry-run** to preview changes
3. **Organize regularly** to prevent accumulation
4. **Check reports** to identify space hogs

## Troubleshooting

**Problem**: Script not found
```bash
# Use python3 explicitly
python3 scripts/organizer.py --analyze
```

**Problem**: Permission errors
```bash
# Fix permissions on downloads folder
chmod -R u+rw ~/Downloads
```

## License

Apache-2.0
