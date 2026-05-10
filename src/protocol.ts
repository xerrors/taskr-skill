import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { relative as pathRelative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dump, JSON_SCHEMA, load } from "js-yaml";

export const TASKR_DIR = ".taskr";
export const TASKS_DIR = "tasks";
export const TEMPLATES_DIR = "templates";
export const TASK_TEMPLATE = "task.md";

export const SCHEMA_VERSION = 1;
export const VALID_STATUSES = ["planned", "in_progress", "implemented", "blocked"] as const;
export const VALID_COMMIT_STATUSES = ["created", "not_created", "not_applicable"] as const;
export const SKILL_TARGETS = ["claude", "codex"] as const;
export const REQUIRED_SECTIONS = [
  "Request",
  "Acceptance Criteria",
  "Implementation Plan",
  "Progress Log",
  "Agent Notes",
  "Completion Summary",
] as const;

export type TaskStatus = (typeof VALID_STATUSES)[number];
export type CommitStatus = (typeof VALID_COMMIT_STATUSES)[number];
export type SkillTarget = (typeof SKILL_TARGETS)[number];
export type SkillScope = "project" | "user";
export type TaskMetadata = Record<string, unknown>;

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;
const SECTION_RE = /^## ([^\n]+)\n?/gm;

export class TaskrError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaskrError";
  }
}

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface TaskDocument {
  path: string;
  metadata: TaskMetadata;
  body: string;
}

export function taskId(document: TaskDocument): string {
  return String(document.metadata.id ?? basenameWithoutExtension(document.path));
}

export function taskTitle(document: TaskDocument): string {
  return String(document.metadata.title ?? taskId(document));
}

export function taskStatus(document: TaskDocument): string {
  return String(document.metadata.status ?? "");
}

export function shortCommitId(commit: string): string {
  return commit.trim().slice(0, 7);
}

export function normalizeCommitIds(commits: string[]): string[] {
  return unique(commits.map(shortCommitId).filter(Boolean));
}

export function findRepoRoot(start = process.cwd()): string {
  const cwd = resolve(start);
  try {
    const output = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return resolve(output.trim());
  } catch {
    return cwd;
  }
}

export function taskrRoot(repoRoot: string): string {
  return resolve(repoRoot, TASKR_DIR);
}

export function tasksRoot(repoRoot: string): string {
  return resolve(taskrRoot(repoRoot), TASKS_DIR);
}

export function nowIso(): string {
  return formatLocalDateTime(new Date(), "T", true);
}

export function logTimestamp(): string {
  return formatLocalDateTime(new Date(), " ", false);
}

export function slugify(value: string): string {
  const asciiText = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const slug = asciiText
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase()
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  if (slug) {
    return slug;
  }
  const digest = createHash("sha1").update(value, "utf8").digest("hex").slice(0, 8);
  return `task-${digest}`;
}

export function ensureUniqueTaskId(repoRoot: string, desired: string): string {
  const base = slugify(desired);
  let candidate = base;
  let index = 2;
  while (existsSync(taskPath(repoRoot, candidate))) {
    candidate = `${base}-${index}`;
    index += 1;
  }
  return candidate;
}

export function defaultConfig(): TaskMetadata {
  return {
    version: SCHEMA_VERSION,
    tasks_dir: ".taskr/tasks",
    id: {
      style: "kebab-case",
      generated_by: "agent",
    },
    statuses: [...VALID_STATUSES],
    commit: {
      required_for_implemented: false,
      convention: "[taskr:{id}]",
    },
    agent: {
      preferred_update_method: "cli_or_direct_file",
      default_status_after_code_change: "implemented",
      require_completion_summary: true,
      require_related_files: true,
    },
  };
}

export function defaultSchema(): TaskMetadata {
  return {
    schema_version: SCHEMA_VERSION,
    task_frontmatter: {
      required: [
        "schema_version",
        "id",
        "title",
        "status",
        "created_at",
        "updated_at",
        "branch",
        "commits",
        "commit_status",
        "related_files",
        "verification",
      ],
      statuses: [...VALID_STATUSES],
      commit_statuses: [...VALID_COMMIT_STATUSES],
    },
    task_sections: [...REQUIRED_SECTIONS],
  };
}

