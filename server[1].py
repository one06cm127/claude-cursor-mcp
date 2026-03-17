#!/usr/bin/env python3
"""
Claude-Cursor MCP Server
Bridges Claude.ai to the Cursor editor via a local VS Code extension.
"""

import asyncio
import json
import socket
import sys
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp import types

CURSOR_HOST = "localhost"
CURSOR_PORT = 9877

app = Server("cursor-mcp")

def send_to_cursor(command: str, params: dict = None):
    """Send a command to the Cursor extension and get a response."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(10)
            s.connect((CURSOR_HOST, CURSOR_PORT))
            payload = json.dumps({"command": command, "params": params or {}}) + "\n"
            s.sendall(payload.encode())
            response = b""
            while True:
                chunk = s.recv(4096)
                if not chunk:
                    break
                response += chunk
                if b"\n" in response:
                    break
            return json.loads(response.decode().strip())
    except ConnectionRefusedError:
        return {"error": "Cannot connect to Cursor. Make sure the Cursor MCP Bridge extension is running."}
    except Exception as e:
        return {"error": str(e)}


@app.list_tools()
async def list_tools():
    return [
        types.Tool(
            name="get_open_files",
            description="Get a list of all files currently open in Cursor",
            inputSchema={"type": "object", "properties": {}}
        ),
        types.Tool(
            name="get_file_content",
            description="Get the content of a specific file open in Cursor",
            inputSchema={
                "type": "object",
                "properties": {
                    "filepath": {"type": "string", "description": "Path to the file"}
                },
                "required": ["filepath"]
            }
        ),
        types.Tool(
            name="get_active_file",
            description="Get the content of the currently active/focused file in Cursor",
            inputSchema={"type": "object", "properties": {}}
        ),
        types.Tool(
            name="write_file",
            description="Write or overwrite content to a file in Cursor",
            inputSchema={
                "type": "object",
                "properties": {
                    "filepath": {"type": "string", "description": "Path to the file"},
                    "content": {"type": "string", "description": "Content to write"}
                },
                "required": ["filepath", "content"]
            }
        ),
        types.Tool(
            name="insert_at_cursor",
            description="Insert text at the current cursor position in the active editor",
            inputSchema={
                "type": "object",
                "properties": {
                    "text": {"type": "string", "description": "Text to insert"}
                },
                "required": ["text"]
            }
        ),
        types.Tool(
            name="get_selection",
            description="Get the currently selected text in Cursor",
            inputSchema={"type": "object", "properties": {}}
        ),
        types.Tool(
            name="replace_selection",
            description="Replace the currently selected text in Cursor",
            inputSchema={
                "type": "object",
                "properties": {
                    "text": {"type": "string", "description": "Text to replace selection with"}
                },
                "required": ["text"]
            }
        ),
        types.Tool(
            name="open_file",
            description="Open a file in Cursor",
            inputSchema={
                "type": "object",
                "properties": {
                    "filepath": {"type": "string", "description": "Absolute path to the file to open"}
                },
                "required": ["filepath"]
            }
        ),
        types.Tool(
            name="get_workspace_folder",
            description="Get the current workspace/project folder path in Cursor",
            inputSchema={"type": "object", "properties": {}}
        ),
        types.Tool(
            name="show_message",
            description="Show a notification message in Cursor",
            inputSchema={
                "type": "object",
                "properties": {
                    "message": {"type": "string", "description": "Message to show"},
                    "type": {"type": "string", "enum": ["info", "warning", "error"], "description": "Message type"}
                },
                "required": ["message"]
            }
        ),
    ]


@app.call_tool()
async def call_tool(name: str, arguments: dict):
    result = send_to_cursor(name, arguments)
    return [types.TextContent(type="text", text=json.dumps(result, indent=2))]


async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())

if __name__ == "__main__":
    asyncio.run(main())
