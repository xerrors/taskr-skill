#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createBoardModel, renderBoardHtml, startBoardServer } from "./board.js";
import {
  addNote,
  completeTask,
  createTask,
  findRepoRoot,
  initProtocol,
  installAgentSkill,
  listTasks,
  loadTaskById,
  relative,
  setStatus,
  SKILL_TARGETS,
  TaskrError,
  taskId,
  taskStatus,
  taskTitle,
  validate,
  VALID_COMMIT_STATUSES,
  VALID_STATUSES,
} from "./protocol.js";

interface ParsedArgs {
  positionals: string[];
  values: Record<string, string>;
  lists: Record<string, string[]>;
  flags: Set<string>;
}

interface OptionSpec {
  takesValue?: boolean;
  multiple?: boolean;
}

export function run(argv = process.argv.slice(2)): number {
  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h") {
    printHelp();
    return 0;
  }

  if (argv[0] === "help") {
    const command = argv[1];
    if (command) {
      printCommandHelp(command);
    } else {
      printHelp();
    }
    return 0;
  }

  if (argv[0] === "--version" || argv[0] === "-V" || argv[0] === "version") {
    console.log(`taskr ${readPackageVersion()}`);
    return 0;
  }

  const command = argv[0];
  if (argv[1] === "--help" || argv[1] === "-h") {
    printCommandHelp(command);
    return 0;
  }

  const repoRoot = findRepoRoot();

  try {
    if (command === "doctor") {
      const parsed = parseArgs(argv.slice(1), {});
      requireNoPositionals(parsed);
      return printDoctor(repoRoot);
    }

    if (command === "init") {
      const parsed = parseArgs(argv.slice(1), {
        force: {},
      });
      requireNoPositionals(parsed);
      const changed = initProtocol(repoRoot, parsed.flags.has("force"));
      if (changed.length > 0) {
        for (const path of changed) {
          console.log(`created ${relative(path, repoRoot)}`);
        }
      } else {
        console.log(".taskr/ already initialized");
      }
      return 0;
    }

    if (command === "install-skill") {
      const parsed = parseArgs(argv.slice(1), {
        scope: { takesValue: true },
        force: {},
      });
      const target = requiredPositional(parsed, 0, "target");
      requireChoices(target, [...SKILL_TARGETS], "target");
      requirePositionalCount(parsed, 1);
      const scope = parsed.values.scope ?? "project";
      requireChoices(scope, ["project", "user"], "scope");
      const installed = installAgentSkill(repoRoot, {
        target: target as (typeof SKILL_TARGETS)[number],
        scope: scope as "project" | "user",
        force: parsed.flags.has("force"),
      });
      console.log(`installed ${scope === "project" ? relative(installed, repoRoot) : installed}`);
      return 0;
    }

    if (command === "new") {
      const parsed = parseArgs(argv.slice(1), {
        id: { takesValue: true },
        status: { takesValue: true },
        request: { takesValue: true },
      });
      const title = requiredPositional(parsed, 0, "title");
      requirePositionalCount(parsed, 1);
      const status = parsed.values.status ?? "planned";
      requireChoices(status, [...VALID_STATUSES], "status");
      const path = createTask(repoRoot, title, {
        taskId: parsed.values.id,
        status: status as (typeof VALID_STATUSES)[number],
        request: parsed.values.request,
      });
      console.log(`created ${relative(path, repoRoot)}`);
      return 0;
    }

    if (command === "list") {
      const parsed = parseArgs(argv.slice(1), {
        status: { takesValue: true },
      });
      requireNoPositionals(parsed);
      if (parsed.values.status !== undefined) {
        requireChoices(parsed.values.status, [...VALID_STATUSES], "status");
      }
      let tasks = listTasks(repoRoot);
      if (parsed.values.status) {
        tasks = tasks.filter((task) => taskStatus(task) === parsed.values.status);
      }
      if (tasks.length === 0) {
        console.log("No tasks found.");
        return 0;
      }
      const width = Math.max(...tasks.map((task) => taskId(task).length));
      for (const task of tasks) {
        console.log(
          `${taskId(task).padEnd(width)}  ${taskStatus(task).padEnd(11)}  ${taskTitle(task)}`,
        );
      }
      return 0;
    }

    if (command === "show") {
      const parsed = parseArgs(argv.slice(1), {});
      const id = requiredPositional(parsed, 0, "task_id");
      requirePositionalCount(parsed, 1);
      const task = loadTaskById(repoRoot, id);
      process.stdout.write(readTaskFile(task.path));
      return 0;
    }

    if (command === "board") {
      const parsed = parseArgs(argv.slice(1), {
        host: { takesValue: true },
        port: { takesValue: true },
        open: {},
        html: {},
      });
      requireNoPositionals(parsed);
      const host = parsed.values.host ?? "127.0.0.1";
      const port = parsePort(parsed.values.port ?? "4317");
      if (parsed.flags.has("html")) {
        process.stdout.write(renderBoardHtml(createBoardModel(repoRoot)));
        return 0;
      }
      startBoardServer(repoRoot, {
        host,
        port,
        open: parsed.flags.has("open"),
      })
        .then(({ url }) => {
          console.log(`Taskr board: ${url}`);
          console.log("Press Ctrl+C to stop.");
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`taskr: ${message}`);
          process.exitCode = 1;
        });
      return 0;
    }

    if (command === "validate") {
      const parsed = parseArgs(argv.slice(1), {});
      requirePositionalCount(parsed, parsed.positionals.length > 0 ? 1 : 0);
      const issues = validate(repoRoot, parsed.positionals[0]);
      if (issues.length === 0) {
        console.log("Taskr validation passed.");
        return 0;
      }
      for (const issue of issues) {
        console.error(`${relative(issue.path, repoRoot)}: ${issue.message}`);
      }
      return 1;
    }

    if (command === "status") {
      const parsed = parseArgs(argv.slice(1), {});
      const id = requiredPositional(parsed, 0, "task_id");
      const status = requiredPositional(parsed, 1, "status");
      requireChoices(status, [...VALID_STATUSES], "status");
      requirePositionalCount(parsed, 2);
      const task = setStatus(repoRoot, id, status as (typeof VALID_STATUSES)[number]);
      console.log(`updated ${relative(task.path, repoRoot)}`);
      return 0;
    }

    if (command === "note") {
      const parsed = parseArgs(argv.slice(1), {});
      const id = requiredPositional(parsed, 0, "task_id");
      const note = requiredPositional(parsed, 1, "note");
      requirePositionalCount(parsed, 2);
      const task = addNote(repoRoot, id, note);
      console.log(`updated ${relative(task.path, repoRoot)}`);
      return 0;
    }

    if (command === "complete") {
      const parsed = parseArgs(argv.slice(1), {
        summary: { takesValue: true },
        commit: { takesValue: true, multiple: true },
        "commit-status": { takesValue: true },
        file: { takesValue: true, multiple: true },
        test: { takesValue: true, multiple: true },
        result: { takesValue: true },
        "check-criteria": {},
      });
      const id = requiredPositional(parsed, 0, "task_id");
      requirePositionalCount(parsed, 1);
      const summary = parsed.values.summary;
      if (!summary) {
        throw new TaskrError("Missing required option: --summary");
      }
      const commitStatus = parsed.values["commit-status"];
      if (commitStatus !== undefined) {
        requireChoices(commitStatus, [...VALID_COMMIT_STATUSES], "commit-status");
      }
      const task = completeTask(repoRoot, id, {
        summary,
        commits: parsed.lists.commit ?? [],
        relatedFiles: parsed.lists.file ?? [],
        testsRun: parsed.lists.test,
        verificationResult: parsed.values.result,
        commitStatus: commitStatus as (typeof VALID_COMMIT_STATUSES)[number] | undefined,
        checkCriteria: parsed.flags.has("check-criteria"),
      });
      console.log(`updated ${relative(task.path, repoRoot)}`);
      return 0;
    }
  } catch (error) {
    if (error instanceof TaskrError) {
      console.error(`taskr: ${error.message}`);
      return 1;
    }
    throw error;
  }

  console.error(`taskr: Unknown command: ${command}`);
  return 2;
}

