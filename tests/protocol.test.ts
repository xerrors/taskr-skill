import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createBoardModel, renderBoardHtml } from "../src/board.js";
import {
  completeTask,
  createTask,
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

    expect(path).toBe(resolve(repo, ".taskr/tasks/implement-user-invitation-flow.md"));
    expect(document.metadata.id).toBe("implement-user-invitation-flow");
    expect(document.metadata.schema_version).toBe(1);
    expect(document.metadata.status).toBe("in_progress");
    expect(document.body).toContain("## Acceptance Criteria");
    expect(validate(repo)).toEqual([]);
  });

  it("requires summary and files for implemented tasks", () => {
    const repo = tempRepo();
    initProtocol(repo);
    createTask(repo, "Implement billing webhook");

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
    createTask(repo, "Implement billing webhook");

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
    createTask(repo, "Implement board visualization", { status: "in_progress" });

    const model = createBoardModel(repo);
    const html = renderBoardHtml(model);

    expect(model.statuses).toContain("in_progress");
    expect(model.tasks).toHaveLength(1);
    expect(model.tasks[0].id).toBe("implement-board-visualization");
    expect(model.tasks[0].sections.Request).toContain("Implement board visualization");
    expect(html).toContain("Taskr Board");
    expect(html).toContain("Taskr Kanban board");
    expect(html).toContain("Click any card to open its task detail.");
    expect(html).toContain('task.relatedFiles.join("\\n")');
  });

  it("keeps tasks with unknown statuses visible on the board", () => {
    const repo = tempRepo();
    initProtocol(repo);
    createTask(repo, "Inspect odd task state");
    const path = taskPath(repo, "inspect-odd-task-state");
    const content = readFileSync(path, "utf8").replace("status: planned", "status: reviewing");
    writeFileSync(path, content, "utf8");

    const model = createBoardModel(repo);

    expect(model.statuses).toContain("reviewing");
    expect(model.tasks[0].status).toBe("reviewing");
  });
});

function tempRepo(): string {
  return mkdtempSync(resolve(tmpdir(), "taskr-"));
}
