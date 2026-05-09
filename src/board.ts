import { createServer, type Server } from "node:http";
import { spawn } from "node:child_process";
import {
  extractSections,
  listTasks,
  relative,
  taskId,
  taskStatus,
  taskTitle,
  VALID_STATUSES,
  type TaskDocument,
} from "./protocol.js";

export interface BoardTask {
  id: string;
  title: string;
  status: string;
  path: string;
  updatedAt: string;
  branch: string | null;
  commitStatus: string;
  commits: string[];
  relatedFiles: string[];
  verification: unknown;
  sections: Record<string, string>;
  criteria: {
    checked: number;
    total: number;
  };
}

export interface BoardModel {
  generatedAt: string;
  repoRoot: string;
  statuses: string[];
  tasks: BoardTask[];
}

export interface BoardServerOptions {
  host: string;
  port: number;
  open?: boolean;
}

export interface BoardServer {
  server: Server;
  url: string;
}

export function createBoardModel(repoRoot: string): BoardModel {
  const tasks = listTasks(repoRoot).map((task) => boardTask(task, repoRoot));
  const unknownStatuses = tasks
    .map((task) => task.status)
    .filter((status) => !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number]));
  return {
    generatedAt: new Date().toISOString(),
    repoRoot,
    statuses: [...VALID_STATUSES, ...new Set(unknownStatuses)],
    tasks,
  };
}