export function taskTemplatePlaceholder(): string {
  return `---
schema_version: 1
id: example-task
title: Example task
status: planned
created_at: 2026-05-09T14:30:00+08:00
updated_at: 2026-05-09T14:30:00+08:00
branch: null
commits: []
commit_status: not_created
related_files: []
verification:
  tests_run: []
  result: not_run
  reason: Not run yet.
---

# Example task

## Request

Describe the original user request.

## Acceptance Criteria

- [ ] Define concrete completion criteria.

## Implementation Plan

- [ ] Inspect the relevant code.
- [ ] Implement the smallest useful change.
- [ ] Validate the result.

## Progress Log

- 2026-05-09 14:30 +08:00 - Task created.

## Agent Notes

Empty.

## Completion Summary

Empty.
`;
}

export function initProtocol(repoRoot: string, force = false): string[] {
  const root = taskrRoot(repoRoot);
  const createdOrUpdated: string[] = [];
  mkdirSync(resolve(root, TASKS_DIR), { recursive: true });
  mkdirSync(resolve(root, TEMPLATES_DIR), { recursive: true });

  const files = new Map<string, string>([
    [resolve(root, "config.yaml"), dumpYaml(defaultConfig())],
    [resolve(root, "schema.yaml"), dumpYaml(defaultSchema())],
    [resolve(root, TEMPLATES_DIR, TASK_TEMPLATE), taskTemplatePlaceholder()],
  ]);

  for (const [path, content] of files.entries()) {
    if (existsSync(path) && !force) {
      continue;
    }
    writeFileSync(path, content, "utf8");
    createdOrUpdated.push(path);
  }

  return createdOrUpdated;
}

export function dumpYaml(data: TaskMetadata): string {
  return dump(data, {
    schema: JSON_SCHEMA,
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  });
}

export function renderTask({
  taskId,
  title,
  request,
  status = "planned",
}: {
  taskId: string;
  title: string;
  request: string;
  status?: TaskStatus;
}): string {
  if (!isTaskStatus(status)) {
    throw new TaskrError(`Invalid status: ${status}`);
  }

  const timestamp = nowIso();
  const language = taskLanguage(`${title}\n${request}`);
  const copy = taskTemplateCopy(language);
  const metadata: TaskMetadata = {
    schema_version: SCHEMA_VERSION,
    id: taskId,
    title,
    status,
    created_at: timestamp,
    updated_at: timestamp,
    branch: null,
    commits: [],
    commit_status: "not_created",
    related_files: [],
    verification: {
      tests_run: [],
      result: "not_run",
      reason: "Not run yet.",
    },
  };
  const createdLine = `- ${logTimestamp()} - Task created.`;
  return `---
${dumpYaml(metadata)}---

# ${title}

## Request

${request.trim() || title}

## Acceptance Criteria

${copy.acceptanceCriteria.map((item) => `- [ ] ${item}`).join("\n")}

## Implementation Plan

${copy.implementationPlan.map((item) => `- [ ] ${item}`).join("\n")}

## Progress Log

${createdLine}

## Agent Notes

${copy.empty}

## Completion Summary

${copy.empty}
`;
}

export function defaultTaskId(title: string): string {
  return `${localDatePrefix(new Date())}-${slugify(title)}`;
}

export function createTask(
  repoRoot: string,
  title: string,
  {
    taskId: explicitTaskId,
    status = "planned",
    request,
  }: {
    taskId?: string;
    status?: TaskStatus;
    request?: string;
  } = {},
): string {
  const root = taskrRoot(repoRoot);
  if (!existsSync(root)) {
    throw new TaskrError("Taskr is not initialized. Run `taskr init` first.");
  }
  if (explicitTaskId !== undefined && !SLUG_RE.test(explicitTaskId)) {
    throw new TaskrError("Task id must use lower-kebab-case.");
  }

  const resolvedId = explicitTaskId ?? ensureUniqueTaskId(repoRoot, defaultTaskId(title));
  const path = taskPath(repoRoot, resolvedId);
  if (existsSync(path)) {
    throw new TaskrError(`Task already exists: ${resolvedId}`);
  }
  writeFileSync(
    path,
    renderTask({
      taskId: resolvedId,
      title,
      request: request ?? title,
      status,
    }),
    "utf8",
  );
  return path;
}

export function splitFrontmatter(content: string): [TaskMetadata, string] {
  const match = FRONTMATTER_RE.exec(content);
  if (!match) {
    throw new TaskrError("Task file is missing YAML frontmatter.");
  }
  const frontmatterText = match[1];
  let metadata: unknown;
  try {
    metadata = load(frontmatterText, { schema: JSON_SCHEMA }) ?? {};
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new TaskrError(`Invalid YAML frontmatter: ${message}`);
  }
  if (!isRecord(metadata)) {
    throw new TaskrError("Frontmatter must be a YAML mapping.");
  }
  return [metadata, content.slice(match[0].length)];
}

