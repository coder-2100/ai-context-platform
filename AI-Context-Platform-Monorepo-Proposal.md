# AI Context Platform — 单仓库 Monorepo 提案

## 版本：v1.0

---

## 一、为什么合并为单仓库

原始提案将知识资产（Repo A）和 CLI 工具（Repo B）拆为两个仓库，审查发现了大量跨仓库集成问题：

| 问题 | 双仓库 | 单仓库 |
|------|--------|--------|
| 接口契约同步 | 需要独立 npm 包 + 版本协调 | 同仓库直接引用，零同步成本 |
| Schema 归属 | 两份 Zod schema 可能不一致 | 一份 schema，直接共享 |
| 开发排序 | Phase 0 先定义契约，再并行开发 | 无需 Phase 0，自然串行 |
| 集成测试 | 跨仓库 E2E 链路复杂 | 同仓库一体化测试 |
| Schema 变更 | 旧包兼容性难以保证 | 同时修改 schema + consumer |
| 发布协调 | 两仓库版本耦合 | 一次发布，原子性 |

**结论**：对于当前阶段（团队规模小、快速迭代期），单仓库的收益远大于双仓库。后期如果知识资产需要独立于 CLI 发版，再拆分也不迟。

---

## 二、项目概述

**ai-context-platform** 是企业级 AI Coding 知识管理与运行时系统。

核心能力：
- 定义、组织、版本化 AI Context Package（rules / skills / agents / domains / playbooks / templates）
- CLI 工具安装、解析、组装、压缩、渲染运行时上下文
- 多工具适配（Claude Code / Codex / Trae / Gemini CLI）
- 文档系统（CLI 使用文档 + 知识资产查阅）

定位：**结构化 Prompt 管理 + 运行时组装系统**。

---

## 三、仓库结构

```
ai-context-platform/
│
├── packages/                            # 所有可发布包
│   ├── schema/                          # @ai-context/schema — 共享类型和 schema
│   │   ├── src/
│   │   │   ├── manifest.ts              # manifest.yaml Zod schema
│   │   │   ├── rule.ts                  # rule frontmatter schema
│   │   │   ├── skill.ts                 # skill schema
│   │   │   ├── agent.ts                 # agent schema
│   │   │   ├── adapter.ts               # adapter 接口类型
│   │   │   ├── task.ts                  # task 类型定义
│   │   │   ├── config.ts                # config.yaml schema
│   │   │   ├── lockfile.ts              # lock.yaml schema
│   │   │   └── index.ts                 # 统一导出
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── cli/                             # @ai-context/cli — CLI 工具
│   │   ├── src/
│   │   │   ├── commands/                # CLI 命令
│   │   │   │   ├── init.ts
│   │   │   │   ├── add.ts
│   │   │   │   ├── browse.ts
│   │   │   │   ├── remove.ts
│   │   │   │   ├── list.ts
│   │   │   │   ├── build.ts
│   │   │   │   ├── upgrade.ts
│   │   │   │   ├── diff.ts
│   │   │   │   └── search.ts
│   │   │   ├── core/                    # 核心引擎
│   │   │   │   ├── package-manager.ts
│   │   │   │   ├── registry-client.ts
│   │   │   │   ├── catalog.ts           # Catalog 数据模型与缓存
│   │   │   │   ├── interactive.ts       # 交互式选择逻辑（checkbox + disabled）
│   │   │   │   ├── config.ts
│   │   │   │   ├── lockfile.ts
│   │   │   │   └── cache.ts
│   │   │   ├── engine/                  # Build Pipeline
│   │   │   │   ├── task-resolver.ts
│   │   │   │   ├── retrieval.ts
│   │   │   │   ├── ranking.ts
│   │   │   │   ├── content-extraction.ts   # 解析 entry 文件 + frontmatter
│   │   │   │   ├── assembly.ts             # 冲突解决与合并
│   │   │   │   └── index-builder.ts        # 生成精简索引层
│   │   │   ├── adapters/               # 工具适配器
│   │   │   │   ├── types.ts
│   │   │   │   ├── claude.ts
│   │   │   │   ├── codex.ts
│   │   │   │   ├── trae.ts
│   │   │   │   └── gemini.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── assets/                          # @ai-context/* — 知识资产包
│       ├── core-engineering/
│       │   ├── package.json
│       │   ├── manifest.yaml
│       │   ├── README.md
│       │   ├── rules/
│       │   │   └── coding-standards.md
│       │   └── CHANGELOG.md
│       ├── react-rules/
│       │   ├── package.json
│       │   ├── manifest.yaml
│       │   ├── README.md
│       │   ├── rules/
│       │   │   ├── hooks.md
│       │   │   └── components.md
│       │   ├── skills/
│       │   │   └── react-review.md
│       │   └── CHANGELOG.md
│       ├── backend-security/
│       ├── payment-domain/
│       ├── reviewer-agent/
│       └── migration-playbook/
│
├── docs/                                # 文档系统
│   ├── src/                             # 文档站源码（VitePress / Docusaurus）
│   │   ├── .vitepress/                  # VitePress 配置
│   │   │   └── config.ts
│   │   ├── cli/                         # CLI 使用文档
│   │   │   ├── getting-started.md
│   │   │   ├── commands/
│   │   │   │   ├── init.md
│   │   │   │   ├── add.md
│   │   │   │   ├── remove.md
│   │   │   │   ├── list.md
│   │   │   │   ├── build.md
│   │   │   │   ├── upgrade.md
│   │   │   │   └── diff.md
│   │   │   ├── configuration.md
│   │   │   ├── adapters.md
│   │   │   └── troubleshooting.md
│   │   ├── assets/                      # 知识资产查阅文档
│   │   │   ├── overview.md              # 资产类型总览
│   │   │   ├── rules/
│   │   │   │   ├── core-engineering.md
│   │   │   │   ├── react-rules/
│   │   │   │   │   ├── hooks.md
│   │   │   │   │   └── components.md
│   │   │   │   └── backend-security.md
│   │   │   ├── skills/
│   │   │   │   └── react-review.md
│   │   │   ├── agents/
│   │   │   │   └── reviewer.md
│   │   │   ├── domains/
│   │   │   │   └── payment.md
│   │   │   └── playbooks/
│   │   │       └── migration.md
│   │   ├── authoring/                   # 资产编写指南
│   │   │   ├── creating-package.md
│   │   │   ├── writing-rules.md
│   │   │   ├── writing-skills.md
│   │   │   ├── writing-agents.md
│   │   │   ├── writing-domains.md
│   │   │   ├── writing-playbooks.md
│   │   │   └── manifest-reference.md
│   │   ├── governance/                  # 治理指南
│   │   │   ├── versioning.md
│   │   │   ├── review-process.md
│   │   │   └── deprecation.md
│   │   └── architecture/               # 架构文档
│   │       ├── overview.md
│   │       ├── build-pipeline.md
│   │       └── adapter-system.md
│   └── package.json
│
├── schemas/                             # JSON Schema 定义（供外部工具使用）
│   ├── manifest.schema.json
│   ├── rule.schema.json
│   ├── skill.schema.json
│   ├── agent.schema.json
│   ├── config.schema.json
│   └── lockfile.schema.json
│
├── scripts/                             # 仓库级脚本
│   ├── validate-manifest.ts             # manifest 验证
│   ├── sync-versions.ts                 # package.json ↔ manifest.yaml 版本同步
│   ├── check-circular-deps.ts           # 循环依赖检测
│   ├── generate-docs.ts                 # 从 manifest + rules 自动生成文档
│   └── publish.ts                       # 发布脚本
│
├── templates/                           # 包脚手架模板
│   └── package-template/
│       ├── package.json.hbs
│       ├── manifest.yaml.hbs
│       └── README.md.hbs
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                       # lint + validate + test
│   │   ├── publish.yml                  # 发布 npm 包
│   │   └── docs.yml                     # 发布文档站
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── CODEOWNERS
│
├── pnpm-workspace.yaml
├── package.json                         # 根 package.json
├── tsconfig.base.json                   # 共享 TypeScript 配置
├── .npmrc                               # npm 发布配置
├── CHANGELOG.md
└── README.md
```

