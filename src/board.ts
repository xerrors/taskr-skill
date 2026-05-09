import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { spawn } from "node:child_process";
import {
  extractSections,
  listTasks,
  loadTaskById,
  relative,
  replaceSection,
  TaskrError,
  taskId,
  taskStatus,
  taskTitle,
  VALID_STATUSES,
  writeTask,
  type TaskDocument,
} from "./protocol.js";

export interface BoardTask {
  id: string;
  title: string;
  status: string;
  originalStatus: string;
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
  return {
    generatedAt: new Date().toISOString(),
    repoRoot,
    statuses: [...VALID_STATUSES],
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
      --ink: #dbe7f3;
      --ink-strong: #f7fbff;
      --muted: #93a4b7;
      --faint: #617083;
      --background: #090d12;
      --surface: #0f151c;
      --panel: #121922;
      --panel-raised: #17202b;
      --card: #141c25;
      --card-hover: #182331;
      --line: rgba(148, 163, 184, 0.16);
      --line-strong: rgba(148, 163, 184, 0.28);
      --accent: #38bdf8;
      --accent-soft: rgba(56, 189, 248, 0.12);
      --accent-2: #22c55e;
      --focus: 0 0 0 3px rgba(56, 189, 248, 0.26);
      --planned: #f59e0b;
      --blocked: #fb7185;
      --implemented: #22c55e;
      --shadow-sm: 0 10px 28px rgba(0, 0, 0, 0.24);
      --shadow-md: 0 18px 56px rgba(0, 0, 0, 0.34);
      font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100dvh;
      color: var(--ink);
      line-height: 1.5;
      background:
        linear-gradient(180deg, rgba(56, 189, 248, 0.065), transparent 320px),
        linear-gradient(90deg, rgba(34, 197, 94, 0.035), transparent 42%),
        var(--background);
      overflow-x: hidden;
    }

    body::before {
      content: "";
      position: fixed;
      inset: 0;
      pointer-events: none;
      opacity: 0.035;
      background-image:
        linear-gradient(rgba(226, 232, 240, 0.18) 1px, transparent 1px),
        linear-gradient(90deg, rgba(226, 232, 240, 0.14) 1px, transparent 1px);
      background-size: 40px 40px;
      mask-image: linear-gradient(to bottom, black, transparent 58%);
    }

    button, input { font: inherit; }

    .shell {
      width: min(1560px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 16px 0 28px;
    }

    .masthead {
      position: sticky;
      top: 12px;
      z-index: 20;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 20px;
      align-items: center;
      padding: 22px 0 18px;
      border-bottom: 1px solid transparent;
      background: transparent;
      isolation: isolate;
      transition: padding 180ms ease, border-color 180ms ease;
    }

    .masthead::before {
      content: "";
      position: absolute;
      top: 0;
      bottom: 0;
      left: 50%;
      width: 100vw;
      transform: translateX(-50%);
      z-index: -1;
      opacity: 0;
      background: rgba(9, 13, 18, 0.9);
      border-bottom: 1px solid var(--line);
      box-shadow: 0 14px 28px rgba(0, 0, 0, 0.18);
      backdrop-filter: blur(16px);
      transition: opacity 180ms ease;
    }

    .masthead.is-compact {
      padding: 10px 0 10px;
    }

    .masthead.is-compact::before {
      opacity: 1;
    }

    .eyebrow {
      margin: 0 0 6px;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0;
      font-size: 0.72rem;
      font-weight: 700;
    }

    h1 {
      margin: 0;
      color: var(--ink-strong);
      font-size: 2.65rem;
      line-height: 1.05;
      letter-spacing: 0;
      font-weight: 720;
      transition: font-size 180ms ease;
    }

    .masthead.is-compact h1 {
      font-size: 1.55rem;
    }

    .repo {
      max-width: 62rem;
      margin: 8px 0 0;
      color: var(--muted);
      font-size: 0.86rem;
      word-break: break-all;
      transition: margin 180ms ease, font-size 180ms ease;
    }

    .masthead.is-compact .repo {
      margin-top: 4px;
      font-size: 0.78rem;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(92px, 1fr));
      gap: 8px;
      min-width: 300px;
    }

    .stat {
      padding: 10px 12px;
      border-radius: 8px;
      background: rgba(18, 25, 34, 0.74);
      border: 1px solid var(--line);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
      transition: padding 180ms ease;
    }

    .masthead.is-compact .stat {
      padding: 8px 10px;
    }

