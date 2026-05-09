import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createBoardModel, renderBoardHtml, startBoardServer } from "../src/board.js";
import {
  completeTask,
  createTask,
  defaultTaskId,
  initProtocol,
  loadTask,
  slugify,
  taskPath,
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

  it("defines the four canonical task statuses", () => {
    expect([...VALID_STATUSES]).toEqual(["planned", "in_progress", "implemented", "blocked"]);
  });

  it("initializes the protocol without an index cache", () => {
    const repo = tempRepo();
    const changed = initProtocol(repo);

    expect(changed.map((path) => path.slice(repo.length + 1))).toEqual([
      ".taskr/config.yaml",
      ".taskr/schema.yaml",
      ".taskr/templates/task.md",
    ]);
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

  it("requires summary and files for implemented tasks", () => {
    const repo = tempRepo();
    initProtocol(repo);
    createTask(repo, "Implement billing webhook", { taskId: "implement-billing-webhook" });

    const path = taskPath(repo, "implement-billing-webhook");
    const content = readFileSync(path, "utf8").replace("status: planned", "status: implemented");
    writeFileSync(path, content, "utf8");

    const messages = validate(repo, "implement-billing-webhook").map((issue) => issue.message);

    expect(messages).toContain("`implemented` tasks need a Completion Summary.");
    expect(messages).toContain(
      "`implemented` tasks need `related_files` or `no_related_files_reason`.",
    );
  });

  it("can produce a valid implemented task", () => {
    const repo = tempRepo();
    initProtocol(repo);
    createTask(repo, "Implement billing webhook", { taskId: "implement-billing-webhook" });

    completeTask(repo, "implement-billing-webhook", {
      summary: "Implemented the billing webhook handler.",
      relatedFiles: ["src/billing.ts"],
      testsRun: ["npm test"],
      verificationResult: "passed",
      checkCriteria: true,
    });

    expect(validate(repo, "implement-billing-webhook")).toEqual([]);
  });

  it("renders a board model as a Kanban HTML page", () => {
    const repo = tempRepo();
    initProtocol(repo);
    createTask(repo, "Implement board visualization", {
      taskId: "implement-board-visualization",
      status: "in_progress",
    });

    const model = createBoardModel(repo);
    const html = renderBoardHtml(model);

    expect(model.statuses).toContain("in_progress");
    expect(model.statuses).not.toContain("closed");
    expect(model.tasks).toHaveLength(1);
    expect(model.tasks[0].id).toBe("implement-board-visualization");
    expect(model.tasks[0].sections.Request).toContain("Implement board visualization");
    expect(html).toContain("Taskr Board");
    expect(html).toContain("Taskr Kanban board");
    expect(html).toContain("Click any task to open its detail.");
    expect(html).toContain("Refresh");
    expect(html).toContain("Taskr task table");
    expect(html).toContain("languageStorageKey");
    expect(html).toContain("Switch language to Chinese");
    expect(html).toContain("Taskr 看板");
    expect(html).toContain("点击任意任务查看详情。");
    expect(html).toContain('let currentView = "table"');
    expect(html).toContain("window.scrollY > 88");
    expect(html).toContain("window.scrollY > 16");
    expect(html).toContain("compact-meta");
    expect(html).toContain("progressbar");
    expect(html).toContain("formatTimestamp");
    expect(html).toContain('task.relatedFiles.join("\\n")');
  });

  it("maps legacy and unknown statuses into the four board columns", () => {
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

    expect(model.statuses).toEqual(["planned", "in_progress", "implemented", "blocked"]);
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
});

function tempRepo(): string {
  return mkdtempSync(resolve(tmpdir(), "taskr-"));
}