### pnpm-workspace.yaml

```yaml
packages:
  - 'packages/schema'
  - 'packages/cli'
  - 'packages/assets/*'
```

---

## 四、核心设计原则

### 原则一：Tool Agnostic Source of Truth + Tool-Aware Rendering

- 所有知识资产以工具无关的中间表示（IR）存储
- `compatibleTools` 表示"对这些工具有优化适配"，不是排他性的
- Adapter 层负责 IR → 工具特定格式的转换

### 原则二：Small Composable Packages

每个包聚焦一个领域，小而可组合。

### 原则三：Layered Context Architecture

| 层级 | 含义 | 示例 |
|------|------|------|
| core | 通用工程规范 | clean-code, git-conventions |
| stack | 技术栈规范 | react-rules, node-backend |
| domain | 业务领域规范 | payment-domain, auth-domain |
| project | 项目特有规范 | my-project-conventions |
| runtime | 动态生成的上下文 | git-diff-summary |

manifest.yaml 的 `layer` 字段标注层级，用于排序引擎。

### 原则四：Semantic Versioning

所有包遵循 semver。manifest.yaml schema 自身也遵循 semver。

### 原则五：Schema-First，代码共享

`@ai-context/schema` 包是两端的共同依赖，CLI 直接 import 类型定义，零同步成本。

---

## 五、接口定义

### 5.1 manifest.yaml 完整 Schema

```yaml
# ─── 必填字段 ───
schemaVersion: "1"
name: react-rules                     # 包短名 = package.json name 的 scope 后部分
version: 1.4.0                        # 与 package.json version 同步
type: rules                           # 枚举：rules|skills|agents|domains|playbooks|meta
layer: stack                          # 枚举：core|stack|domain|project|runtime
description: "React coding conventions and review rules"

# ─── 可选字段 ───
priority: high                        # 枚举：critical|high|medium|low，默认 medium
tags:
  - react
  - frontend
compatibleTools:                      # 优化适配的工具，非排他
  - claude-code
  - codex
  - trae
minCLIVersion: "0.1.0"
author: "frontend-team"
license: "MIT"

# ─── 内容入口 ───
entry:
  rules:
    - rules/hooks.md
    - rules/components.md
  skills:
    - skills/react-review.md
  agents: []
  domains: []
  playbooks: []
  templates: []

# ─── Task 映射 ───
appliesTo:                            # 适用的 task 类型
  - review
  - implement

# ─── 依赖关系 ───
dependencies:
  - name: "@ai-context/core-engineering"
    version: "^1.0.0"
    optional: false
peerDependencies:
  - name: "react"
    version: ">=18.0.0"

# ─── 继承（Phase 3） ───
extends: []
overrides: []
```

**type 枚举**：`rules` | `skills` | `agents` | `domains` | `playbooks` | `meta`（混合类型）

**priority 语义**：

| 值 | 权重 | 含义 |
|----|------|------|
| critical | 100 | 必须加载，不可截断 |
| high | 75 | 优先加载，压缩时最后裁剪 |
| medium | 50 | 默认，按需加载 |
| low | 25 | 补充性内容，优先裁剪 |

### 5.2 Rule 文件格式

每个 rule 文件使用 YAML frontmatter 声明元数据：

```markdown
---
id: react-hooks-rules
priority: high
layer: stack
appliesTo: [review, implement]
---

# React Hooks Rules

## Principles
- Prefer composition over inheritance
- Avoid effect chains

## Forbidden
- Nested useEffect loops
- Mutable shared state

## Recommended
- Use useCallback for event handlers passed as props
- Use useMemo for expensive computations
```

### 5.3 Skill 文件格式

```markdown
---
id: react-review-skill
type: skill
priority: medium
appliesTo: [review]
---

# React Review Skill

## Focus
- Rendering performance
- Stale closure detection
- Hydration mismatch

## Workflow
1. Inspect hooks dependencies
2. Inspect memoization strategy
3. Inspect async effects cleanup

## Checklist
- [ ] useEffect dependencies are correct
- [ ] useMemo/useCallback are used where needed
- [ ] No inline object/function creation in render
```

### 5.4 Agent 文件格式

```markdown
---
id: reviewer-agent
type: agent
priority: high
appliesTo: [review]
---

# Reviewer Agent

## Role
You are a senior code reviewer focused on correctness and maintainability.

## Focus
- Backward compatibility
- Transaction safety
- Error handling completeness

## Reject
- Giant functions (>50 lines)
- Hidden side effects
- Untested error paths

## Style
- Be direct and specific
- Cite the rule being violated
- Suggest the fix, don't just point out the problem
```

### 5.5 Adapter 接口

