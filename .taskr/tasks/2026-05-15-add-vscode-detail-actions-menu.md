---
schema_version: 1
id: 2026-05-15-add-vscode-detail-actions-menu
title: 为 VS Code 详情页添加三点操作菜单
status: implemented
created_at: 2026-05-15T12:55:18+08:00
updated_at: 2026-05-15T18:31:25+08:00
branch: null
commits:
  - 50e03b6
commit_status: created
verification:
  tests_run:
    - npm run build
    - npm test
    - npm run format:check
    - rg -n "detailActionsButton|detailActionsMenu|Delete Task|Deleted task|deleteTask\\(task\\)|ellipsis|vscode-danger-option" src/vscode-board-template.ts src/vscode-board-client.ts src/vscode-board-styles.ts vscode-extension/dist/webview/vscode-board-client.js vscode-extension/dist/webview/vscode-board.css vscode-extension/dist/extension.cjs
    - if rg -n "Deleted task\\." src/vscode-board-client.ts vscode-extension/dist/webview/vscode-board-client.js; then exit 1; else echo "No Deleted task status message remains."; fi
    - rg -n "padding: 6px 20px" src/vscode-board-styles.ts vscode-extension/dist/webview/vscode-board.css
    - 本地静态预览打开 VS Code webview，确认详情页里有 `Task actions` 三点入口；受预览环境限制未直接验证 VS Code 原生确认框。
  result: passed
  reason: 构建、测试、格式检查通过；生成的 webview asset 和 extension bundle 中包含三点菜单、删除菜单项、删除请求和 extension 侧确认删除逻辑。
---

# 为 VS Code 详情页添加三点操作菜单

## Request

新增一个需求并开始实施，右上角的那个 openfile，可以类比其他的扩展程序，添加一个三个点的图标，点击之后展开选项，比如说Open File，Delete Task

## Acceptance Criteria

- [x] VS Code 插件详情页右上角不再直接显示 `Open File` 文本按钮，改为三点图标按钮。
- [x] 点击三点图标后展开操作菜单，包含 `Open File` 和 `Delete Task`。
- [x] `Open File` 保持原有打开任务 Markdown 文件行为。
- [x] `Delete Task` 能删除当前任务，并在删除前有明确确认，删除后刷新列表并关闭详情页。
- [x] 菜单支持基础可访问性状态、点击外部关闭和 Escape 关闭。
- [x] 构建或相关检查通过，必要时补充局部验证。

## Implementation Plan

- [x] 检查 VS Code 详情页模板、客户端脚本、样式和 extension message handler。
- [x] 改造详情页 header 右侧操作入口和菜单结构。
- [x] 添加菜单展开/关闭、打开文件和删除任务交互。
- [x] 补充三点、删除等图标和菜单样式。
- [x] 运行构建/测试/格式或针对性检查，并记录结果。

## Progress Log

- 2026-05-15 12:56 +08:00 - 已将详情页右上角 `Open File` 文本按钮替换为三点操作菜单，并加入 `Open File` 与 `Delete Task` 菜单项。
- 2026-05-15 13:01 +08:00 - 根据反馈修正删除逻辑：不再依赖 Webview `window.confirm`，改为 extension 侧使用 VS Code 原生 warning dialog 确认后再删除任务文件。
- 2026-05-15 13:05 +08:00 - 根据反馈移除删除成功后的 `Deleted task.` 状态提示，并将 VS Code 搜索/排序控件区域左右 padding 调整为 20px。

## Agent Notes

- `Delete Task` 请求现在由 `vscode-extension/src/extension.ts` 先调用 `vscode.window.showWarningMessage(..., { modal: true }, "Delete Task")` 确认；取消时返回当前模型，不删除文件。
- 预览环境能看到三点入口和详情页内容，但不能完整模拟 VS Code 原生确认框；删除确认逻辑通过类型检查、构建和生成 bundle 内容确认。
- `Deleted task.` 来自 Webview 客户端删除成功后的状态行提示；删除后详情页会关闭且列表刷新，因此已移除这条成功提示，只保留错误提示。

## Completion Summary

已把 VS Code 插件详情页右上角改为三点菜单，菜单包含 `Open File` 和 `Delete Task`。`Open File` 沿用原来的打开 Markdown 文件请求；`Delete Task` 现在发给 extension，由 VS Code 原生确认弹窗确认后调用现有 `deleteBoardTask` 删除任务，取消则不做删除。删除成功后的 `Deleted task.` 状态提示已移除，搜索/排序控件区域左右 padding 已调整为 20px。构建、测试和格式检查均已通过。