    .stat strong {
      display: block;
      font-size: 1.35rem;
      line-height: 1;
      color: var(--ink-strong);
      font-weight: 720;
      transition: font-size 180ms ease;
    }

    .masthead.is-compact .stat strong {
      font-size: 1.2rem;
    }

    .stat span {
      display: block;
      margin-top: 5px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0;
      font-size: 0.66rem;
      font-weight: 600;
    }

    .toolbar {
      display: flex;
      gap: 12px;
      align-items: center;
      margin: 14px 0 12px;
      padding: 8px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: rgba(15, 21, 28, 0.66);
    }

    .search-wrap {
      display: flex;
      gap: 8px;
      align-items: center;
      width: min(620px, 100%);
    }

    .view-toggle {
      display: inline-flex;
      gap: 4px;
      padding: 4px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: rgba(9, 13, 18, 0.58);
    }

    .search {
      width: 100%;
      color: var(--ink);
      border: 1px solid var(--line);
      outline: none;
      border-radius: 8px;
      background: rgba(9, 13, 18, 0.78);
      min-height: 44px;
      padding: 10px 13px;
      transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
    }

    .search::placeholder { color: var(--faint); }

    .search:focus-visible {
      border-color: var(--accent-2);
      box-shadow: var(--focus);
      background: var(--panel-raised);
    }

    .icon-button, .section-action {
      display: inline-grid;
      place-items: center;
      min-width: 44px;
      min-height: 44px;
      color: var(--ink);
      border: 1px solid var(--line);
      border-radius: 8px;
      background: rgba(20, 28, 37, 0.88);
      cursor: pointer;
      transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease, color 160ms ease;
    }

    .icon-button {
      width: auto;
      padding: 0 16px;
      white-space: nowrap;
      font-weight: 700;
    }

    .view-tab {
      min-height: 36px;
      min-width: 72px;
      padding: 0 12px;
      color: var(--muted);
      border: 1px solid transparent;
      border-radius: 7px;
      background: transparent;
      cursor: pointer;
      font-size: 0.82rem;
      font-weight: 700;
      transition: color 160ms ease, border-color 160ms ease, background 160ms ease;
    }

    .view-tab:hover {
      color: var(--ink);
      background: rgba(148, 163, 184, 0.08);
    }

    .view-tab:focus-visible {
      outline: none;
      box-shadow: var(--focus);
    }

    .view-tab[aria-pressed="true"] {
      color: var(--ink-strong);
      border-color: var(--line-strong);
      background: rgba(20, 28, 37, 0.92);
    }

    .icon-button:hover, .section-action:hover {
      border-color: var(--line-strong);
      background: var(--panel-raised);
    }

    .section-action:hover {
      transform: translateY(-1px);
    }

    .refresh-button {
      min-width: 96px;
      color: var(--ink);
      background: rgba(20, 28, 37, 0.88);
      border-color: var(--line);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
    }

    .refresh-button:hover {
      color: var(--ink-strong);
      background: var(--panel-raised);
      border-color: var(--line-strong);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
    }

    .refresh-button[disabled] {
      color: var(--faint);
      background: rgba(20, 28, 37, 0.62);
      border-color: var(--line);
      box-shadow: none;
    }

    .icon-button:focus-visible, .section-action:focus-visible {
      outline: none;
      box-shadow: var(--focus);
    }

    .icon-button[disabled], .section-action[disabled] {
      cursor: wait;
      color: var(--faint);
      transform: none;
    }

    .toolbar-status {
      min-width: 128px;
      color: var(--muted);
      font-size: 0.82rem;
    }

    .hint {
      color: var(--muted);
      font-size: 0.84rem;
    }

    .is-hidden {
      display: none !important;
    }

    .table-view {
      border: 1px solid var(--line);
      border-radius: 10px;
      background: rgba(15, 21, 28, 0.78);
      overflow: hidden;
      box-shadow: 0 1px 0 rgba(255, 255, 255, 0.03);
    }