export function renderDocument(metadata: TaskMetadata, body: string): string {
  return `---\n${dumpYaml(metadata)}---\n\n${body.trimStart()}`;
}

export function loadTask(path: string): TaskDocument {
  const [metadata, body] = splitFrontmatter(readFileSync(path, "utf8"));
  return { path, metadata, body };
}

export function taskPath(repoRoot: string, id: string): string {
  return resolve(tasksRoot(repoRoot), `${id}.md`);
}

export function loadTaskById(repoRoot: string, id: string): TaskDocument {
  const path = taskPath(repoRoot, id);
  if (!existsSync(path)) {
    throw new TaskrError(`Task not found: ${id}`);
  }
  return loadTask(path);
}

export function writeTask(document: TaskDocument): void {
  document.metadata.updated_at = nowIso();
  writeFileSync(document.path, renderDocument(document.metadata, document.body), "utf8");
}

export function listTasks(repoRoot: string): TaskDocument[] {
  const root = tasksRoot(repoRoot);
  if (!existsSync(root)) {
    return [];
  }
  const tasks = readdirSync(root)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .map((name) => loadTask(resolve(root, name)));
  return tasks.sort((left, right) =>
    String(right.metadata.updated_at ?? "").localeCompare(String(left.metadata.updated_at ?? "")),
  );
}

export function extractSections(body: string): Record<string, string> {
  const matches = [...body.matchAll(SECTION_RE)];
  const sections: Record<string, string> = {};
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const title = match[1].trim();
    const start = (match.index ?? 0) + match[0].length;
    const end =
      index + 1 < matches.length ? (matches[index + 1].index ?? body.length) : body.length;
    sections[title] = body.slice(start, end).trim();
  }
  return sections;
}

export function replaceSection(body: string, section: string, content: string): string {
  const matches = [...body.matchAll(SECTION_RE)];
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    if (match[1].trim() !== section) {
      continue;
    }
    const start = (match.index ?? 0) + match[0].length;
    const end =
      index + 1 < matches.length ? (matches[index + 1].index ?? body.length) : body.length;
    const replacement = `\n${content.trim()}\n\n`;
    return body.slice(0, start) + replacement + body.slice(end);
  }
  throw new TaskrError(`Task is missing section: ${section}`);
}

export function appendToSection(body: string, section: string, line: string): string {
  const sections = extractSections(body);
  let current = (sections[section] ?? "").trim();
  if (current === "Empty.") {
    current = "";
  }
  const content = `${current}\n${line}`.trim();
  return replaceSection(body, section, content);
}

export function setStatus(repoRoot: string, id: string, status: TaskStatus): TaskDocument {
  if (!isTaskStatus(status)) {
    throw new TaskrError(`Invalid status: ${status}`);
  }
  const document = loadTaskById(repoRoot, id);
  document.metadata.status = status;
  document.body = appendToSection(
    document.body,
    "Progress Log",
    `- ${logTimestamp()} - Status changed to \`${status}\`.`,
  );
  writeTask(document);
  return document;
}

export function addNote(repoRoot: string, id: string, note: string): TaskDocument {
  const document = loadTaskById(repoRoot, id);
  document.body = appendToSection(document.body, "Agent Notes", `- ${note.trim()}`);
  document.body = appendToSection(
    document.body,
    "Progress Log",
    `- ${logTimestamp()} - Added agent note.`,
  );
  writeTask(document);
  return document;
}

export function completeTask(
  repoRoot: string,
  id: string,
  {
    summary,
    commits,
    relatedFiles,
    testsRun,
    verificationResult,
    commitStatus,
    checkCriteria = false,
  }: {
    summary: string;
    commits?: string[];
    relatedFiles?: string[];
    testsRun?: string[];
    verificationResult?: string;
    commitStatus?: CommitStatus;
    checkCriteria?: boolean;
  },
): TaskDocument {
  if (commitStatus !== undefined && !isCommitStatus(commitStatus)) {
    throw new TaskrError(`Invalid commit status: ${commitStatus}`);
  }

  const document = loadTaskById(repoRoot, id);
  const commitList = normalizeCommitIds(commits ?? []);
  const fileList = unique(relatedFiles ?? []);

  const existingCommits = normalizeCommitIds(asStringArray(document.metadata.commits));
  const existingFiles = asStringArray(document.metadata.related_files);
  const mergedCommits = normalizeCommitIds([...existingCommits, ...commitList]);
  document.metadata.commits = mergedCommits;
  document.metadata.commit_status =
    commitStatus ?? (mergedCommits.length > 0 ? "created" : "not_created");
  document.metadata.related_files = unique([...existingFiles, ...fileList]);
  document.metadata.status = "implemented";
  if (testsRun !== undefined || verificationResult !== undefined) {
    document.metadata.verification = {
      tests_run: testsRun ?? [],
      result:
        verificationResult ??
        (testsRun === undefined || testsRun.length === 0 ? "not_run" : "recorded"),
    };
  }
  if (checkCriteria) {
    const sections = extractSections(document.body);
    const criteria = sections["Acceptance Criteria"];
    if (criteria === undefined) {
      throw new TaskrError("Task is missing section: Acceptance Criteria");
    }
    const checked = criteria.replace(/- \[ \]/g, "- [x]");
    document.body = replaceSection(document.body, "Acceptance Criteria", checked);
  }
  document.body = replaceSection(document.body, "Completion Summary", summary);
  document.body = appendToSection(
    document.body,
    "Progress Log",
    `- ${logTimestamp()} - Marked implemented.`,
  );
  writeTask(document);
  return document;
}

