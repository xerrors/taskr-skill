---
schema_version: 1
id: 2026-05-15-package-vscode-extension-on-github-release
title: 在 GitHub Release 中打包 VS Code 插件
status: implemented
created_at: 2026-05-15T11:31:34+08:00
updated_at: 2026-05-15T11:40:20+08:00
branch: null
commits:
  - 93b71c4
commit_status: created
verification:
  tests_run:
    - npm run format:check
    - npm run build
    - npm test
    - npm run package:vscode
    - npm pack --dry-run
  result: passed
  reason: All checks passed; VSIX packaged locally and inspected before removing the generated artifact.
---

# 在 GitHub Release 中打包 VS Code 插件

## Request

用户希望先不发布到 VS Code Marketplace，而是在创建 GitHub Release 时打包 VS Code 插件并作为 Release 产物发布；同时确认扩展基础信息正确，并考虑发布 `0.2.0` 版本。

## Acceptance Criteria

- [x] 根包和 VS Code 扩展包版本同步为 `0.2.0`。
- [x] VS Code 扩展基础元数据包含正确的 publisher id `WENJIEZHANG` 和仓库信息。
- [x] GitHub Release 工作流会构建并打包 `.vsix`。
- [x] GitHub Release 工作流会把 `.vsix` 上传到对应 Release。
- [x] 本地验证至少覆盖构建、测试和 VSIX 打包。

## Implementation Plan

- [x] 检查现有 GitHub Actions 发布流程和扩展 manifest。
- [x] 更新版本号、扩展 publisher 和必要的打包依赖。
- [x] 调整 release workflow，在 release published / manual dispatch 时上传 VSIX asset。
- [x] 运行格式、构建、测试和 VSIX 打包验证。

## Progress Log

- 2026-05-15T11:35:15+08:00: 已完成 CI、版本和 VSIX 打包元数据调整；本地打包产物通过检查后已删除，Release 时由 CI 生成。

## Agent Notes

工作区已有多处未提交改动，本任务会只追加发布配置和版本/元数据相关修改，不回退既有变更。

## Completion Summary

实现已完成并提交。根包和 VS Code 扩展版本已同步到 `0.2.0`；扩展 publisher 已更新为 `WENJIEZHANG`；Release workflow 会生成 `taskr-vscode-${RELEASE_TAG#v}.vsix` 并上传到对应 GitHub Release。验证命令全部通过。
