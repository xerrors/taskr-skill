# Taskr

Taskr is a Claude Code Skill and repo-local task protocol for AI-assisted software development.

It lets coding agents create, track, update, and summarize implementation tasks inside your existing Git repository.

No SaaS. No database. No project management ceremony. Just `.taskr/`.

## Usage

### While Developing Taskr

Inside this repository, run the CLI through `uv`:

```bash
uv run taskr init
uv run taskr install-skill claude
uv run taskr new "implement user invitation flow" --status in_progress
uv run taskr list
uv run taskr validate
```

### Try Taskr in Another Project with a Local Wheel

Build a wheel from this repository:

```bash
cd /path/to/taskr
uv build
```

Then use that wheel from any other Git repository:

```bash
cd /path/to/your-project
uvx --from /path/to/taskr/dist/taskr-0.1.0-py3-none-any.whl taskr init
uvx --from /path/to/taskr/dist/taskr-0.1.0-py3-none-any.whl taskr install-skill claude
uvx --from /path/to/taskr/dist/taskr-0.1.0-py3-none-any.whl taskr new "implement user invitation flow" --status in_progress
uvx --from /path/to/taskr/dist/taskr-0.1.0-py3-none-any.whl taskr list
uvx --from /path/to/taskr/dist/taskr-0.1.0-py3-none-any.whl taskr validate
```

This is the recommended way to test Taskr in a real project before publishing it. The target project does not need to add Taskr as a dependency; `uvx` creates an isolated temporary tool environment from the wheel.

### After Publishing

Once Taskr is published as a package, the same workflow becomes:

```bash
uvx taskr init
uvx taskr install-skill claude
uvx taskr new "implement user invitation flow" --status in_progress
uvx taskr list
uvx taskr validate
```

## What Gets Created

```text
.taskr/
├── config.yaml
├── schema.yaml
├── templates/
│   └── task.md
├── tasks/
│   └── implement-user-invitation-flow.md
└── index.json

.claude/
└── skills/
    └── taskr/
        └── SKILL.md
```

`taskr` treats `.taskr/tasks/*.md` as the source of truth. `index.json` is only a cache placeholder.

## Task States

```text
planned
in_progress
blocked
implemented
closed
```

`implemented` means an agent completed a round of implementation. It does not imply the change has been reviewed, merged, deployed, or even fully tested.

## Commit Convention

When creating commits for a task, include:

```text
[taskr:<task-id>]
```

Example:

```text
feat(invitation): add invitation creation flow [taskr:user-invitation]
```
