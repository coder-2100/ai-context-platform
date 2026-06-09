# @coder-2100/cli

## 0.2.0-beta.6

### Patch Changes

- 修复 remove 指令 bug

## 0.2.0-beta.5

### Minor Changes

- 修复 build 指令分发功能逻辑

## 0.2.0-beta.4

### Minor Changes

- 将包缓存从项目级 `.ai/cache/` 迁移到全局 `~/.ai-context/cache/`，新增 `ai-context clean` 命令用于清理（支持 `--packages` / `--manifests` / `--dry-run`）。`init` 不再创建 `.ai/cache` 目录；已有项目的旧目录不会被自动迁移，可手动删除。
- 缓存机制重构，缓存目录迁移至全局复用

## 0.2.0-beta.3

### Minor Changes

- 新增安装远程资源包能力

### Patch Changes

- Updated dependencies
  - @coder-2100/schema@0.2.0-beta.3

## 0.2.0-beta.2

### Minor Changes

- 调整 cli 部分不合适的逻辑；资源包常规更新

### Patch Changes

- Updated dependencies
  - @coder-2100/schema@0.2.0-beta.2

## 0.1.1-beta.0

### Patch Changes

- 发布测试
- Updated dependencies
  - @coder-2100/schema@0.1.1-beta.0