    .table-scroll {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    .task-table {
      width: 100%;
      min-width: 860px;
      border-collapse: collapse;
    }

    .task-table th {
      padding: 11px 14px;
      color: var(--muted);
      border-bottom: 1px solid var(--line);
      background: rgba(9, 13, 18, 0.46);
      text-align: left;
      text-transform: uppercase;
      letter-spacing: 0;
      font-size: 0.68rem;
      font-weight: 750;
    }

    .task-table td {
      padding: 12px 14px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
      color: var(--ink);
      vertical-align: middle;
      font-size: 0.86rem;
    }

    .task-table tr:last-child td {
      border-bottom: 0;
    }

    .task-row {
      cursor: pointer;
      transition: background 140ms ease, box-shadow 140ms ease;
    }

    .task-row:hover,
    .task-row:focus-visible {
      background: rgba(24, 35, 49, 0.78);
      outline: none;
    }

    .task-row.is-active {
      background: rgba(56, 189, 248, 0.08);
      box-shadow: inset 3px 0 0 var(--accent);
    }

    .task-title-cell {
      min-width: 280px;
    }

    .task-title-main {
      display: block;
      color: var(--ink-strong);
      font-weight: 700;
      line-height: 1.35;
    }

    .task-title-sub {
      display: block;
      max-width: 520px;
      margin-top: 4px;
      color: var(--muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 0.78rem;
    }

    .status-chip {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      min-width: 112px;
      color: var(--ink);
      font-weight: 650;
    }

    .status-chip .dot {
      flex: 0 0 auto;
    }

    .status-chip[data-status="blocked"] .dot { background: var(--blocked); box-shadow: 0 0 0 3px rgba(251, 113, 133, 0.12); }
    .status-chip[data-status="implemented"] .dot { background: var(--implemented); box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.12); }
    .status-chip[data-status="in_progress"] .dot { background: var(--accent); box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.12); }

    .table-empty {
      margin: 10px;
    }

    .board {
      display: grid;
      grid-template-columns: repeat(4, minmax(250px, 1fr));
      gap: 10px;
      align-items: start;
      overflow-x: auto;
      padding-bottom: 16px;
      -webkit-overflow-scrolling: touch;
    }

    .column {
      min-height: 560px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: rgba(15, 21, 28, 0.78);
      box-shadow: 0 1px 0 rgba(255, 255, 255, 0.03);
      padding: 10px;
    }