export function validateTaskFile(path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!existsSync(path)) {
    return [{ path, message: "Task file does not exist." }];
  }

  let document: TaskDocument;
  try {
    document = loadTask(path);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [{ path, message }];
  }

  const metadata = document.metadata;
  for (const key of requiredFrontmatterFields()) {
    if (!(key in metadata)) {
      issues.push({ path, message: `Missing frontmatter field \`${key}\`.` });
    }
  }

  const id = String(metadata.id ?? "");
  if (!id || !SLUG_RE.test(id)) {
    issues.push({ path, message: "`id` must use lower-kebab-case." });
  } else if (basenameWithoutExtension(path) !== id) {
    issues.push({ path, message: `Filename must match id \`${id}\`.` });
  }

  const status = metadata.status;
  if (!isTaskStatus(status)) {
    issues.push({ path, message: `\`status\` must be one of ${VALID_STATUSES.join(", ")}.` });
  }

  const commitStatus = metadata.commit_status;
  if (!isCommitStatus(commitStatus)) {
    issues.push({
      path,
      message: `\`commit_status\` must be one of ${VALID_COMMIT_STATUSES.join(", ")}.`,
    });
  }

  if (!Array.isArray(metadata.commits ?? [])) {
    issues.push({ path, message: "`commits` must be a list." });
  }
  if (!Array.isArray(metadata.related_files ?? [])) {
    issues.push({ path, message: "`related_files` must be a list." });
  }

  const sections = extractSections(document.body);
  for (const section of REQUIRED_SECTIONS) {
    if (!(section in sections)) {
      issues.push({ path, message: `Missing section \`## ${section}\`.` });
    }
  }

  if (status === "implemented") {
    const summary = (sections["Completion Summary"] ?? "").trim();
    if (summary === "" || summary === "Empty.") {
      issues.push({ path, message: "`implemented` tasks need a Completion Summary." });
    }

    const commits = asStringArray(metadata.commits);
    if (commitStatus === "created" && commits.length === 0) {
      issues.push({ path, message: "`commit_status: created` requires at least one commit." });
    }

    const relatedFiles = asStringArray(metadata.related_files);
    const noFilesReason = metadata.no_related_files_reason;
    if (relatedFiles.length === 0 && !noFilesReason) {
      issues.push({
        path,
        message: "`implemented` tasks need `related_files` or `no_related_files_reason`.",
      });
    }

    const criteria = sections["Acceptance Criteria"] ?? "";
    const checkboxMatches = [...criteria.matchAll(/- \[([ xX])\]/g)];
    if (checkboxMatches.length === 0) {
      issues.push({ path, message: "Acceptance Criteria must include checklist items." });
    } else if (!checkboxMatches.some((match) => match[1].toLowerCase() === "x")) {
      issues.push({
        path,
        message: "`implemented` tasks should mark checked Acceptance Criteria.",
      });
    }
  }

  return issues;
}

export function validate(repoRoot: string, id?: string): ValidationIssue[] {
  if (id) {
    return validateTaskFile(taskPath(repoRoot, id));
  }

  const root = tasksRoot(repoRoot);
  if (!existsSync(root)) {
    return [{ path: root, message: "Taskr is not initialized. Run `taskr init` first." }];
  }

  const taskFiles = readdirSync(root)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .map((name) => resolve(root, name));
  return taskFiles.flatMap((path) => validateTaskFile(path));
}

export function installClaudeSkill(
  repoRoot: string,
  {
    scope = "project",
    force = false,
  }: {
    scope?: SkillScope;
    force?: boolean;
  } = {},
): string {
  return installAgentSkill(repoRoot, { target: "claude", scope, force });
}

