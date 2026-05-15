const HTML_FRAGMENT_PATTERN = /^[\s]*<[a-z][^>]*>/i;

export function renderMarkdownHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const blocks: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (line.trim() === "") {
      index += 1;
      continue;
    }

    const heading = headingItem(line);
    if (heading) {
      blocks.push(`<h${heading.level}>${renderInline(heading.text)}</h${heading.level}>`);
      index += 1;
      continue;
    }

    // Detect standalone HTML fragment lines (lines that start with an HTML tag) and pass them through safely
    if (HTML_FRAGMENT_PATTERN.test(line)) {
      // Collect multi-line HTML blocks by looking for continuation lines
      const fragmentLines: string[] = [line.trim()];
      index += 1;
      while (index < lines.length) {
        const nextLine = lines[index];
        // Empty line ends the HTML block
        if (nextLine.trim() === "") {
          break;
        }
        // Indented lines or lines starting with closing tag or opening tag are continuations
        if (/^\s+/.test(nextLine) || /^\s*<\/?/.test(nextLine)) {
          fragmentLines.push(nextLine.trim());
          index += 1;
        } else {
          break;
        }
      }
      blocks.push(sanitizeHtml(fragmentLines.join("\n")));
      continue;
    }

    const todo = todoItem(line);
    if (todo) {
      const items: string[] = [];
      while (index < lines.length) {
        const item = todoItem(lines[index]);
        if (!item) break;
        const checked = item.checked ? " checked" : "";
        items.push(
          `<li class="task-list-item"><input type="checkbox" disabled${checked}><span class="task-list-item-content">${renderInline(item.text)}</span></li>`,
        );
        index += 1;
      }
      blocks.push(`<ul class="task-list">${items.join("")}</ul>`);
      continue;
    }

    const unordered = unorderedItem(line);
    if (unordered) {
      const items: string[] = [];
      while (index < lines.length) {
        const item = unorderedItem(lines[index]);
        if (!item) break;
        items.push(`<li>${renderInline(item)}</li>`);
        index += 1;
      }
      blocks.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    const ordered = orderedItem(line);
    if (ordered) {
      const items: string[] = [];
      while (index < lines.length) {
        const item = orderedItem(lines[index]);
        if (!item) break;
        items.push(`<li>${renderInline(item)}</li>`);
        index += 1;
      }
      blocks.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() !== "" &&
      !todoItem(lines[index]) &&
      !unorderedItem(lines[index]) &&
      !orderedItem(lines[index]) &&
      !headingItem(lines[index])
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push(`<p>${paragraph.map(renderInline).join("<br>")}</p>`);
  }

  return blocks.join("");
}

export function markdownBrowserScript(nonce?: string): string {
  return `<script${scriptNonce(nonce)}>${markdownBrowserScriptSource()}</script>`;
}

export function markdownBrowserScriptSource(): string {
  return browserScriptSource();
}

function scriptNonce(nonce: string | undefined): string {
  return nonce ? ` nonce="${escapeAttribute(nonce)}"` : "";
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function browserScriptSource(): string {
  return `(() => {
const HTML_FRAGMENT_PATTERN = /^[\\s]*<[a-z][^>]*>/i;
const DANGEROUS_TAGS = /^(script|iframe|object|embed|form|input|button|select|textarea|style|link|meta)$/i;
const DANGEROUS_ATTR_PATTERN = /^(on\\w+|style|href|src)$/i;
${renderMarkdownHtml.toString()}
${renderInline.toString()}
${todoItem.toString()}
${unorderedItem.toString()}
${orderedItem.toString()}
${headingItem.toString()}
${sanitizeHtml.toString()}
${escapeHtml.toString()}
window.renderTaskrMarkdown = renderMarkdownHtml;
})();`;
}

function renderInline(value: string): string {
  let result = "";
  let index = 0;

  while (index < value.length) {
    if (value[index] === "\`") {
      const close = value.indexOf("\`", index + 1);
      if (close !== -1) {
        result += "<code>" + escapeHtml(value.slice(index + 1, close)) + "</code>";
        index = close + 1;
        continue;
      }
    }

    if (value.startsWith("**", index)) {
      const close = value.indexOf("**", index + 2);
      if (close !== -1) {
        result += "<strong>" + escapeHtml(value.slice(index + 2, close)) + "</strong>";
        index = close + 2;
        continue;
      }
    }

    result += escapeHtml(value[index]);
    index += 1;
  }

  return result;
}

function todoItem(line: string): { checked: boolean; text: string } | null {
  const match = /^\s*[-*]\s+\[([ xX])\]\s+(.+?)\s*$/.exec(line);
  if (!match) return null;
  return {
    checked: match[1].toLowerCase() === "x",
    text: match[2],
  };
}

function unorderedItem(line: string): string | null {
  const match = /^\s*[-*]\s+(.+?)\s*$/.exec(line);
  if (!match || /^\[[ xX]\]\s+/.test(match[1])) return null;
  return match[1];
}

function orderedItem(line: string): string | null {
  const match = /^\s*\d+[.)]\s+(.+?)\s*$/.exec(line);
  return match ? match[1] : null;
}

function headingItem(line: string): { level: number; text: string } | null {
  const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
  if (!match) return null;
  return {
    level: match[1].length,
    text: match[2],
  };
}

// Allowed HTML tags for task markdown fragments
const ALLOWED_TAGS = new Set([
  "section",
  "div",
  "span",
  "p",
  "br",
  "hr",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "strong",
  "em",
  "b",
  "i",
  "u",
  "s",
  "code",
  "pre",
  "a",
  "img",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "blockquote",
]);

// Dangerous tag patterns that indicate potential script injection
const DANGEROUS_TAGS =
  /^(script|iframe|object|embed|form|input|button|select|textarea|style|link|meta)$/i;

// Dangerous attribute patterns
const DANGEROUS_ATTR_PATTERN = /^(on\w+|style|href|src)$/i;

function sanitizeHtml(html: string): string {
  // Basic tag name extraction for validation
  const tagMatch = /^<(\w+)/.exec(html);
  if (tagMatch) {
    const tagName = tagMatch[1].toLowerCase();
    // Reject dangerous tags
    if (DANGEROUS_TAGS.test(tagName)) {
      return escapeHtml(html);
    }
  }

  // Remove dangerous event handlers and problematic attributes while preserving safe ones
  // This regex removes attributes that match dangerous patterns
  const sanitized = html.replace(/\s+([a-zA-Z:_][\w:.]*)=(?:"[^"]*"|'[^']*')/g, (match, attr) => {
    if (DANGEROUS_ATTR_PATTERN.test(attr)) {
      return ""; // Remove dangerous attribute
    }
    return match; // Keep safe attribute
  });

  return sanitized;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
