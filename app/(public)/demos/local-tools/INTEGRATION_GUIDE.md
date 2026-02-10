# Matrx Local — Frontend & AI Integration Guide

> **Audience:** The frontend team building UI in `ai-matrx-admin` and the AI integration team wiring tool calls into agent workflows.
>
> **What this covers:** Everything the `matrx_local` backend service currently does, what UI needs to be built for it, and exactly how AI agents should invoke local tools.

---

## Architecture Overview

```
┌─────────────────────────────────────┐
│         ai-matrx-admin              │
│      (Next.js — web/mobile)         │
│                                     │
│  ┌──────────┐    ┌───────────────┐  │
│  │    UI     │    │  AI Agent     │  │
│  │ Components│    │  Orchestrator │  │
│  └─────┬─────┘    └──────┬────────┘  │
│        │                 │           │
│        └────────┬────────┘           │
│                 │                    │
│          ┌──────▼──────┐             │
│          │  WebSocket   │             │
│          │  or REST     │             │
│          └──────┬──────┘             │
└─────────────────┼───────────────────┘
                  │ localhost:8000
┌─────────────────▼───────────────────┐
│           matrx_local               │
│        (FastAPI — Python)           │
│                                     │
│  ┌──────────────────────────────┐   │
│  │      Tool Dispatcher         │   │
│  │  ┌─────┐ ┌─────┐ ┌───────┐  │   │
│  │  │File │ │Shell│ │System │  │   │
│  │  │ Ops │ │Exec │ │ Info  │  │   │
│  │  └─────┘ └─────┘ └───────┘  │   │
│  └──────────────────────────────┘   │
│                                     │
│  Per-connection session:            │
│  - Working directory (cwd)          │
│  - Background processes             │
│  - File read history                │
└─────────────────────────────────────┘
```

**The user installs and runs `matrx_local` on their machine.** It listens on `localhost:8000`. The web app connects to it via WebSocket (stateful, recommended) or REST (stateless, simpler).

---

## Connection

### Pairing Flow (UI needed)

The user needs to:

1. Start `matrx_local` on their machine (`uv run run.py`)
2. In the web app, click "Connect Local Machine"
3. Web app attempts WebSocket connection to `ws://localhost:8000/ws`
4. On success, show a "Connected" indicator; on failure, show setup instructions

**UI to build:**
- A global connection status indicator (header bar or sidebar badge)
- A settings panel where the user can change the URL (default `http://localhost:8000`) for non-standard setups
- A first-time setup flow with download/install instructions for `matrx_local`
- Auto-reconnect with exponential backoff when the connection drops

### Transport Protocols

| Protocol | Endpoint | Use Case |
|----------|----------|----------|
| **WebSocket** | `ws://localhost:8000/ws` | Stateful sessions, real-time streaming, concurrent tools, background tasks. **Preferred.** |
| **REST** | `http://localhost:8000/tools/invoke` | One-shot tool calls from server-side code or simple integrations. Fresh session per request. |

---

## Available Tools (Current)

These are the tools currently registered in the dispatcher. Each can be called via WebSocket or REST.

### File Operations

| Tool | Parameters | Returns | Notes |
|------|-----------|---------|-------|
| **Read** | `file_path: string`, `offset?: number`, `limit?: number` | File contents with line numbers | Supports images (returns base64). Respects session cwd. |
| **Write** | `file_path: string`, `content: string`, `create_directories?: boolean` | Confirmation message | Creates parent dirs by default |
| **Edit** | `file_path: string`, `old_string: string`, `new_string: string` | Confirmation message | `old_string` must be unique in file |
| **Glob** | `pattern: string`, `path?: string` | Matching file paths | Uses `fd` if available, falls back to Python glob. 15s timeout. |
| **Grep** | `pattern: string`, `path?: string`, `include?: string`, `max_results?: number` | Matching lines with file:line:content | Uses `rg` if available. 15s timeout. Default 100 results. |

### Shell Execution

| Tool | Parameters | Returns | Notes |
|------|-----------|---------|-------|
| **Bash** | `command: string`, `description?: string`, `timeout?: number`, `run_in_background?: boolean` | Command output | `timeout` in ms (default 120s, max 600s). Session cwd persists. |
| **BashOutput** | `bash_id: string`, `filter?: string` | New output since last check | `filter` is regex. Shows running/completed status. |
| **TaskStop** | `task_id: string` | Confirmation | Kills background process by shell_id |

### System

