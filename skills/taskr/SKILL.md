---
name: taskr
description: Repo-local task tracking workflow for agent implementation work. Use when the user invokes /taskr or asks to track, implement, fix, refactor, investigate, or plan code changes with Taskr in a Git repository; if .taskr exists, use it for substantial code changes.
---

# Taskr

Taskr is a repo-local task protocol stored under `.taskr/`. Use it to keep implementation intent, checklist progress, optional progress notes, verification, and commits in human-readable Markdown.

## Installation Policy

Taskr Skill is distributed independently from the `@xerrors/taskr` npm CLI package. The canonical Skill source lives in this repository at `skills/taskr/SKILL.md` so standalone skill installers can discover it from the repository root.

Use the open skills installer for new installs:

```bash
npx --yes skills add xerrors/taskr-skill --skill taskr --agent claude-code
npx --yes skills add xerrors/taskr-skill --skill taskr --agent codex
npx --yes skills add xerrors/taskr-skill --skill taskr --agent codex --global
```

Project installs are written into the target repository's agent-specific skill directory. Global installs use the selected agent's user-level skill directory. Use `--copy` with the skills installer when a real copied file is preferred over a symlink.

Do not recommend `npx --yes @xerrors/taskr install-skill ...` for new installs. That command is retained only as a deprecated compatibility command that points users to the standalone skills installer.

The Taskr CLI is still distributed through npm. In ordinary target repositories, do not assume the user has installed a global `taskr` binary or added Taskr as a project dependency. Prefer `npx` commands for task operations:

```bash
npx --yes @xerrors/taskr init
npx --yes @xerrors/taskr list
npx --yes @xerrors/taskr board --open
```

If npm cannot infer the scoped package binary for Taskr task operations in a particular shell, use the explicit package form:

```bash
npx --yes --package @xerrors/taskr taskr list
```

Use a bare `taskr ...` command only when the current environment explicitly provides that binary. If `npx` and the CLI are unavailable, edit `.taskr/tasks/<task-id>.md` directly according to the format below.

## Trigger Policy

- If `.taskr/` exists, use Taskr for substantial implementation, fix, refactor, investigation, and planning work in the repo.
- If `.taskr/` does not exist, initialize it only when the user explicitly mentions Taskr or invokes `/taskr`.
- Do not create a task for trivial edits unless the user asks to track them.
- Prefer reusing a matching `planned`, `in_progress`, or `pending_confirmation` task over creating a duplicate.
- Do not use `closed`; Taskr tracks only planned, in-progress, pending-confirmation, implemented, and blocked work.

## Intent And Confirmation Policy

Taskr should add useful friction before code changes, not ceremony everywhere.

- For simple, clear requests, write a concise task card and proceed only when the user has already asked you to implement, fix, refactor, or otherwise do the work.
- For complex, ambiguous, cross-module, product-behavior, release, or visual-design requests, ask at most a few key clarification questions when the answer materially changes the implementation.
- After creating or updating the task card and lightweight plan, stop and ask whether to start implementation unless the user has already given explicit implementation approval in the current request.
- If the user has not clearly approved implementation, do not edit source files. Summarize the recorded request, acceptance criteria, and plan, then wait.
- Keep planning lightweight. A checklist is enough for most tasks; add goals, scope, risks, files, or stop conditions only when they help the user review or edit the plan.
- Do not force a Superpowers-style heavy flow by default: no mandatory brainstorming, no mandatory design document, no default worktree, no skill splitting, and no expanded state machine.

## CLI Policy

Prefer the npm CLI through `npx`; target repositories should not need a global install or a local Taskr dependency:

```bash
npx --yes @xerrors/taskr init
npx --yes @xerrors/taskr new "implement user invitation flow" --status in_progress
npx --yes @xerrors/taskr status 2026-05-10-user-invitation in_progress
npx --yes @xerrors/taskr note 2026-05-10-user-invitation "Found existing workspace role model."
npx --yes @xerrors/taskr complete 2026-05-10-user-invitation --summary "Implemented invitation flow; waiting for user confirmation." --check-criteria
npx --yes @xerrors/taskr validate 2026-05-10-user-invitation
```

If npm cannot infer the scoped package binary, use `npx --yes --package @xerrors/taskr taskr ...` with the same arguments.

If you are working inside the Taskr package source itself and need to validate unpublished local changes, use the repo's documented development command instead. In the TypeScript Taskr package, build first when needed and use `node dist/cli.js ...`.

If `npx` or the CLI is unavailable, edit `.taskr/tasks/<task-id>.md` directly according to the format below.

## Task Workflow

For multi-task requests:

1. List existing planned tasks before editing.
2. Work one task at a time unless the user explicitly asks to batch tasks together.
3. Confirm the user has explicitly approved implementation for the current task before editing source files.
4. Move the current task to `in_progress`, implement it, verify it, and report the result before starting the next task.
5. After implementation and verification, mark the task `pending_confirmation`, not `implemented`.
6. Commit and mark the task `implemented` only when the user has explicitly approved submission/completion, or when the current request already asked you to implement, verify, and submit completed tasks.
7. Keep a short running plan outside Taskr if it helps the user follow long work, but keep durable task state in `.taskr/`.

