import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { run } from "../src/cli.js";

const PACKAGE_VERSION = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
).version as string;

describe("Taskr CLI", () => {
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    vi.restoreAllMocks();
  });

  it("prints the package version", () => {
    expect(run(["--version"])).toBe(0);
    expect(console.log).toHaveBeenLastCalledWith(`taskr ${PACKAGE_VERSION}`);

    expect(run(["version"])).toBe(0);
    expect(console.log).toHaveBeenLastCalledWith(`taskr ${PACKAGE_VERSION}`);
  });

  it("prints command-specific help", () => {
    expect(run(["new", "--help"])).toBe(0);
    expect(console.log).toHaveBeenLastCalledWith(expect.stringContaining("Usage: taskr new"));
    expect(console.log).toHaveBeenLastCalledWith(expect.stringContaining("--request"));

    expect(run(["help", "doctor"])).toBe(0);
    expect(console.log).toHaveBeenLastCalledWith(expect.stringContaining("Usage: taskr doctor"));
  });

  it("reports doctor status for initialized and missing protocols", () => {
    const repo = mkdtempSync(resolve(tmpdir(), "taskr-cli-"));
    process.chdir(repo);

    expect(run(["doctor"])).toBe(1);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("[error] Protocol: .taskr/ is missing."),
    );

    expect(run(["init"])).toBe(0);
    expect(run(["doctor"])).toBe(0);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("[ok] Protocol: .taskr/ is initialized."),
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("[ok] Structure: Task Markdown files are the repo-local source"),
    );
    expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining("Config"));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("[warn] Tasks: 0 Markdown"));
  });

  it("runs the init-to-complete workflow", () => {
    const repo = mkdtempSync(resolve(tmpdir(), "taskr-cli-"));
    process.chdir(repo);

    expect(run(["init"])).toBe(0);
    expect(
      run([
        "new",
        "implement user invitation flow",
        "--id",
        "2026-05-10-implement-user-invitation-flow",
        "--status",
        "in_progress",
      ]),
    ).toBe(0);
    expect(run(["status", "2026-05-10-implement-user-invitation-flow", "blocked"])).toBe(0);
    expect(
      run(["note", "2026-05-10-implement-user-invitation-flow", "Waiting on API contract."]),
    ).toBe(0);
    expect(
      run([
        "complete",
        "2026-05-10-implement-user-invitation-flow",
        "--summary",
        "Implemented the invitation flow.",
        "--test",
        "npm test",
        "--result",
        "passed",
        "--check-criteria",
      ]),
    ).toBe(0);
    expect(run(["validate", "2026-05-10-implement-user-invitation-flow"])).toBe(0);
    expect(
      readFileSync(
        resolve(repo, ".taskr/tasks/2026-05-10-implement-user-invitation-flow.md"),
        "utf8",
      ),
    ).toContain("status: pending_confirmation");
  });

  it("creates opt-in research report files from the CLI", () => {
    const repo = mkdtempSync(resolve(tmpdir(), "taskr-cli-"));
    process.chdir(repo);

    expect(run(["init"])).toBe(0);
    expect(run(["new", "research storage", "--id", "research-storage"])).toBe(0);
    expect(
      run([
        "research",
        "research-storage",
        "overview.md",
        "--content",
        "# Overview\n\nDetailed notes.",
      ]),
    ).toBe(0);

    const task = readFileSync(resolve(repo, ".taskr/tasks/research-storage.md"), "utf8");
    const report = readFileSync(
      resolve(repo, ".taskr/research/research-storage/overview.md"),
      "utf8",
    );

    expect(task).toContain("research_files:");
    expect(task).toContain(".taskr/research/research-storage/overview.md");
    expect(report).toBe("# Overview\n\nDetailed notes.\n");
    expect(console.log).toHaveBeenLastCalledWith(
      "created .taskr/research/research-storage/overview.md",
    );
  });

  it("lists tasks by status order with a default and explicit limit", () => {
    const repo = mkdtempSync(resolve(tmpdir(), "taskr-cli-"));
    process.chdir(repo);

    expect(run(["init"])).toBe(0);
    createTaskFixture(repo, "implemented-task", "implemented", "2026-05-11T10:00:00+08:00");
    createTaskFixture(repo, "blocked-task", "blocked", "2026-05-12T10:00:00+08:00");
    createTaskFixture(repo, "planned-newer", "planned", "2026-05-13T10:00:00+08:00");
    createTaskFixture(repo, "planned-older", "planned", "2026-05-10T10:00:00+08:00");
    createTaskFixture(repo, "in-progress-task", "in_progress", "2026-05-14T10:00:00+08:00");

    expect(run(["list", "-n", "3"])).toBe(0);
    let output = consoleLogLines();
    expect(output).toHaveLength(3);
    expect(output[0]).toContain("planned-newer");
    expect(output[1]).toContain("planned-older");
    expect(output[2]).toContain("in-progress-task");
    expect(output[0]).toContain("2026-05-13T10:00:00+08:00");

    vi.mocked(console.log).mockClear();
    expect(run(["list", "--number", "12", "--status", "blocked"])).toBe(0);
    output = consoleLogLines();
    expect(output).toEqual(["blocked  blocked-task  2026-05-12T10:00:00+08:00  blocked-task"]);
  });

  it("uses 10 as the default list limit", () => {
    const repo = mkdtempSync(resolve(tmpdir(), "taskr-cli-"));
    process.chdir(repo);

    expect(run(["init"])).toBe(0);
    for (let index = 0; index < 12; index += 1) {
      createTaskFixture(
        repo,
        `planned-${String(index).padStart(2, "0")}`,
        "planned",
        `2026-05-${String(index + 1).padStart(2, "0")}T10:00:00+08:00`,
      );
    }

    expect(run(["list"])).toBe(0);

    expect(consoleLogLines()).toHaveLength(10);
  });

  it("keeps install-skill as deprecated migration guidance", () => {
    const repo = mkdtempSync(resolve(tmpdir(), "taskr-cli-"));
    process.chdir(repo);

    expect(run(["install-skill", "codex", "--scope", "user"])).toBe(1);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("is deprecated"));
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining(
        "npx --yes skills add xerrors/taskr-skill --skill taskr --agent codex --global",
      ),
    );
  });
});

function createTaskFixture(repo: string, id: string, status: string, updatedAt: string): void {
  expect(run(["new", id, "--id", id])).toBe(0);
  const path = resolve(repo, ".taskr/tasks", `${id}.md`);
  const content = readFileSync(path, "utf8")
    .replace("status: planned", `status: ${status}`)
    .replace(/updated_at: .+/, `updated_at: ${updatedAt}`)
    .replace(/title: .+/, `title: ${id}`);
  writeFileSync(path, content, "utf8");
  vi.mocked(console.log).mockClear();
}

function consoleLogLines(): string[] {
  return vi.mocked(console.log).mock.calls.map((call) => String(call[0]));
}
