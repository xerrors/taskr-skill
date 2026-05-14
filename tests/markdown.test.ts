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
    const script = markdownBrowserScript();

    expect(script).toContain("window.renderTaskrMarkdown = renderMarkdownHtml");
    expect(script).toContain("function sanitizeHtml");
    expect(script).toContain("const DANGEROUS_TAGS");
  });

  it("renders standalone HTML fragments with allowed tags", () => {
    const html = renderMarkdownHtml('<section class="demo">HTML content</section>');
    expect(html).toContain('<section class="demo">HTML content</section>');
  });

  it("escapes dangerous HTML tags like script", () => {
    const html = renderMarkdownHtml("<script>alert('x')</script>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("removes dangerous attributes like onclick while preserving safe ones", () => {
    const html = renderMarkdownHtml(
      '<div class="test" onclick="alert(1)" style="color:red">Content</div>',
    );
    expect(html).toContain('class="test"');
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("style");
  });

  it("escapes iframe and other embedding tags", () => {
    const html = renderMarkdownHtml("<iframe src='evil.com'></iframe>");
    expect(html).toContain("&lt;iframe");
    expect(html).not.toContain("<iframe");
  });

  it("renders multiple HTML fragments in sequence", () => {
    const html = renderMarkdownHtml(
      '<section class="a">First</section>\n<section class="b">Second</section>',
    );
    expect(html).toContain('<section class="a">First</section>');
    expect(html).toContain('<section class="b">Second</section>');
  });

  it("renders multiline HTML fragments as one sanitized block", () => {
    const html = renderMarkdownHtml(
      [
        '<section class="demo">',
        "  <h3>HTML fragment</h3>",
        '  <p onclick="alert(1)">Content</p>',
        "</section>",
      ].join("\n"),
    );

    expect(html).toContain('<section class="demo">');
    expect(html).toContain("<h3>HTML fragment</h3>");
    expect(html).toContain("<p>Content</p>");
    expect(html).not.toContain("<p></p>");
    expect(html).not.toContain("onclick");
  });
});
