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
      --ink: #eee7d5;
      --muted: #9f998d;
      --faint: #615b50;
      --paper: #191714;
      --panel: #211f1a;
      --card: #f0e3c4;
      --card-ink: #21180f;
      --rail: #302d27;
      --line: rgba(238, 231, 213, 0.16);
      --accent: #f58b43;
      --accent-2: #96d6bf;
      --blocked: #ef6f6c;
      --implemented: #a5e065;
      --closed: #9ea7ff;
      --shadow: 0 28px 80px rgba(0, 0, 0, 0.42);
      font-family: "Avenir Next Condensed", "DIN Condensed", "Gill Sans", sans-serif;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      color: var(--ink);
      background:
        radial-gradient(circle at 12% 8%, rgba(245, 139, 67, 0.18), transparent 34rem),
        radial-gradient(circle at 88% 12%, rgba(150, 214, 191, 0.12), transparent 28rem),
        linear-gradient(135deg, #11100e 0%, #1f1b16 46%, #0f0e0c 100%);
      overflow-x: hidden;
    }

    body::before {
      content: "";
      position: fixed;
      inset: 0;
      pointer-events: none;
      opacity: 0.18;
      background-image:
        linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
      background-size: 42px 42px;
      mask-image: linear-gradient(to bottom, black, transparent 82%);
    }

    button, input { font: inherit; }

    .shell {
      width: min(1680px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 28px 0 36px;
    }

    .masthead {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 24px;
      align-items: end;
      padding: 28px;
      border: 1px solid var(--line);
      border-radius: 30px;
      background: rgba(25, 23, 20, 0.72);
      box-shadow: var(--shadow);
      backdrop-filter: blur(18px);
    }

    .eyebrow {
      margin: 0 0 8px;
      color: var(--accent-2);
      letter-spacing: 0.24em;
      text-transform: uppercase;
      font-size: 0.82rem;
    }

    h1 {
      margin: 0;
      font-family: Georgia, "Times New Roman", serif;
      font-size: clamp(3.4rem, 7vw, 8.5rem);
      line-height: 0.82;
      letter-spacing: -0.08em;
      font-weight: 900;
    }

    .repo {
      max-width: 62rem;
      margin: 18px 0 0;
      color: var(--muted);
      font-size: 0.96rem;
      word-break: break-all;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(92px, 1fr));
      gap: 10px;
      min-width: 340px;
    }

    .stat {
      padding: 18px;
      border-radius: 22px;
      background: #0f0e0c;
      border: 1px solid var(--line);
    }

    .stat strong {
      display: block;
      font-size: 2.4rem;
      line-height: 1;
      color: var(--accent);
      font-family: Georgia, "Times New Roman", serif;
    }

    .stat span {
      display: block;
      margin-top: 8px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.13em;
      font-size: 0.72rem;
    }

    .toolbar {
      display: flex;
      gap: 14px;
      align-items: center;
      margin: 18px 0;
    }

    .search {
      width: min(520px, 100%);
      color: var(--ink);
      border: 1px solid var(--line);
      outline: none;
      border-radius: 999px;
      background: rgba(15, 14, 12, 0.78);
      padding: 14px 18px;
    }

    .hint { color: var(--muted); }

    .board {
      display: grid;
      grid-template-columns: repeat(5, minmax(260px, 1fr));
      gap: 16px;
      align-items: start;
      overflow-x: auto;
      padding-bottom: 18px;
    }

    .column {
      min-height: 540px;
      border: 1px solid var(--line);
      border-radius: 26px;
      background: rgba(33, 31, 26, 0.74);
      box-shadow: 0 18px 42px rgba(0, 0, 0, 0.24);
      padding: 14px;
    }

    .column-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
      padding: 10px 8px 14px;
      border-bottom: 1px solid var(--line);
    }

    .column-title {
      display: flex;
      gap: 9px;
      align-items: center;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 0.86rem;
    }

    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 0 5px rgba(245, 139, 67, 0.12);
    }

    .column[data-status="blocked"] .dot { background: var(--blocked); box-shadow: 0 0 0 5px rgba(239, 111, 108, 0.14); }
    .column[data-status="implemented"] .dot { background: var(--implemented); box-shadow: 0 0 0 5px rgba(165, 224, 101, 0.14); }
    .column[data-status="closed"] .dot { background: var(--closed); box-shadow: 0 0 0 5px rgba(158, 167, 255, 0.14); }
    .column[data-status="in_progress"] .dot { background: var(--accent-2); box-shadow: 0 0 0 5px rgba(150, 214, 191, 0.14); }

    .count {
      color: var(--muted);
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 3px 9px;
      font-size: 0.78rem;
    }

    .cards {
      display: grid;
      gap: 12px;
    }

    .card {
      width: 100%;
      display: block;
      text-align: left;
      color: var(--card-ink);
      border: 0;
      border-radius: 22px;
      padding: 18px;
      background:
        linear-gradient(135deg, rgba(255, 255, 255, 0.56), transparent 44%),
        var(--card);
      box-shadow: 0 14px 28px rgba(0, 0, 0, 0.28), inset 0 -1px 0 rgba(0, 0, 0, 0.12);
      cursor: pointer;
      transform: rotate(var(--tilt, -0.6deg));
      transition: transform 180ms ease, box-shadow 180ms ease, filter 180ms ease;
    }

    .card:hover, .card:focus-visible {
      transform: translateY(-4px) rotate(0deg);
      box-shadow: 0 24px 46px rgba(0, 0, 0, 0.36);
      outline: none;
      filter: saturate(1.06);
    }

    .card.is-active {
      box-shadow: 0 0 0 3px var(--accent), 0 24px 46px rgba(0, 0, 0, 0.36);
    }

    .card:nth-child(2n) { --tilt: 0.7deg; }
    .card:nth-child(3n) { --tilt: -1.1deg; }

    .card-id {
      color: rgba(33, 24, 15, 0.54);
      text-transform: uppercase;
      letter-spacing: 0.13em;
      font-size: 0.72rem;
    }

    .card-title {
      margin: 8px 0 12px;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 1.42rem;
      line-height: 1.05;
      letter-spacing: -0.035em;
    }

    .card-request {
      color: rgba(33, 24, 15, 0.74);
      line-height: 1.38;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .card-footer {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 14px;
    }

    .pill {
      border-radius: 999px;
      padding: 5px 9px;
      background: rgba(33, 24, 15, 0.09);
      color: rgba(33, 24, 15, 0.72);
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .empty {
      min-height: 120px;
      display: grid;
      place-items: center;
      color: var(--faint);
      border: 1px dashed rgba(238, 231, 213, 0.16);
      border-radius: 18px;
      font-family: Georgia, "Times New Roman", serif;
    }

    .detail {
      position: fixed;
      top: 18px;
      right: 18px;
      bottom: 18px;
      width: min(620px, calc(100vw - 36px));
      display: grid;
      grid-template-rows: auto 1fr;
      border: 1px solid rgba(238, 231, 213, 0.24);
      border-radius: 30px;
      background: rgba(15, 14, 12, 0.94);
      box-shadow: 0 30px 100px rgba(0, 0, 0, 0.62);
      transform: translateX(calc(100% + 28px));
      transition: transform 220ms ease;
      z-index: 10;
      overflow: hidden;
      backdrop-filter: blur(18px);
    }

    .detail.is-open { transform: translateX(0); }

    .detail-header {
      padding: 24px;
      border-bottom: 1px solid var(--line);
      background: linear-gradient(135deg, rgba(245, 139, 67, 0.14), transparent);
    }

    .detail-kicker {
      color: var(--accent-2);
      text-transform: uppercase;
      letter-spacing: 0.16em;
      font-size: 0.76rem;
    }

    .detail-title {
      margin: 10px 0 0;
      font-family: Georgia, "Times New Roman", serif;
      font-size: clamp(2rem, 5vw, 3.3rem);
      line-height: 0.96;
      letter-spacing: -0.055em;
    }

    .close {
      position: absolute;
      top: 18px;
      right: 18px;
      width: 42px;
      height: 42px;
      border: 1px solid var(--line);
      border-radius: 50%;
      color: var(--ink);
      background: rgba(255, 255, 255, 0.06);
      cursor: pointer;
    }

    .detail-body {
      overflow: auto;
      padding: 22px 24px 28px;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 20px;
    }

    .meta {
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 13px;
      background: rgba(255, 255, 255, 0.035);
    }

    .meta span {
      display: block;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 0.7rem;
      margin-bottom: 5px;
    }

    .section {
      margin-top: 16px;
      border: 1px solid var(--line);
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.032);
      overflow: hidden;
    }

    .section h3 {
      margin: 0;
      padding: 13px 16px;
      color: var(--accent);
      border-bottom: 1px solid var(--line);
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 0.78rem;
    }

    .section pre {
      margin: 0;
      padding: 16px;
      color: #d9d1bf;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: "SFMono-Regular", Consolas, monospace;
      font-size: 0.86rem;
      line-height: 1.52;
    }

    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.36);
      opacity: 0;
      pointer-events: none;
      transition: opacity 180ms ease;
      z-index: 9;
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
      .shell { width: min(100vw - 20px, 1680px); padding-top: 10px; }
      .masthead { padding: 20px; border-radius: 22px; }
      .stats { grid-template-columns: 1fr; }
      .toolbar { display: block; }
      .hint { margin-top: 10px; }
      .meta-grid { grid-template-columns: 1fr; }
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
      <input class="search" id="search" type="search" placeholder="Filter by title, id, request, or file..." autocomplete="off">
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
