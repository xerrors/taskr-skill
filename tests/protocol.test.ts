import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { boardClientScript } from "../src/board-client.js";
import { boardStyles } from "../src/board-styles.js";
import { createBoardModel, renderBoardHtml, startBoardServer } from "../src/board.js";
import {
  completeTask,
  createResearchFile,
  createTask,
  defaultTaskId,
  addNote,
  extractSections,
  extractUnsectionedBody,
  initProtocol,
  loadTask,
  slugify,
  taskPath,
  taskResearchFiles,
  VALID_STATUSES,
  validate,
} from "../src/protocol.js";

describe("Taskr protocol", () => {
  it("uses kebab case for ASCII task ids", () => {
    expect(slugify("Implement user invitation flow")).toBe("implement-user-invitation-flow");
  });

  it("falls back for non-ASCII task ids", () => {
    expect(slugify("实现用户邀请功能")).toMatch(/^task-/);
  });

  it("defines the five canonical task statuses", () => {
    expect([...VALID_STATUSES]).toEqual([
      "planned",
      "in_progress",
      "pending_confirmation",
      "implemented",
      "blocked",
    ]);
  });

  it("initializes the protocol without config, schema, or an index cache", () => {
    const repo = tempRepo();
    const changed = initProtocol(repo);

    expect(changed.map((path) => path.slice(repo.length + 1))).toEqual([
      ".taskr/templates/task.md",
    ]);
    expect(existsSync(resolve(repo, ".taskr/config.yaml"))).toBe(false);
    expect(existsSync(resolve(repo, ".taskr/schema.yaml"))).toBe(false);
    expect(existsSync(resolve(repo, ".taskr/index.json"))).toBe(false);
  });

  it("creates a valid planned task", () => {
    const repo = tempRepo();
    initProtocol(repo);

    const path = createTask(repo, "Implement user invitation flow", { status: "in_progress" });
    const document = loadTask(path);

    expect(path).toMatch(/\/\.taskr\/tasks\/\d{4}-\d{2}-\d{2}-implement-user-invitation-flow\.md$/);
    expect(document.metadata.id).toMatch(/^\d{4}-\d{2}-\d{2}-implement-user-invitation-flow$/);
    expect(document.metadata.schema_version).toBe(1);
    expect(document.metadata.status).toBe("in_progress");
    expect(document.body).toContain("## Acceptance Criteria");
    expect(validate(repo)).toEqual([]);
  });

  it("prefixes generated task ids with the local date", () => {
    expect(defaultTaskId("Implement user invitation flow")).toMatch(
      /^\d{4}-\d{2}-\d{2}-implement-user-invitation-flow$/,
    );
  });

  it("localizes generated task body copy for Chinese requests", () => {
    const repo = tempRepo();
    initProtocol(repo);

    const path = createTask(repo, "实现用户邀请功能", { request: "实现用户邀请功能" });
    const document = loadTask(path);

    expect(document.body).toContain("## Acceptance Criteria");
    expect(document.body).toContain("- [ ] 确认用户请求的行为已经实现。");
    expect(document.body).toContain("- [ ] 检查相关代码和既有模式。");
    expect(document.body).toContain("暂无。");
    expect(validate(repo)).toEqual([]);
  });

  it("keeps progress log optional for generated tasks and agent notes", () => {
    const repo = tempRepo();
    initProtocol(repo);

    createTask(repo, "Investigate optional progress log", {
      taskId: "investigate-optional-progress-log",
    });
    let document = loadTask(taskPath(repo, "investigate-optional-progress-log"));
    let sections = extractSections(document.body);

    expect(sections["Progress Log"]).toBe("Empty.");

    addNote(repo, "investigate-optional-progress-log", "Found the relevant parser behavior.");
    document = loadTask(taskPath(repo, "investigate-optional-progress-log"));
    sections = extractSections(document.body);

    expect(sections["Agent Notes"]).toContain("- Found the relevant parser behavior.");
    expect(sections["Progress Log"]).toBe("Empty.");
  });

  it("keeps content outside protocol sections available for detail rendering", () => {
    const body = [
      "# Task title already shown in detail header",
      "",
      "Intro note before sections.",
      "",
      "## Request",
      "",
      "Do the work.",
      "",
      "## Test HTML Fragments",
      "",
      '<section class="demo">',
      "  <h3>Rendered</h3>",
      "</section>",
      "",
      "## Acceptance Criteria",
      "",
      "- [ ] It works.",
    ].join("\n");

    expect(extractSections(body)).toMatchObject({
      Request: "Do the work.",
      "Acceptance Criteria": "- [ ] It works.",
      "Test HTML Fragments": '<section class="demo">\n  <h3>Rendered</h3>\n</section>',
    });
    expect(extractUnsectionedBody(body)).toBe(
      [
        "Intro note before sections.",
        "",
        "## Test HTML Fragments",
        "",
        '<section class="demo">',
        "  <h3>Rendered</h3>",
        "</section>",
      ].join("\n"),
    );
  });

  it("creates opt-in research report files and records task references", () => {
    const repo = tempRepo();
    initProtocol(repo);
    createTask(repo, "Research storage pattern", {
      taskId: "2026-05-14-research-storage-pattern",
    });

    const reportPath = createResearchFile(
      repo,
      "2026-05-14-research-storage-pattern",
      "overview.md",
      "# Overview\n\nDetailed notes.",
    );
    const document = loadTask(taskPath(repo, "2026-05-14-research-storage-pattern"));

    expect(reportPath).toBe(
      resolve(repo, ".taskr/research/2026-05-14-research-storage-pattern/overview.md"),
    );
    expect(readFileSync(reportPath, "utf8")).toBe("# Overview\n\nDetailed notes.\n");
    expect(taskResearchFiles(document)).toEqual([
      ".taskr/research/2026-05-14-research-storage-pattern/overview.md",
    ]);
    expect(document.body).toContain(
      "Research file: `.taskr/research/2026-05-14-research-storage-pattern/overview.md`",
    );
    expect(validate(repo, "2026-05-14-research-storage-pattern")).toEqual([]);
  });

  it("validates declared research report file paths", () => {
    const repo = tempRepo();
    initProtocol(repo);
    createTask(repo, "Broken research reference", { taskId: "broken-research-reference" });
    const path = taskPath(repo, "broken-research-reference");
    const content = readFileSync(path, "utf8").replace(
      "verification:\n  tests_run: []\n  result: not_run\n  reason: Not run yet.\n",
      "verification:\n  tests_run: []\n  result: not_run\n  reason: Not run yet.\nresearch_files:\n  - notes.md\n  - .taskr/research/broken-research-reference/missing.md\n",
    );
    writeFileSync(path, content, "utf8");

    const messages = validate(repo, "broken-research-reference").map((issue) => issue.message);

    expect(messages).toContain(
      "`research_files` entries must be Markdown paths under `.taskr/research/`.",
    );
    expect(messages).toContain(
      "Research file does not exist: .taskr/research/broken-research-reference/missing.md",
    );
  });

  it("requires summary for tasks awaiting confirmation", () => {
    const repo = tempRepo();
    initProtocol(repo);
    createTask(repo, "Implement billing webhook", { taskId: "implement-billing-webhook" });

    const path = taskPath(repo, "implement-billing-webhook");
    const content = readFileSync(path, "utf8").replace(
      "status: planned",
      "status: pending_confirmation",
    );
    writeFileSync(path, content, "utf8");

    const messages = validate(repo, "implement-billing-webhook").map((issue) => issue.message);

    expect(messages).toContain(
      "`pending_confirmation` and `implemented` tasks need a Completion Summary.",
    );
  });

  it("can produce a valid task awaiting confirmation", () => {
    const repo = tempRepo();
    initProtocol(repo);
    createTask(repo, "Implement billing webhook", { taskId: "implement-billing-webhook" });

    completeTask(repo, "implement-billing-webhook", {
      summary: "Implemented the billing webhook handler.",
      testsRun: ["npm test"],
      verificationResult: "passed",
      checkCriteria: true,
    });

    const document = loadTask(taskPath(repo, "implement-billing-webhook"));
    expect(document.metadata.status).toBe("pending_confirmation");
    expect(validate(repo, "implement-billing-webhook")).toEqual([]);
  });

  it("renders a board model as a Kanban HTML page", () => {
    const repo = tempRepo();
    initProtocol(repo);
    createTask(repo, "Implement board visualization", {
      taskId: "implement-board-visualization",
      status: "in_progress",
    });
    createTask(repo, "Confirm board visualization", {
      taskId: "confirm-board-visualization",
      status: "pending_confirmation",
    });

    const model = createBoardModel(repo);
    const html = renderBoardHtml(model);

    expect(model.statuses).toContain("in_progress");
    expect(model.statuses).toContain("pending_confirmation");
    expect(model.statuses).not.toContain("closed");
    expect(model.tasks).toHaveLength(2);
    expect(
      model.tasks.find((task) => task.id === "implement-board-visualization")?.sections.Request,
    ).toContain("Implement board visualization");
    expect(model.tasks[0].unsectionedBody).toBe("");
    expect(model.tasks[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(html).toContain("Taskr Board");
    expect(html).toContain(boardStyles);
    expect(html).toContain(boardClientScript);
    expect(html).toContain("Taskr Kanban board");
    expect(html).toContain("Click any task to open its detail.");
    expect(html).toContain("Refresh");
    expect(html).toContain("Taskr task table");
    expect(html).toContain("languageStorageKey");
    expect(html).toContain("Switch language to Chinese");
    expect(html).toContain("masthead-topline");
    expect(html).toContain("🇨🇳 ZH");
    expect(html).toContain("🌐 EN");
    expect(html).toContain("toolbar-primary");
    expect(html).toContain("toolbar-secondary");
    expect(html).toContain("autoRefreshIntervalMs = 5000");
    expect(html).toContain("boardModelSignature");
    expect(html).toContain('loadTasks({ source: "auto" })');
    expect(html).toContain("document.hidden");
    expect(html).toContain('detail.querySelector("textarea")');
    expect(html).toContain("activeElement.matches");
    expect(html).toContain("sortSelect");
    expect(html).toContain("Sort tasks");
    expect(html).toContain('let sortBy = "progress"');
    expect(html).toContain('<option value="progress">Progress</option>');
    expect(html).toContain("Progress");
    expect(html).toContain("进度");
    expect(html).toContain("Created");
    expect(html).toContain("更新时间");
    expect(html).toContain("sortTasks");
    expect(html).toContain("progressValue");
    expect(html).toContain("compareTimestamp(right.updatedAt, left.updatedAt)");
    expect(html).toContain("createdAt");
    expect(html).toContain("border: 0;");
    expect(html).toContain("max-width: 1440px;");
    expect(html).toContain("padding: 16px clamp(16px, 3vw, 64px) 28px;");
    expect(html).toContain('statuses: ["in_progress", "pending_confirmation"]');
    expect(html).toContain("Pending Confirmation");
    expect(html).toContain("待确认");
    expect(html).toContain("Taskr 看板");
    expect(html).toContain("点击任意任务查看详情。");
    expect(html).toContain('let currentView = "table"');
    expect(html).toContain("window.scrollY > 88");
    expect(html).toContain("window.scrollY > 16");
    expect(html).toContain("compact-meta");
    expect(html).toContain("progressbar");
    expect(html).toContain("formatTimestamp");
    expect(html).toContain("detail-basics");
    expect(html).toContain('detailBasic(t("meta.path"), task.path)');
    expect(html).toContain('detailBasic(t("meta.updated"), formatTimestamp(task.updatedAt))');
    expect(html).not.toContain('metaItem(t("meta.path"), task.path)');
    expect(html).toContain("grid-template-columns: minmax(64px, max-content) minmax(0, 1fr);");
    expect(html).toContain("commit-panel");
    expect(html).toContain("commit-files");
    expect(html).toContain("commitDetails");
    expect(html).toContain("commitStatusLabel");
    expect(html).toContain("renderTaskrMarkdown");
    expect(html).toContain("markdown-content");
    expect(html).toContain("coreSectionNames");
    expect(html).toContain("grid-template-columns: auto minmax(0, 1fr);");
    expect(html).toContain("appearance: none;");
    expect(html).toContain("border-color: rgba(34, 197, 94, 0.72);");
    expect(html).toContain("task-list-item-content");
    expect(html).toContain("overflow-wrap: anywhere;");
    expect(html).toContain("danger-zone");
    expect(html).toContain("Delete task");
    expect(html).toContain("删除任务会移除本地 Markdown 文件");
    expect(html).toContain("statusEditor");
    expect(html).toContain("Change status");
    expect(html).toContain("手动修改状态");
    expect(html).toContain("status-editor");
    expect(html).toContain("/status");
  });

  it("loads file-level diff details for task commits in the board model", () => {
    const repo = tempRepo();
    initGitRepo(repo);
    writeFileSync(resolve(repo, "feature.txt"), "old\nremove\n", "utf8");
    git(repo, "add", "feature.txt");
    git(repo, "commit", "-m", "baseline");
    writeFileSync(resolve(repo, "feature.txt"), "old\nnew\n", "utf8");
    writeFileSync(resolve(repo, "fresh.txt"), "fresh\n", "utf8");
    git(repo, "add", "feature.txt");
    git(repo, "add", "fresh.txt");
    git(repo, "commit", "-m", "update feature");
    const commit = git(repo, "rev-parse", "HEAD");

    initProtocol(repo);
    createTask(repo, "Display commit stats", { taskId: "display-commit-stats" });
    completeTask(repo, "display-commit-stats", {
      summary: "Displayed commit stats.",
      commits: [commit],
      checkCriteria: true,
    });

    const model = createBoardModel(repo);
    const detail = model.tasks[0].commitDetails[0];

    expect(model.tasks[0].commits).toEqual([commit.slice(0, 7)]);
    expect(detail.hash).toBe(commit);
    expect(detail.shortHash).toBe(commit.slice(0, 7));
    expect(detail.subject).toBe("update feature");
    expect(detail.additions).toBe(2);
    expect(detail.deletions).toBe(1);
    expect(detail.filesChanged).toBe(2);
    expect(detail.files).toEqual([
      {
        path: "feature.txt",
        status: "M",
        additions: 1,
        deletions: 1,
      },
      {
        path: "fresh.txt",
        status: "U",
        additions: 1,
        deletions: 0,
      },
    ]);
    expect(detail.error).toBeNull();
  });

  it("discovers task commits from git log and writes them back to the task file", () => {
    const repo = tempRepo();
    initGitRepo(repo);
    initProtocol(repo);
    createTask(repo, "Recover commit from log", { taskId: "recover-commit-from-log" });

    writeFileSync(resolve(repo, "feature.txt"), "implemented\n", "utf8");
    git(repo, "add", "feature.txt");
    git(repo, "commit", "-m", "implement feature", "-m", "Taskr: recover-commit-from-log");
    const commit = git(repo, "rev-parse", "HEAD");

    const model = createBoardModel(repo);
    const task = model.tasks[0];
    const taskContent = readFileSync(taskPath(repo, "recover-commit-from-log"), "utf8");

    expect(task.commits).toEqual([commit.slice(0, 7)]);
    expect(task.commitStatus).toBe("created");
    expect(task.commitDetails[0].subject).toBe("implement feature");
    expect(taskContent).toMatch(new RegExp(`  - '?${commit.slice(0, 7)}'?`));
    expect(taskContent).not.toContain(commit);
    expect(taskContent).toContain("commit_status: created");
  });

  it("deduplicates short and full task commit ids by the first seven characters", () => {
    const repo = tempRepo();
    initGitRepo(repo);
    initProtocol(repo);
    createTask(repo, "Deduplicate commit ids", { taskId: "deduplicate-commit-ids" });

    writeFileSync(resolve(repo, "feature.txt"), "implemented\n", "utf8");
    git(repo, "add", "feature.txt");
    git(repo, "commit", "-m", "implement feature", "-m", "Taskr: deduplicate-commit-ids");
    const commit = git(repo, "rev-parse", "HEAD");
    const shortCommit = commit.slice(0, 7);

    completeTask(repo, "deduplicate-commit-ids", {
      summary: "Implemented the feature.",
      commits: [shortCommit, commit],
      checkCriteria: true,
    });

    const model = createBoardModel(repo);
    const taskContent = readFileSync(taskPath(repo, "deduplicate-commit-ids"), "utf8");

    expect(model.tasks[0].commits).toEqual([shortCommit]);
    expect(model.tasks[0].commitDetails[0].shortHash).toBe(shortCommit);
    expect(taskContent).toContain(`  - ${shortCommit}`);
    expect(taskContent).not.toContain(commit);
  });

  it("still discovers legacy bracketed task commit references", () => {
    const repo = tempRepo();
    initGitRepo(repo);
    initProtocol(repo);
    createTask(repo, "Recover legacy commit from log", {
      taskId: "recover-legacy-commit-from-log",
    });

    writeFileSync(resolve(repo, "legacy.txt"), "implemented\n", "utf8");
    git(repo, "add", "legacy.txt");
    git(repo, "commit", "-m", "implement legacy [taskr:recover-legacy-commit-from-log]");
    const commit = git(repo, "rev-parse", "HEAD");

    const model = createBoardModel(repo);

    expect(model.tasks[0].commits).toEqual([commit.slice(0, 7)]);
  });

  it("maps legacy and unknown statuses into board statuses", () => {
    const repo = tempRepo();
    initProtocol(repo);
    createTask(repo, "Inspect closed task", { taskId: "inspect-closed-task" });
    createTask(repo, "Inspect odd task state", { taskId: "inspect-odd-task-state" });
    const closedPath = taskPath(repo, "inspect-closed-task");
    const oddPath = taskPath(repo, "inspect-odd-task-state");
    writeFileSync(
      closedPath,
      readFileSync(closedPath, "utf8").replace("status: planned", "status: closed"),
      "utf8",
    );
    writeFileSync(
      oddPath,
      readFileSync(oddPath, "utf8").replace("status: planned", "status: reviewing"),
      "utf8",
    );

    const model = createBoardModel(repo);
    const closedTask = model.tasks.find((task) => task.id === "inspect-closed-task");
    const oddTask = model.tasks.find((task) => task.id === "inspect-odd-task-state");

    expect(model.statuses).toEqual([
      "planned",
      "in_progress",
      "pending_confirmation",
      "implemented",
      "blocked",
    ]);
    expect(closedTask?.status).toBe("implemented");
    expect(closedTask?.originalStatus).toBe("closed");
    expect(oddTask?.status).toBe("blocked");
    expect(oddTask?.originalStatus).toBe("reviewing");
  });

  it("saves task sections through the board API", async () => {
    const repo = tempRepo();
    initProtocol(repo);
    createTask(repo, "Edit task sections", { taskId: "edit-task-sections" });

    const { server, url } = await startBoardServer(repo, {
      host: "127.0.0.1",
      port: 0,
    });

    try {
      const response = await fetch(new URL("api/tasks/edit-task-sections/sections/Request", url), {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: "Updated from the board." }),
      });
      const model = await response.json();
      const content = readFileSync(taskPath(repo, "edit-task-sections"), "utf8");

      expect(response.status).toBe(200);
      expect(model.tasks[0].sections.Request).toBe("Updated from the board.");
      expect(content).toContain("## Request\n\nUpdated from the board.");
      expect(content).toContain("## Acceptance Criteria");
    } finally {
      await new Promise<void>((resolveClose, rejectClose) => {
        server.close((error) => (error ? rejectClose(error) : resolveClose()));
      });
    }
  });

  it("saves task status through the board API", async () => {
    const repo = tempRepo();
    initProtocol(repo);
    createTask(repo, "Confirm task status", {
      taskId: "confirm-task-status",
      status: "pending_confirmation",
    });

    const { server, url } = await startBoardServer(repo, {
      host: "127.0.0.1",
      port: 0,
    });

    try {
      const response = await fetch(new URL("api/tasks/confirm-task-status/status", url), {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "implemented" }),
      });
      const model = await response.json();
      const content = readFileSync(taskPath(repo, "confirm-task-status"), "utf8");

      expect(response.status).toBe(200);
      expect(model.tasks[0].status).toBe("implemented");
      expect(content).toContain("status: implemented");
      expect(content).toContain("Status changed to `implemented`.");
    } finally {
      await new Promise<void>((resolveClose, rejectClose) => {
        server.close((error) => (error ? rejectClose(error) : resolveClose()));
      });
    }
  });

  it("deletes task files through the board API", async () => {
    const repo = tempRepo();
    initProtocol(repo);
    createTask(repo, "Delete task sections", { taskId: "delete-task-sections" });
    createTask(repo, "Keep another task", { taskId: "keep-another-task" });

    const { server, url } = await startBoardServer(repo, {
      host: "127.0.0.1",
      port: 0,
    });

    try {
      const response = await fetch(new URL("api/tasks/delete-task-sections", url), {
        method: "DELETE",
        headers: { accept: "application/json" },
      });
      const model = await response.json();

      expect(response.status).toBe(200);
      expect(existsSync(taskPath(repo, "delete-task-sections"))).toBe(false);
      expect(existsSync(taskPath(repo, "keep-another-task"))).toBe(true);
      expect(model.tasks.map((task: { id: string }) => task.id)).toEqual(["keep-another-task"]);
    } finally {
      await new Promise<void>((resolveClose, rejectClose) => {
        server.close((error) => (error ? rejectClose(error) : resolveClose()));
      });
    }
  });

  it("returns not found when deleting a missing task through the board API", async () => {
    const repo = tempRepo();
    initProtocol(repo);

    const { server, url } = await startBoardServer(repo, {
      host: "127.0.0.1",
      port: 0,
    });

    try {
      const response = await fetch(new URL("api/tasks/missing-task", url), {
        method: "DELETE",
        headers: { accept: "application/json" },
      });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe("Task not found: missing-task");
    } finally {
      await new Promise<void>((resolveClose, rejectClose) => {
        server.close((error) => (error ? rejectClose(error) : resolveClose()));
      });
    }
  });
});

function tempRepo(): string {
  return mkdtempSync(resolve(tmpdir(), "taskr-"));
}

function initGitRepo(repo: string): void {
  git(repo, "init");
  git(repo, "config", "user.email", "taskr@example.test");
  git(repo, "config", "user.name", "Taskr Test");
}

function git(repo: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
}
