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
});
