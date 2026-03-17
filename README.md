# Claude-Cursor MCP Bridge

Lets Claude.ai talk directly to your Cursor editor — read files, write code, get selections, and more.

## 📖 Full setup guide + download → [one06cm127.github.io/claude-cursor-mcp](https://one06cm127.github.io/claude-cursor-mcp)

> ⭐ If this actually worked for you, drop a star — it helps more people find it!

> 💬 **Heads up** — I vibe coded this whole thing, so if something's broken or you need help setting it up, just ask Claude lol

## What's Included

- `cursor-mcp-bridge-0.0.1.vsix` — Cursor/VS Code extension (install this first)
- `server.py` — MCP server that connects Claude.ai to the extension
- `package.json` — Extension manifest

## Requirements

- [Cursor](https://cursor.sh) or VS Code
- Python 3.8+
- [uv](https://docs.astral.sh/uv/) or pip
- Claude.ai account (Pro plan supports MCP)

## Setup

See the full installation guide at the link above, or follow the steps below.

### Step 1 — Install the Cursor Extension

1. Open Cursor
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
3. Type `Extensions: Install from VSIX`
4. Select `cursor-mcp-bridge-0.0.1.vsix`
5. Reload Cursor — you should see "Claude-Cursor MCP Bridge started on port 9877"

### Step 2 — Install Python Dependencies

```bash
pip install mcp
```

Or with uv:
```bash
uv pip install mcp
```

### Step 3 — Configure Claude.ai

Go to **Claude.ai → Settings → Integrations → Add MCP Server** and add:

```json
{
  "mcpServers": {
    "cursor": {
      "command": "python",
      "args": ["/full/path/to/server.py"]
    }
  }
}
```

Replace `/full/path/to/server.py` with the actual path where you saved `server.py`.

### Step 4 — Test It

In Claude.ai, try: *"What files do I have open in Cursor?"*

## Available Tools

| Tool | Description |
|------|-------------|
| `get_open_files` | List all open files |
| `get_active_file` | Get the focused file's content |
| `get_file_content` | Read any file by path |
| `write_file` | Write/overwrite a file |
| `insert_at_cursor` | Insert text at cursor position |
| `get_selection` | Get selected text |
| `replace_selection` | Replace selected text |
| `open_file` | Open a file in the editor |
| `get_workspace_folder` | Get current project path |
| `show_message` | Show a notification in Cursor |

## How It Works

The extension runs a local TCP server on port 9877. The Python MCP server connects Claude.ai to this socket, translating MCP tool calls into editor commands.

## License

MIT
