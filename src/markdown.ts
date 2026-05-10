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
      !orderedItem(lines[index])
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push(`<p>${paragraph.map(renderInline).join("<br>")}</p>`);
  }

  return blocks.join("");
}

export function markdownBrowserScript(): string {
  return `<script>${browserScriptSource()}</script>`;
}

function browserScriptSource(): string {
  return `(() => {
${renderMarkdownHtml.toString()}
${renderInline.toString()}
${todoItem.toString()}
${unorderedItem.toString()}
${orderedItem.toString()}
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