function parseArgs(argv: string[], specs: Record<string, OptionSpec>): ParsedArgs {
  const parsed: ParsedArgs = {
    positionals: [],
    values: {},
    lists: {},
    flags: new Set(),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      parsed.positionals.push(arg);
      continue;
    }

    const [rawName, inlineValue] = arg.slice(2).split(/=(.*)/s, 2);
    const spec = specs[rawName];
    if (!spec) {
      throw new TaskrError(`Unknown option: --${rawName}`);
    }

    if (!spec.takesValue) {
      if (inlineValue !== undefined) {
        throw new TaskrError(`Option does not take a value: --${rawName}`);
      }
      parsed.flags.add(rawName);
      continue;
    }

    const value = inlineValue ?? argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new TaskrError(`Missing value for option: --${rawName}`);
    }
    if (inlineValue === undefined) {
      index += 1;
    }

    if (spec.multiple) {
      parsed.lists[rawName] = [...(parsed.lists[rawName] ?? []), value];
    } else {
      parsed.values[rawName] = value;
    }
  }

  return parsed;
}

function requiredPositional(parsed: ParsedArgs, index: number, name: string): string {
  const value = parsed.positionals[index];
  if (value === undefined) {
    throw new TaskrError(`Missing required argument: ${name}`);
  }
  return value;
}