    .column-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
      padding: 5px 3px 10px;
      border-bottom: 1px solid var(--line);
    }

    .column-title {
      display: flex;
      gap: 9px;
      align-items: center;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0;
      color: var(--ink);
      font-size: 0.74rem;
      font-weight: 700;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: var(--planned);
      box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.12);
    }

    .column[data-status="blocked"] .dot { background: var(--blocked); box-shadow: 0 0 0 3px rgba(251, 113, 133, 0.12); }
    .column[data-status="implemented"] .dot { background: var(--implemented); box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.12); }
    .column[data-status="in_progress"] .dot { background: var(--accent); box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.12); }

    .count {
      color: var(--muted);
      border: 1px solid var(--line);
      border-radius: 7px;
      min-width: 26px;
      padding: 2px 7px;
      text-align: center;
      font-size: 0.72rem;
      font-variant-numeric: tabular-nums;
    }

    .cards {
      display: grid;
      gap: 8px;
    }

    .card {
      width: 100%;
      display: block;
      text-align: left;
      color: var(--ink);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 12px;
      background: var(--card);
      box-shadow: none;
      cursor: pointer;
      transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
    }

    .card:hover, .card:focus-visible {
      border-color: var(--line-strong);
      background: var(--card-hover);
      box-shadow: var(--shadow-sm);
      outline: none;
    }

    .card:focus-visible { box-shadow: var(--focus), var(--shadow-sm); }

    .card.is-active {
      border-color: rgba(56, 189, 248, 0.72);
      box-shadow: inset 3px 0 0 var(--accent), var(--shadow-sm);
    }

    .card.card-compact {
      min-height: 0;
      display: grid;
      gap: 7px;
      padding: 10px 11px;
      border-radius: 8px;
      background:
        linear-gradient(180deg, rgba(20, 28, 37, 0.86), rgba(15, 21, 28, 0.72));
      border-color: rgba(148, 163, 184, 0.13);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025);
    }

    .card.card-compact:hover,
    .card.card-compact:focus-visible {
      background:
        linear-gradient(180deg, rgba(24, 35, 49, 0.92), rgba(18, 25, 34, 0.82));
      border-color: rgba(148, 163, 184, 0.26);
    }

    .card.card-compact .card-title {
      margin: 0;
      font-size: 0.88rem;
      line-height: 1.34;
      font-weight: 680;
    }

    .compact-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      min-width: 0;
      color: var(--muted);
    }

    .compact-id {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.7rem;
      font-weight: 620;
    }

    .card.card-compact .mini-progress {
      flex: 0 0 auto;
      min-width: 62px;
      padding: 2px 0;
      border: 0;
      background: transparent;
    }

    .card-id {
      color: var(--muted);
      letter-spacing: 0;
      font-size: 0.72rem;
      font-weight: 600;
    }

    .card-title {
      margin: 6px 0 8px;
      color: var(--ink-strong);
      font-size: 0.96rem;
      line-height: 1.35;
      letter-spacing: 0;
      font-weight: 680;
    }

    .card-request {
      color: var(--muted);
      line-height: 1.45;
      font-size: 0.84rem;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .card-footer {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-top: 11px;
    }

    .pill {
      border-radius: 7px;
      padding: 3px 7px;
      background: rgba(148, 163, 184, 0.08);
      color: var(--muted);
      border: 1px solid rgba(148, 163, 184, 0.1);
      font-size: 0.72rem;
      letter-spacing: 0;
    }

    .mini-progress {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-width: 68px;
    }

    .mini-progress-bar {
      width: 34px;
      height: 5px;
      border-radius: 999px;
      background: rgba(148, 163, 184, 0.14);
      overflow: hidden;
    }

    .mini-progress-bar span {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: var(--implemented);
    }

    .empty {
      min-height: 96px;
      display: grid;
      place-items: center;
      color: var(--faint);
      border: 1px dashed var(--line);
      border-radius: 8px;
      font-size: 0.84rem;
    }

    .detail {
      position: fixed;
      top: 14px;
      right: 14px;
      bottom: 14px;
      width: min(660px, calc(100vw - 28px));
      display: grid;
      grid-template-rows: auto 1fr;
      border: 1px solid var(--line-strong);
      border-radius: 12px;
      background: rgba(12, 17, 24, 0.98);
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.58);
      transform: translateX(calc(100% + 28px));
      transition: transform 220ms ease;
      z-index: 40;
      overflow: hidden;
    }

    .detail.is-open { transform: translateX(0); }

    .detail-header {
      padding: 20px 22px 18px;
      border-bottom: 1px solid var(--line);
      background: var(--panel);
    }

    .detail-kicker {
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0;
      font-size: 0.72rem;
      font-weight: 700;
    }

    .detail-title {
      margin: 8px 56px 0 0;
      color: var(--ink-strong);
      font-size: 1.35rem;
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
      border-radius: 8px;
      color: var(--ink);
      background: rgba(148, 163, 184, 0.08);
      cursor: pointer;
      transition: transform 160ms ease, border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
    }

    .close:hover {
      border-color: var(--line-strong);
      background: rgba(148, 163, 184, 0.13);
      transform: translateY(-1px);
    }

    .close:focus-visible {
      outline: none;
      box-shadow: var(--focus);
    }

    .detail-body {
      overflow: auto;
      padding: 16px 22px 24px;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-bottom: 16px;
    }

    .meta {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px;
      background: rgba(20, 28, 37, 0.66);
      color: var(--ink);
      word-break: break-word;
    }

    .meta span {
      display: block;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0;
      font-size: 0.66rem;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .progress-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .progress-label {
      min-width: 44px;
      color: var(--ink);
      font-weight: 650;
      font-variant-numeric: tabular-nums;
    }

    .progress-percent {
      min-width: 36px;
      color: var(--muted);
      font-size: 0.82rem;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .progress-track {
      flex: 1;
      min-width: 72px;
      height: 9px;
      border-radius: 999px;
      background: rgba(148, 163, 184, 0.12);
      overflow: hidden;
    }

    .progress-fill {
      display: block;
      height: 100%;
      width: 0%;
      border-radius: inherit;
      background: linear-gradient(90deg, var(--accent), var(--implemented));
      transition: width 180ms ease;
    }

    .section {
      margin-top: 12px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: rgba(20, 28, 37, 0.54);
      overflow: hidden;
    }

    .section-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 11px 13px;
      border-bottom: 1px solid var(--line);
    }

    .section h3 {
      margin: 0;
      color: #7dd3fc;
      text-transform: uppercase;
      letter-spacing: 0;
      font-size: 0.72rem;
      font-weight: 750;
    }

    .section-tools {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .section-status {
      color: var(--muted);
      font-size: 0.76rem;
    }

    .section-action {
      min-width: 34px;
      min-height: 30px;
      padding: 4px 9px;
      border-radius: 7px;
      font-size: 0.78rem;
      font-weight: 700;
    }

    .section pre {
      margin: 0;
      padding: 13px;
      color: #dbe7f3;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: "SFMono-Regular", Consolas, monospace;
      font-size: 0.86rem;
      line-height: 1.52;
    }

    .section textarea {
      width: 100%;
      min-height: 180px;
      margin: 0;
      display: block;
      resize: vertical;
      color: #dbe7f3;
      background: rgba(9, 13, 18, 0.78);
      border: 0;
      border-top: 1px solid rgba(148, 163, 184, 0.08);
      outline: none;
      padding: 13px;
      font-family: "SFMono-Regular", Consolas, monospace;
      font-size: 0.86rem;
      line-height: 1.52;
    }

    .section textarea:focus {
      box-shadow: inset 0 0 0 2px rgba(56, 189, 248, 0.32);
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
      .board { grid-template-columns: repeat(4, 280px); }
    }

    @media (max-width: 640px) {
      .shell { width: min(100vw - 16px, 1560px); padding-top: 8px; }
      .masthead {
        padding: 16px 0;
        border: 0;
        border-radius: 0;
        background: transparent;
      }
      h1 { font-size: 2rem; }
      .stats { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .stat { padding: 10px; }
      .stat strong { font-size: 1.35rem; }
      .toolbar { display: grid; }
      .search-wrap { width: 100%; }
      .view-toggle { width: 100%; }
      .view-tab { flex: 1; }
      .hint { margin-top: 10px; }
      .board {
        grid-template-columns: 1fr;
        overflow: visible;
      }
      .table-view {
        overflow: hidden;
      }
      .column { min-height: 0; }
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
        <div class="stat"><strong id="totalTasks">0</strong><span>Total</span></div>
        <div class="stat"><strong id="activeTasks">0</strong><span>Active</span></div>
        <div class="stat"><strong id="implementedTasks">0</strong><span>Done</span></div>
      </div>
    </section>

    <div class="toolbar">
      <div class="search-wrap">
        <input class="search" id="search" type="search" aria-label="Filter tasks" placeholder="Filter by title, id, request, or file..." autocomplete="off">
        <button class="icon-button refresh-button" id="refresh" type="button" aria-label="Refresh tasks" title="Refresh tasks">Refresh</button>
      </div>
      <div class="view-toggle" role="group" aria-label="Board view">
        <button class="view-tab" id="tableViewButton" type="button" aria-pressed="true">Table</button>
        <button class="view-tab" id="boardViewButton" type="button" aria-pressed="false">Board</button>
      </div>
      <div class="hint">Click any task to open its detail.</div>
      <div class="toolbar-status" id="toolbarStatus" role="status" aria-live="polite"></div>
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
  <script>
    let model = window.__TASKR_BOARD__;
    const board = document.querySelector("#board");
    const tableView = document.querySelector("#tableView");
    const detail = document.querySelector("#detail");
    const backdrop = document.querySelector("#backdrop");
    const closeButton = document.querySelector("#close");
    const search = document.querySelector("#search");
    const refreshButton = document.querySelector("#refresh");
    const tableViewButton = document.querySelector("#tableViewButton");
    const boardViewButton = document.querySelector("#boardViewButton");
    const toolbarStatus = document.querySelector("#toolbarStatus");
    const masthead = document.querySelector(".masthead");
    let activeId = null;
    let currentView = "table";
    let statusTimer = null;
    let headerCompact = false;
    let headerFrame = null;

    const labels = {
      planned: "Planned",
      in_progress: "In Progress",
      implemented: "Implemented",
      blocked: "Blocked"
    };

    function updateStats() {
      document.querySelector("#repo").textContent = model.repoRoot;
      document.querySelector("#totalTasks").textContent = model.tasks.length;
      document.querySelector("#activeTasks").textContent = model.tasks.filter((task) => ["planned", "in_progress", "blocked"].includes(task.status)).length;
      document.querySelector("#implementedTasks").textContent = model.tasks.filter((task) => task.status === "implemented").length;
    }

    function render() {
      const query = search.value.trim().toLowerCase();
      const tasks = model.tasks.filter((task) => matches(task, query));
      renderBoard(tasks);
      renderTable(tasks);
      syncView();
    }

    function renderBoard(tasks) {
      board.replaceChildren(...model.statuses.map((status) => column(status, tasks.filter((task) => task.status === status))));
    }

    function renderTable(tasks) {
      if (tasks.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty table-empty";
        empty.textContent = "No tasks";
        tableView.replaceChildren(empty);
        return;
      }

      const scroll = document.createElement("div");
      scroll.className = "table-scroll";
      const table = document.createElement("table");
      table.className = "task-table";

      const head = document.createElement("thead");
      const headRow = document.createElement("tr");
      for (const label of ["Task", "Status", "Criteria", "Updated", "Files", "Commit"]) {
        const cell = document.createElement("th");
        cell.scope = "col";
        cell.textContent = label;
        headRow.append(cell);
      }
      head.append(headRow);

      const body = document.createElement("tbody");
      body.append(...tasks.map(tableRow));
      table.append(head, body);
      scroll.append(table);
      tableView.replaceChildren(scroll);
    }

    function tableRow(task) {
      const row = document.createElement("tr");
      row.className = "task-row" + (task.id === activeId ? " is-active" : "");
      row.tabIndex = 0;
      row.addEventListener("click", () => openDetail(task));
      row.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openDetail(task);
        }
      });

      const title = document.createElement("td");
      title.className = "task-title-cell";
      const titleMain = document.createElement("span");
      titleMain.className = "task-title-main";
      titleMain.textContent = task.title;
      const titleSub = document.createElement("span");
      titleSub.className = "task-title-sub";
      titleSub.textContent = task.id;
      title.append(titleMain, titleSub);

      const status = document.createElement("td");
      status.append(statusChip(task.status));

      const criteria = document.createElement("td");
      criteria.append(criteriaPill(task));

      const updated = document.createElement("td");
      updated.textContent = formatTimestamp(task.updatedAt);

      const files = document.createElement("td");
      files.textContent = String(task.relatedFiles.length);

      const commit = document.createElement("td");
      commit.textContent = task.commitStatus || "Unknown";

      row.append(title, status, criteria, updated, files, commit);
      return row;
    }

    function statusChip(status) {
      const element = document.createElement("span");
      element.className = "status-chip";
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.setAttribute("aria-hidden", "true");
      element.dataset.status = status;
      element.append(dot, document.createTextNode(labels[status] || status));
      return element;
    }

    function syncView() {
      const showingTable = currentView === "table";
      tableView.classList.toggle("is-hidden", !showingTable);
      board.classList.toggle("is-hidden", showingTable);
      tableViewButton.setAttribute("aria-pressed", String(showingTable));
      boardViewButton.setAttribute("aria-pressed", String(!showingTable));
    }

    function setView(view) {
      currentView = view;
      syncView();
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
      if (task.status === "implemented") {
        button.className += " card-compact";
      }
      button.addEventListener("click", () => openDetail(task));

      const id = document.createElement("div");
      id.className = "card-id";
      id.textContent = task.id;

      const title = document.createElement("h3");
      title.className = "card-title";
      title.textContent = task.title;

      if (task.status === "implemented") {
        button.setAttribute("aria-label", task.title + " · " + (labels[task.status] || task.status));
        const meta = document.createElement("div");
        meta.className = "compact-meta";
        const compactId = document.createElement("span");
        compactId.className = "compact-id";
        compactId.textContent = task.id;
        meta.append(compactId, criteriaPill(task));
        button.append(title, meta);
        return button;
      }

      const request = document.createElement("div");
      request.className = "card-request";
      request.textContent = task.sections.Request || "No request recorded.";

      const footer = document.createElement("div");
      footer.className = "card-footer";
      footer.append(
        criteriaPill(task),
        pill(task.commitStatus || "commit unknown"),
        pill(task.relatedFiles.length + " files")
      );

      button.append(id, title, request, footer);
      return button;
    }

    function openDetail(task, options = {}) {
      activeId = task.id;
      render();
      updateDetail(task);
      detail.classList.add("is-open");
      detail.setAttribute("aria-hidden", "false");
      backdrop.hidden = false;
      requestAnimationFrame(() => backdrop.classList.add("is-open"));
      if (options.focusClose !== false) {
        closeButton.focus({ preventScroll: true });
      }
    }

    function updateDetail(task) {
      const status = labels[task.status] || task.status;
      const original = task.originalStatus && task.originalStatus !== task.status ? " · was " + task.originalStatus : "";
      document.querySelector("#detailKicker").textContent = task.id + " · " + status + original;
      document.querySelector("#detailTitle").textContent = task.title;
      document.querySelector("#detailBody").replaceChildren(detailContent(task));
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
        metaItem("Updated", formatTimestamp(task.updatedAt)),
        metaItem("Commit status", task.commitStatus || "Unknown"),
        metaItem("Path", task.path),
        metaItem("Branch", task.branch || "None"),
        progressMeta(task),
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
      wrapper.dataset.section = title;

      const head = document.createElement("div");
      head.className = "section-head";
      const heading = document.createElement("h3");
      heading.textContent = title;
      const tools = document.createElement("div");
      tools.className = "section-tools";
      const status = document.createElement("span");
      status.className = "section-status";
      const body = document.createElement("div");
      body.className = "section-body";

      function readMode(value) {
        status.textContent = "";
        const edit = document.createElement("button");
        edit.type = "button";
        edit.className = "section-action";
        edit.textContent = "Edit";
        edit.addEventListener("click", () => editMode(value));
        tools.replaceChildren(status, edit);

        const pre = document.createElement("pre");
        pre.textContent = value;
        body.replaceChildren(pre);
      }

      function editMode(value) {
        status.textContent = "";
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("aria-label", title + " content");

        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.className = "section-action";
        cancel.textContent = "Cancel";
        cancel.addEventListener("click", () => readMode(value));

        const save = document.createElement("button");
        save.type = "button";
        save.className = "section-action";
        save.textContent = "Save";
        save.addEventListener("click", () => saveSection(title, textarea.value, status, save));

        tools.replaceChildren(status, cancel, save);
        body.replaceChildren(textarea);
        textarea.focus({ preventScroll: true });
      }

      head.append(heading, tools);
      wrapper.append(head, body);
      readMode(content);
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

    function progressMeta(task) {
      const item = document.createElement("div");
      item.className = "meta";
      const key = document.createElement("span");
      key.textContent = "Criteria";
      const total = task.criteria.total;
      const checked = task.criteria.checked;
      const percent = total > 0 ? Math.round((checked / total) * 100) : 0;

      const row = document.createElement("div");
      row.className = "progress-row";
      const label = document.createElement("div");
      label.className = "progress-label";
      label.textContent = total > 0 ? checked + "/" + total : "0/0";

      const track = document.createElement("div");
      track.className = "progress-track";
      track.setAttribute("role", "progressbar");
      track.setAttribute("aria-valuemin", "0");
      track.setAttribute("aria-valuemax", String(total));
      track.setAttribute("aria-valuenow", String(checked));
      const fill = document.createElement("span");
      fill.className = "progress-fill";
      fill.style.width = percent + "%";
      track.append(fill);

      const value = document.createElement("div");
      value.className = "progress-percent";
      value.textContent = total > 0 ? percent + "%" : "0%";
      row.append(label, track, value);
      item.append(key, row);
      return item;
    }

    function pill(value) {
      const element = document.createElement("span");
      element.className = "pill";
      element.textContent = value;
      return element;
    }

    function criteriaPill(task) {
      const element = document.createElement("span");
      element.className = "pill mini-progress";
      const text = document.createElement("span");
      text.textContent = task.criteria.checked + "/" + task.criteria.total;
      const bar = document.createElement("span");
      bar.className = "mini-progress-bar";
      const fill = document.createElement("span");
      const percent = task.criteria.total > 0 ? Math.round((task.criteria.checked / task.criteria.total) * 100) : 0;
      fill.style.width = percent + "%";
      bar.append(fill);
      element.append(text, bar);
      return element;
    }

    function formatTimestamp(value) {
      if (!value) return "Unknown";
      const normalized = String(value).replace(/([+-]\\d{2})(\\d{2})$/, "$1:$2");
      const date = new Date(normalized);
      if (Number.isNaN(date.getTime())) return String(value);
      const parts = new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZoneName: "short"
      }).formatToParts(date).reduce((result, part) => {
        result[part.type] = part.value;
        return result;
      }, {});
      return parts.year + "-" + parts.month + "-" + parts.day + " " + parts.hour + ":" + parts.minute + " " + parts.timeZoneName;
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

    function findTask(id) {
      return model.tasks.find((task) => task.id === id) || null;
    }

    async function loadTasks() {
      refreshButton.disabled = true;
      setToolbarStatus("Refreshing...");
      try {
        const response = await fetch("/api/tasks", { headers: { accept: "application/json" } });
        const data = await parseJson(response);
        if (!response.ok) {
          throw new Error(data && data.error ? data.error : "Refresh failed");
        }
        model = data;
        updateStats();
        render();
        syncDetail();
        setToolbarStatus("Refreshed");
      } catch (error) {
        setToolbarStatus("Refresh failed: " + errorMessage(error), true);
      } finally {
        refreshButton.disabled = false;
      }
    }

    async function saveSection(sectionTitle, content, statusNode, saveButton) {
      if (!activeId) return;
      saveButton.disabled = true;
      statusNode.textContent = "Saving...";
      try {
        const response = await fetch("/api/tasks/" + encodeURIComponent(activeId) + "/sections/" + encodeURIComponent(sectionTitle), {
          method: "PUT",
          headers: {
            accept: "application/json",
            "content-type": "application/json"
          },
          body: JSON.stringify({ content })
        });
        const data = await parseJson(response);
        if (!response.ok) {
          throw new Error(data && data.error ? data.error : "Save failed");
        }
        model = data;
        updateStats();
        render();
        syncDetail();
        setToolbarStatus("Saved");
      } catch (error) {
        statusNode.textContent = "Save failed";
        setToolbarStatus("Save failed: " + errorMessage(error), true);
      } finally {
        saveButton.disabled = false;
      }
    }

    async function parseJson(response) {
      try {
        return await response.json();
      } catch {
        return null;
      }
    }

    function syncDetail() {
      if (!activeId || !detail.classList.contains("is-open")) return;
      const task = findTask(activeId);
      if (task) {
        updateDetail(task);
        return;
      }
      document.querySelector("#detailKicker").textContent = "Task detail";
      document.querySelector("#detailTitle").textContent = "Select a task";
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "This task no longer exists.";
      document.querySelector("#detailBody").replaceChildren(empty);
      activeId = null;
      render();
    }

    function setToolbarStatus(message, sticky = false) {
      toolbarStatus.textContent = message;
      if (statusTimer) clearTimeout(statusTimer);
      if (!sticky && message) {
        statusTimer = setTimeout(() => { toolbarStatus.textContent = ""; }, 1800);
      }
    }

    function errorMessage(error) {
      return error instanceof Error ? error.message : String(error);
    }

    function syncHeader() {
      if (headerFrame !== null) return;
      headerFrame = requestAnimationFrame(() => {
        headerFrame = null;
        const shouldCompact = headerCompact ? window.scrollY > 16 : window.scrollY > 88;
        if (shouldCompact === headerCompact) return;
        headerCompact = shouldCompact;
        masthead.classList.toggle("is-compact", headerCompact);
      });
    }

    closeButton.addEventListener("click", closeDetail);
    backdrop.addEventListener("click", closeDetail);
    search.addEventListener("input", render);
    refreshButton.addEventListener("click", loadTasks);
    tableViewButton.addEventListener("click", () => setView("table"));
    boardViewButton.addEventListener("click", () => setView("board"));
    window.addEventListener("scroll", syncHeader, { passive: true });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && detail.classList.contains("is-open")) closeDetail();
    });

    updateStats();
    syncHeader();
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
    void handleBoardRequest(repoRoot, request, response).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      sendJson(response, 500, { error: message });
    });
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

