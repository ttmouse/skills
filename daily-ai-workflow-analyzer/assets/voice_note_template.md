---
created: {{CREATED_AT}}
type: voice-record
source: typeless
id: {{ID}}
app: {{FOCUSED_APP_NAME}}
tags: [voice/transcript]
---

# Voice Record - {{FORMATTED_DATE}}

## Transcription
{{REFINED_TEXT}}

## Metadata
- **Created**: {{CREATED_AT}}
- **Duration**: {{DURATION}}s
- **Language**: {{DETECTED_LANGUAGE}}
- **Microphone**: {{MIC_DEVICE}}
- **Status**: {{STATUS}}

## Context
{{#if FOCUSED_APP_NAME}}
- **App**: {{FOCUSED_APP_NAME}}
{{/if}}
{{#if FOCUSED_APP_WINDOW_TITLE}}
- **Window Title**: {{FOCUSED_APP_WINDOW_TITLE}}
{{/if}}
{{#if FOCUSED_APP_WINDOW_WEB_DOMAIN}}
- **Website**: {{FOCUSED_APP_WINDOW_WEB_DOMAIN}}
{{/if}}
{{#if FOCUSED_APP_WINDOW_WEB_URL}}
- **URL**: {{FOCUSED_APP_WINDOW_WEB_URL}}
{{/if}}

## Links
- [[Daily Note {{DAILY_NOTE_DATE}}]]
- [[Voice Records]]

---
*Extracted from Typeless.app on {{EXTRACTION_DATE}}*