function requireNoPositionals(parsed: ParsedArgs): void {
  requirePositionalCount(parsed, 0);
}

function requirePositionalCount(parsed: ParsedArgs, count: number): void {
  if (parsed.positionals.length > count) {
    throw new TaskrError(`Unexpected argument: ${parsed.positionals[count]}`);
  }
}

function requireChoices(value: string, choices: string[], name: string): void {
  if (!choices.includes(value)) {
    throw new TaskrError(`${name} must be one of ${choices.join(", ")}.`);
  }
}

function parsePort(value: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new TaskrError("port must be an integer between 0 and 65535.");
  }
  return port;
}

function readTaskFile(path: string): string {
  return readFileSync(path, "utf8");
}

function readPackageVersion(): string {
  const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  if (
    typeof packageJson !== "object" ||
    packageJson === null ||
    typeof packageJson.version !== "string"
  ) {
    throw new TaskrError("Could not read package version.");
  }
  return packageJson.version;
}

function printHelp(): void {
  console.log(`Usage: taskr <command> [options]

Repo-local task protocol for AI-assisted software development.

Commands:
  version                         Print the Taskr CLI version.
  init                            Initialize .taskr/ in this repo.
  install-skill <target>          Install a Taskr agent skill. Targets: claude, codex.
  new <title>                     Create a task file.
  list                            List tasks.
  show <task_id>                  Print a task file.
  board                           Serve a Kanban board.
  validate [task_id]              Validate Taskr task files.
  doctor                          Check protocol, task, skill, and environment status.
  status <task_id> <status>       Update a task status.
  note <task_id> <note>           Append an agent note to a task.
  complete <task_id>              Mark a task implemented.

Run "taskr <command> --help" for command-specific options.
`);
}

function printCommandHelp(command: string): void {
  const help: Record<string, string> = {
    version: `Usage: taskr version

Print the Taskr CLI version.
Aliases: --version, -V
`,
    init: `Usage: taskr init [--force]

Initialize .taskr/ in the current Git repository.

Options:
  --force    Recreate protocol config, schema, and template files.
`,
    "install-skill": `Usage: taskr install-skill <target> [--scope project|user] [--force]

Install the shared Taskr Skill for an agent platform.

Arguments:
  target     claude or codex.

Options:
  --scope    Install in this repo or in the user skill directory. Default: project.
  --force    Replace an existing skill file.
`,
    new: `Usage: taskr new <title> [--id task-id] [--status status] [--request text]

Create a Markdown task file under .taskr/tasks/.

Options:
  --id        Explicit lower-kebab-case task id.
  --status    Initial status: planned, in_progress, implemented, or blocked.
  --request   Original request text to place in the task body.
`,
    list: `Usage: taskr list [--status status]

List Taskr tasks.

Options:
  --status    Filter by status: planned, in_progress, implemented, or blocked.
`,
    show: `Usage: taskr show <task_id>

Print one task Markdown file.
`,
    board: `Usage: taskr board [--host host] [--port port] [--open] [--html]

Serve the repo-local Taskr board.

Options:
  --host    Host to bind. Default: 127.0.0.1.
  --port    Port to bind. Default: 4317.
  --open    Open the board URL in the default browser.
  --html    Print the board HTML instead of starting a server.
`,
    validate: `Usage: taskr validate [task_id]

Validate all task files, or a single task when task_id is provided.
`,
    doctor: `Usage: taskr doctor

Check the current repository for Taskr initialization, task files, validation
status, project skill installation clues, and the local Node runtime.
`,
    status: `Usage: taskr status <task_id> <status>

Update a task status.

Statuses: planned, in_progress, implemented, blocked.
`,
    note: `Usage: taskr note <task_id> <note>

Append a note to ## Agent Notes and record the update in ## Progress Log.
`,
    complete: `Usage: taskr complete <task_id> --summary text [options]

Mark a task implemented and update its completion metadata.

Options:
  --summary text           Required completion summary.
  --commit hash            Record a commit. Can be repeated.
  --commit-status status   created, not_created, or not_applicable.
  --file path              Record a related file. Can be repeated.
  --test command           Record a verification command/check. Can be repeated.
  --result result          Verification result summary.
  --check-criteria         Mark acceptance checklist items checked.
`,
  };
  const output = help[command];
  if (output) {
    console.log(output);
  } else {
    console.error(`taskr: Unknown command: ${command}`);
  }
}

