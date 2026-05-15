import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { markdownBrowserScriptSource } from "../dist/markdown.js";
import { vscodeBoardClientScript } from "../dist/vscode-board-client.js";
import { vscodeBoardStyles } from "../dist/vscode-board-styles.js";

const outputDir = resolve("vscode-extension/dist/webview");
mkdirSync(outputDir, { recursive: true });

writeFileSync(resolve(outputDir, "vscode-board.css"), `${vscodeBoardStyles}\n`, "utf8");
writeFileSync(resolve(outputDir, "markdown.js"), `${markdownBrowserScriptSource()}\n`, "utf8");
writeFileSync(resolve(outputDir, "vscode-board-client.js"), `${vscodeBoardClientScript}\n`, "utf8");
