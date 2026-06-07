# AI Context Platform

企业级 AI Coding 知识管理与运行时系统，为 AI 辅助编码提供上下文管理、知识索引与运行时支持。

## 技术栈

- **包管理**: pnpm (monorepo)
- **语言**: TypeScript
- **文档**: VitePress
- **校验**: Zod
- **代码检查**: Biome

## 项目结构

```
ai-context-platform/
├── docs/            # VitePress 文档站点
├── packages/
│   └── schema/      # 核心 Schema 定义
├── schemas/         # JSON Schema 输出
├── scripts/         # 工具脚本
└── pnpm-workspace.yaml
```

## 快速开始

```bash
# 安装依赖
pnpm install

# 构建所有子包
pnpm build

# 启动文档开发服务器
pnpm docs:dev

# 构建文档站点
pnpm docs:build
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm build` | 构建所有子包 |
| `pnpm test` | 运行所有子包测试 |
| `pnpm lint` | 代码检查 |
| `pnpm lint:fix` | 代码检查并自动修复 |
| `pnpm docs:dev` | 启动文档开发服务器 |
| `pnpm docs:build` | 构建文档站点 |
| `pnpm validate` | 校验 Manifest 清单 |
| `pnpm generate:schema` | 生成 JSON Schema |
| `pnpm sync-versions` | 同步依赖版本 |

## 发布流程

本项目使用 [Changesets](https://github.com/changesets/changesets) 管理版本和发布。

### 日常开发：记录变更意图

完成一个 feature 或 fix 后，创建 changeset：

```bash
pnpm changeset
```

交互式选择：
1. 哪些包受影响（多选）
2. 版本 bump 类型（patch / minor / major）
3. 变更描述（写入 changelog）

### 发布流程

```bash
# 1. 消费 changeset → bump 版本 + 生成 changelog + 同步 manifest.yaml
pnpm bump

# 2. 提交版本变更
git add .
git commit -m "chore: version packages"

# 3. 构建 + 测试 + 发布 + 创建 tag
pnpm release

# 4. 推送
git push --follow-tags
```

### 紧急 hotfix

不需要 changeset 文件，直接手动修改版本号：

```bash
# 1. 手动修改 package.json 版本
# 2. 同步 manifest.yaml
tsx scripts/sync-manifest-versions.ts
# 3. 提交 + tag + 推送
git commit -am "chore: release @coder-2100/xxx@x.x.x"
git tag @coder-2100/xxx@x.x.x
git push --follow-tags
```

### 预发布版本（alpha/beta）

```bash
pnpm changeset pre enter alpha
pnpm changeset    # 选择 minor → 生成 x.x.x-alpha.0
pnpm bump
pnpm release

# 退出 pre-release 模式
pnpm changeset pre exit
```

### CI 自动发布

当 tag 格式为 `@coder-2100/*@*` 的 tag 被推送到 GitHub 后，CI 自动构建并发布到 GitHub Packages。

## CLI 全局缓存

`@coder-2100/cli` 将 npm 包和清单缓存统一存放在用户目录下的 `~/.ai-context/cache/`，跨项目共享，避免重复下载。

```
~/.ai-context/cache/
├── packages/<package-name>/<version>/   # npm tarball 解压内容
└── manifests/<name>/<version>.yaml      # 清单缓存
```

清理缓存：

```bash
ai-context clean              # 清空全部
ai-context clean --packages   # 只清 npm 包
ai-context clean --manifests  # 只清清单
ai-context clean --dry-run    # 预览，不删除
```

> 0.x 早期版本曾将缓存放在每个项目的 `.ai/cache/` 下。升级后该目录将不再被使用，可手动删除。

## 卸载 CLI

```bash
ai-context clean              # 先清缓存（推荐）
npm uninstall -g @coder-2100/cli
rm -rf ~/.ai-context          # 如有需要，彻底移除全局目录
```

## 许可证

[MIT](LICENSE)