```typescript
// packages/schema/src/adapter.ts

// ── 两层输出架构 ──

// Tier 1: 索引层（始终加载，体积小）
// 写入 CLAUDE.md / AGENTS.md / GEMINI.md 等入口文件
interface IndexOutput {
  content: string                      // 索引 markdown 内容
  path: string                         // 部署路径（如 CLAUDE.md）
}

// Tier 2: 内容层（按需加载，独立文件）
// 写入 .ai/runtime/rules/xxx.md 等独立文件
interface ContentFile {
  type: 'rule' | 'skill' | 'agent' | 'domain' | 'playbook'
  id: string                           // 资源唯一标识
  name: string                         # 显示名称
  path: string                         // 相对路径（如 .ai/runtime/rules/react-hooks.md）
  content: string                      // 完整 markdown 内容
  appliesTo: string[]                  // 适用的 task 类型
  priority: Priority
}

// Adapter 输出
interface AdapterOutput {
  index: IndexOutput                   // Tier 1: 索引文件
  files: ContentFile[]                 // Tier 2: 内容文件
  instructions: string[]               // 给用户的操作提示
}

// Adapter 输入
interface AdapterInput {
  task: string
  packages: ResolvedPackage[]
  rules: Rule[]
  skills: Skill[]
  agents: Agent[]
  domains: Domain[]
  playbooks: Playbook[]
  indexBudget: number                  // 索引层 token 预算
  contentBudget: number                // 内容层 token 预算（单文件上限）
  toolCapabilities: ToolCapabilities
}

interface ToolCapabilities {
  maxTokens: number                     // 最大上下文 token
  supportsMultiFile: boolean            // 是否支持多文件输出
  supportsImages: boolean               // 是否支持图片
  indexFileLocation: string             // 索引文件位置（如 CLAUDE.md）
  contentDirLocation: string            // 内容文件目录（如 .ai/runtime/）
  contextFileFormat: 'index-plus-files' | 'single-md' | 'multi-md'
}

interface Adapter {
  name: string
  capabilities: ToolCapabilities
  render(input: AdapterInput): AdapterOutput
}
```

**各工具适配规格**：

| 工具 | maxTokens | 输出格式 | 索引文件位置 | 内容目录 | 特点 |
|------|-----------|----------|-------------|----------|------|
| Claude Code | 200k | index-plus-files | `CLAUDE.md` | `.ai/runtime/` | 长上下文，会自动读取引用文件 |
| Codex | 32k | index-plus-files | `AGENTS.md` | `.ai/runtime/` | task-oriented，索引更精简 |
| Trae | 64k | multi-md | `.trae/rules/` | `.trae/skills/` | 原生多文件，规则与技能分离 |
| Gemini CLI | 128k | index-plus-files | `GEMINI.md` | `.ai/runtime/` | reasoning optimized |

> **核心设计理念**：索引层（CLAUDE.md 等）只写入核心规则 + 可用资源索引，AI 工具在对话中按需读取具体文件。安装 10 个包不会让索引膨胀，因为索引只包含资源摘要和文件路径。

### 5.5.1 两层输出架构详解

**问题**：如果将所有安装包的内容直接写入 CLAUDE.md，安装 10 个包后上下文可能超过 5 万 token，AI 被迫在大量无关内容中工作，效果急剧下降。

**解决方案**：索引 + 内容两层分离。

```
.ai/
├── config.yaml
├── lock.yaml
├── runtime/                        # 所有工具共享的内容层
│   ├── rules/
│   │   ├── core-engineering.md
│   │   ├── react-hooks.md
│   │   ├── react-components.md
│   │   └── backend-security.md
│   ├── skills/
│   │   └── react-review.md
│   ├── agents/
│   │   └── reviewer.md
│   ├── domains/
│   │   └── payment.md
│   └── playbooks/
│       └── migration.md
├── cache/
└── logs/
```

**Tier 1 — 索引层**（始终加载，控制在 ~3000 token 以内）

以 Claude Code 为例，`CLAUDE.md` 内容示例：

```markdown
# My Project                                    ← 用户自定义区域（不受 build 影响）

这是用户自己写的项目介绍、团队约定等。

## Team Conventions
- We use conventional commits
- All PRs need 2 approvals

<!-- AI-CONTEXT:INDEX:START -->                 ← 标记区域起始（CLI 只替换此区域）

# Project Context

## Core Rules
- Follow clean code principles
- All functions < 50 lines
- No hidden side effects

## Available Resources

When performing specific tasks, read the relevant files below for detailed guidance.

### Rules
- **React Hooks** — .ai/runtime/rules/react-hooks.md — Working with React hooks
- **React Components** — .ai/runtime/rules/react-components.md — Building React components
- **Backend Security** — .ai/runtime/rules/backend-security.md — Writing backend API code

### Skills
- **React Review** — .ai/runtime/skills/react-review.md — Reviewing React code

### Agents
- **Reviewer Agent** — .ai/runtime/agents/reviewer.md — Performing code review

### Domains
- **Payment Domain** — .ai/runtime/domains/payment.md — Working on payment features

### Playbooks
- **DB Migration** — .ai/runtime/playbooks/migration.md — Database migration tasks

<!-- AI-CONTEXT:INDEX:END -->                   ← 标记区域结束

## My Custom References                          ← 用户自定义区域（不受 build 影响）

- See docs/architecture.md for system design
- See .ai/runtime/agents/reviewer.md for review checklist
- Internal API docs: https://wiki.company.com/api
```

**Tier 2 — 内容层**（按需读取，独立文件）

每个文件是完整的 rule/skill/agent/domain/playbook 内容，AI 只在需要时读取。

**按需加载的工作流程**：

```
1. AI 读取 CLAUDE.md（索引层，~3000 token）
2. 用户请求："Review this React component"
3. AI 从索引中识别：需要 React Review skill + React rules
4. AI 主动读取：
   - .ai/runtime/skills/react-review.md
   - .ai/runtime/rules/react-hooks.md
   - .ai/runtime/rules/react-components.md
5. 按需加载，只消耗必要 token
```

**`ai-context build <task>` 的作用**：

build 命令不是决定"写入哪些内容"，而是决定"索引中高亮哪些资源"：

```markdown
## Current Task: review

Priority resources for this task (read first):
- **React Review** (skill) — .ai/runtime/skills/react-review.md
- **Reviewer Agent** — .ai/runtime/agents/reviewer.md
- **React Hooks** (rule) — .ai/runtime/rules/react-hooks.md

Reference resources (read if needed):
- **React Components** — .ai/runtime/rules/react-components.md
- **Payment Domain** — .ai/runtime/domains/payment.md
```

索引中增加一个 Task 区块，引导 AI 优先加载与当前 task 相关的资源。

**不同 task 切换**：

```bash
ai-context build review     # 索引高亮 review 相关资源
ai-context build implement  # 索引高亮 implement 相关资源
```

每次 build 重新生成索引层内容，内容层文件不变（除非包版本更新）。

**标记区域（Marker Zone）机制**：

索引文件（CLAUDE.md / AGENTS.md / GEMINI.md）采用标记区域保护用户自定义内容：

```
<!-- AI-CONTEXT:INDEX:START -->
... CLI 生成的索引内容（每次 build 覆盖）...
<!-- AI-CONTEXT:INDEX:END -->
```

**规则**：
- 标记之间的内容：CLI 每次执行 `build` 时完整替换
- 标记之前的内容（header）：用户自定义，永不覆盖
- 标记之后的内容（footer）：用户自定义，永不覆盖
- 文件不存在或无标记时：`build` 创建文件并在末尾追加标记区域
- 用户手动编辑标记区域内的内容会被下次 `build` 覆盖，CLI 在 header 区域提示这一点