Before starting substantial work:

1. Check whether `.taskr/` exists.
2. List or inspect existing `planned`, `in_progress`, and `pending_confirmation` tasks, then reuse a matching task when one exists.
3. If Taskr is active and no matching task exists, create one task under `.taskr/tasks/`.
4. Use a lower-kebab-case task id.
5. Prefix new task file ids with the local date, at least `YYYY-MM-DD`, for example `2026-05-10-implement-user-invitation-flow.md`. Keep the date prefix lower-kebab-case compatible and human-readable. Existing task files without a date prefix may remain unchanged.
6. Record the user's original request in `## Request`.
7. Add concrete acceptance criteria and a short implementation plan.
8. If implementation approval is not already explicit, ask whether to start implementation and wait.
9. Set status to `in_progress` before making code changes.

### Language Policy

- Match human-facing task content to the user's language when it does not affect parsing. For Chinese requests, write the request body, checklist text, progress notes, agent notes, and completion summary in Chinese. For English requests, use English.
- Keep parse-sensitive protocol fields stable unless the Taskr parser explicitly supports alternatives: YAML frontmatter keys, status values, commit status values, task ids, and required section headings such as `## Request`, `## Acceptance Criteria`, `## Implementation Plan`, `## Progress Log`, `## Agent Notes`, and `## Completion Summary`.
- If localized section headings are added in the future, update parsing, board rendering, validation, and tests in the same change.

During work:

1. Re-read the task before significant edits.
2. Update checklist items when they become true.
3. Use `## Progress Log` only for long-running work, handoff context, blockers, repeated failed attempts, or notable state changes that are not already obvious from the checklist/status.
4. Use `blocked` when missing context, dependencies, or errors prevent progress.

### Verification Policy

- Match verification to the change. Run unit/build checks for code changes, and add browser or preview validation for visible UI, styling, layout, or interaction changes.
- Record verification with at least the command or check name, the result, and any failure or unable-to-run reason.
- Record the exact commands or manual/browser checks in `verification.tests_run` when possible.
- If a requested style or interaction change is visual, verify at least the default state and the changed interaction state. For responsive UI, also check a narrow viewport when practical.
- If verification cannot be run, record the reason instead of leaving it implicit.

### TDD Policy

- TDD is recommended for bug fixes, behavior changes, parser/protocol logic, and risky shared code.
- TDD is optional for documentation, configuration, research, generated assets, tiny copy changes, and low-risk style polish.
- When strict TDD is impractical, still prefer a focused regression test or a clear verification command before declaring the work complete.

### Review Policy

- For complex, cross-module, public API, release, or user-facing workflow changes, add a light review gate before completion.
- Prefer a reviewer agent when the platform supports one and the user has allowed delegation. Otherwise self-review or ask the user for manual review.
- Review against `## Request`, `## Acceptance Criteria`, `## Implementation Plan`, and recorded verification. Note any gaps in `## Agent Notes` or the final response.

### Commit Policy

- Do not create a git commit without explicit user confirmation. A current user request to implement, verify, and submit completed tasks counts as confirmation.
- Commit after each completed task when the user requests task-by-task commits.
- Use a normal first-line summary. Put the Taskr reference in the commit message footer, for example `Taskr: 2026-05-10-user-invitation`. New commits should use only this `Taskr: <task-id>` footer form.
- Legacy `[taskr:<task-id>]` messages may still be read for older git history, but new commits must not use the bracketed subject-line form.
- After the commit succeeds, record the commit hash in the task metadata and set status to `implemented`; if using the CLI, run `npx --yes @xerrors/taskr complete --commit <hash> ...` to record metadata, then `npx --yes @xerrors/taskr status <task-id> implemented` after user confirmation.
- If `.taskr/` is ignored by Git, still update it locally; the Markdown task files remain the working record even when they are not committed.

After implementation and verification:

1. Set the task to `pending_confirmation` after implementation and verification are done but before user confirmation.
2. Update `## Completion Summary` before or when moving into `pending_confirmation`.
3. Record commits when created and set `commit_status` to `created`, `not_created`, or `not_applicable`.
4. Check acceptance criteria that are satisfied.
5. Record verification commands or checks and result in `verification`.
6. Set status to `implemented` only after the user confirms submission/completion unless the work is blocked.
7. Run `npx --yes @xerrors/taskr validate <task-id>` when possible.

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

`## Progress Log` remains a required section for parser and board compatibility, but its content is optional. Prefer the acceptance and implementation checklists for routine progress; leave the section empty for short tasks unless there is useful handoff context to preserve.

Required statuses:

```text
planned
in_progress
pending_confirmation
implemented
blocked
```

Use `pending_confirmation` for completed agent work that is waiting for user confirmation. Use `implemented` only after the user confirms the work can be submitted or treated as done. Use `blocked` when missing context, dependencies, or errors prevent progress.

Required commit statuses:

```text
created
not_created
not_applicable
```

`pending_confirmation` and `implemented` tasks must have a completion summary, checked acceptance criteria, and an explicit commit status.