function printDoctor(repoRoot: string): number {
  const checks = doctorChecks(repoRoot);
  console.log("Taskr doctor");
  for (const check of checks) {
    console.log(`[${check.level}] ${check.label}: ${check.message}`);
  }
  return checks.some((check) => check.level === "error") ? 1 : 0;
}

function doctorChecks(repoRoot: string): { level: "ok" | "warn" | "error"; label: string; message: string }[] {
  const checks: { level: "ok" | "warn" | "error"; label: string; message: string }[] = [];
  const taskrDir = resolve(repoRoot, ".taskr");
  const tasksDir = resolve(taskrDir, "tasks");
  const schemaPath = resolve(taskrDir, "schema.yaml");
  const configPath = resolve(taskrDir, "config.yaml");

  checks.push({ level: "ok", label: "Repository", message: repoRoot });
  checks.push(nodeCheck());

  if (!existsSync(taskrDir)) {
    checks.push({ level: "error", label: "Protocol", message: ".taskr/ is missing. Run `taskr init`." });
    return checks;
  }

  checks.push({ level: "ok", label: "Protocol", message: ".taskr/ is initialized." });
  checks.push(
    existsSync(configPath) && existsSync(schemaPath)
      ? { level: "ok", label: "Config", message: "config.yaml and schema.yaml are present." }
      : { level: "warn", label: "Config", message: "config.yaml or schema.yaml is missing." },
  );

  if (!existsSync(tasksDir)) {
    checks.push({ level: "error", label: "Tasks", message: ".taskr/tasks/ is missing." });
  } else {
    const taskCount = readdirSync(tasksDir).filter((name) => name.endsWith(".md")).length;
    checks.push({
      level: taskCount > 0 ? "ok" : "warn",
      label: "Tasks",
      message: `${taskCount} Markdown task file${taskCount === 1 ? "" : "s"} found.`,
    });
  }

  const issues = validate(repoRoot);
  checks.push(
    issues.length === 0
      ? { level: "ok", label: "Validation", message: "Task files pass validation." }
      : { level: "error", label: "Validation", message: `${issues.length} issue${issues.length === 1 ? "" : "s"} found.` },
  );

  const skillPaths = [
    [".claude", resolve(repoRoot, ".claude", "skills", "taskr", "SKILL.md")],
    [".codex", resolve(repoRoot, ".codex", "skills", "taskr", "SKILL.md")],
  ] as const;
  const installed = skillPaths.filter(([, path]) => existsSync(path)).map(([label]) => label);
  checks.push({
    level: installed.length > 0 ? "ok" : "warn",
    label: "Skills",
    message:
      installed.length > 0
        ? `Project skill installed for ${installed.join(", ")}.`
        : "No project skill file found under .claude/ or .codex/.",
  });

  return checks;
}

function nodeCheck(): { level: "ok" | "warn" | "error"; label: string; message: string } {
  const major = Number(/^v?(\d+)/.exec(process.version)?.[1] ?? "0");
  return {
    level: major >= 20 ? "ok" : "warn",
    label: "Node",
    message:
      major >= 20
        ? `${process.version} satisfies package engines.`
        : `${process.version} is below the recommended >=20 engine.`,
  };
}

if (isMainModule()) {
  process.exitCode = run();
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  try {
    return pathToFileURL(realpathSync(entry)).href === import.meta.url;
  } catch {
    return false;
  }
}