**首次 `ai-context init` 生成的 CLAUDE.md**：

```markdown
# Project Context

<!-- AI-CONTEXT:INDEX:START -->
<!-- Managed by ai-context. Do not edit between START and END markers. -->
<!-- Run `ai-context build` to update this section. -->

No packages installed yet. Run `ai-context add` or `ai-context browse` to get started.

<!-- AI-CONTEXT:INDEX:END -->
```

**`ai-context build` 的写入逻辑**：

```typescript
function writeIndexFile(filePath: string, generatedContent: string) {
  const START = '<!-- AI-CONTEXT:INDEX:START -->'
  const END = '<!-- AI-CONTEXT:INDEX:END -->'

  if (!existsSync(filePath)) {
    // 首次创建：整个文件 = header + marked zone + footer
    writeFileSync(filePath, `${START}\n${generatedContent}\n${END}\n`)
    return
  }

  const existing = readFileSync(filePath, 'utf-8')
  const startIdx = existing.indexOf(START)
  const endIdx = existing.indexOf(END)

  if (startIdx === -1 || endIdx === -1) {
    // 无标记：追加到文件末尾
    writeFileSync(filePath, `${existing}\n\n${START}\n${generatedContent}\n${END}\n`)
    return
  }

  // 有标记：替换标记区域，保留前后内容
  const header = existing.slice(0, startIdx)
  const footer = existing.slice(endIdx + END.length)
  writeFileSync(filePath, `${header}${START}\n${generatedContent}\n${END}${footer}`)
}
```

### 5.6 Task 类型系统

| Task | 含义 | 默认加载内容 |
|------|------|-------------|
| review | 代码审查 | rules + agents（review 类型）+ skills |
| debug | 调试 | rules + playbooks + domains |
| migration | 迁移 | playbooks + domains + rules |
| architecture | 架构设计 | domains + rules + agents |
| implement | 功能实现 | rules + skills + templates |
| test | 测试 | rules + skills |

**映射逻辑**：
1. 筛选 `appliesTo` 包含目标 task 的包
2. `appliesTo` 缺失时按 `type` 推断（rules 适用于所有 task，agents 默认 review）
3. 按 layer → priority 排序

### 5.7 依赖解析策略

```yaml
dependencies:
  - name: "@ai-context/core-engineering"
    version: "^1.0.0"           # 支持 semver range
    optional: false             # optional=true 时安装失败不阻断

peerDependencies:
  - name: "react"
    version: ">=18.0.0"         # 宿主项目条件
```

**版本冲突处理**：
1. 同包不同 minor/patch → 取最高版本
2. 同包不同 major → **报错**，用户手动解决
3. 循环依赖 → **报错**（发布时 CI 检测 + 安装时检测）
4. 缺失包 → non-optional 报错，optional 警告跳过

### 5.8 Context 合并与冲突策略

**优先级规则**：
1. project > domain > stack > core（层级越高越优先）
2. 同层级内 priority 字段决定（critical > high > medium > low）
3. 同层级同 priority，config.yaml 中后声明的覆盖先声明的

**冲突检测**：同一 rule id 的 rules 视为冲突，高优先级完整替换低优先级。

### 5.9 本地项目结构

```
.ai/
├── config.yaml                     # 项目配置
├── lock.yaml                       # 包版本锁定
├── runtime/                        # 内容层：所有工具共享
│   ├── rules/                      # 规则文件（独立 .md）
│   │   ├── core-engineering.md
│   │   ├── react-hooks.md
│   │   └── backend-security.md
│   ├── skills/                     # 技能文件
│   │   └── react-review.md
│   ├── agents/                     # Agent 文件
│   │   └── reviewer.md
│   ├── domains/                    # 领域知识文件
│   │   └── payment.md
│   └── playbooks/                  # 操作手册文件
│       └── migration.md
├── cache/                          # 本地缓存
└── logs/                           # 运行日志
```

索引层文件由 `ai-context build` 生成并部署到各工具期望位置：

| 工具 | 索引文件位置 | 内容文件目录 |
|------|-------------|-------------|
| Claude Code | `CLAUDE.md`（项目根） | `.ai/runtime/` |
| Codex | `AGENTS.md`（项目根） | `.ai/runtime/` |
| Trae | `.trae/rules/` + `.trae/skills/` | `.trae/` |
| Gemini CLI | `GEMINI.md`（项目根） | `.ai/runtime/` |

索引文件内容始终精简（~3000 token），详细内容通过文件路径按需读取。提供 `--dry-run` 模式仅预览不写入。

### 5.10 config.yaml

```yaml
project: my-project
description: "My project description"

packages:
  - name: "@ai-context/react-rules"
    version: "^1.4.0"              # 可选，不填则 latest
  - name: "@ai-context/payment-domain"
    version: "^2.0.0"
  - name: "@ai-context/reviewer-agent"
    version: "^1.0.0"

tooling:
  claude-code:
    enabled: true
    deploy: true                   # 自动部署到工具期望位置
  codex:
    enabled: true
    deploy: true
  trae:
    enabled: false
  gemini:
    enabled: false

budget:
  indexBudget: 3000                     # 索引层 token 预算（默认 3000）
  perTool:
    claude-code:
      indexBudget: 5000                 # Claude 长上下文，索引可以更大
    codex:
      indexBudget: 2000                 # Codex 短上下文，索引更精简
```

### 5.11 lock.yaml

```yaml
schemaVersion: "1"
cliVersion: "0.1.0"
generatedAt: "2026-05-27T10:00:00Z"

packages:
  "@ai-context/react-rules":
    version: "1.4.2"
    resolved: "https://npm.company.com/@ai-context/react-rules/-/react-rules-1.4.2.tgz"
    integrity: "sha512-abc123..."
  "@ai-context/payment-domain":
    version: "2.0.1"
    resolved: "https://npm.company.com/@ai-context/payment-domain/-/payment-domain-2.0.1.tgz"
    integrity: "sha512-def456..."
```

---

## 六、文档系统设计

### 6.1 技术选型

| 方案 | 优点 | 缺点 |
|------|------|------|
| **VitePress** (推荐) | Vue 生态、构建快、Markdown 优先、全文搜索内置 | 需要 Vue 基础（模板层面很少） |
| Docusaurus | React 生态、功能全面 | 较重、构建慢 |
| MkDocs | Python 生态、简单 | 扩展性弱 |

推荐 VitePress：轻量、构建快、Markdown-first，适合技术文档场景。

### 6.2 文档结构详解

