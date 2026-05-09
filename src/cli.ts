#!/usr/bin/env node
import { readFileSync, realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import {
  addNote,
  completeTask,
  createTask,
  findRepoRoot,
  initProtocol,
  installClaudeSkill,
  listTasks,
  loadTaskById,
  relative,
  setStatus,
  TaskrError,
  taskId,
  taskStatus,
  taskTitle,
  validate,
  VALID_COMMIT_STATUSES,
  VALID_STATUSES
} from "./protocol.js";

const VERSION = "0.1.0";

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

  if (argv[0] === "--version" || argv[0] === "-V") {
    console.log(`taskr ${VERSION}`);
    return 0;
  }

  const command = argv[0];
  const repoRoot = findRepoRoot();

  try {
    if (command === "init") {
      const parsed = parseArgs(argv.slice(1), {
        force: {}
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
        force: {}
      });
      const target = requiredPositional(parsed, 0, "target");
      requireChoices(target, ["claude"], "target");
      requirePositionalCount(parsed, 1);
      const scope = parsed.values.scope ?? "project";
      requireChoices(scope, ["project", "user"], "scope");
      const installed = installClaudeSkill(repoRoot, {
        scope: scope as "project" | "user",
        force: parsed.flags.has("force")
      });
      console.log(`installed ${scope === "project" ? relative(installed, repoRoot) : installed}`);
      return 0;
    }

    if (command === "new") {
      const parsed = parseArgs(argv.slice(1), {
        id: { takesValue: true },
        status: { takesValue: true },
        request: { takesValue: true }
      });
      const title = requiredPositional(parsed, 0, "title");
      requirePositionalCount(parsed, 1);
      const status = parsed.values.status ?? "planned";
      requireChoices(status, [...VALID_STATUSES], "status");
      const path = createTask(repoRoot, title, {
        taskId: parsed.values.id,
        status: status as (typeof VALID_STATUSES)[number],
        request: parsed.values.request
      });
      console.log(`created ${relative(path, repoRoot)}`);
      return 0;
    }

    if (command === "list") {
      const parsed = parseArgs(argv.slice(1), {
        status: { takesValue: true }
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
          `${taskId(task).padEnd(width)}  ${taskStatus(task).padEnd(11)}  ${taskTitle(task)}`
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
        "check-criteria": {}
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
        checkCriteria: parsed.flags.has("check-criteria")
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
    flags: new Set()
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

function readTaskFile(path: string): string {
  return readFileSync(path, "utf8");
}

function printHelp(): void {
  console.log(`Usage: taskr <command> [options]

Repo-local task protocol for AI-assisted software development.

Commands:
  init                         Initialize .taskr/ in this repo.
  install-skill claude         Install a Taskr agent skill.
  new <title>                  Create a task file.
  list                         List tasks.
  show <task_id>               Print a task file.
  validate [task_id]           Validate Taskr task files.
  status <task_id> <status>    Update a task status.
  note <task_id> <note>        Append an agent note to a task.
  complete <task_id>           Mark a task implemented.
`);
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
