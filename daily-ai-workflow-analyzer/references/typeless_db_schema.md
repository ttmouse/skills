# Typeless Database Schema

## Overview

Typeless.app stores all voice transcription data in a SQLite database located at:
```
~/Library/Application Support/Typeless/typeless.db
```

## Primary Table: `history`

### Columns

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT (PRIMARY KEY) | Unique identifier for each voice record |
| `refined_text` | TEXT | The transcribed text (final output) |
| `edited_text` | TEXT | User-edited version of the text |
| `status` | TEXT | Processing status (e.g., 'transcript', 'processing') |
| `audio` | BLOB | Audio data (if stored in DB) |
| `audio_context` | TEXT | Additional audio context |
| `duration` | REAL | Duration of audio in seconds |
| `app_version` | TEXT | Typeless app version |
| `created_at` | TEXT | ISO 8601 timestamp when record was created |
| `updated_at` | TEXT | ISO 8601 timestamp when record was last updated |
| `languages` | TEXT | Detected languages |
| `detected_language` | TEXT | Primary detected language |
| `mic_device` | TEXT | Microphone device used |
| `focused_app_name` | TEXT | Name of active app during recording |
| `focused_app_window_title` | TEXT | Window title of active app |
| `focused_app_window_web_domain` | TEXT | Web domain (if browser) |
| `focused_app_window_web_url` | TEXT | Web URL (if browser) |
| `focused_app_bundle_id` | TEXT | Bundle ID of active app |
| `audio_local_path` | TEXT | Path to local audio file |
| `user_id` | TEXT | User identifier |
| `mode` | TEXT | Recording mode (e.g., 'voice_transcript') |
| `mode_meta` | TEXT | Additional mode metadata |

## Indexes

The database includes several indexes for efficient querying:

- `idx_history_user_created_at` - By user and creation time
- `idx_history_status` - By status
- `idx_history_detected_language` - By detected language
- `idx_history_user_status_created_at` - By user, status, and time
- `idx_history_user_app_name_status_created_at` - By user, app, status, and time
- And several more app/web-specific indexes

## Useful Queries

### Get All Voice Transcriptions
```sql
SELECT id, refined_text, status, created_at, duration
FROM history
WHERE mode = 'voice_transcript'
ORDER BY created_at DESC
LIMIT 100;
```

### Get Records for Specific Date
```sql
SELECT *
FROM history
WHERE mode = 'voice_transcript'
  AND created_at >= '2025-12-05'
  AND created_at < '2025-12-06'
ORDER BY created_at;
```

### Get Records by Status
```sql
SELECT COUNT(*) as count, status
FROM history
WHERE mode = 'voice_transcript'
GROUP BY status;
```

### Get Records with Audio Files
```sql
SELECT id, refined_text, audio_local_path, created_at
FROM history
WHERE mode = 'voice_transcript'
  AND audio_local_path IS NOT NULL
ORDER BY created_at DESC;
```

## Audio Files

Audio recordings are stored separately in:
```
~/Library/Application Support/Typeless/Recordings/{id}.m4a
```

Where `{id}` matches the record ID from the database.

## Data Types

- **Timestamps**: Stored as ISO 8601 strings (e.g., `2025-12-05T07:12:54.333Z`)
- **Duration**: Stored as real numbers (seconds)
- **Status Values**: Common values include 'transcript', 'processing', 'failed'
- **Mode Values**: Primary mode is 'voice_transcript'

## Notes

- The database can be accessed while Typeless is running (SQLite handles concurrent access)
- Large audio data is typically stored externally (see `audio_local_path`)
- Edited text takes priority over refined text for display purposes
- The database includes migration tracking via `__drizzle_migrations` table
