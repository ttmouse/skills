# Alma API Specification

This document describes the complete REST API for Alma, a desktop AI chat application.

**Base URL:** `http://localhost:23001`

---

## Settings API

### GET /api/settings

Get current application settings.

**Response:** Complete `AppSettings` object (see Data Types below)

**Example:**
```bash
curl -s http://localhost:23001/api/settings | jq
```

### PUT /api/settings

Update application settings.

**Request Body:** Complete `AppSettings` object

**IMPORTANT:** This endpoint requires the COMPLETE settings object. You must:
1. First GET the current settings
2. Modify the desired fields
3. PUT the entire object back

**Example:**
```bash
# Get current settings, modify, and update
current=$(curl -s http://localhost:23001/api/settings)
updated=$(echo "$current" | jq '.general.theme = "dark"')
curl -s -X PUT http://localhost:23001/api/settings \
  -H "Content-Type: application/json" \
  -d "$updated" | jq
```

### POST /api/settings/reset

Reset all settings to defaults.

**Response:** HTTP 204 No Content

**Example:**
```bash
curl -s -X POST http://localhost:23001/api/settings/reset
```

### POST /api/settings/test-proxy

Test proxy configuration connectivity.

**Request Body:**
```json
{
  "proxy": {
    "enabled": true,
    "type": "http",
    "host": "127.0.0.1",
    "port": 7890
  },
  "url": "https://api.openai.com",
  "timeoutMs": 10000
}
```

**Response:**
```json
{
  "ok": true,
  "status": 200,
  "latencyMs": 150,
  "ip": "1.2.3.4",
  "countryCode": "US",
  "countryFlag": "🇺🇸"
}
```

---

## Provider API

### GET /api/providers

List all configured AI providers.

**Response:** Array of `Provider` objects

**Example:**
```bash
curl -s http://localhost:23001/api/providers | jq
```

### POST /api/providers

Create a new provider.

**Request Body:**
```json
{
  "name": "My OpenAI",
  "type": "openai",
  "apiKey": "sk-xxx",
  "baseURL": "https://api.openai.com/v1",
  "enabled": true
}
```

**Provider Types:** openai, anthropic, google, aihubmix, openrouter, deepseek, copilot, azure, moonshot, custom, acp, claude-subscription, zai-coding-plan

**Response:** Created `Provider` object (HTTP 201)

**Example:**
```bash
curl -s -X POST http://localhost:23001/api/providers \
  -H "Content-Type: application/json" \
  -d '{"name": "My OpenAI", "type": "openai", "apiKey": "sk-xxx"}' | jq
```

### PUT /api/providers/:id

Update an existing provider.

**Request Body:** Partial `Provider` object (only fields to update)

**Response:** Updated `Provider` object

**Example:**
```bash
curl -s -X PUT http://localhost:23001/api/providers/PROVIDER_ID \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name", "enabled": false}' | jq
```

### DELETE /api/providers/:id

Delete a provider.

**Response:** HTTP 204 No Content

**Example:**
```bash
curl -s -X DELETE http://localhost:23001/api/providers/PROVIDER_ID
```

### POST /api/providers/:id/test

Test provider connection and authentication.

**Response:**
```json
{
  "success": true,
  "latencyMs": 250
}
```
Or on failure:
```json
{
  "success": false,
  "error": "Invalid API key"
}
```

**Example:**
```bash
curl -s -X POST http://localhost:23001/api/providers/PROVIDER_ID/test | jq
```

### GET /api/providers/:id/models

Get models for a specific provider.

**Response:**
```json
{
  "data": ["gpt-4o", "gpt-4o-mini"],
  "models": [
    {
      "id": "gpt-4o",
      "name": "GPT-4o",
      "capabilities": {
        "vision": true,
        "functionCalling": true,
        "streaming": true,
        "contextWindow": 128000
      }
    }
  ]
}
```

**Example:**
```bash
curl -s http://localhost:23001/api/providers/PROVIDER_ID/models | jq
```

### POST /api/providers/:id/models/fetch

Fetch available models from the provider's API and cache them.

**Response:** Updated list of models with capabilities

**Example:**
```bash
curl -s -X POST http://localhost:23001/api/providers/PROVIDER_ID/models/fetch | jq
```

### PUT /api/providers/:id/models

Update enabled models for a provider.

**Request Body:**
```json
{
  "models": [
    {"id": "gpt-4o", "name": "GPT-4o"},
    {"id": "gpt-4o-mini", "name": "GPT-4o Mini"}
  ]
}
```

**Response:** Updated `Provider` object

---

## Models API

### GET /api/models

Get all available models across all enabled providers.

**Response:**
```json
[
  {
    "id": "provider-id:gpt-4o",
    "name": "GPT-4o",
    "provider": "OpenAI",
    "providerId": "provider-id",
    "capabilities": {
      "vision": true,
      "functionCalling": true
    }
  }
]
```

**Note:** Model IDs use the format `providerId:modelId`

**Example:**
```bash
curl -s http://localhost:23001/api/models | jq
```

---

## Health API

### GET /api/health

Check API server health.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Example:**
```bash
curl -s http://localhost:23001/api/health | jq
```

---

## Data Types

### AppSettings

