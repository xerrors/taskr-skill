import type { BoardModel } from "./board-types.js";
import { vscodeBoardClientScript } from "./vscode-board-client.js";
import { vscodeBoardStyles } from "./vscode-board-styles.js";

export interface VsCodeBoardRenderOptions {
  cspSource: string;
  nonce: string;
  assets: {
    stylesUri: string;
    markdownScriptUri: string;
    clientScriptUri: string;
  };
}

export function renderVsCodeBoardHtml(
  model: BoardModel,
  options: VsCodeBoardRenderOptions,
): string {
  const data = escapeScriptJson(model);
  const nonce = escapeHtmlAttribute(options.nonce);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  ${contentSecurityPolicy(options)}
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Taskr</title>
  <link rel="stylesheet" href="${escapeHtmlAttribute(options.assets.stylesUri)}">
</head>
<body>
  <main class="taskr-vscode-view" aria-label="Taskr board">
    <section class="vscode-controls" aria-label="Task filters">
      <div class="vscode-search-field">
        <span class="vscode-field-icon" aria-hidden="true">${iconSvg("search")}</span>
        <input id="search" type="search" aria-label="Filter tasks" placeholder="Search tasks" autocomplete="off">
        <button class="vscode-icon-button vscode-clear-search" id="clearSearch" type="button" aria-label="Clear search" title="Clear search" hidden>${iconSvg("x")}</button>
      </div>
      <div class="vscode-sort-control">
        <button class="vscode-icon-button vscode-sort-button" id="sortButton" type="button" aria-label="Sort tasks" title="Sort tasks" aria-haspopup="menu" aria-expanded="false">${iconSvg("sort")}</button>
        <div class="vscode-sort-menu" id="sortMenu" role="menu" aria-label="Sort tasks" hidden>
          <button class="vscode-sort-option" type="button" role="menuitemradio" data-sort="progress" aria-checked="true">Progress</button>
          <button class="vscode-sort-option" type="button" role="menuitemradio" data-sort="updatedAt" aria-checked="false">Updated</button>
          <button class="vscode-sort-option" type="button" role="menuitemradio" data-sort="createdAt" aria-checked="false">Created</button>
        </div>
      </div>
    </section>

    <div class="vscode-status-line" id="statusLine" role="status" aria-live="polite"></div>
    <section class="vscode-task-list" id="taskList" aria-label="Taskr tasks"></section>
  </main>

  <aside class="vscode-detail" id="detail" aria-hidden="true" aria-labelledby="detailTitle" inert>
    <header class="vscode-detail-header">
      <button class="vscode-toolbar-button vscode-back-button" id="closeDetail" type="button" aria-label="Back to task list"><span class="vscode-button-icon" aria-hidden="true">${iconSvg("arrow-left")}</span><span>Back</span></button>
      <button class="vscode-toolbar-button" id="openTask" type="button"><span class="vscode-button-icon" aria-hidden="true">${iconSvg("open")}</span><span>Open File</span></button>
    </header>
    <div class="vscode-detail-scroll">
      <div class="vscode-detail-kicker" id="detailKicker"></div>
      <h2 id="detailTitle"></h2>
      <div class="vscode-detail-meta" id="detailMeta"></div>
      <div class="vscode-detail-body" id="detailBody"></div>
    </div>
  </aside>

  <script nonce="${nonce}">
    window.__TASKR_BOARD__ = ${data};
  </script>
  <script nonce="${nonce}" src="${escapeHtmlAttribute(options.assets.markdownScriptUri)}"></script>
  <script nonce="${nonce}" src="${escapeHtmlAttribute(options.assets.clientScriptUri)}"></script>
</body>
</html>`;
}

function contentSecurityPolicy(options: VsCodeBoardRenderOptions): string {
  const source = escapeHtmlAttribute(options.cspSource);
  const nonce = escapeHtmlAttribute(options.nonce);
  return `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${source} https: data:; style-src ${source}; script-src ${source} 'nonce-${nonce}';">`;
}

function escapeScriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function escapeHtmlAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function iconSvg(name: "arrow-left" | "open" | "search" | "sort" | "x"): string {
  const paths: Record<typeof name, string> = {
    "arrow-left": '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    open: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    sort: '<path d="M8 7h12"/><path d="M8 12h9"/><path d="M8 17h6"/><path d="m4 6 2 2 2-2"/><path d="M6 8V4"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  };
  return `<svg class="vscode-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths[name]}</svg>`;
}

export { vscodeBoardClientScript, vscodeBoardStyles };
