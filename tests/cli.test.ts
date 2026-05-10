import { existsSync, mkdtempSync, readFileSync } from "node:fs";
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
    expect(run(["install-skill", "claude"])).toBe(0);
    expect(run(["install-skill", "codex"])).toBe(0);
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
        "--file",
        "src/invitations.ts",
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
    expect(existsSync(resolve(repo, ".claude/skills/taskr/SKILL.md"))).toBe(true);
    expect(existsSync(resolve(repo, ".codex/skills/taskr/SKILL.md"))).toBe(true);
  });
});