export function renderBoardHtml(model: BoardModel): string {
  const data = escapeScriptJson(model);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Taskr Board</title>
  <style>
    :root {
      color-scheme: dark;
      --ink: #e7e2d8;
      --ink-strong: #f7f2e8;
      --muted: #a39c91;
      --faint: #6c665d;
      --background: #101316;
      --panel: #171b20;
      --panel-raised: #1c2228;
      --card: #20262d;
      --card-hover: #242b33;
      --line: rgba(231, 226, 216, 0.12);
      --line-strong: rgba(231, 226, 216, 0.22);
      --accent: #d37b45;
      --accent-soft: rgba(211, 123, 69, 0.14);
      --accent-2: #76b6a8;
      --focus: 0 0 0 3px rgba(118, 182, 168, 0.24);
      --blocked: #d66b68;
      --implemented: #88bd63;
      --closed: #8f99e8;
      --shadow-sm: 0 6px 16px rgba(0, 0, 0, 0.18);
      --shadow-md: 0 16px 42px rgba(0, 0, 0, 0.28);
      font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100dvh;
      color: var(--ink);
      line-height: 1.5;
      background:
        linear-gradient(180deg, rgba(118, 182, 168, 0.045), transparent 360px),
        var(--background);
      overflow-x: hidden;
    }

    body::before {
      content: "";
      position: fixed;
      inset: 0;
      pointer-events: none;
      opacity: 0.08;
      background-image:
        linear-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
      background-size: 48px 48px;
      mask-image: linear-gradient(to bottom, black, transparent 70%);
    }

    button, input { font: inherit; }

    .shell {
      width: min(1560px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 20px 0 28px;
    }

    .masthead {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 20px;
      align-items: center;
      padding: 22px;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: rgba(23, 27, 32, 0.94);
      box-shadow: var(--shadow-md);
    }

    .eyebrow {
      margin: 0 0 6px;
      color: var(--accent-2);
      text-transform: uppercase;
      letter-spacing: 0;
      font-size: 0.78rem;
      font-weight: 700;
    }

    h1 {
      margin: 0;
      color: var(--ink-strong);
      font-size: 3.15rem;
      line-height: 1.05;
      letter-spacing: 0;
      font-weight: 720;
    }

    .repo {
      max-width: 62rem;
      margin: 10px 0 0;
      color: var(--muted);
      font-size: 0.9rem;
      word-break: break-all;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(92px, 1fr));
      gap: 8px;
      min-width: 320px;
    }

    .stat {
      padding: 12px;
      border-radius: 10px;
      background: var(--panel-raised);
      border: 1px solid var(--line);
    }

    .stat strong {
      display: block;
      font-size: 1.75rem;
      line-height: 1;
      color: var(--accent);
      font-weight: 720;
    }

    .stat span {
      display: block;
      margin-top: 5px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0;
      font-size: 0.7rem;
      font-weight: 600;
    }

    .toolbar {
      display: flex;
      gap: 12px;
      align-items: center;
      margin: 14px 0;
    }

    .search {
      width: min(520px, 100%);
      color: var(--ink);
      border: 1px solid var(--line);
      outline: none;
      border-radius: 10px;
      background: rgba(28, 34, 40, 0.9);
      min-height: 44px;
      padding: 10px 12px;
      transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
    }

    .search::placeholder { color: var(--faint); }

    .search:focus-visible {
      border-color: var(--accent-2);
      box-shadow: var(--focus);
      background: var(--panel-raised);
    }

    .hint {
      color: var(--muted);
      font-size: 0.9rem;
    }

    .board {
      display: grid;
      grid-template-columns: repeat(5, minmax(260px, 1fr));
      gap: 12px;
      align-items: start;
      overflow-x: auto;
      padding-bottom: 16px;
      -webkit-overflow-scrolling: touch;
    }

    .column {
      min-height: 540px;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: rgba(23, 27, 32, 0.96);
      box-shadow: 0 1px 0 rgba(255, 255, 255, 0.03);
      padding: 12px;
    }

    .column-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
      padding: 6px 4px 12px;
      border-bottom: 1px solid var(--line);
    }

    .column-title {
      display: flex;
      gap: 9px;
      align-items: center;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0;
      font-size: 0.78rem;
      font-weight: 700;
    }

    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--accent);
    }

    .column[data-status="blocked"] .dot { background: var(--blocked); }
    .column[data-status="implemented"] .dot { background: var(--implemented); }
    .column[data-status="closed"] .dot { background: var(--closed); }
    .column[data-status="in_progress"] .dot { background: var(--accent-2); }

    .count {
      color: var(--muted);
      border: 1px solid var(--line);
      border-radius: 999px;
      min-width: 28px;
      padding: 2px 8px;
      text-align: center;
      font-size: 0.76rem;
    }

    .cards {
      display: grid;
      gap: 9px;
    }

    .card {
      width: 100%;
      display: block;
      text-align: left;
      color: var(--ink);
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 13px;
      background: var(--card);
      box-shadow: none;
      cursor: pointer;
      transition: transform 180ms ease, border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
    }

    .card:hover, .card:focus-visible {
      transform: translateY(-1px);
      border-color: var(--line-strong);
      background: var(--card-hover);
      box-shadow: var(--shadow-sm);
      outline: none;
    }

    .card:focus-visible { box-shadow: var(--focus), var(--shadow-sm); }

    .card.is-active {
      border-color: var(--accent);
      box-shadow: inset 3px 0 0 var(--accent);
    }

    .card-id {
      color: var(--muted);
      letter-spacing: 0;
      font-size: 0.76rem;
      font-weight: 600;
    }

    .card-title {
      margin: 7px 0 9px;
      color: var(--ink-strong);
      font-size: 1rem;
      line-height: 1.35;
      letter-spacing: 0;
      font-weight: 680;
    }

    .card-request {
      color: var(--muted);
      line-height: 1.45;
      font-size: 0.88rem;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .card-footer {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 12px;
    }

    .pill {
      border-radius: 999px;
      padding: 3px 7px;
      background: rgba(231, 226, 216, 0.06);
      color: var(--muted);
      border: 1px solid rgba(231, 226, 216, 0.07);
      font-size: 0.72rem;
      letter-spacing: 0;
    }

    .empty {
      min-height: 96px;
      display: grid;
      place-items: center;
      color: var(--faint);
      border: 1px dashed var(--line);
      border-radius: 10px;
      font-size: 0.9rem;
    }

    .detail {
      position: fixed;
      top: 18px;
      right: 18px;
      bottom: 18px;
      width: min(620px, calc(100vw - 36px));
      display: grid;
      grid-template-rows: auto 1fr;
      border: 1px solid var(--line-strong);
      border-radius: 14px;
      background: rgba(17, 21, 25, 0.98);
      box-shadow: 0 22px 70px rgba(0, 0, 0, 0.52);
      transform: translateX(calc(100% + 28px));
      transition: transform 220ms ease;
      z-index: 40;
      overflow: hidden;
    }

    .detail.is-open { transform: translateX(0); }

    .detail-header {
      padding: 22px;
      border-bottom: 1px solid var(--line);
      background: var(--panel);
    }

    .detail-kicker {
      color: var(--accent-2);
      text-transform: uppercase;
      letter-spacing: 0;
      font-size: 0.76rem;
      font-weight: 700;
    }

    .detail-title {
      margin: 8px 56px 0 0;
      color: var(--ink-strong);
      font-size: 1.55rem;
      line-height: 1.25;
      letter-spacing: 0;
      font-weight: 720;
    }

    .close {
      position: absolute;
      top: 14px;
      right: 14px;
      width: 44px;
      height: 44px;
      border: 1px solid var(--line);
      border-radius: 10px;
      color: var(--ink);
      background: rgba(231, 226, 216, 0.06);
      cursor: pointer;
      transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
    }

    .close:hover {
      border-color: var(--line-strong);
      background: rgba(231, 226, 216, 0.1);
    }

    .close:focus-visible {
      outline: none;
      box-shadow: var(--focus);
    }

    .detail-body {
      overflow: auto;
      padding: 18px 22px 24px;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 9px;
      margin-bottom: 18px;
    }

    .meta {
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 11px;
      background: rgba(231, 226, 216, 0.035);
      color: var(--ink);
      word-break: break-word;
    }

    .meta span {
      display: block;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0;
      font-size: 0.7rem;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .section {
      margin-top: 12px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: rgba(231, 226, 216, 0.03);
      overflow: hidden;
    }

    .section h3 {
      margin: 0;
      padding: 11px 13px;
      color: var(--accent);
      border-bottom: 1px solid var(--line);
      text-transform: uppercase;
      letter-spacing: 0;
      font-size: 0.78rem;
      font-weight: 750;
    }

    .section pre {
      margin: 0;
      padding: 13px;
      color: #d8d1c5;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: "SFMono-Regular", Consolas, monospace;
      font-size: 0.86rem;
      line-height: 1.52;
    }

    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      opacity: 0;
      pointer-events: none;
      transition: opacity 180ms ease;
      z-index: 30;
    }

    .backdrop.is-open {
      opacity: 1;
      pointer-events: auto;
    }

    @media (max-width: 980px) {
      .masthead { grid-template-columns: 1fr; }
      .stats { min-width: 0; }
      .board { grid-template-columns: repeat(5, 280px); }
    }

    @media (max-width: 640px) {
      .shell { width: min(100vw - 16px, 1560px); padding-top: 8px; }
      .masthead { padding: 16px; border-radius: 12px; }
      h1 { font-size: 2.25rem; }
      .stats { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .stat { padding: 10px; }
      .stat strong { font-size: 1.35rem; }
      .toolbar { display: block; }
      .hint { margin-top: 10px; }
      .meta-grid { grid-template-columns: 1fr; }
      .detail {
        top: 8px;
        right: 8px;
        bottom: 8px;
        width: calc(100vw - 16px);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 1ms !important;
        scroll-behavior: auto !important;
        transition-duration: 1ms !important;
      }

      .card:hover, .card:focus-visible { transform: none; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <section class="masthead" aria-labelledby="title">
      <div>
        <p class="eyebrow">Repo-local task memory</p>
        <h1 id="title">Taskr Board</h1>
        <p class="repo" id="repo"></p>
      </div>
      <div class="stats" aria-label="Task statistics">
        <div class="stat"><strong id="totalTasks">0</strong><span>Total tasks</span></div>
        <div class="stat"><strong id="activeTasks">0</strong><span>Active</span></div>
        <div class="stat"><strong id="implementedTasks">0</strong><span>Implemented</span></div>
      </div>
    </section>

    <div class="toolbar">
      <input class="search" id="search" type="search" aria-label="Filter tasks" placeholder="Filter by title, id, request, or file..." autocomplete="off">
      <div class="hint">Click any card to open its task detail.</div>
    </div>

    <section class="board" id="board" aria-label="Taskr Kanban board"></section>
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
  <script>
    const model = window.__TASKR_BOARD__;
    const board = document.querySelector("#board");
    const detail = document.querySelector("#detail");
    const backdrop = document.querySelector("#backdrop");
    const closeButton = document.querySelector("#close");
    const search = document.querySelector("#search");
    let activeId = null;

    const labels = {
      planned: "Planned",
      in_progress: "In progress",
      blocked: "Blocked",
      implemented: "Implemented",
      closed: "Closed"
    };

    document.querySelector("#repo").textContent = model.repoRoot;
    document.querySelector("#totalTasks").textContent = model.tasks.length;
    document.querySelector("#activeTasks").textContent = model.tasks.filter((task) => ["planned", "in_progress", "blocked"].includes(task.status)).length;
    document.querySelector("#implementedTasks").textContent = model.tasks.filter((task) => task.status === "implemented").length;

    function render() {
      const query = search.value.trim().toLowerCase();
      const tasks = model.tasks.filter((task) => matches(task, query));
      board.replaceChildren(...model.statuses.map((status) => column(status, tasks.filter((task) => task.status === status))));
    }

    function column(status, tasks) {
      const element = document.createElement("article");
      element.className = "column";
      element.dataset.status = status;

      const header = document.createElement("div");
      header.className = "column-header";

      const title = document.createElement("h2");
      title.className = "column-title";
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.setAttribute("aria-hidden", "true");
      const label = document.createElement("span");
      label.textContent = labels[status] || status;
      title.append(dot, label);

      const count = document.createElement("span");
      count.className = "count";
      count.textContent = String(tasks.length);
      header.append(title, count);

      const cards = document.createElement("div");
      cards.className = "cards";
      if (tasks.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = "No cards";
        cards.append(empty);
      } else {
        cards.append(...tasks.map(card));
      }

      element.append(header, cards);
      return element;
    }

    function card(task) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "card" + (task.id === activeId ? " is-active" : "");
      button.addEventListener("click", () => openDetail(task));

      const id = document.createElement("div");
      id.className = "card-id";
      id.textContent = task.id;

      const title = document.createElement("h3");
      title.className = "card-title";
      title.textContent = task.title;

      const request = document.createElement("div");
      request.className = "card-request";
      request.textContent = task.sections.Request || "No request recorded.";

      const footer = document.createElement("div");
      footer.className = "card-footer";
      footer.append(
        pill(criteriaLabel(task)),
        pill(task.commitStatus || "commit unknown"),
        pill(task.relatedFiles.length + " files")
      );

      button.append(id, title, request, footer);
      return button;
    }

    function openDetail(task) {
      activeId = task.id;
      render();
      document.querySelector("#detailKicker").textContent = task.id + " · " + (labels[task.status] || task.status);
      document.querySelector("#detailTitle").textContent = task.title;
      document.querySelector("#detailBody").replaceChildren(detailContent(task));
      detail.classList.add("is-open");
      detail.setAttribute("aria-hidden", "false");
      backdrop.hidden = false;
      requestAnimationFrame(() => backdrop.classList.add("is-open"));
      closeButton.focus({ preventScroll: true });
    }

    function closeDetail() {
      activeId = null;
      detail.classList.remove("is-open");
      detail.setAttribute("aria-hidden", "true");
      backdrop.classList.remove("is-open");
      setTimeout(() => { backdrop.hidden = true; }, 180);
      render();
    }

    function detailContent(task) {
      const fragment = document.createDocumentFragment();
      const meta = document.createElement("div");
      meta.className = "meta-grid";
      meta.append(
        metaItem("Status", labels[task.status] || task.status),
        metaItem("Updated", task.updatedAt || "Unknown"),
        metaItem("Commit status", task.commitStatus || "Unknown"),
        metaItem("Path", task.path),
        metaItem("Branch", task.branch || "None"),
        metaItem("Criteria", criteriaLabel(task)),
        metaItem("Related files", task.relatedFiles.length ? task.relatedFiles.join("\\n") : "None"),
        metaItem("Commits", task.commits.length ? task.commits.join("\\n") : "None")
      );
      fragment.append(meta);

      for (const name of ["Request", "Acceptance Criteria", "Implementation Plan", "Progress Log", "Agent Notes", "Completion Summary"]) {
        fragment.append(section(name, task.sections[name] || "Empty."));
      }
      return fragment;
    }

    function section(title, content) {
      const wrapper = document.createElement("section");
      wrapper.className = "section";
      const heading = document.createElement("h3");
      heading.textContent = title;
      const pre = document.createElement("pre");
      pre.textContent = content;
      wrapper.append(heading, pre);
      return wrapper;
    }

    function metaItem(label, value) {
      const item = document.createElement("div");
      item.className = "meta";
      const key = document.createElement("span");
      key.textContent = label;
      const body = document.createElement("div");
      body.textContent = String(value);
      item.append(key, body);
      return item;
    }

    function pill(value) {
      const element = document.createElement("span");
      element.className = "pill";
      element.textContent = value;
      return element;
    }

    function criteriaLabel(task) {
      return task.criteria.checked + "/" + task.criteria.total + " criteria";
    }

    function matches(task, query) {
      if (!query) return true;
      return [
        task.id,
        task.title,
        task.path,
        task.sections.Request,
        task.relatedFiles.join(" ")
      ].join(" ").toLowerCase().includes(query);
    }

    closeButton.addEventListener("click", closeDetail);
    backdrop.addEventListener("click", closeDetail);
    search.addEventListener("input", render);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && detail.classList.contains("is-open")) closeDetail();
    });

    render();
  </script>
