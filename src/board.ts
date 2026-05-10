import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { execFileSync, spawn } from "node:child_process";
import { renderBoardHtml } from "./board-template.js";
import {
  deleteTask,
  extractSections,
  listTasks,
  loadTaskById,
  normalizeCommitIds,
  relative,
  replaceSection,
  shortCommitId,
  TaskrError,
  taskId,
  taskStatus,
  taskTitle,
  VALID_STATUSES,
  writeTask,
  type TaskDocument,
} from "./protocol.js";
import type { BoardCommitDetail, BoardCommitFile, BoardModel, BoardTask } from "./board-types.js";

export { renderBoardHtml };
export type { BoardCommitDetail, BoardCommitFile, BoardModel, BoardTask } from "./board-types.js";

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
  const documents = listTasks(repoRoot);
  syncTaskCommitsFromGitLog(repoRoot, documents);
  const tasks = documents.map((task) => boardTask(task, repoRoot));
  return {
    generatedAt: new Date().toISOString(),
    repoRoot,
    statuses: [...VALID_STATUSES],
    tasks,
  };
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

  const taskMatch = /^\/api\/tasks\/([^/]+)$/.exec(url.pathname);
  if (request.method === "DELETE" && taskMatch) {
    const id = decodeURIComponent(taskMatch[1]);
    try {
      deleteTask(repoRoot, id);
      sendJson(response, 200, createBoardModel(repoRoot));
    } catch (error) {
      if (error instanceof TaskrError) {
        const status = error.message.startsWith("Task not found")
          ? 404
          : error.message.startsWith("Invalid task id")
            ? 400
            : 500;
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
  const commits = normalizeCommitIds(asStringArray(document.metadata.commits));
  return {
    id: taskId(document),
    title: taskTitle(document),
    status: boardStatus(originalStatus),
    originalStatus,
    path: relative(document.path, repoRoot),
    createdAt: String(document.metadata.created_at ?? ""),
    updatedAt: String(document.metadata.updated_at ?? ""),
    branch: document.metadata.branch === null ? null : String(document.metadata.branch ?? ""),
    commitStatus: String(document.metadata.commit_status ?? "not_created"),
    commits,
    commitDetails: commits.map((commit) => commitDetail(repoRoot, commit)),
    relatedFiles: asStringArray(document.metadata.related_files),
    verification: document.metadata.verification ?? null,
    sections,
    criteria: countCriteria(sections["Acceptance Criteria"] ?? ""),
  };
}

function syncTaskCommitsFromGitLog(repoRoot: string, documents: TaskDocument[]): void {
  if (documents.length === 0) {
    return;
  }

  const commitsByTask = taskCommitsFromGitLog(repoRoot);

  for (const document of documents) {
    const discoveredCommits = commitsByTask.get(taskId(document)) ?? [];
    const existingCommits = asStringArray(document.metadata.commits);
    const mergedCommits = normalizeCommitIds([...existingCommits, ...discoveredCommits]);
    const shouldUpdateCommits = !stringArraysEqual(mergedCommits, existingCommits);
    const shouldUpdateStatus =
      mergedCommits.length > 0 && document.metadata.commit_status !== "created";

    if (!shouldUpdateCommits && !shouldUpdateStatus) {
      continue;
    }

    document.metadata.commits = mergedCommits;
    document.metadata.commit_status = "created";
    writeTask(document);
  }
}

function taskCommitsFromGitLog(repoRoot: string): Map<string, string[]> {
  const commitsByTask = new Map<string, string[]>();
  let output: string;
  try {
    output = execFileSync("git", ["log", "--all", "--format=%H%x1f%B%x1e"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return commitsByTask;
  }

  for (const record of output.split("\x1e")) {
    const separatorIndex = record.indexOf("\x1f");
    if (separatorIndex === -1) {
      continue;
    }
    const hash = record.slice(0, separatorIndex).trim();
    const message = record.slice(separatorIndex + 1);
    if (!hash) {
      continue;
    }
    for (const match of message.matchAll(taskReferencePattern())) {
      const id = match[1];
      commitsByTask.set(id, normalizeCommitIds([...(commitsByTask.get(id) ?? []), hash]));
    }
  }

  return commitsByTask;
}

function taskReferencePattern(): RegExp {
  return /(?:\[taskr:|^Taskr:\s*)([a-z0-9]+(?:-[a-z0-9]+)*)(?:\])?/gim;
}

function commitDetail(repoRoot: string, commit: string): BoardCommitDetail {
  try {
    if (!commit.trim() || commit.startsWith("-")) {
      throw new Error("Invalid commit id.");
    }
    const output = execFileSync(
      "git",
      ["show", "--numstat", "--format=%H%n%s", "--no-renames", commit],
      {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    const lines = output.trimEnd().split("\n");
    const hash = lines[0] || commit;
    const subject = lines[1] || "";
    let additions = 0;
    let deletions = 0;
    const filesByPath = new Map<string, BoardCommitFile>();
    const statuses = commitFileStatuses(repoRoot, commit);

    for (const line of lines.slice(2)) {
      if (!line.trim()) {
        continue;
      }
      const [added, deleted, ...pathParts] = line.split("\t");
      const path = pathParts.join("\t");
      if (!path) {
        continue;
      }
      const fileAdditions = numericDiffStat(added);
      const fileDeletions = numericDiffStat(deleted);
      additions += fileAdditions;
      deletions += fileDeletions;
      filesByPath.set(path, {
        path,
        status: statuses.get(path) ?? "M",
        additions: fileAdditions,
        deletions: fileDeletions,
      });
    }

    for (const [path, status] of statuses.entries()) {
      if (filesByPath.has(path)) {
        continue;
      }
      filesByPath.set(path, {
        path,
        status,
        additions: 0,
        deletions: 0,
      });
    }

    const files = [...filesByPath.values()];

    return {
      hash,
      shortHash: shortCommitId(hash),
      subject,
      additions,
      deletions,
      filesChanged: files.length,
      files,
      error: null,
    };
  } catch (error) {
    return {
      hash: commit,
      shortHash: shortCommitId(commit),
      subject: "",
      additions: null,
      deletions: null,
      filesChanged: null,
      files: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function commitFileStatuses(
  repoRoot: string,
  commit: string,
): Map<string, BoardCommitFile["status"]> {
  const output = execFileSync(
    "git",
    ["show", "--name-status", "--format=", "--no-renames", commit],
    {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const statuses = new Map<string, BoardCommitFile["status"]>();
  for (const line of output.trimEnd().split("\n")) {
    if (!line.trim()) {
      continue;
    }
    const [rawStatus, ...pathParts] = line.split("\t");
    const path = pathParts.join("\t");
    if (!path) {
      continue;
    }
    statuses.set(path, fileStatusCode(rawStatus));
  }
  return statuses;
}

function fileStatusCode(status: string | undefined): BoardCommitFile["status"] {
  if (status?.startsWith("A")) {
    return "U";
  }
  if (status?.startsWith("D")) {
    return "D";
  }
  return "M";
}

function numericDiffStat(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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

function stringArraysEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
