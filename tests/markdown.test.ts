import { describe, expect, it } from "vitest";
import { markdownBrowserScript, renderMarkdownHtml } from "../src/markdown.js";

describe("Taskr Markdown renderer", () => {
  it("renders inline code, strong text, and escapes HTML", () => {
    expect(renderMarkdownHtml("Use `taskr` with **care** <now>.")).toBe(
      "<p>Use <code>taskr</code> with <strong>care</strong> &lt;now&gt;.</p>",
    );
  });

  it("renders task, unordered, and ordered lists", () => {
    const html = renderMarkdownHtml(
      [
        "- [x] Finished `setup`",
        "- [ ] Verify **output**",
        "",
        "- One",
        "- Two",
        "",
        "1. First",
        "2. Second",
      ].join("\n"),
    );

    expect(html).toContain('<ul class="task-list">');
    expect(html).toContain(
      '<li class="task-list-item"><input type="checkbox" disabled checked><span class="task-list-item-content">Finished <code>setup</code></span></li>',
    );
    expect(html).toContain(
      '<li class="task-list-item"><input type="checkbox" disabled><span class="task-list-item-content">Verify <strong>output</strong></span></li>',
    );
    expect(html).toContain("<ul><li>One</li><li>Two</li></ul>");
    expect(html).toContain("<ol><li>First</li><li>Second</li></ol>");
  });

  it("emits a browser script with the renderer entrypoint", () => {
    expect(markdownBrowserScript()).toContain("window.renderTaskrMarkdown = renderMarkdownHtml");
  });
});