```typescript
interface AppSettings {
  general: {
    language: 'zh' | 'en';
    theme: 'light' | 'dark' | 'system';
    autoStart: boolean;
    minimizeToTray: boolean;
    closeToTray: boolean;
    startMinimized: boolean;
    quickChatHideOnBlur: boolean;
    defaultWorkspaceId?: string;
  };

  chat: {
    defaultModel: string;  // Format: "providerId:modelId"
    temperature: number;   // 0-2
    maxTokens: number;
    streamResponse: boolean;
    autoSaveHistory: boolean;
    historyRetentionDays: number;
    showTokenUsage: boolean;
    enableMarkdown: boolean;
    singleDollarTextMath: boolean;
    infographicEnabled: boolean;
    modelUsageHistory: Record<string, number>;  // modelId -> timestamp
    defaultToolSelection: 'auto' | 'all' | 'none';
    defaultSkillSelection: 'auto' | 'all' | 'none';
    soundEffects: {
      enabled: boolean;
      volume: number;  // 0-1
      synthPreset: 'classic' | 'ethereal' | 'digital' | 'retro' | 'off';
    };
    autoCompact: {
      enabled: boolean;
      threshold: number;        // 60-95 (percentage)
      keepRecentMessages: number;  // 2-20
      summaryModel?: string;    // Format: "providerId:modelId"
    };
  };

  ui: {
    fontSize: number;
    density: 'compact' | 'comfortable' | 'spacious';
    sidebarWidth: number;
    artifactPanelWidth?: number;
    showLineNumbers: boolean;
    wordWrap: boolean;
    showMinimap: boolean;
    useSystemCaret: boolean;
  };

  network: {
    proxy: {
      enabled: boolean;
      type: 'http' | 'https' | 'socks5';
      host: string;
      port: number;
      username?: string;
      password?: string;
    };
    timeout: number;       // milliseconds
    retryAttempts: number;
    userAgent?: string;
  };

  data: {
    dataPath: string;
    enableBackup: boolean;
    backupInterval: 'daily' | 'weekly' | 'monthly';
    maxBackups: number;
    enableSync: boolean;
    syncProvider?: 'icloud' | 'dropbox' | 'google-drive';
  };

  security: {
    encryptApiKeys: boolean;
    requirePassword: boolean;
    sessionTimeout: number;  // minutes
    enableLogging: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
  };

  advanced: {
    enableExperimentalFeatures: boolean;
    debugMode: boolean;
    developerMode: boolean;
    customCss?: string;
    customJs?: string;
  };

  keybindings: {
    newChatThread: string;
    quickChat: string;
    searchThreads: string;
    sendMessage: string;
    openSettings: string;
    toggleSidebar: string;
    toggleWhisper: string;
  };

  memory: {
    enabled: boolean;
    autoSummarize: boolean;
    autoRetrieve: boolean;
    maxRetrievedMemories: number;  // 1-20
    similarityThreshold: number;   // 0-1
    queryRewriting?: boolean;
    summarizationModel?: string;   // Format: "providerId:modelId"
    toolModel?: string;            // Format: "providerId:modelId"
    embeddingModel?: string;       // Format: "providerId:modelId"
  };

  toolModel: {
    model?: string;  // Format: "providerId:modelId"
  };

  onboarding?: {
    dismissed: boolean;
  };

  whisper: {
    enabled: boolean;
    model: string;     // e.g., 'base', 'small', 'medium'
    language: string;  // e.g., 'en', 'zh', 'auto'
  };

  webSearch: {
    engine: 'google' | 'xiaohongshu';
  };

  terminal: {
    fontFamily: string;
    fontSize: number;  // 8-24
  };

  themeConfig: {
    darkTheme: string | null;
    lightTheme: string | null;
    pluginThemeId: string | null;
    nvchad: {
      enabled: boolean;
      configPath: string | null;
      autoSync: boolean;
    };
  };
}
```

### Provider

```typescript
interface Provider {
  id: string;
  name: string;
  type: 'openai' | 'anthropic' | 'google' | 'aihubmix' | 'openrouter' |
        'deepseek' | 'copilot' | 'azure' | 'moonshot' | 'custom' | 'acp' |
        'claude-subscription' | 'zai-coding-plan';
  models: StoredProviderModel[];           // Enabled models
  availableModels: StoredProviderModel[];  // All available models
  apiKey: string;                          // Encrypted, do not expose
  baseURL?: string;
  apiVersion?: string;                     // For Azure OpenAI
  isResponseAPI?: boolean;                 // Azure OpenAI Responses API
  useMaxCompletionTokens?: boolean;        // Custom providers

  // ACP-specific fields
  acpCommand?: string;
  acpArgs?: string[];
  acpMcpServerIds?: string[];
  acpAuthMethodId?: string;
  acpApiProviderId?: string;
  acpModelMapping?: {
    defaultModel?: string;
    opusModel?: string;
    sonnetModel?: string;
    haikuModel?: string;
    subagentModel?: string;
  };

  enabled: boolean;
  createdAt: string;  // ISO timestamp
  updatedAt: string;  // ISO timestamp
}

interface StoredProviderModel {
  id: string;
  name: string;
  capabilities?: {
    vision?: boolean;
    imageOutput?: boolean;
    functionCalling?: boolean;
    functionCallingViaXml?: boolean;
    jsonMode?: boolean;
    streaming?: boolean;
    reasoning?: boolean;
    contextWindow?: number;
    maxOutputTokens?: number;
  };
  isManual?: boolean;
  providerOptions?: Record<string, any>;
}
```

---

## Important Notes

1. **Model ID Format:** Throughout the API, model IDs use the format `providerId:modelId` (e.g., `abc123:gpt-4o`)

2. **Settings Updates:** When updating settings via PUT /api/settings, you must send the complete settings object. Partial updates are not supported.

3. **API Keys:** Provider API keys are stored encrypted. The API will not expose decrypted keys in responses.

4. **WebSocket Sync:** Changes made via the API are automatically broadcast to all connected clients via WebSocket.

5. **Error Responses:** Failed requests return JSON with an `error` field:
   ```json
   {"error": "Error message here"}
   ```

---

*Generated at: 2026-01-17T14:11:06.271Z*