| Tool | Parameters | Returns | Notes |
|------|-----------|---------|-------|
| **SystemInfo** | _(none)_ | Platform, hostname, Python version, cwd, user | Metadata dict included |
| **Screenshot** | _(none)_ | Screenshot image (base64 PNG) | Saved to temp dir |
| **ListDirectory** | `path?: string`, `show_hidden?: boolean` | Directory listing | Sorted, shows dirs with `/` suffix |
| **OpenUrl** | `url: string` | Confirmation | Opens in user's default browser |
| **OpenPath** | `path: string` | Confirmation | Opens in Finder/Explorer/xdg-open |

---

## WebSocket Protocol

### Sending a Tool Call

```json
{
  "id": "req-1707500000000-abc1",
  "tool": "Bash",
  "input": {
    "command": "ls -la",
    "timeout": 10000
  }
}
```

- **`id`** — Unique request identifier. Include this to correlate responses. Use `req-{timestamp}-{random}` format.
- **`tool`** — Exact tool name from the table above (case-sensitive).
- **`input`** — Object with tool parameters.

### Receiving a Response

```json
{
  "id": "req-1707500000000-abc1",
  "type": "success",
  "output": "total 48\ndrwxr-xr-x  12 user  staff  384 Feb  9 10:00 .\n...",
  "metadata": {
    "cwd": "/Users/user/projects"
  }
}
```

- **`id`** — Matches the request `id`.
- **`type`** — `"success"` or `"error"`.
- **`output`** — Text content (always present, may be empty string).
- **`image`** — Optional. `{ "media_type": "image/png", "base64_data": "..." }`.
- **`metadata`** — Optional. Structured data (varies by tool).

### Control Messages

```json
// Cancel a specific task
{ "id": "req-1707500000000-abc1", "action": "cancel" }

// Cancel ALL running tasks
{ "action": "cancel_all" }

// Ping (keepalive)
{ "action": "ping" }
```

### Concurrent Execution

Multiple tool calls can be sent without waiting for responses. Each runs concurrently on the server. Responses arrive independently, matched by `id`. This is critical for AI agents that may want to run several operations in parallel.

---

## REST Protocol

### List Available Tools

```
GET http://localhost:8000/tools/list
```

Response:
```json
{
  "tools": ["Bash", "BashOutput", "Edit", "Glob", "Grep", "ListDirectory", "OpenPath", "OpenUrl", "Read", "Screenshot", "SystemInfo", "TaskStop", "Write"]
}
```

### Invoke a Tool

```
POST http://localhost:8000/tools/invoke
Content-Type: application/json

{
  "tool": "SystemInfo",
  "input": {}
}
```

Response:
```json
{
  "type": "success",
  "output": "platform: Darwin\nplatform_release: 25.2.0\n...",
  "image": null,
  "metadata": {
    "platform": "Darwin",
    "hostname": "users-macbook"
  }
}
```

**Note:** REST calls are stateless. Each request gets a fresh session. `cd` in one request does NOT affect the next. Use WebSocket for multi-step workflows.

---

## AI Agent Integration

### How AI Tool Calls Map to Matrx Local

AI models (Claude, GPT, etc.) produce structured tool calls in this format:

```json
{
  "type": "tool_use",
  "name": "local_bash",
  "input": {
    "command": "find . -name '*.py' | head -20"
  }
}
```

**The orchestrator's job:**

1. Intercept tool calls with the `local_` prefix (or whatever namespace you define)
2. Strip the prefix to get the Matrx Local tool name (`local_bash` → `Bash`)
3. Forward `input` to the WebSocket connection
4. Wait for the response
5. Feed the `output` back to the AI model as a tool result

### Tool Definitions for AI Models

When constructing the system prompt or tool definitions for the AI model, expose Matrx Local tools like this:

```json
{
  "name": "local_bash",
  "description": "Execute a shell command on the user's local machine. The working directory persists across calls. Use this for any CLI operation.",
  "input_schema": {
    "type": "object",
    "properties": {
      "command": {
        "type": "string",
        "description": "The shell command to execute"
      },
      "timeout": {
        "type": "integer",
        "description": "Timeout in milliseconds (default 120000, max 600000)"
      },
      "run_in_background": {
        "type": "boolean",
        "description": "If true, runs in background. Use BashOutput to check on it."
      }
    },
    "required": ["command"]
  }
}
```

```json
{
  "name": "local_read",
  "description": "Read a file from the user's local filesystem. Returns numbered lines. Supports images (returns base64).",
  "input_schema": {
    "type": "object",
    "properties": {
      "file_path": {
        "type": "string",
        "description": "Absolute or relative path to the file"
      },
      "offset": {
        "type": "integer",
        "description": "Start reading from this line number (1-indexed)"
      },
      "limit": {
        "type": "integer",
        "description": "Maximum number of lines to return"
      }
    },
    "required": ["file_path"]
  }
}
```