```
docs/
├── src/
│   ├── .vitepress/
│   │   └── config.ts                # VitePress 配置（导航、侧边栏、搜索）
│   │
│   ├── index.md                     # 首页（项目介绍 + 快速开始）
│   │
│   ├── cli/                         # ── CLI 使用文档 ──
│   │   ├── getting-started.md       # 安装、初始化、第一个 build
│   │   ├── commands/                # 每个命令一篇文档
│   │   │   ├── init.md              # ai-context init
│   │   │   ├── add.md               # ai-context add（含交互式模式说明）
│   │   │   ├── browse.md            # ai-context browse（浏览与批量安装）
│   │   │   ├── remove.md            # ai-context remove
│   │   │   ├── list.md              # ai-context list
│   │   │   ├── build.md             # ai-context build（核心命令）
│   │   │   ├── upgrade.md           # ai-context upgrade
│   │   │   ├── diff.md              # ai-context diff
│   │   │   └── search.md            # ai-context search
│   │   ├── configuration.md         # config.yaml 完整配置参考
│   │   ├── lockfile.md              # lock.yaml 说明
│   │   ├── adapters.md              # 各工具适配说明
│   │   ├── budget.md                # Token 预算和压缩策略
│   │   └── troubleshooting.md       # 常见问题排查
│   │
│   ├── assets/                      # ── 知识资产查阅 ──
│   │   ├── overview.md              # 资产类型总览（rules/skills/agents/domains/playbooks/templates）
│   │   ├── catalog.md               # 所有包的目录索引（自动生成）
│   │   ├── rules/                   # 按 package 组织的 rules 内容
│   │   │   ├── core-engineering.md
│   │   │   ├── react-rules/
│   │   │   │   ├── hooks.md         # 从 packages/assets/react-rules/rules/hooks.md 生成
│   │   │   │   └── components.md
│   │   │   └── backend-security.md
│   │   ├── skills/
│   │   │   └── react-review.md
│   │   ├── agents/
│   │   │   └── reviewer.md
│   │   ├── domains/
│   │   │   └── payment.md
│   │   └── playbooks/
│   │       └── migration.md
│   │
│   ├── authoring/                   # ── 资产编写指南 ──
│   │   ├── creating-package.md      # 从零创建一个 AI Context Package
│   │   ├── manifest-reference.md    # manifest.yaml 字段完整参考
│   │   ├── writing-rules.md         # 如何编写高质量 rules
│   │   ├── writing-skills.md        # 如何编写 skills
│   │   ├── writing-agents.md        # 如何编写 agents
│   │   ├── writing-domains.md       # 如何编写 domain 知识
│   │   ├── writing-playbooks.md     # 如何编写 playbooks
│   │   └── best-practices.md        # 内容编写最佳实践
│   │
│   ├── governance/                  # ── 治理指南 ──
│   │   ├── versioning.md            # 版本管理策略
│   │   ├── review-process.md        # PR 审查流程
│   │   ├── deprecation.md           # 废弃生命周期
│   │   └── publishing.md            # 发布流程
│   │
│   └── architecture/               # ── 架构文档 ──
│       ├── overview.md              # 系统架构总览
│       ├── build-pipeline.md        # Build Pipeline 详解
│       ├── adapter-system.md        # Adapter 系统设计
│       └── schema-evolution.md      # Schema 演进策略
│
└── package.json
```

### 6.3 知识资产文档的自动生成

知识资产的内容（rules/skills/agents/domains/playbooks）存放于 `packages/assets/` 中，文档站需要呈现这些内容。设计两种策略：

**策略 A：构建时自动生成（推荐）**

`scripts/generate-docs.ts` 在 `pnpm docs:build` 前执行：

1. 扫描 `packages/assets/*/manifest.yaml`
2. 读取每个包的 `entry` 中列出的文件
3. 将 Markdown 内容转换为 VitePress 页面：
   - 保留 frontmatter 元数据作为页面标题和导航信息
   - 添加面包屑导航（包名 > 类型 > 文件名）
   - 添加侧边栏元信息（版本、layer、priority、appliesTo）
4. 生成 `catalog.md`：所有包的目录索引，包含名称、描述、版本、标签
5. 写入 `docs/src/assets/` 对应目录

**优势**：文档与源码始终同步，零手工维护。
**注意**：生成文件加入 `.gitignore`，不提交到仓库。

**策略 B：手动编写 + 引用**

文档由人工编写，资产内容通过相对路径引用。适合需要额外解释说明的场景。

**推荐**：主流程用策略 A，特殊页面（如 overview、best-practices）用手动编写。

### 6.4 catalog.md 格式（自动生成）

```markdown
# Package Catalog

## Rules

| Package | Layer | Version | Tags | Applies To |
|---------|-------|---------|------|------------|
| [core-engineering](/assets/rules/core-engineering.md) | core | 1.0.0 | `engineering`, `standards` | all |
| [react-rules](/assets/rules/react-rules/) | stack | 1.0.0 | `react`, `frontend` | review, implement |
| [backend-security](/assets/rules/backend-security.md) | stack | 1.0.0 | `security`, `backend` | review, implement |

## Skills

| Package | Version | Applies To |
|---------|---------|------------|
| [react-review](/assets/skills/react-review.md) | 1.0.0 | review |

## Agents

| Package | Version | Applies To |
|---------|---------|------------|
| [reviewer](/assets/agents/reviewer.md) | 1.0.0 | review |
```

### 6.5 VitePress 配置要点

```typescript
// docs/src/.vitepress/config.ts
import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'AI Context Platform',
  description: 'Enterprise AI Coding Knowledge Management',

  themeConfig: {
    nav: [
      { text: 'CLI', link: '/cli/getting-started' },
      { text: 'Assets', link: '/assets/overview' },
      { text: 'Authoring', link: '/authoring/creating-package' },
      { text: 'Governance', link: '/governance/versioning' },
      { text: 'Architecture', link: '/architecture/overview' },
    ],

    sidebar: {
      '/cli/': [
        { text: 'Getting Started', link: '/cli/getting-started' },
        { text: 'Commands', items: [
          { text: 'init', link: '/cli/commands/init' },
          { text: 'add', link: '/cli/commands/add' },
          { text: 'browse', link: '/cli/commands/browse' },
          { text: 'remove', link: '/cli/commands/remove' },
          { text: 'list', link: '/cli/commands/list' },
          { text: 'build', link: '/cli/commands/build' },
          { text: 'upgrade', link: '/cli/commands/upgrade' },
          { text: 'diff', link: '/cli/commands/diff' },
          { text: 'search', link: '/cli/commands/search' },
        ]},
        { text: 'Configuration', link: '/cli/configuration' },
        { text: 'Lockfile', link: '/cli/lockfile' },
        { text: 'Adapters', link: '/cli/adapters' },
        { text: 'Token Budget', link: '/cli/budget' },
        { text: 'Troubleshooting', link: '/cli/troubleshooting' },
      ],
      '/assets/': [
        { text: 'Overview', link: '/assets/overview' },
        { text: 'Catalog', link: '/assets/catalog' },
        { text: 'Rules', items: [ /* 自动生成 */ ] },
        { text: 'Skills', items: [ /* 自动生成 */ ] },
        { text: 'Agents', items: [ /* 自动生成 */ ] },
        { text: 'Domains', items: [ /* 自动生成 */ ] },
        { text: 'Playbooks', items: [ /* 自动生成 */ ] },
      ],
      '/authoring/': [ /* ... */ ],
      '/governance/': [ /* ... */ ],
      '/architecture/': [ /* ... */ ],
    ],

    search: {
      provider: 'local',  // VitePress 内置本地搜索
    },
  },
})
```

