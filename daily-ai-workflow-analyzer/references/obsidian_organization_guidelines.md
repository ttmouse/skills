# Obsidian Organization Guidelines

## Vault Location
`/Users/douba/Library/Mobile Documents/com~apple~CloudDocs/douba-OB`

## Folder Structure

```
douba-OB/
├── 📁 Voice Records/
│   ├── 📁 2025/
│   │   ├── 📁 2025-01/
│   │   ├── 📁 2025-02/
│   │   └── ...
│   ├── 📁 2026/
│   │   ├── 📁 2026-01/
│   │   └── ...
├── 📁 Daily Notes/
├── 📁 Projects/
└── ...
```

## Voice Record File Naming Convention

Format: `YYYY-MM-DD-Voice-Record-HHMMSS.md`

Example: `2026-01-11-Voice-Record-143025.md`

## Voice Note Template Structure

Each voice record note should follow this structure:

```markdown
---
created: YYYY-MM-DDTHH:MM:SSZ
type: voice-record
source: typeless
app: [focused_app_name]
tags: [voice/transcript]
---

# Voice Record - YYYY-MM-DD HH:MM:SS

## Transcription
[refined_text content]

## Metadata
- **Created**: YYYY-MM-DDTHH:MM:SSZ
- **Duration**: [duration]s
- **Language**: [detected_language]
- **Microphone**: [mic_device]

## Context
- **App**: [focused_app_name]
- **Window Title**: [focused_app_window_title]
- **Website**: [focused_app_window_web_domain] (if applicable)

## Links
- [[Daily Note YYYY-MM-DD]]
- [[Voice Records]]
```

## Linking Guidelines

1. **Daily Notes**: Each voice record should link to its corresponding daily note
2. **Cross-References**: Related voice records should link to each other
3. **Topic Tags**: Use meaningful tags based on content:
   - `#voice/transcript`
   - `#voice/meeting`
   - `#voice/idea`
   - `#voice/task`
   - `#voice/reminder`

## Organization by Topics

For better knowledge management, consider creating topic-based indexes:

### Example: Meeting Records
```
📁 Voice Records/Meetings/
    └── 📄 2026-01-11-Meeting-Record.md
```

### Example: Ideas & Thoughts
```
📁 Voice Records/Ideas/
    └── 📄 2026-01-11-Idea-Record.md
```

## Search Best Practices

- Use global search with: `tag:#voice/transcript`
- Filter by date: `path:Voice Records/2026/2026-01/`
- Search by app context: `app:Typeless.app`

## Backups

The vault is synced via iCloud, but consider:
- Weekly local backup
- Version history enabled
- Git backup for critical notes
