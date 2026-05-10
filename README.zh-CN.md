# Taskr

[English README](README.md)

Taskr 是一个面向 AI 辅助开发的仓库本地任务协议。

它让编码智能体把每个任务的需求、验收标准、计划、进度、验证、相关文件和完成总结记录到持久的 Markdown 文件里。所有内容都留在你的 Git 仓库中。

没有 SaaS。没有数据库。没有项目管理仪式。只有 `.taskr/`。

## 为什么使用 Taskr

- 把智能体工作绑定到明确的任务文件，而不是只依赖聊天上下文。
- Claude 和 Codex 使用同一份共享 Skill。
- 保持很小的五状态模型：`planned`、`in_progress`、`pending_confirmation`、`implemented`、`blocked`。
- 提供本地看板，用于浏览任务、查看提交、编辑任务小节。
- 通过 npm CLI 分发，一条 `npx` 命令即可使用。

## 安装 Skill

日常使用时，先安装一次 Taskr Skill，然后让你的智能体使用 Taskr。安装器会创建对应的 skill 目录。

安装到 Claude Code 的用户级目录：

```bash
npx @xerrors/taskr install-skill claude --scope user
```

也可以只安装到当前仓库：

```bash
npx @xerrors/taskr install-skill claude
```

Codex 使用同样的方式：

```bash
npx @xerrors/taskr install-skill codex --scope user
```

安装后，可以在智能体中这样触发：

```text
/taskr implement user invitation flow
```

当第一次在仓库中使用 Taskr 跟踪工作时，Skill 会引导智能体初始化 `.taskr/`。

## CLI 快速开始

当你需要脚本化、排查安装问题或手动管理任务文件时，可以直接使用 CLI：

```bash
npx @xerrors/taskr init
npx @xerrors/taskr new "implement user invitation flow" --status in_progress
npx @xerrors/taskr list
npx @xerrors/taskr doctor
npx @xerrors/taskr board
npx @xerrors/taskr validate
```

查看帮助：

```bash
npx @xerrors/taskr --help
npx @xerrors/taskr new --help
npx @xerrors/taskr complete --help
```

npm 包位于 `xerrors` 作用域，并提供 `taskr` 可执行命令。

## Doctor 检查

`taskr doctor` 会检查当前仓库：

- `.taskr/` 是否已经初始化。
- config、schema 和任务目录是否存在。
- 任务 Markdown 是否通过协议验证。
- 是否存在项目级 Claude/Codex skill 安装线索。
- 本地 Node 版本是否满足要求。

当设置看起来不对时，先运行它：

```bash
npx @xerrors/taskr doctor
```

## Board 看板

使用 `taskr board` 为 `.taskr/tasks/*.md` 启动本地任务看板：

```bash
npx @xerrors/taskr board --open
```

看板默认以表格视图打开，便于快速扫描；也可以切换到按状态分组的 Kanban 视图。点击任务后会展开详情抽屉，展示提交状态、文件级 diff 统计，支持手动刷新，能在任务小节中渲染轻量 Markdown，并可以把编辑内容写回原始任务文件。

## 会创建哪些文件

```text
.taskr/
├── config.yaml
├── schema.yaml
├── templates/
│   └── task.md
└── tasks/
    └── 2026-05-10-implement-user-invitation-flow.md

.claude/
└── skills/
    └── taskr/
        └── SKILL.md

.codex/
└── skills/
    └── taskr/
        └── SKILL.md
```

`taskr` 把 `.taskr/tasks/*.md` 视为唯一事实来源。看板直接读取任务 Markdown 文件，不需要 index 缓存。

`taskr install-skill <target>` 会为不同智能体平台安装同一份 Taskr Skill。项目级安装时，Claude 使用 `.claude/skills/taskr/SKILL.md`，Codex 使用 `.codex/skills/taskr/SKILL.md`。用户级安装时，Claude 使用 `~/.claude/skills/taskr/SKILL.md`；Codex 优先使用 `$CODEX_HOME/skills/taskr/SKILL.md`，否则使用 `~/.codex/skills/taskr/SKILL.md`。

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

在本仓库中安装依赖并运行 TypeScript CLI：

```bash
npm install
npm run build
node dist/cli.js install-skill claude
node dist/cli.js install-skill codex
node dist/cli.js init
node dist/cli.js new "implement user invitation flow" --status in_progress
node dist/cli.js list
node dist/cli.js doctor
node dist/cli.js board
node dist/cli.js validate
```

运行检查：

```bash
npm run check
```

构建本地 npm tarball：

```bash
npm pack
```

然后在另一个 Git 仓库中使用：

```bash
cd /path/to/your-project
npx --package /path/to/taskr/xerrors-taskr-0.1.2.tgz taskr install-skill claude
npx --package /path/to/taskr/xerrors-taskr-0.1.2.tgz taskr init
npx --package /path/to/taskr/xerrors-taskr-0.1.2.tgz taskr new "implement user invitation flow" --status in_progress
npx --package /path/to/taskr/xerrors-taskr-0.1.2.tgz taskr doctor
```

目标项目不需要把 Taskr 加为依赖；`npx` 会在临时 npm 环境中运行这个包。

## 发布到 npm

当 GitHub Release 发布时，`.github/workflows/publish.yml` 会自动发布 npm 包。

第一次自动发布前，需要为 `@xerrors/taskr` 配置 npm Trusted Publishing：

- Publisher: GitHub Actions
- Owner: `xerrors`
- Repository: `taskr`
- Workflow filename: `publish.yml`
- Environment name: 如果 workflow 之后没有改为使用 environment，则留空

workflow 使用 npm 基于 OIDC 的 Trusted Publishing，不需要 `NPM_TOKEN` secret。配置完成后，只要有权限向 GitHub 仓库推送，就可以通过推送匹配版本的 tag 并发布 GitHub Release 来触发 npm 发布。

发布新版本：

```bash
npm version <version> --no-git-tag-version
npm run check
git add package.json package-lock.json README.md README.zh-CN.md .github/workflows/publish.yml
git commit -m "chore(release): prepare v<version>"
git tag v<version>
git push origin main
git push origin v<version>
gh release create v<version> --verify-tag --title "v<version>" --notes ""
```

Release tag 必须匹配 `package.json`，例如 `v0.1.2` 发布 `0.1.2`。如果发布失败且 npm 尚未接受该版本，修复问题后可以用同一个 tag 重新发布 GitHub Release；如果 npm 已经接受版本，则需要准备并发布新的 patch 版本，因为 npm 包版本不可变。

## 提交约定

为任务创建提交时，第一行保持正常摘要，把 Taskr 引用放在提交信息底部：

```text
Taskr: <task-id>
```

示例：

```text
feat(invitation): add invitation creation flow

Taskr: user-invitation
```