async function handleBoardRequest(
  repoRoot: string,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const url = new URL(request.url ?? "/", "http://taskr.local");

  if (request.method === "GET" && url.pathname === "/api/tasks") {
    sendJson(response, 200, createBoardModel(repoRoot));
    return;
  }

  const sectionMatch = /^\/api\/tasks\/([^/]+)\/sections\/([^/]+)$/.exec(url.pathname);
  if (request.method === "PUT" && sectionMatch) {
    const id = decodeURIComponent(sectionMatch[1]);
    const section = decodeURIComponent(sectionMatch[2]);
    const payload = await readJsonBody(request);
    if (!isRecord(payload) || typeof payload.content !== "string") {
      sendJson(response, 400, { error: "Request body must include string field `content`." });
      return;
    }

    try {
      const document = loadTaskById(repoRoot, id);
      document.body = replaceSection(document.body, section, payload.content);
      writeTask(document);
      sendJson(response, 200, createBoardModel(repoRoot));
    } catch (error) {
      if (error instanceof TaskrError) {
        const status = error.message.startsWith("Task not found") ? 404 : 400;
        sendJson(response, status, { error: error.message });
        return;
      }
      throw error;
    }
    return;
  }

  if (request.method === "GET" && url.pathname === "/") {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(renderBoardHtml(createBoardModel(repoRoot)));
    return;
  }

  if (request.method === "GET" && url.pathname === "/favicon.ico") {
    response.writeHead(204);
    response.end();
    return;
  }

  sendJson(response, 404, { error: "Not found" });
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1_000_000) {
      throw new TaskrError("Request body is too large.");
    }
  }
  if (!body.trim()) {
    return {};
  }
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new TaskrError("Request body must be valid JSON.");
  }
}

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  if (response.headersSent) {
    response.end();
    return;
  }
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(value, null, 2));
}

function boardTask(document: TaskDocument, repoRoot: string): BoardTask {
  const sections = extractSections(document.body);
  const originalStatus = taskStatus(document) || "planned";
  return {
    id: taskId(document),
    title: taskTitle(document),
    status: boardStatus(originalStatus),
    originalStatus,
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

function boardStatus(status: string): string {
  if (VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return status;
  }
  if (status === "closed") {
    return "implemented";
  }
  return "blocked";
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
