# Taskr VS Code Extension

Taskr's VS Code extension shows repo-local `.taskr/tasks/*.md` files in a sidebar webview.

## Install

1. Download the latest `taskr-vscode-*.vsix` asset from [GitHub Releases](https://github.com/xerrors/taskr-skill/releases).
2. In VS Code, open Extensions.
3. Open the Extensions view `...` menu and choose **Install from VSIX...**.
4. Select the downloaded `.vsix` file, then open the Taskr activity bar item in a repository that has `.taskr/tasks/*.md`.

## Local Development

From the repository root:

```bash
npm run build
code --extensionDevelopmentPath="$PWD/vscode-extension" "$PWD"
```

Open the Taskr activity bar item to view the board. The extension watches `.taskr/tasks/*.md`, supports manual refresh, and opens a task Markdown file from the task detail drawer.
