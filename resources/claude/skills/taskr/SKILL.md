---
name: taskr
description: Repo-local task tracking workflow for Claude Code implementation work. Use when the user invokes /taskr or asks to track, implement, fix, refactor, investigate, or plan code changes with Taskr in a Git repository; if .taskr exists, use it for substantial code changes.
---

# Taskr

Taskr is a repo-local task protocol stored under `.taskr/`. Use it to keep implementation intent, progress, related files, verification, and commits in human-readable Markdown.

## Trigger Policy

- If `.taskr/` exists, use Taskr for substantial implementation, fix, refactor, investigation, and planning work in the repo.
- If `.taskr/` does not exist, initialize it only when the user explicitly mentions Taskr or invokes `/taskr`.
- Do not create a task for trivial edits unless the user asks to track them.
- Do not use `closed`; Taskr tracks only planned, in-progress, implemented, and blocked work.

## CLI Policy

Prefer the `taskr` CLI when available:

```bash
taskr init
taskr new "implement user invitation flow" --status in_progress
taskr status 2026-05-10-user-invitation in_progress
taskr note 2026-05-10-user-invitation "Found existing workspace role model."
taskr complete 2026-05-10-user-invitation --summary "Implemented invitation flow." --file path/to/file.py --check-criteria
taskr validate 2026-05-10-user-invitation
```

If `taskr` is unavailable but this repo contains the Taskr package source, use the repo's documented local command instead. In the TypeScript Taskr package, build first when needed and use `node dist/cli.js ...`.

If the CLI is unavailable, edit `.taskr/tasks/<task-id>.md` directly according to the format below.

## Task Workflow

For multi-task requests:

1. List existing planned tasks before editing.
2. Work one task at a time unless the user explicitly asks to batch tasks together.
3. Move the current task to `in_progress`, implement it, verify it, commit it, and complete the task record before starting the next task.
4. Use a separate commit for each completed task when the user asks for per-task commits.
5. Keep a short running plan outside Taskr if it helps the user follow long work, but keep durable task state in `.taskr/`.

Before starting substantial work:

1. Check whether `.taskr/` exists.
2. If Taskr is active, create or update one task under `.taskr/tasks/`.
3. Use a lower-kebab-case task id.
4. Prefix new task file ids with the local date, at least `YYYY-MM-DD`, for example `2026-05-10-implement-user-invitation-flow.md`. Keep the date prefix lower-kebab-case compatible and human-readable. Existing task files without a date prefix may remain unchanged.
5. Record the user's original request in `## Request`.
6. Add concrete acceptance criteria and a short implementation plan.
7. Set status to `in_progress` before making code changes.

### Language Policy

- Match human-facing task content to the user's language when it does not affect parsing. For Chinese requests, write the request body, checklist text, progress notes, agent notes, and completion summary in Chinese. For English requests, use English.
- Keep parse-sensitive protocol fields stable unless the Taskr parser explicitly supports alternatives: YAML frontmatter keys, status values, commit status values, task ids, and required section headings such as `## Request`, `## Acceptance Criteria`, `## Implementation Plan`, `## Progress Log`, `## Agent Notes`, and `## Completion Summary`.
- If localized section headings are added in the future, update parsing, board rendering, validation, and tests in the same change.

During work:

1. Re-read the task before significant edits.
2. Update checklist items when they become true.
3. Append dated entries to `## Progress Log` after meaningful progress.
4. Add discovered files to `related_files`.
5. Use `blocked` when missing context, dependencies, or errors prevent progress.

### Verification Policy

- Match verification to the change. Run unit/build checks for code changes, and add browser or preview validation for visible UI, styling, layout, or interaction changes.
- Record the exact commands or manual/browser checks in `verification.tests_run`.
- If a requested style or interaction change is visual, verify at least the default state and the changed interaction state. For responsive UI, also check a narrow viewport when practical.
- If verification cannot be run, record the reason instead of leaving it implicit.

### Commit Policy

- Commit after each completed task when the user requests task-by-task commits.
- Include `[taskr:<task-id>]` in the commit message.
- After the commit succeeds, record the commit hash in the task using `taskr complete --commit <hash>` or by editing the task file.
- If `.taskr/` is ignored by Git, still update it locally; the Markdown task files remain the working record even when they are not committed.

After implementation:

1. Update `## Completion Summary`.
2. Record changed files in `related_files`, or add `no_related_files_reason`.
3. Record commits when created and include `[taskr:<task-id>]` in commit messages.
4. Set `commit_status` to `created`, `not_created`, or `not_applicable`.
5. Check acceptance criteria that are satisfied.
6. Record verification commands and result in `verification`.
7. Set status to `implemented` unless the work is blocked.
8. Run `taskr validate <task-id>` when possible.

## Task File Contract

Task files live at `.taskr/tasks/<task-id>.md`. Markdown files are the source of truth.

Required sections:

```md
## Request

## Acceptance Criteria

## Implementation Plan

## Progress Log

## Agent Notes

## Completion Summary
```

Required statuses:

```text
planned
in_progress
implemented
blocked
```

Use `implemented` for completed agent work. Use `blocked` when missing context, dependencies, or errors prevent progress.

Required commit statuses:

```text
created
not_created
not_applicable
```

Implemented tasks must have a completion summary, checked acceptance criteria, an explicit commit status, and either `related_files` or `no_related_files_reason`.
