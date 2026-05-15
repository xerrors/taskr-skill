import { existsSync } from "node:fs";
import * as vscode from "vscode";
import {
  createBoardModel,
  deleteBoardTask,
  updateBoardTaskSection,
  updateBoardTaskStatus,
} from "../../src/board.js";
import { findRepoRoot, taskPath, VALID_STATUSES } from "../../src/protocol.js";
import { renderVsCodeBoardHtml } from "../../src/vscode-board-template.js";
import type { BoardModel } from "../../src/board-types.js";

const VIEW_ID = "taskr.board";

export function activate(context: vscode.ExtensionContext): void {
  const provider = new TaskrBoardProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(VIEW_ID, provider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    vscode.commands.registerCommand("taskr.refreshBoard", () => provider.refresh("manual")),
  );
}

export function deactivate(): void {
  // VS Code disposes registered subscriptions for us.
}

class TaskrBoardProvider implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | undefined;
  private refreshTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly context: vscode.ExtensionContext) {
    const watcher = vscode.workspace.createFileSystemWatcher("**/.taskr/tasks/*.md");
    watcher.onDidCreate(() => this.scheduleRefresh());
    watcher.onDidChange(() => this.scheduleRefresh());
    watcher.onDidDelete(() => this.scheduleRefresh());
    context.subscriptions.push(
      watcher,
      vscode.workspace.onDidChangeWorkspaceFolders(() => this.refresh("workspace")),
    );
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.html = renderVsCodeBoardHtml(
      emptyModel("Loading Taskr workspace"),
      this.renderOptions(webviewView.webview),
    );
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    };
    webviewView.webview.onDidReceiveMessage(
      (message: unknown) => void this.handleMessage(message),
      undefined,
      this.context.subscriptions,
    );
    webviewView.onDidDispose(() => {
      this.view = undefined;
    });
    this.render();
  }

  refresh(_source: "manual" | "watcher" | "workspace" = "manual"): void {
    if (!this.view) {
      return;
    }
    try {
      this.view.webview.postMessage({
        type: "taskr.model",
        model: this.model(),
      });
    } catch (error) {
      this.postError(error);
    }
  }

  private scheduleRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = undefined;
      this.refresh("watcher");
    }, 150);
  }

  private render(): void {
    const view = this.view;
    if (!view) {
      return;
    }
    view.webview.html = renderVsCodeBoardHtml(this.model(), this.renderOptions(view.webview));
  }

  private renderOptions(webview: vscode.Webview) {
    const asset = (filename: string) =>
      webview
        .asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview", filename))
        .toString();
    return {
      mode: "vscode",
      cspSource: webview.cspSource,
      nonce: nonceValue(),
      assets: {
        stylesUri: asset("vscode-board.css"),
        markdownScriptUri: asset("markdown.js"),
        clientScriptUri: asset("vscode-board-client.js"),
      },
    } as const;
  }

  private async handleMessage(message: unknown): Promise<void> {
    if (!isRecord(message) || message.type !== "taskr.request") {
      return;
    }
    const requestId = Number(message.requestId);
    try {
      const data = await this.handleRequest(message);
      this.postResponse(requestId, true, data);
    } catch (error) {
      this.postResponse(requestId, false, undefined, errorMessage(error));
    }
  }

  private async handleRequest(message: Record<string, unknown>): Promise<unknown> {
    const action = requiredString(message.action, "action");
    if (action === "getTasks") {
      return this.model();
    }

    const repoRoot = this.repoRoot();
    if (!repoRoot) {
      throw new Error("Open a workspace folder before using Taskr.");
    }

    if (action === "setStatus") {
      const status = requiredString(message.status, "status");
      if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
        throw new Error(`Status must be one of ${VALID_STATUSES.join(", ")}.`);
      }
      return updateBoardTaskStatus(repoRoot, requiredString(message.id, "id"), status);
    }

    if (action === "saveSection") {
      return updateBoardTaskSection(
        repoRoot,
        requiredString(message.id, "id"),
        requiredString(message.sectionTitle, "sectionTitle"),
        requiredString(message.content, "content"),
      );
    }

    if (action === "deleteTask") {
      return deleteBoardTask(repoRoot, requiredString(message.id, "id"));
    }

    if (action === "openTask") {
      await this.openTask(repoRoot, requiredString(message.id, "id"));
      return { ok: true };
    }

    throw new Error(`Unsupported board action: ${action}`);
  }

  private async openTask(repoRoot: string, id: string): Promise<void> {
    const path = taskPath(repoRoot, id);
    if (!existsSync(path)) {
      throw new Error(`Task not found: ${id}`);
    }
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(path));
    await vscode.window.showTextDocument(document, { preview: false });
  }

  private model(): BoardModel {
    const repoRoot = this.repoRoot();
    if (!repoRoot) {
      return emptyModel("No workspace folder");
    }
    return createBoardModel(repoRoot);
  }

  private repoRoot(): string | null {
    const folder = activeWorkspaceFolder();
    return folder ? findRepoRoot(folder.uri.fsPath) : null;
  }

  private postResponse(requestId: number, ok: boolean, data?: unknown, error?: string): void {
    this.view?.webview.postMessage({
      type: "taskr.response",
      requestId,
      ok,
      data,
      error,
    });
  }

  private postError(error: unknown): void {
    this.view?.webview.postMessage({
      type: "taskr.error",
      error: errorMessage(error),
    });
  }
}

function activeWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
  const activeUri = vscode.window.activeTextEditor?.document.uri;
  if (activeUri) {
    const folder = vscode.workspace.getWorkspaceFolder(activeUri);
    if (folder) {
      return folder;
    }
  }
  return vscode.workspace.workspaceFolders?.[0];
}

function emptyModel(repoRoot: string): BoardModel {
  return {
    generatedAt: new Date().toISOString(),
    repoRoot,
    statuses: [...VALID_STATUSES],
    tasks: [],
  };
}

function requiredString(value: unknown, name: string): string {
  if (typeof value !== "string") {
    throw new Error(`Missing string field: ${name}`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function nonceValue(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let value = "";
  for (let index = 0; index < 32; index += 1) {
    value += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return value;
}