### 6.6 docs 相关脚本

```json
// docs/package.json
{
  "name": "@ai-context/docs",
  "private": true,
  "scripts": {
    "generate": "tsx ../../scripts/generate-docs.ts",
    "dev": "pnpm generate && vitepress dev src",
    "build": "pnpm generate && vitepress build src",
    "preview": "vitepress preview src"
  },
  "devDependencies": {
    "vitepress": "^1.6.0",
    "tsx": "^4.0.0"
  }
}
```

---

## 七、Runtime Build Pipeline

```
用户执行: ai-context build review --tool claude-code
                    │
                    ▼
        ┌──── 1. Task Resolution ────┐
        │ 解析 task 类型              │
        │ 确定 appliesTo 过滤条件     │
        └──────────┬──────────────────┘
                   │
                   ▼
        ┌──── 2. Package Retrieval ──┐
        │ 读取 config.yaml 包列表    │
        │ 解析 lock.yaml 版本        │
        │ 从 cache/registry 加载包   │
        │ 递归解析 dependencies      │
        └──────────┬──────────────────┘
                   │
                   ▼
        ┌──── 3. Filtering & Ranking ┐
        │ 按 appliesTo 过滤包        │
        │ 按 layer 排序               │
        │ 按 priority 排序            │
        │ 按 config.yaml 声明顺序     │
        └──────────┬──────────────────┘
                   │
                   ▼
        ┌──── 4. Content Extraction ─┐
        │ 解析各包 entry 中的文件    │
        │ 提取 frontmatter 元数据    │
        │ 按 type 分类（rule/skill/  │
        │   agent/domain/playbook）   │
        │ 冲突检测与解决             │
        └──────────┬──────────────────┘
                   │
                   ▼
        ┌──── 5. Two-Tier Output ────┐
        │                            │
        │ Tier 2: 内容层              │
        │ · 写入 .ai/runtime/rules/  │
        │ · 写入 .ai/runtime/skills/ │
        │ · 写入 .ai/runtime/agents/ │
        │ · 每个资源一个独立文件      │
        │ · 内容层与 task 无关        │
        │   （所有已安装资源都在磁盘）│
        │                            │
        │ Tier 1: 索引层              │
        │ · 提取 core rules（精简）   │
        │ · 生成资源索引表格          │
        │ · 按 task 高亮优先资源      │
        │ · 控制在 ~3000 token 以内   │
        └──────────┬──────────────────┘
                   │
                   ▼
        ┌──── 6. Adapter Rendering ──┐
        │ 按 tool 选择 adapter        │
        │ 渲染索引层 → 工具入口文件   │
        │  (CLAUDE.md / AGENTS.md)    │
        │ 内容层文件路径写入索引       │
        │ 部署到工具期望位置           │
        └──────────────────────────────┘
```

**关键区别**：不是把所有内容合并到一个文件，而是：
- 内容层：每个资源独立文件，始终存在于 `.ai/runtime/` 下，与 task 无关
- 索引层：精简的入口文件，包含核心规则 + 资源路径索引 + 当前 task 推荐读取顺序
- AI 工具在对话中按需读取具体文件，而非一次性加载所有内容

---

## 八、CLI 命令设计

```
ai-context init                          # 初始化项目（创建 .ai/ 目录和 config.yaml）
ai-context add [package...]              # 添加包（交互式 / 指定包名）
ai-context browse                        # 浏览可用资源，交互式选择批量安装
ai-context remove <package>              # 移除包
ai-context list                          # 列出已安装的包
ai-context build [task] [--tool <tool>]  # 构建运行时上下文
ai-context upgrade [package]             # 升级包（--preview 预览变更）
ai-context diff [package]               # 查看包版本差异
ai-context search <keyword>             # 搜索可用的包（从 registry）
```

### 8.1 `ai-context add` — 交互式与指定安装

**模式一：指定包名安装**

```bash
ai-context add @ai-context/react-rules
ai-context add @ai-context/react-rules@1.4.0
ai-context add @ai-context/react-rules @ai-context/payment-domain   # 批量指定
```

**模式二：交互式选择安装（不带参数时触发）**

```bash
ai-context add
```

不带参数时，展示交互式多选列表：

```
? Select packages to install: (Press space to select, Enter to confirm)
❯ ○ @ai-context/core-engineering     core    1.0.0   General coding standards
  ○ @ai-context/react-rules          stack   1.4.0   React coding conventions
  ○ @ai-context/backend-security     stack   1.2.0   Backend security rules
  ○ @ai-context/payment-domain       domain  2.0.0   Payment business knowledge
  ● @ai-context/reviewer-agent       agents  1.0.0   [installed]  ← disabled, 不可取消选择
  ○ @ai-context/migration-playbook   playbook 1.0.0  Database migration guide
```

**交互规则**：
- 已安装的包标记 `[installed]`，默认选中且 disable（不可取消选中，避免误卸载）
- 未安装的包默认未选中，用户用空格键切换
- 按 layer 分组展示（core → stack → domain → agents → playbooks）
- 每行显示：包名 / layer / 最新版本 / description
- Enter 确认后，批量安装选中的新包

### 8.2 `ai-context browse` — 浏览与批量安装

更完整的浏览体验，支持分类导航和筛选：

```bash
ai-context browse              # 全量浏览
ai-context browse --layer core # 按 layer 筛选
ai-context browse --type rules # 按 type 筛选
ai-context browse --tag react  # 按 tag 筛选
```

**交互流程**：

```
? Browse by: (选择浏览方式)
❯ All packages
  By Layer (core / stack / domain / ...)
  By Type (rules / skills / agents / ...)
  By Tag (react / security / payment / ...)

→ 选择 "By Layer"

? Select layer:
❯ core
  stack
  domain
  project

→ 选择 "stack"

? Select packages to install:
❯ ○ @ai-context/react-rules          React coding conventions      v1.4.0
  ○ @ai-context/backend-security     Backend security rules        v1.2.0
  ● @ai-context/node-backend         [installed]                   v1.1.0

→ 选择 react-rules，Enter 确认

Installing 1 package...
  + @ai-context/react-rules@1.4.0

Updated .ai/config.yaml and .ai/lock.yaml
Run `ai-context build` to generate runtime context.
```

