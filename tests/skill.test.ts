import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SKILL = readFileSync(new URL("../resources/skills/taskr/SKILL.md", import.meta.url), "utf8");

describe("Taskr skill guidance", () => {
  it("gates implementation on explicit user approval", () => {
    expect(SKILL).toContain("Intent And Confirmation Policy");
    expect(SKILL).toContain("ask whether to start implementation");
    expect(SKILL).toContain("do not edit source files");
    expect(SKILL).toContain("no mandatory brainstorming");
    expect(SKILL).toContain("reuse a matching task");
  });

  it("requires explicit commit confirmation and structured verification", () => {
    expect(SKILL).toContain("Do not create a git commit without explicit user confirmation");
    expect(SKILL).toContain("Taskr: 2026-05-10-user-invitation");
    expect(SKILL).toContain("TDD is recommended");
    expect(SKILL).toContain("TDD is optional");
    expect(SKILL).toContain("Review against `## Request`");
    expect(SKILL).toContain("Set the task to `pending_confirmation`");
    expect(SKILL).toContain("Use `implemented` only after the user confirms");
    expect(SKILL).toContain("failure or unable-to-run reason");
  });

  it("uses npx instead of assuming a globally installed taskr binary", () => {
    expect(SKILL).toContain("npx --yes @xerrors/taskr init");
    expect(SKILL).toContain("npx --yes @xerrors/taskr install-skill codex");
    expect(SKILL).toContain("npx --yes --package @xerrors/taskr taskr");
    expect(SKILL).toContain("do not assume the user has installed a global `taskr` binary");
    expect(SKILL).not.toContain("Prefer the `taskr` CLI when available");
    expect(SKILL).not.toMatch(/^taskr init$/m);
  });
});
