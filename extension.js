const vscode = require('vscode');
const net = require('net');
const fs = require('fs');
const path = require('path');

const PORT = 9877;
let server;

function activate(context) {
    console.log('Claude-Cursor MCP Bridge is now active!');
    vscode.window.showInformationMessage('Claude-Cursor MCP Bridge started on port 9877');
    startServer(context);
}

function startServer(context) {
    server = net.createServer((socket) => {
        let buffer = '';

        socket.on('data', (data) => {
            buffer += data.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const request = JSON.parse(line);
                    handleCommand(request.command, request.params || {})
                        .then(result => {
                            socket.write(JSON.stringify(result) + '\n');
                        })
                        .catch(err => {
                            socket.write(JSON.stringify({ error: err.message }) + '\n');
                        });
                } catch (e) {
                    socket.write(JSON.stringify({ error: 'Invalid JSON' }) + '\n');
                }
            }
        });

        socket.on('error', () => {});
    });

    server.listen(PORT, 'localhost', () => {
        console.log(`Claude-Cursor MCP Bridge listening on port ${PORT}`);
    });

    server.on('error', (err) => {
        vscode.window.showErrorMessage(`Claude-Cursor MCP Bridge error: ${err.message}`);
    });

    context.subscriptions.push({ dispose: () => server.close() });
}

async function handleCommand(command, params) {
    const editor = vscode.window.activeTextEditor;

    switch (command) {
        case 'get_open_files': {
            const tabs = vscode.window.tabGroups.all
                .flatMap(g => g.tabs)
                .filter(t => t.input && t.input.uri)
                .map(t => t.input.uri.fsPath);
            return { files: tabs };
        }

        case 'get_active_file': {
            if (!editor) return { error: 'No active editor' };
            const content = editor.document.getText();
            const filepath = editor.document.uri.fsPath;
            return { filepath, content };
        }

        case 'get_file_content': {
            const filepath = params.filepath;
            if (!filepath) return { error: 'filepath required' };
            try {
                const content = fs.readFileSync(filepath, 'utf8');
                return { filepath, content };
            } catch (e) {
                try {
                    const doc = await vscode.workspace.openTextDocument(filepath);
                    return { filepath, content: doc.getText() };
                } catch (e2) {
                    return { error: `Cannot read file: ${e2.message}` };
                }
            }
        }

        case 'write_file': {
            const { filepath, content } = params;
            if (!filepath || content === undefined) return { error: 'filepath and content required' };
            try {
                fs.mkdirSync(path.dirname(filepath), { recursive: true });
                fs.writeFileSync(filepath, content, 'utf8');
                const uri = vscode.Uri.file(filepath);
                const openDocs = vscode.workspace.textDocuments;
                for (const doc of openDocs) {
                    if (doc.uri.fsPath === filepath) {
                        await vscode.window.showTextDocument(doc);
                        break;
                    }
                }
                return { success: true, filepath };
            } catch (e) {
                return { error: e.message };
            }
        }

        case 'insert_at_cursor': {
            if (!editor) return { error: 'No active editor' };
            const { text } = params;
            await editor.edit(editBuilder => {
                editBuilder.insert(editor.selection.active, text);
            });
            return { success: true };
        }

        case 'get_selection': {
            if (!editor) return { error: 'No active editor' };
            const selection = editor.selection;
            const text = editor.document.getText(selection);
            return { text, isEmpty: selection.isEmpty };
        }

        case 'replace_selection': {
            if (!editor) return { error: 'No active editor' };
            const { text } = params;
            await editor.edit(editBuilder => {
                editBuilder.replace(editor.selection, text);
            });
            return { success: true };
        }

        case 'open_file': {
            const { filepath } = params;
            try {
                const doc = await vscode.workspace.openTextDocument(filepath);
                await vscode.window.showTextDocument(doc);
                return { success: true, filepath };
            } catch (e) {
                return { error: e.message };
            }
        }

        case 'get_workspace_folder': {
            const folders = vscode.workspace.workspaceFolders;
            if (!folders || folders.length === 0) return { error: 'No workspace folder open' };
            return { path: folders[0].uri.fsPath };
        }

        case 'show_message': {
            const { message, type } = params;
            if (type === 'error') vscode.window.showErrorMessage(message);
            else if (type === 'warning') vscode.window.showWarningMessage(message);
            else vscode.window.showInformationMessage(message);
            return { success: true };
        }

        default:
            return { error: `Unknown command: ${command}` };
    }
}

function deactivate() {
    if (server) server.close();
}

module.exports = { activate, deactivate };