**browse 与 add 的区别**：

| 维度 | `ai-context add` | `ai-context browse` |
|------|------------------|---------------------|
| 入口 | 快速安装，不带参数时交互 | 浏览为主，安装为辅 |
| 分类 | 扁平列表 | 分级导航（layer / type / tag） |
| 筛选 | 无 | 支持 `--layer` `--type` `--tag` |
| 适用 | 知道要装什么 | 探索可用资源 |
| 已安装标记 | disable | disable + 显示版本信息 |

### 8.3 数据来源：Registry Catalog API

交互式安装依赖 registry 提供可用包列表。定义 Catalog 接口：

```typescript
interface CatalogPackage {
  name: string              // @ai-context/react-rules
  version: string           // 1.4.0
  description: string       // React coding conventions
  type: PackageType         // rules | skills | agents | domains | playbooks | meta
  layer: Layer              // core | stack | domain | project | runtime
  tags: string[]            // [react, frontend]
}

interface RegistryClient {
  // 搜索包
  search(query: string): Promise<CatalogPackage[]>

  // 获取完整目录（带缓存）
  catalog(options?: { layer?: Layer; type?: PackageType; tag?: string }): Promise<CatalogPackage[]>

  // 获取包详情（含完整 manifest）
  getPackage(name: string, version?: string): Promise<Manifest>

  // 下载包到缓存
  download(name: string, version: string): Promise<string>  // 返回本地路径
}
```

**实现策略**：

| 阶段 | 数据来源 | 说明 |
|------|----------|------|
| MVP | npm registry search API | `npm search @ai-context`，从 package.json 的 keywords 和 description 提取信息 |
| 稳定期 | 专用 catalog endpoint | 自建 registry 提供 `/api/catalog` 接口，返回完整 CatalogPackage 信息 |
| 离线 | 本地缓存 | `~/.ai-context/cache/catalog.json`，定期刷新 |

**MVP 阶段的 catalog 获取**：解析已安装包的 manifest.yaml 补充元信息，不足部分从 npm registry 的 package.json description/keywords 字段获取。

### 8.4 交互式 UI 技术选型

| 方案 | 优点 | 缺点 |
|------|------|------|
| **@inquirer/prompts** (推荐) | 功能全面、checkbox 支持 disabled、社区活跃 | 包体积较大 |
| prompts | 轻量、简洁 | checkbox 不支持 disabled 项 |
| clack | 现代、美观 | disabled 支持不完善 |

推荐 `@inquirer/prompts`：原生支持 checkbox 的 disabled 选项，满足"已安装包不可取消选择"的需求。

```typescript
import { checkbox } from '@inquirer/prompts'

const selected = await checkbox({
  message: 'Select packages to install:',
  choices: allPackages.map(pkg => ({
    name: `${pkg.name}  ${pkg.layer}  v${pkg.version}  ${pkg.description}`,
    value: pkg.name,
    checked: installedNames.has(pkg.name),
    disabled: installedNames.has(pkg.name) ? 'installed' : false,
  })),
})
```

### 8.5 `ai-context list` — 已安装包列表

```bash
ai-context list                  # 简洁列表
ai-context list --verbose        # 详细信息（含 layer, type, description）
```

**简洁模式**：
```
@ai-context/core-engineering  1.0.0
@ai-context/react-rules       1.4.0
@ai-context/reviewer-agent    1.0.0
```

**详细模式**：
```
Package                         Version  Layer   Type     Description
@ai-context/core-engineering    1.0.0    core    rules    General coding standards
@ai-context/react-rules         1.4.0    stack   rules    React coding conventions
@ai-context/reviewer-agent      1.0.0    stack   agents   Code reviewer agent
```

### 8.6 `ai-context build` — 构建运行时上下文

```
ai-context build [task] [options]

Arguments:
  task                    Task 类型：review|debug|migration|architecture|implement|test

Options:
  --tool <tool>          目标工具：claude-code|codex|trae|gemini
  --all-tools            为所有已启用的工具生成
  --dry-run              仅预览，不写入文件
  --index-budget <tokens>  索引层 token 预算（默认 3000）
  --verbose              详细输出
```

**输出说明**：
- 内容层：将所有已安装包的资源文件写入 `.ai/runtime/rules/`、`.ai/runtime/skills/` 等，每个资源一个独立文件
- 索引层：生成精简入口文件（CLAUDE.md / AGENTS.md 等），包含核心规则 + 资源路径索引 + 当前 task 推荐读取顺序
- `--index-budget` 控制索引层大小，超出时裁剪低优先级资源的描述文字（不裁剪内容层）

---

## 九、@ai-context/schema 包设计

作为两端共享的类型基础，直接在 monorepo 内引用，无需发布即可开发。发布时作为独立 npm 包供第三方工具使用。

```typescript
// packages/schema/src/index.ts

// Manifest 相关
export { ManifestSchema, type Manifest } from './manifest'

// 内容文件 frontmatter
export { RuleFrontmatterSchema, type RuleFrontmatter } from './rule'
export { SkillFrontmatterSchema, type SkillFrontmatter } from './skill'
export { AgentFrontmatterSchema, type AgentFrontmatter } from './agent'

// Adapter 接口
export { type Adapter, type AdapterInput, type AdapterOutput, type ToolCapabilities } from './adapter'

// Task 系统
export { TASK_TYPES, type TaskType } from './task'

// Config / Lockfile
export { ConfigSchema, type Config } from './config'
export { LockfileSchema, type Lockfile } from './lockfile'

// 枚举常量
export { Layer, Priority, PackageType } from './constants'
```

---

## 十、实施计划

### Phase 1 — 基础设施 + Schema（1 周）

| 任务 | 交付物 |
|------|--------|
| 初始化 monorepo（pnpm workspaces + tsconfig.base.json） | 根配置文件 |
| 创建 `packages/schema/`，定义所有 Zod schema 和 TypeScript 类型 | @ai-context/schema |
| 创建 `schemas/` 目录，导出 JSON Schema | manifest.schema.json 等 |
| 创建 `scripts/validate-manifest.ts` | manifest 验证脚本 |
| 创建 `scripts/sync-versions.ts` | 版本同步检查脚本 |
| 搭建 CI（lint + validate + build） | .github/workflows/ci.yml |
| 初始化 `docs/`（VitePress + 基础页面） | 文档站骨架 |

### Phase 2 — 核心 Packages + CLI MVP（2-3 周）

