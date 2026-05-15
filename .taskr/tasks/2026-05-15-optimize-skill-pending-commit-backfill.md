---
schema_version: 1
id: 2026-05-15-optimize-skill-pending-commit-backfill
title: 优化 Skill 待确认任务提交回填说明
status: implemented
created_at: 2026-05-15T17:41:02+08:00
updated_at: 2026-05-15T18:32:10+08:00
branch: null
commits:
  - a3ca5b9
commit_status: created
verification:
  tests_run:
    - npm test -- --run tests/skill.test.ts
    - node dist/cli.js validate 2026-05-15-optimize-skill-pending-commit-backfill
    - node dist/cli.js validate 2026-05-15-add-vscode-detail-actions-menu
  result: passed
  reason: 聚焦 Skill 测试通过；新增任务和被回填的待确认任务均通过 Taskr 校验。
---

# 优化 Skill 待确认任务提交回填说明

## Request

用户要求优化 Taskr Skill 的描述：任务完成之后，需要检查当前待确认的任务，因为其中可能有些已经被提交；应结合 git diff 回填部分 commit id。

## Acceptance Criteria

- [x] Skill frontmatter description 更明确覆盖完成后同步待确认任务提交信息的场景。
- [x] Skill 工作流说明要求完成后检查 `pending_confirmation` 任务，并结合 git 状态和提交历史回填 commit id。
- [x] 说明避免把无关提交或当前未提交 diff 错误归属到任务。
- [x] 相关测试覆盖新增 Skill 文案约束。

## Implementation Plan

- [x] 检查 Skill 源文件、现有测试和任务记录。
- [x] 更新 `skills/taskr/SKILL.md` 的描述和完成后流程。
- [x] 更新 Skill 测试，验证关键说明存在。
- [x] 运行聚焦测试。

## Progress Log

- 2026-05-15 17:43 +08:00 - 已根据 git 状态回填待确认任务 `2026-05-15-add-vscode-detail-actions-menu` 的 commit id `50e03b6`。
- 2026-05-15 18:32 +08:00 - 用户确认提交后，已将本任务标记为 implemented，并记录 Skill 更新提交 `a3ca5b9`。

## Agent Notes

- 保留已有 `.taskr/tasks/2026-05-15-package-vscode-extension-on-github-release.md` 的未提交改动；该改动看起来是现有任务的 commit id 回填。
- `2026-05-15-add-vscode-detail-actions-menu` 与 `50e03b6` 的提交主题和变更文件范围明确匹配，且当前 diff 中没有对应源码改动残留，因此只回填 commit metadata，不改变其 `pending_confirmation` 状态。

## Completion Summary

已优化 Taskr Skill 的 frontmatter description 和完成后流程：完成实现和验证后，需要检查当前 `pending_confirmation` 任务与 Git 状态，用 `.taskr/tasks` 的 diff 区分 metadata 回填和源码变更，并在提交引用或变更文件明确匹配时回填 commit id；证据不足时保持 `commit_status: not_created`。已新增 Skill 回归测试覆盖该要求，并将待确认任务 `2026-05-15-add-vscode-detail-actions-menu` 回填到 commit `50e03b6`。
