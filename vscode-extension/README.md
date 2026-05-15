# Taskr VS Code Extension

Taskr's VS Code extension shows repo-local `.taskr/tasks/*.md` files in a sidebar webview.

## Local Development

From the repository root:

```bash
npm run build
code --extensionDevelopmentPath="$PWD/vscode-extension" "$PWD"
```

Open the Taskr activity bar item to view the board. The extension watches `.taskr/tasks/*.md`, supports manual refresh, and opens a task Markdown file from the task detail drawer.