| 任务 | 交付物 |
|------|--------|
| core-engineering package | @ai-context/core-engineering@1.0.0 |
| react-rules package | @ai-context/react-rules@1.0.0 |
| CLI 基础框架（commander + tsup + @inquirer/prompts） | packages/cli/ 骨架 |
| init 命令 | 创建 .ai/ 目录和 config.yaml |
| add 命令（指定包名 + 交互式选择） | 交互式多选安装，已安装包 disable |
| browse 命令（分类浏览 + 选择安装） | 按 layer/type/tag 分级导航 |
| remove / list 命令 | 移除和列表 |
| RegistryClient（catalog 接口） | 从 npm registry 获取可用包列表 |
| config.yaml / lock.yaml 解析 | 配置系统 |
| Claude Code adapter（索引层 + 内容层） | CLAUDE.md 索引 + .ai/runtime/ 内容文件 |
| npm publish pipeline | .github/workflows/publish.yml |

### Phase 3 — Layering + 更多包（1-2 周）

| 任务 | 交付物 |
|------|--------|
| extends / override 字段支持 | manifest schema v1.1 |
| dependency graph + 循环检测 | check-circular-deps.ts |
| backend-security package | @ai-context/backend-security@1.0.0 |
| reviewer-agent package | @ai-context/reviewer-agent@1.0.0 |
| payment-domain package | @ai-context/payment-domain@1.0.0 |
| migration-playbook package | @ai-context/migration-playbook@1.0.0 |

### Phase 4 — Builder Pipeline（2 周）

| 任务 | 交付物 |
|------|--------|
| Dependency resolution（含冲突检测） | 完整依赖解析 |
| Task resolution + appliesTo 映射 | task-resolver.ts |
| Retrieval + Ranking engine | retrieval.ts + ranking.ts |
| Content Extraction（解析 entry 文件 + frontmatter） | content-extraction.ts |
| Merge engine（冲突解决） | assembly.ts |
| Index Builder（生成精简索引层，~3000 token 预算） | index-builder.ts |
| Codex adapter | AGENTS.md 索引 + 内容文件 |

### Phase 5 — Multi-Tool Adapters + 文档完善（1-2 周）

| 任务 | 交付物 |
|------|--------|
| Trae adapter | .ai/runtime/trae/ 多文件输出 |
| Gemini CLI adapter | .ai/runtime/gemini.md |
| 自动部署到工具期望位置 | copy/symlink 机制 |
| Tool capabilities 描述 | 各工具能力建模 |
| 文档内容完善 + 自动生成脚本 | generate-docs.ts |
| 发布文档站 | .github/workflows/docs.yml |

### Phase 6 — Governance（1-2 周）

| 任务 | 交付物 |
|------|--------|
| Package lint + validation | manifest 和内容验证 |
| diff / upgrade 命令 | ai-context diff, ai-context upgrade |
| Audit logs | 操作日志 |
| Changelog enforcement | CI 检查 |
| search 命令 | ai-context search |

### Phase 7 — Runtime Providers（2 周）

| 任务 | 交付物 |
|------|--------|
| Provider 沙箱运行时（isolated-vm） | 安全执行环境 |
| Provider 权限声明模型 | manifest.yaml providerPermissions 字段 |
| 内置 providers（architecture-summary, git-diff） | 2 个示例 provider |

### Phase 8 — Enterprise（持续演进）

| 任务 | 交付物 |
|------|--------|
| Vector retrieval | 语义检索 |
| MCP server/client | MCP 协议支持 |
| Semantic ranking | AI 辅助排序 |
| Telemetry | 使用分析 |

### 阶段依赖关系

```
Phase 1 (Schema + Infra)
    │
    ▼
Phase 2 (Core Packages + CLI MVP)
    │
    ├──────────────────────┐
    ▼                      ▼
Phase 3 (Layering)    Phase 4 (Builder Pipeline)
    │                      │
    └──────────┬───────────┘
               ▼
    Phase 5 (Multi-Tool + Docs)
               │
               ▼
    Phase 6 (Governance)
               │
               ▼
    Phase 7 (Runtime Providers)
               │
               ▼
    Phase 8 (Enterprise)
```

---

## 十一、技术选型

| 决策点 | 选择 | 理由 |
|--------|------|------|
| Monorepo 工具 | pnpm workspaces | 轻量、原生 workspace、与 npm 生态兼容 |
| Schema 定义 | Zod（运行时）+ JSON Schema（文档） | Zod 做解析验证，JSON Schema 做外部工具参考 |
| CLI 框架 | commander | 成熟、TypeScript 支持好 |
| CLI 构建 | tsup | 快速、esbuild 内置 |
| 文档站 | VitePress | 轻量、Markdown-first、构建快、内置搜索 |
| Token 估算 | js-tiktoken | 粗略估算，用于 budget 控制 |
| Provider 沙箱 | isolated-vm | 安全隔离 JS 执行 |
| 发布策略 | GitHub Packages（MVP）→ 私有 registry（企业） | 快速起步，按需迁移 |
| CI | GitHub Actions | 与 GitHub 生态集成 |

---

## 十二、与双仓库提案的对比

| 维度 | 双仓库 | 单仓库 Monorepo |
|------|--------|-----------------|
| 接口契约 | 需要独立 npm 包 + 版本协调 | 同仓库直接引用，零成本 |
| Schema 共享 | 两份 Zod 可能不一致 | 一份 @ai-context/schema |
| 开发排序 | 需要 Phase 0 先定义契约 | Phase 1 即可并行 |
| 集成测试 | 跨仓库 E2E 链路复杂 | 同仓库一体化测试 |
| 发布协调 | 两仓库版本耦合 | 一次发布，原子性 |
| 仓库结构 | 两个独立仓库 | 一个仓库，pnpm workspaces |
| 知识资产包命名 | @company/* | @ai-context/* |
| 文档系统 | 未设计 | VitePress + 自动生成 |
| 职责边界 | 物理隔离（仓库级） | 逻辑隔离（目录级） |
| 后期拆分成本 | 无 | 可按 packages/ 拆出 |

**何时需要拆回双仓库**：
- 知识资产需要独立于 CLI 发版
- 知识资产由不同团队维护，需要独立权限控制
- CLI 和资产的发布节奏差异显著

当前阶段建议单仓库，降低协调成本，加速迭代。

---

## 十三、风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 单仓库体积增长 | clone 变慢 | pnpm 只安装需要的依赖；后期可拆分 |
| 知识资产与 CLI 耦合发布 | 不想升级 CLI 时被迫升级资产 | 包独立版本，CLI 不强绑定资产版本 |
| 多工具 context 格式变更 | Adapter 维护成本高 | Adapter 保持薄层，核心逻辑在 IR |
| Phase 时间不足 | 交付延期 | 缩小 MVP（2 个包 + 基础 CLI + Claude adapter） |
| Provider 安全风险 | 企业合规问题 | 沙箱 + 权限模型 + 审查流程 |
| 文档与源码不同步 | 文档过时误导 | 自动生成脚本 + CI 检查 |
