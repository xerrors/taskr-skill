# Taskr

Taskr is a repo-local task protocol for AI-assisted software development.

It lets coding agents create, track, update, and summarize implementation tasks inside your existing Git repository.

No SaaS. No database. No project management ceremony. Just `.taskr/`.

## Usage

### While Developing Taskr

Inside this repository, install dependencies and run the TypeScript CLI:

```bash
npm install
npm run build
node dist/cli.js init
node dist/cli.js install-skill claude
node dist/cli.js new "implement user invitation flow" --status in_progress
node dist/cli.js list
node dist/cli.js validate
```

Run checks with:

```bash
npm run check
```

### Try Taskr in Another Project Locally

Build a local npm package tarball from this repository:

```bash
cd /path/to/taskr
npm pack
```

Then use that package from any other Git repository:

```bash
cd /path/to/your-project
npx --package /path/to/taskr/xerrors-taskr-0.1.0.tgz taskr init
npx --package /path/to/taskr/xerrors-taskr-0.1.0.tgz taskr install-skill claude
npx --package /path/to/taskr/xerrors-taskr-0.1.0.tgz taskr new "implement user invitation flow" --status in_progress
npx --package /path/to/taskr/xerrors-taskr-0.1.0.tgz taskr list
npx --package /path/to/taskr/xerrors-taskr-0.1.0.tgz taskr validate
```

This is the recommended way to test Taskr in a real project before publishing it. The target project does not need to add Taskr as a dependency; `npx` executes the package in a temporary npm environment.

### After Publishing

Once Taskr is published as `@xerrors/taskr`, the same workflow becomes:

```bash
npx @xerrors/taskr init
npx @xerrors/taskr install-skill claude
npx @xerrors/taskr new "implement user invitation flow" --status in_progress
npx @xerrors/taskr list
npx @xerrors/taskr validate
```

The npm package is scoped to the `xerrors` npm account and exposes a `taskr` binary.

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