export function installAgentSkill(
  repoRoot: string,
  {
    target,
    scope = "project",
    force = false,
  }: {
    target: SkillTarget;
    scope?: SkillScope;
    force?: boolean;
  },
): string {
  if (!SKILL_TARGETS.includes(target)) {
    throw new TaskrError(`Skill target must be one of ${SKILL_TARGETS.join(", ")}.`);
  }
  if (scope !== "project" && scope !== "user") {
    throw new TaskrError("Skill scope must be `project` or `user`.");
  }

  const destination = skillDestination(repoRoot, target, scope);

  mkdirSync(destination, { recursive: true });
  const skillFile = resolve(destination, "SKILL.md");
  if (existsSync(skillFile) && !force) {
    throw new TaskrError(`Skill already exists: ${skillFile}. Use --force to replace it.`);
  }

  const source = fileURLToPath(new URL("../resources/skills/taskr/SKILL.md", import.meta.url));
  copyFileSync(source, skillFile);
  return skillFile;
}

export function skillDestination(repoRoot: string, target: SkillTarget, scope: SkillScope): string {
  if (target === "claude") {
    return scope === "project"
      ? resolve(repoRoot, ".claude", "skills", "taskr")
      : resolve(homedir(), ".claude", "skills", "taskr");
  }

  const codexHome = process.env.CODEX_HOME
    ? resolve(process.env.CODEX_HOME)
    : resolve(homedir(), ".codex");
  return scope === "project"
    ? resolve(repoRoot, ".codex", "skills", "taskr")
    : resolve(codexHome, "skills", "taskr");
}

export function relative(path: string, root: string): string {
  const resolvedPath = resolve(path);
  const resolvedRoot = resolve(root);
  const value = pathRelative(resolvedRoot, resolvedPath);
  return value.startsWith("..") ? resolvedPath : value || ".";
}

function requiredFrontmatterFields(): string[] {
  const schema = defaultSchema();
  const taskFrontmatter = schema.task_frontmatter;
  if (!isRecord(taskFrontmatter) || !Array.isArray(taskFrontmatter.required)) {
    return [];
  }
  return taskFrontmatter.required.map(String);
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === "string" && VALID_STATUSES.includes(value as TaskStatus);
}

function isCommitStatus(value: unknown): value is CommitStatus {
  return typeof value === "string" && VALID_COMMIT_STATUSES.includes(value as CommitStatus);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type TaskLanguage = "en" | "zh";

function taskLanguage(value: string): TaskLanguage {
  return /[\u3400-\u9fff]/.test(value) ? "zh" : "en";
}

function taskTemplateCopy(language: TaskLanguage): {
  acceptanceCriteria: string[];
  implementationPlan: string[];
  empty: string;
} {
  if (language === "zh") {
    return {
      acceptanceCriteria: [
        "确认用户请求的行为已经实现。",
        "在可行范围内更新或增加聚焦验证。",
        "总结变更文件和已执行的验证。",
      ],
      implementationPlan: [
        "检查相关代码和既有模式。",
        "实现最小且有用的改动。",
        "运行合适的验证，或记录无法运行的原因。",
        "更新本任务的进展、相关文件和完成说明。",
      ],
      empty: "暂无。",
    };
  }
  return {
    acceptanceCriteria: [
      "Confirm the requested behavior is implemented.",
      "Update or add focused validation where practical.",
      "Summarize changed files and any verification performed.",
    ],
    implementationPlan: [
      "Inspect the relevant code and existing patterns.",
      "Implement the smallest useful change.",
      "Run appropriate validation or record why it was not run.",
      "Update this task with progress, related files, and completion notes.",
    ],
    empty: "Empty.",
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function basenameWithoutExtension(path: string): string {
  const base = path.slice(path.lastIndexOf("/") + 1);
  return base.endsWith(".md") ? base.slice(0, -3) : base;
}

function formatLocalDateTime(date: Date, separator: "T" | " ", includeSeconds: boolean): string {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  const second = pad(date.getSeconds());
  const offset = timezoneOffset(date);
  if (includeSeconds) {
    return `${year}-${month}-${day}${separator}${hour}:${minute}:${second}${offset}`;
  }
  return `${year}-${month}-${day}${separator}${hour}:${minute} ${offset}`;
}

function localDatePrefix(date: Date): string {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}-${month}-${day}`;
}

function timezoneOffset(date: Date): string {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absolute = Math.abs(offsetMinutes);
  const hours = pad(Math.floor(absolute / 60));
  const minutes = pad(absolute % 60);
  return `${sign}${hours}:${minutes}`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
