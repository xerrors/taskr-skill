import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { run } from "../src/cli.js";

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

  it("runs the init-to-complete workflow", () => {
    const repo = mkdtempSync(resolve(tmpdir(), "taskr-cli-"));
    process.chdir(repo);

    expect(run(["init"])).toBe(0);
    expect(run(["install-skill", "claude"])).toBe(0);
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
    expect(existsSync(resolve(repo, ".claude/skills/taskr/SKILL.md"))).toBe(true);
  });
});