```json
{
  "name": "local_write",
  "description": "Write content to a file on the user's local filesystem. Creates parent directories automatically.",
  "input_schema": {
    "type": "object",
    "properties": {
      "file_path": {
        "type": "string",
        "description": "Absolute or relative path to the file"
      },
      "content": {
        "type": "string",
        "description": "The content to write to the file"
      }
    },
    "required": ["file_path", "content"]
  }
}
```

```json
{
  "name": "local_edit",
  "description": "Edit a file by replacing a unique string. The old_string must appear exactly once in the file.",
  "input_schema": {
    "type": "object",
    "properties": {
      "file_path": { "type": "string" },
      "old_string": { "type": "string", "description": "The exact text to find (must be unique)" },
      "new_string": { "type": "string", "description": "The replacement text" }
    },
    "required": ["file_path", "old_string", "new_string"]
  }
}
```

```json
{
  "name": "local_glob",
  "description": "Find files matching a glob pattern on the user's machine.",
  "input_schema": {
    "type": "object",
    "properties": {
      "pattern": { "type": "string", "description": "Glob pattern (e.g. '*.py', '**/*.ts')" },
      "path": { "type": "string", "description": "Directory to search in (default: session cwd)" }
    },
    "required": ["pattern"]
  }
}
```

```json
{
  "name": "local_grep",
  "description": "Search file contents by regex on the user's machine.",
  "input_schema": {
    "type": "object",
    "properties": {
      "pattern": { "type": "string", "description": "Regex pattern to search for" },
      "path": { "type": "string", "description": "Directory to search (default: session cwd)" },
      "include": { "type": "string", "description": "Glob to filter files (e.g. '*.py')" },
      "max_results": { "type": "integer", "description": "Max matches (default 100)" }
    },
    "required": ["pattern"]
  }
}
```

```json
{
  "name": "local_screenshot",
  "description": "Capture a screenshot of the user's screen. Returns a base64-encoded PNG.",
  "input_schema": {
    "type": "object",
    "properties": {}
  }
}
```

```json
{
  "name": "local_list_directory",
  "description": "List contents of a directory on the user's machine.",
  "input_schema": {
    "type": "object",
    "properties": {
      "path": { "type": "string", "description": "Directory path (default: session cwd)" },
      "show_hidden": { "type": "boolean", "description": "Include dotfiles (default false)" }
    }
  }
}
```

```json
{
  "name": "local_system_info",
  "description": "Get system information about the user's machine (OS, hostname, Python version, cwd).",
  "input_schema": {
    "type": "object",
    "properties": {}
  }
}
```

```json
{
  "name": "local_open_url",
  "description": "Open a URL in the user's default browser.",
  "input_schema": {
    "type": "object",
    "properties": {
      "url": { "type": "string", "description": "The URL to open" }
    },
    "required": ["url"]
  }
}
```

```json
{
  "name": "local_open_path",
  "description": "Open a file or folder in the user's OS file manager (Finder, Explorer, etc.).",
  "input_schema": {
    "type": "object",
    "properties": {
      "path": { "type": "string", "description": "The file or directory path to open" }
    },
    "required": ["path"]
  }
}
```

### Recommended AI System Prompt Addition

When the user has `matrx_local` connected, append this to the AI model's system prompt:

```
You have access to the user's local machine via the Matrx Local tool system. The following tools execute directly on their computer:

- local_bash: Run shell commands (cwd persists between calls)
- local_read: Read files (returns numbered lines)
- local_write: Write files (creates directories)
- local_edit: Find-and-replace in files (old_string must be unique)
- local_glob: Find files by pattern
- local_grep: Search file contents by regex
- local_screenshot: Capture the screen
- local_list_directory: List directory contents
- local_system_info: Get OS/platform details
- local_open_url: Open URL in browser
- local_open_path: Open file/folder in OS file manager

Guidelines:
- Always use local_read before editing a file to understand its contents.
- Working directory persists in the session — use local_bash with "cd" to navigate.
- For long-running commands, set run_in_background: true and check with BashOutput.
- Paths can be relative (to session cwd) or absolute.
- Ask for confirmation before destructive operations (deleting files, killing processes).
```

---

## UI Components to Build

### 1. Connection Manager (Global)

**Priority: HIGH — needed before anything else works**

- Persistent connection status in the app header/sidebar
- Auto-connect on page load if previously connected
- Reconnect with backoff on disconnect
- Settings: custom URL, auto-connect toggle
- First-time pairing flow with install instructions

### 2. Tool Dashboard (Exists — needs polish)

