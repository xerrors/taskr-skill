# Taskr

[![npm package](https://img.shields.io/npm/v/%40xerrors%2Ftaskr?label=npm)](https://www.npmjs.com/package/@xerrors/taskr)
[![npm downloads](https://img.shields.io/npm/dm/%40xerrors%2Ftaskr?label=downloads)](https://www.npmjs.com/package/@xerrors/taskr)
[![Node.js >=20](https://img.shields.io/badge/node-%3E%3D20-339933)](https://nodejs.org/)

[中文说明](README.zh-CN.md)

Taskr is a repo-local task protocol, standalone Skill, and local board for AI-assisted software development.

It gives coding agents a durable way to turn chat requests into tracked Markdown task files inside your repository: request, acceptance criteria, implementation plan, checklist progress, optional notes, verification, commits, and completion summary.

No SaaS. No database. No project-management ceremony. Just `.taskr/`.

## What Taskr Gives You

- A standalone Claude or Codex Skill that teaches the agent when and how to track work.
- Human-readable task files under `.taskr/tasks/*.md`.
- A small workflow built for agent collaboration: `planned`, `in_progress`, `pending_confirmation`, `implemented`, `blocked`.
- A local board for scanning tasks, switching between table and Kanban views, reviewing commit context, and editing task sections.
- An npm-distributed CLI for Taskr protocol commands and the local board.

## Quick Start

Install the Skill once with the standalone skills installer, then ask your agent to use Taskr when you want tracked implementation work.

For Claude Code across your projects:

```bash
npx --yes skills add xerrors/taskr-skill --skill taskr --agent claude-code --global
```

For Codex across your projects:

```bash
npx --yes skills add xerrors/taskr-skill --skill taskr --agent codex --global
```

For a project-local install, run the same command without `--global` from the repository:

```bash
npx --yes skills add xerrors/taskr-skill --skill taskr --agent claude-code
npx --yes skills add xerrors/taskr-skill --skill taskr --agent codex
```

Then ask your agent for tracked work:

```text
/taskr implement user invitation flow
```

The Skill will initialize `.taskr/` the first time Taskr is used in a repository. It uses the `@xerrors/taskr` CLI for task files, validation, and the board; the CLI package is not the Skill installer.

## Agent Workflow

Taskr is designed for the moment when a chat request becomes real repository work.

1. You ask the agent to implement, fix, refactor, investigate, or plan something with Taskr.
2. The agent records the request, acceptance criteria, and a short plan in `.taskr/tasks/`.
3. The agent keeps the task file updated while it works.
4. When implementation and verification are done, the task moves to `pending_confirmation`.
5. After you confirm the result, the task can be marked `implemented` and linked to the commit.

Because the task is plain Markdown, it remains useful in Git history, code review, handoff, and future agent sessions.

## Board

Open a local board for the current repository:

```bash
npx --yes @xerrors/taskr board --open
```

The board reads `.taskr/tasks/*.md` directly. It supports automatic local-file refresh, search, table and Kanban views, default sorting by acceptance progress with updated time as the tie-breaker, optional sorting by created or updated time, status summaries, commit and file diff context, manual refresh, section editing, lightweight Markdown rendering, and confirmed task deletion.

### VS Code Sidebar

This repository also includes a local VS Code extension prototype under `vscode-extension/`. It reuses the same board model in a sidebar webview, watches `.taskr/tasks/*.md`, refreshes from VS Code, and can open a task Markdown file from the detail drawer.

Run it locally:

```bash
npm run build
code --extensionDevelopmentPath="$PWD/vscode-extension" "$PWD"
```

### Table View

![Taskr table view](docs/assets/taskr-table-view.png)

### Kanban View

![Taskr Kanban view](docs/assets/taskr-kanban-view.png)

### Task Detail Drawer

<p>
  <img src="docs/assets/taskr-detail-overview.png" alt="Taskr detail drawer showing status, commit, and request context" width="49%">
  <img src="docs/assets/taskr-detail-request-plan.png" alt="Taskr detail drawer showing request, acceptance criteria, and implementation plan" width="49%">
</p>

## CLI

Use the CLI directly when you want to initialize Taskr, create tasks yourself, inspect local state, or script repository checks:

```bash
npx --yes @xerrors/taskr init
npx --yes @xerrors/taskr new "implement user invitation flow" --status in_progress
npx --yes @xerrors/taskr list -n 10
npx --yes @xerrors/taskr research 2026-05-10-topic overview.md
npx --yes @xerrors/taskr doctor
npx --yes @xerrors/taskr validate
```

`taskr list` prints tasks in stable status order and shows 10 tasks by default. Pass `-n N` to change the count, or `--status planned` to filter.

Get help for any command:

```bash
npx --yes @xerrors/taskr --help
npx --yes @xerrors/taskr new --help
npx --yes @xerrors/taskr complete --help
```

The npm package is [`@xerrors/taskr`](https://www.npmjs.com/package/@xerrors/taskr) and exposes a `taskr` binary.

## Doctor

`taskr doctor` checks whether the current repository is ready for Taskr:

- `.taskr/` initialization.
- Task directory presence.
- Task Markdown validation.
- Project-level Claude/Codex Skill installation clues.
- Local Node runtime compatibility.

When setup feels off, start here:

```bash
npx --yes @xerrors/taskr doctor
```

## What Gets Created

```text
.taskr/
├── research/
│   └── 2026-05-10-topic/
│       └── overview.md
├── templates/
│   └── task.md
└── tasks/
    └── 2026-05-10-implement-user-invitation-flow.md
```

`taskr` treats `.taskr/tasks/*.md` as the source of truth. The board reads task Markdown files directly and does not require an index cache.

Research report files are opt-in. Create them only when a task needs a longer report:

```bash
npx --yes @xerrors/taskr research 2026-05-10-topic overview.md
```

The CLI writes `.taskr/research/<task-id>/<file>.md` and records that path in the task frontmatter as `research_files`. A task can reference multiple report files.

The Taskr Skill source lives in this repository at `skills/taskr/SKILL.md`. Install it with `npx --yes skills add xerrors/taskr-skill --skill taskr ...`; the installer handles the destination for each agent. `taskr install-skill <target>` is now a deprecated compatibility command that prints migration guidance instead of being the primary install path.

New task ids generated by `taskr new` are prefixed with the local date, such as `2026-05-10-implement-user-invitation-flow`, so `.taskr/tasks/` remains easy to scan from the filesystem. Explicit `--id` values are preserved as long as they use lower-kebab-case.

## Task States

```text
planned
in_progress
pending_confirmation
implemented
blocked
```

`pending_confirmation` means an agent completed implementation and verification and is waiting for the user to confirm submission or completion. `implemented` means the user has confirmed that the task can be treated as done.

The board keeps `in_progress` and `pending_confirmation` in one visual column while preserving their separate task statuses. Legacy `closed` task files are treated as completed in the board view, but `closed` is no longer a valid protocol status.

## Local Development

Inside this repository:

```bash
npm install
npm run build
node dist/cli.js init
node dist/cli.js board
node dist/cli.js validate
```

Run the full project check:

```bash
npm run check
```

## Commit Convention

When creating commits for a task, keep the first line as a normal summary and put the Taskr reference in the footer. New commits should use only this form:

```text
Taskr: <task-id>
```

Taskr still recognizes legacy `[taskr:<task-id>]` references when reading older git history, but new commits should not use the bracketed subject-line form.

Example:

```text
feat(invitation): add invitation creation flow

Taskr: 2026-05-10-user-invitation
```