</body>
</html>`;
}

export function startBoardServer(
  repoRoot: string,
  options: BoardServerOptions,
): Promise<BoardServer> {
  const server = createServer((request, response) => {
    if (request.url === "/api/tasks") {
      const body = JSON.stringify(createBoardModel(repoRoot), null, 2);
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      response.end(body);
      return;
    }

    if (request.url === "/" || request.url === undefined) {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(renderBoardHtml(createBoardModel(repoRoot)));
      return;
    }

    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port, options.host, () => {
      server.off("error", reject);
      const address = server.address();
      const actualPort = typeof address === "object" && address ? address.port : options.port;
      const url = `http://${options.host}:${actualPort}/`;
      if (options.open) {
        openUrl(url);
      }
      resolve({ server, url });
    });
  });
}

function boardTask(document: TaskDocument, repoRoot: string): BoardTask {
  const sections = extractSections(document.body);
  return {
    id: taskId(document),
    title: taskTitle(document),
    status: taskStatus(document) || "planned",
    path: relative(document.path, repoRoot),
    updatedAt: String(document.metadata.updated_at ?? ""),
    branch: document.metadata.branch === null ? null : String(document.metadata.branch ?? ""),
    commitStatus: String(document.metadata.commit_status ?? "not_created"),
    commits: asStringArray(document.metadata.commits),
    relatedFiles: asStringArray(document.metadata.related_files),
    verification: document.metadata.verification ?? null,
    sections,
    criteria: countCriteria(sections["Acceptance Criteria"] ?? ""),
  };
}

function countCriteria(value: string): { checked: number; total: number } {
  const matches = [...value.matchAll(/- \[([ xX])\]/g)];
  return {
    checked: matches.filter((match) => match[1].toLowerCase() === "x").length,
    total: matches.length,
  };
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function escapeScriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function openUrl(url: string): void {
  const command =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  try {
    const child = spawn(command, args, { detached: true, stdio: "ignore" });
    child.on("error", () => undefined);
    child.unref();
  } catch {
    return;
  }
}