**Route:** `/demos/local-tools`

Currently built with preset quick-fire buttons, custom tool input, result panel, and message log. Needs:

- Tool documentation tooltips
- Input validation per tool (don't send Glob without a pattern)
- Better result formatting (syntax highlighting for code, table for structured data)
- Image display for Screenshot results
- Persistent connection across the dashboard and terminal pages

### 3. Terminal Interface (Exists — needs polish)

**Route:** `/demos/local-tools/terminal`

Full shell-like interface with directory navigation, command history, Ctrl+C cancellation. Needs:

- ANSI color code parsing (many CLI tools output colored text)
- Tab completion (fetch directory contents for path completion)
- Split pane (run a command in one pane, browse files in another)
- Scrollback buffer limit (performance — currently unbounded)

### 4. File Browser (New)

**Priority: HIGH**

A visual file explorer for the user's local machine:

- Tree view with expand/collapse
- File preview panel (text, images, PDFs)
- Right-click context menu (open, rename, delete, copy path)
- Drag-and-drop upload to cloud storage
- Breadcrumb navigation
- Backed by `ListDirectory`, `Read`, `Write`, `Glob`

### 5. System Monitor (New)

**Priority: MEDIUM**

- CPU/memory/disk usage (via `Bash` + `top`/`ps` parsing, or a dedicated tool later)
- Running processes list
- Network connections
- Auto-refresh on interval

### 6. Scraping Control Panel (New — when scraping tools are built)

**Priority: HIGH (after scraping tools land)**

- URL input with fetch button
- Toggle between simple HTTP fetch and browser-rendered fetch
- Response viewer (raw HTML, rendered preview, extracted data)
- Cookie/session manager
- Scraping history log
- Extraction rule builder (CSS selector, XPath, or natural language)

### 7. Audio Interface (New — when audio tools are built)

**Priority: MEDIUM**

- Record button with waveform visualization
- Playback controls
- Transcription display (real-time if streaming)
- Device selector dropdown

### 8. AI Agent Activity Feed (New)

**Priority: HIGH**

When AI agents are making local tool calls, the user should see:

- A real-time feed of what the AI is doing on their machine
- Each tool call shown with: tool name, parameters, status (running/done/error), output preview
- Ability to cancel individual operations or all operations
- Expandable details for each call
- This is essentially a read-only version of the message log from the dashboard, but integrated into the main chat interface

---

## Legacy Routes (for reference)

These existed before the tool system. Some may be deprecated in favor of tools, but they're still functional:

| Endpoint | Method | What it does |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/trigger` | POST | Generic event handler (browser events) |
| `/system/info` | GET | Basic OS info |
| `/files` | GET | List files in a directory |
| `/screenshot` | POST | Capture screenshot (returns file path) |
| `/db-data` | GET | Query local PostgreSQL |
| `/logs` | GET | Last 50 lines of system log |
| `/generate-directory-structure/text` | POST | Directory tree as text |
| `/generate-directory-structure/json` | POST | Directory tree as JSON |
| `/generate-directory-structure/zip` | POST | Directory tree as zip |
| `/download/small-file` | GET | Download a small generated file |
| `/download/large-file` | GET | Download a file from disk |
| `/download/generated-file` | GET | Download a generated JSON file |

**Recommendation:** Migrate unique functionality from these into proper tools. The tool system provides a unified interface for both UI and AI agents.

---

## Quick Start (for devs)

### Start the backend

```bash
cd /path/to/matrx_local
uv sync
uv run run.py
# Server starts at http://localhost:8000
# WebSocket at ws://localhost:8000/ws
# API docs at http://localhost:8000/docs
```

### Test from the frontend

1. Start `ai-matrx-admin` dev server
2. Navigate to `/demos/local-tools` (dashboard) or `/demos/local-tools/terminal` (shell)
3. Click "Connect" to establish WebSocket connection
4. Use preset buttons or type commands

### Test from curl

```bash
# List tools
curl http://localhost:8000/tools/list

# Invoke a tool
curl -X POST http://localhost:8000/tools/invoke \
  -H "Content-Type: application/json" \
  -d '{"tool": "SystemInfo", "input": {}}'

# Bash command
curl -X POST http://localhost:8000/tools/invoke \
  -H "Content-Type: application/json" \
  -d '{"tool": "Bash", "input": {"command": "echo hello world"}}'
```

### Test WebSocket (wscat)

```bash
npx wscat -c ws://localhost:8000/ws
> {"id":"1","tool":"SystemInfo","input":{}}
> {"id":"2","tool":"Bash","input":{"command":"ls -la"}}
> {"action":"ping"}
```
