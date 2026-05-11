# Taskr

[![npm package](https://img.shields.io/npm/v/%40xerrors%2Ftaskr?label=npm)](https://www.npmjs.com/package/@xerrors/taskr)
[![npm downloads](https://img.shields.io/npm/dm/%40xerrors%2Ftaskr?label=downloads)](https://www.npmjs.com/package/@xerrors/taskr)
[![Node.js >=20](https://img.shields.io/badge/node-%3E%3D20-339933)](https://nodejs.org/)

[English README](README.md)

Taskr 是一个面向 AI 辅助开发的仓库本地任务协议、独立 Skill 和本地看板。

它让编码智能体把聊天里的需求转成仓库里的持久 Markdown 任务文件：需求、验收标准、实现计划、清单进度、可选备注、验证记录、相关文件、提交和完成总结都留在同一个地方。

没有 SaaS。没有数据库。没有项目管理仪式。只有 `.taskr/`。

## Taskr 提供什么

- 一份独立的 Claude 或 Codex Skill，让智能体知道什么时候、用什么方式跟踪工作。
- 存放在 `.taskr/tasks/*.md` 下的人类可读任务文件。
- 一套适合智能体协作的小工作流：`planned`、`in_progress`、`pending_confirmation`、`implemented`、`blocked`。
- 一个本地看板，用来浏览任务、切换表格和 Kanban、查看提交上下文、编辑任务小节。
- 通过 npm 分发的 CLI，用于 Taskr 协议命令和本地看板。

## 快速开始

先用独立的 skills 安装器安装一次 Skill，然后在需要跟踪实现工作时让智能体使用 Taskr。

安装到 Claude Code 的用户级目录：

```bash
npx --yes skills add xerrors/taskr --skill taskr --agent claude-code --global
```

安装到 Codex 的用户级目录：

```bash
npx --yes skills add xerrors/taskr --skill taskr --agent codex --global
```

如果只想安装到当前仓库，在仓库目录中运行不带 `--global` 的命令：

```bash
npx --yes skills add xerrors/taskr --skill taskr --agent claude-code
npx --yes skills add xerrors/taskr --skill taskr --agent codex
```

之后可以这样让智能体开始跟踪任务：

```text
/taskr implement user invitation flow
```

第一次在仓库中使用 Taskr 时，Skill 会引导智能体初始化 `.taskr/`。Skill 会使用 `@xerrors/taskr` CLI 管理任务文件、验证和看板；CLI 包本身不再作为 Skill 安装器。

## 智能体工作流

Taskr 适合在聊天需求变成真实仓库工作时使用。

1. 你让智能体用 Taskr 实现、修复、重构、调研或规划某件事。
2. 智能体在 `.taskr/tasks/` 中记录需求、验收标准和简短计划。
3. 智能体在工作过程中持续更新任务文件。
4. 实现和验证完成后，任务进入 `pending_confirmation`。
5. 你确认结果后，任务可以标记为 `implemented`，并关联到对应提交。

因为任务就是普通 Markdown，它会在 Git 历史、代码评审、交接和之后的智能体会话中继续有用。

## 看板

为当前仓库打开本地看板：

```bash
npx --yes @xerrors/taskr board --open
```

看板直接读取 `.taskr/tasks/*.md`。它支持本地文件自动刷新、搜索、表格和 Kanban 视图、按创建或更新时间排序、状态统计、提交和文件 diff 上下文、手动刷新、任务小节编辑、轻量 Markdown 渲染，以及需要确认的任务删除。

### 表格视图

![Taskr 表格视图](docs/assets/taskr-table-view.png)

### Kanban 视图

![Taskr Kanban 视图](docs/assets/taskr-kanban-view.png)

### 任务详情抽屉

<p>
  <img src="docs/assets/taskr-detail-overview.png" alt="Taskr 详情抽屉，展示状态、提交和需求上下文" width="49%">
  <img src="docs/assets/taskr-detail-request-plan.png" alt="Taskr 详情抽屉，展示需求、验收标准和实现计划" width="49%">
</p>

## CLI

当你想手动初始化 Taskr、创建任务、检查本地状态或写脚本时，可以直接使用 CLI：

```bash
npx --yes @xerrors/taskr init
npx --yes @xerrors/taskr new "implement user invitation flow" --status in_progress
npx --yes @xerrors/taskr list
npx --yes @xerrors/taskr doctor
npx --yes @xerrors/taskr validate
```

查看任意命令的帮助：

```bash
npx --yes @xerrors/taskr --help
npx --yes @xerrors/taskr new --help
npx --yes @xerrors/taskr complete --help
```

npm 包是 [`@xerrors/taskr`](https://www.npmjs.com/package/@xerrors/taskr)，并提供 `taskr` 可执行命令。

## Doctor 检查

`taskr doctor` 会检查当前仓库是否已经准备好使用 Taskr：

- `.taskr/` 是否已经初始化。
- 任务目录是否存在。
- 任务 Markdown 是否通过协议验证。
- 是否存在项目级 Claude/Codex Skill 安装线索。
- 本地 Node 版本是否满足要求。

当设置看起来不对时，先运行它：

```bash
npx --yes @xerrors/taskr doctor
```

## 会创建哪些文件

```text
.taskr/
├── templates/
│   └── task.md
└── tasks/
    └── 2026-05-10-implement-user-invitation-flow.md
```

`taskr` 把 `.taskr/tasks/*.md` 视为唯一事实来源。看板直接读取任务 Markdown 文件，不需要 index 缓存。

Taskr Skill 源文件位于本仓库的 `skills/taskr/SKILL.md`。请用 `npx --yes skills add xerrors/taskr --skill taskr ...` 安装，具体目标目录由安装器根据智能体平台处理。`taskr install-skill <target>` 现在只是弃用的兼容命令，会打印迁移提示，不再作为主要安装路径。

`taskr new` 生成的新任务 id 会带本地日期前缀，例如 `2026-05-10-implement-user-invitation-flow`，方便直接浏览 `.taskr/tasks/`。显式传入的 `--id` 会保留，只要它符合 lower-kebab-case。

## 任务状态

```text
planned
in_progress
pending_confirmation
implemented
blocked
```

`pending_confirmation` 表示智能体已经完成实现和验证，正在等待用户确认提交或完成。`implemented` 表示用户已经确认该任务可以视为完成。

看板会把 `in_progress` 和 `pending_confirmation` 放在同一个可视化列中，但保留它们各自的任务状态。旧的 `closed` 任务文件会在看板中视为已完成，但 `closed` 不再是有效协议状态。

## 本地开发

在本仓库中：

```bash
npm install
npm run build
node dist/cli.js init
node dist/cli.js board
node dist/cli.js validate
```

运行完整检查：

```bash
npm run check
```

## 提交约定

为任务创建提交时，第一行保持正常摘要，把 Taskr 引用放在提交信息底部：

```text
Taskr: <task-id>
```

示例：

```text
feat(invitation): add invitation creation flow

Taskr: 2026-05-10-user-invitation
```
