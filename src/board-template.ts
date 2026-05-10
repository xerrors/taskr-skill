import { boardClientScript } from "./board-client.js";
import { boardStyles } from "./board-styles.js";
import { markdownBrowserScript } from "./markdown.js";
import type { BoardModel } from "./board-types.js";

export function renderBoardHtml(model: BoardModel): string {
  const data = escapeScriptJson(model);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Taskr Board</title>
  <style>
${boardStyles}
  </style>
</head>
<body>
  <main class="shell">
    <section class="masthead" aria-labelledby="title">
      <div>
        <div class="masthead-topline">
          <p class="eyebrow" id="eyebrow">Repo-local task memory</p>
          <button class="icon-button language-button" id="languageToggle" type="button">🌐 ZH</button>
        </div>
        <h1 id="title">Taskr Board</h1>
        <p class="repo" id="repo"></p>
      </div>
      <div class="stats" aria-label="Task statistics">
        <div class="stat"><strong id="totalTasks">0</strong><span id="totalTasksLabel">Total</span></div>
        <div class="stat"><strong id="activeTasks">0</strong><span id="activeTasksLabel">Active</span></div>
        <div class="stat"><strong id="implementedTasks">0</strong><span id="implementedTasksLabel">Done</span></div>
      </div>
    </section>

    <div class="toolbar">
      <div class="toolbar-primary">
        <div class="search-wrap">
          <input class="search" id="search" type="search" aria-label="Filter tasks" placeholder="Filter by title, id, request, or file..." autocomplete="off">
          <button class="icon-button refresh-button" id="refresh" type="button" aria-label="Refresh tasks" title="Refresh tasks">Refresh</button>
        </div>
        <div class="toolbar-meta">
          <div class="hint" id="hint">Click any task to open its detail.</div>
          <div class="toolbar-status" id="toolbarStatus" role="status" aria-live="polite"></div>
        </div>
      </div>
      <div class="toolbar-secondary">
        <label class="sort-control">
          <span id="sortLabel">Sort</span>
          <select id="sortSelect" aria-label="Sort tasks">
            <option value="updatedAt">Updated</option>
            <option value="createdAt">Created</option>
          </select>
        </label>
        <div class="view-toggle" role="group" aria-label="Board view">
          <button class="view-tab" id="tableViewButton" type="button" aria-pressed="true">Table</button>
          <button class="view-tab" id="boardViewButton" type="button" aria-pressed="false">Board</button>
        </div>
      </div>
    </div>

    <section class="table-view" id="tableView" aria-label="Taskr task table"></section>
    <section class="board is-hidden" id="board" aria-label="Taskr Kanban board"></section>
  </main>

  <div class="backdrop" id="backdrop" hidden></div>
  <aside class="detail" id="detail" aria-hidden="true" aria-labelledby="detailTitle">
    <button class="close" id="close" type="button" aria-label="Close task detail">×</button>
    <div class="detail-header">
      <div class="detail-kicker" id="detailKicker">Task detail</div>
      <h2 class="detail-title" id="detailTitle">Select a task</h2>
    </div>
    <div class="detail-body" id="detailBody"></div>
  </aside>

  <script>
    window.__TASKR_BOARD__ = ${data};
  </script>
  ${markdownBrowserScript()}
  <script>
${boardClientScript}
  </script>
</body>
</html>`;
}

function escapeScriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
