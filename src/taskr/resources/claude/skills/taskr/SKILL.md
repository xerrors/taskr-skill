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
- Do not mark a task `closed` unless the user explicitly confirms.

## CLI Policy

Prefer the `taskr` CLI when available:

```bash
taskr init
taskr new "implement user invitation flow" --status in_progress
taskr status user-invitation in_progress
taskr note user-invitation "Found existing workspace role model."
taskr complete user-invitation --summary "Implemented invitation flow." --file path/to/file.py --check-criteria
taskr validate user-invitation
```

If `taskr` is unavailable but this repo contains the Taskr package, use `uv run taskr ...`.

If the CLI is unavailable, edit `.taskr/tasks/<task-id>.md` directly according to the format below.

## Task Workflow

Before starting substantial work:

1. Check whether `.taskr/` exists.
2. If Taskr is active, create or update one task under `.taskr/tasks/`.
3. Use a lower-kebab-case task id.
4. Record the user's original request in `## Request`.
5. Add concrete acceptance criteria and a short implementation plan.
6. Set status to `in_progress` before making code changes.

During work:

1. Re-read the task before significant edits.
2. Update checklist items when they become true.
3. Append dated entries to `## Progress Log` after meaningful progress.
4. Add discovered files to `related_files`.
5. Use `blocked` when missing context, dependencies, or errors prevent progress.

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
blocked
implemented
closed
```

Use `implemented` for completed agent work. Reserve `closed` for user confirmation, merge, or explicit abandonment.

Required commit statuses:

```text
created
not_created
not_applicable
```

Implemented tasks must have a completion summary, checked acceptance criteria, an explicit commit status, and either `related_files` or `no_related_files_reason`.
