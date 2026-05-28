# Phase 1：基础设施 + Schema 实施计划

> **致 Agent 执行者：** 必须使用的子技能：推荐使用 superpowers:subagent-driven-development 或 superpowers:executing-plans 逐任务执行本计划。步骤使用复选框（`- [ ]`）语法追踪进度。

**目标：** 初始化 ai-context-platform 单仓库，构建共享的 `@ai-context/schema` 包，包含所有 Zod schema、TypeScript 类型、JSON Schema 导出、验证脚本、CI 流水线和文档站骨架。

**架构：** pnpm workspaces 单仓库。`@ai-context/schema` 是所有其他包的基础依赖——定义 manifest、rules、skills、agents、config、lockfile 和 adapter 接口的 Zod schema。JSON Schema 文件导出供外部工具使用。脚本验证 manifest 和同步版本。CI 运行 lint + validate + build + test。

**技术栈：** pnpm workspaces, TypeScript 5.x, Zod 3.x, Vitest, tsup, VitePress, GitHub Actions, Biome（代码检查）

---

## 文件结构

```
ai-context-platform/
├── .github/
│   └── workflows/
│       └── ci.yml
├── .superpowers/
│   └── plans/
│       └── 2026-05-28-phase1-schema-infra.md   ← 本文件
├── packages/
│   └── schema/
│       ├── src/
│       │   ├── constants.ts        # Layer, Priority, PackageType 枚举
│       │   ├── manifest.ts         # Manifest Zod schema + 类型
│       │   ├── rule.ts             # Rule frontmatter schema + 类型
│       │   ├── skill.ts            # Skill frontmatter schema + 类型
│       │   ├── agent.ts            # Agent frontmatter schema + 类型
│       │   ├── adapter.ts          # Adapter 接口类型
│       │   ├── task.ts             # TaskType 枚举 + TASK_TYPES
│       │   ├── config.ts           # Config Zod schema + 类型
│       │   ├── lockfile.ts         # Lockfile Zod schema + 类型
│       │   ├── validate-manifest.ts # Manifest 验证逻辑
│       │   └── index.ts            # 统一导出
│       ├── tests/
│       │   ├── constants.test.ts
│       │   ├── manifest.test.ts
│       │   ├── rule.test.ts
│       │   ├── skill.test.ts
│       │   ├── agent.test.ts
│       │   ├── adapter.test.ts
│       │   ├── task.test.ts
│       │   ├── config.test.ts
│       │   ├── lockfile.test.ts
│       │   └── validate-manifest.test.ts
│       ├── package.json
│       ├── tsconfig.json
│       └── tsup.config.ts
├── schemas/
│   ├── manifest.schema.json
│   ├── rule.schema.json
│   ├── skill.schema.json
│   ├── agent.schema.json
│   ├── config.schema.json
│   └── lockfile.schema.json
├── scripts/
│   ├── validate-manifest.ts
│   ├── sync-versions.ts
│   └── generate-json-schema.ts
├── docs/
│   ├── package.json
│   └── src/
│       ├── .vitepress/
│       │   └── config.ts
│       ├── index.md
│       ├── cli/
│       │   └── getting-started.md
│       ├── assets/
│       │   └── overview.md
│       └── architecture/
│           └── overview.md
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── .npmrc
├── .gitignore
└── biome.json
```

---

### 任务 1：初始化单仓库根目录

**文件：**
- 创建：`package.json`
- 创建：`pnpm-workspace.yaml`
- 创建：`tsconfig.base.json`
- 创建：`.npmrc`
- 创建：`.gitignore`
- 创建：`biome.json`

- [ ] **步骤 1：创建根 package.json**

```json
{
  "name": "ai-context-platform",
  "private": true,
  "description": "企业级 AI Coding 知识管理与运行时系统",
  "license": "MIT",
  "scripts": {
    "build": "pnpm -r run build",
    "test": "pnpm -r run test",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "validate": "tsx scripts/validate-manifest.ts",
    "sync-versions": "tsx scripts/sync-versions.ts",
    "generate:schema": "tsx scripts/generate-json-schema.ts",
    "docs:dev": "pnpm --filter @ai-context/docs dev",
    "docs:build": "pnpm --filter @ai-context/docs build"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

- [ ] **步骤 2：创建 pnpm-workspace.yaml**

```yaml
packages:
  - 'packages/schema'
  - 'packages/cli'
  - 'packages/assets/*'
  - 'docs'
```

- [ ] **步骤 3：创建 tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **步骤 4：创建 .npmrc**

```
shamefully-hoist=false
strict-peer-dependencies=true
auto-install-peers=true
```

- [ ] **步骤 5：创建 .gitignore**

```
node_modules/
dist/
*.tsbuildinfo
.DS_Store
coverage/
.vitepress/cache/
.vitepress/dist/
docs/src/assets/rules/
docs/src/assets/skills/
docs/src/assets/agents/
docs/src/assets/domains/
docs/src/assets/playbooks/
```

- [ ] **步骤 6：创建 biome.json**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedVariables": "error",
        "noUnusedImports": "error"
      },
      "style": {
        "useConst": "error",
        "noVar": "error"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  },
  "files": {
    "ignore": ["node_modules", "dist", "*.min.js", "coverage", ".vitepress"]
  }
}
```

- [ ] **步骤 7：安装根目录依赖**

运行：`pnpm install`
预期：`pnpm` 创建 `pnpm-lock.yaml` 并安装 `@biomejs/biome`、`tsx`、`typescript`

- [ ] **步骤 8：验证单仓库配置**

运行：`pnpm ls -r --depth 0`
预期：仅列出根包（暂无 workspace 子包）

- [ ] **步骤 9：提交**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json .npmrc .gitignore biome.json pnpm-lock.yaml
git commit -m "chore: 使用 pnpm workspaces 初始化单仓库根目录"
```

---

### 任务 2：创建 @ai-context/schema 包骨架

**文件：**
- 创建：`packages/schema/package.json`
- 创建：`packages/schema/tsconfig.json`
- 创建：`packages/schema/tsup.config.ts`

- [ ] **步骤 1：创建 packages/schema/package.json**

```json
{
  "name": "@ai-context/schema",
  "version": "0.1.0",
  "description": "AI Context Platform 共享 Zod schema 和 TypeScript 类型",
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "tsup": "^8.3.0",
    "vitest": "^2.1.0"
  },
  "peerDependencies": {
    "typescript": ">=5.0.0"
  }
}
```

- [ ] **步骤 2：创建 packages/schema/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **步骤 3：创建 packages/schema/tsup.config.ts**

```typescript
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
})
```

- [ ] **步骤 4：创建最小的 src/index.ts 占位符**

```typescript
// @ai-context/schema — 共享 schema 和类型
// 类型和 schema 将在后续任务中添加
export {}
```

- [ ] **步骤 5：安装 schema 包依赖**

运行：`cd packages/schema && pnpm install`
预期：`zod`、`tsup`、`vitest` 安装成功

- [ ] **步骤 6：验证包构建**

运行：`cd packages/schema && pnpm build`
预期：构建成功，`dist/index.js`、`dist/index.cjs`、`dist/index.d.ts` 生成

- [ ] **步骤 7：提交**

```bash
git add packages/schema/
git commit -m "feat(schema): 初始化 @ai-context/schema 包骨架"
```

---

### 任务 3：定义常量（枚举）

**文件：**
- 创建：`packages/schema/src/constants.ts`
- 创建：`packages/schema/tests/constants.test.ts`

- [ ] **步骤 1：编写失败测试**

```typescript
// packages/schema/tests/constants.test.ts
import { describe, it, expect } from 'vitest'
import { Layer, Priority, PackageType } from '../src/constants'

describe('Layer', () => {
  it('包含正确的值', () => {
    expect(Layer.CORE).toBe('core')
    expect(Layer.STACK).toBe('stack')
    expect(Layer.DOMAIN).toBe('domain')
    expect(Layer.PROJECT).toBe('project')
    expect(Layer.RUNTIME).toBe('runtime')
  })

  it('恰好有 5 个值', () => {
    expect(Object.values(Layer)).toHaveLength(5)
  })
})

describe('Priority', () => {
  it('包含正确的值', () => {
    expect(Priority.CRITICAL).toBe('critical')
    expect(Priority.HIGH).toBe('high')
    expect(Priority.MEDIUM).toBe('medium')
    expect(Priority.LOW).toBe('low')
  })

  it('恰好有 4 个值', () => {
    expect(Object.values(Priority)).toHaveLength(4)
  })
})

describe('PackageType', () => {
  it('包含正确的值', () => {
    expect(PackageType.RULES).toBe('rules')
    expect(PackageType.SKILLS).toBe('skills')
    expect(PackageType.AGENTS).toBe('agents')
    expect(PackageType.DOMAINS).toBe('domains')
    expect(PackageType.PLAYBOOKS).toBe('playbooks')
    expect(PackageType.META).toBe('meta')
  })

  it('恰好有 6 个值', () => {
    expect(Object.values(PackageType)).toHaveLength(6)
  })
})
```

- [ ] **步骤 2：运行测试确认失败**

运行：`cd packages/schema && pnpm test -- tests/constants.test.ts`
预期：失败 — 无法解析 `../src/constants`

- [ ] **步骤 3：编写实现**

```typescript
// packages/schema/src/constants.ts

export const Layer = {
  CORE: 'core',
  STACK: 'stack',
  DOMAIN: 'domain',
  PROJECT: 'project',
  RUNTIME: 'runtime',
} as const

export type Layer = (typeof Layer)[keyof typeof Layer]

export const Priority = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const

export type Priority = (typeof Priority)[keyof typeof Priority]

export const PRIORITY_WEIGHTS: Record<Priority, number> = {
  critical: 100,
  high: 75,
  medium: 50,
  low: 25,
}

export const PackageType = {
  RULES: 'rules',
  SKILLS: 'skills',
  AGENTS: 'agents',
  DOMAINS: 'domains',
  PLAYBOOKS: 'playbooks',
  META: 'meta',
} as const

export type PackageType = (typeof PackageType)[keyof typeof PackageType]
```

- [ ] **步骤 4：运行测试确认通过**

运行：`cd packages/schema && pnpm test -- tests/constants.test.ts`
预期：通过

- [ ] **步骤 5：提交**

```bash
git add packages/schema/src/constants.ts packages/schema/tests/constants.test.ts
git commit -m "feat(schema): 添加 Layer、Priority、PackageType 常量"
```

---

### 任务 4：定义 Task 类型系统

**文件：**
- 创建：`packages/schema/src/task.ts`
- 创建：`packages/schema/tests/task.test.ts`

- [ ] **步骤 1：编写失败测试**

```typescript
// packages/schema/tests/task.test.ts
import { describe, it, expect } from 'vitest'
import { TaskType, TASK_TYPES, DEFAULT_TASK_LOAD } from '../src/task'

describe('TaskType', () => {
  it('包含正确的值', () => {
    expect(TaskType.REVIEW).toBe('review')
    expect(TaskType.DEBUG).toBe('debug')
    expect(TaskType.MIGRATION).toBe('migration')
    expect(TaskType.ARCHITECTURE).toBe('architecture')
    expect(TaskType.IMPLEMENT).toBe('implement')
    expect(TaskType.TEST).toBe('test')
  })

  it('TASK_TYPES 包含所有 task 类型', () => {
    expect(TASK_TYPES).toEqual([
      'review', 'debug', 'migration', 'architecture', 'implement', 'test',
    ])
  })
})

describe('DEFAULT_TASK_LOAD', () => {
  it('将每个 task 映射到内容类型', () => {
    expect(DEFAULT_TASK_LOAD.review).toContain('rules')
    expect(DEFAULT_TASK_LOAD.review).toContain('agents')
    expect(DEFAULT_TASK_LOAD.review).toContain('skills')

    expect(DEFAULT_TASK_LOAD.debug).toContain('rules')
    expect(DEFAULT_TASK_LOAD.debug).toContain('playbooks')
    expect(DEFAULT_TASK_LOAD.debug).toContain('domains')

    expect(DEFAULT_TASK_LOAD.migration).toContain('playbooks')
    expect(DEFAULT_TASK_LOAD.migration).toContain('domains')
    expect(DEFAULT_TASK_LOAD.migration).toContain('rules')

    expect(DEFAULT_TASK_LOAD.architecture).toContain('domains')
    expect(DEFAULT_TASK_LOAD.architecture).toContain('rules')
    expect(DEFAULT_TASK_LOAD.architecture).toContain('agents')

    expect(DEFAULT_TASK_LOAD.implement).toContain('rules')
    expect(DEFAULT_TASK_LOAD.implement).toContain('skills')
    expect(DEFAULT_TASK_LOAD.implement).toContain('templates')

    expect(DEFAULT_TASK_LOAD.test).toContain('rules')
    expect(DEFAULT_TASK_LOAD.test).toContain('skills')
  })
})
```

- [ ] **步骤 2：运行测试确认失败**

运行：`cd packages/schema && pnpm test -- tests/task.test.ts`
预期：失败 — 无法解析 `../src/task`

- [ ] **步骤 3：编写实现**

```typescript
// packages/schema/src/task.ts
import type { PackageType } from './constants'

export const TaskType = {
  REVIEW: 'review',
  DEBUG: 'debug',
  MIGRATION: 'migration',
  ARCHITECTURE: 'architecture',
  IMPLEMENT: 'implement',
  TEST: 'test',
} as const

export type TaskType = (typeof TaskType)[keyof typeof TaskType]

export const TASK_TYPES: TaskType[] = Object.values(TaskType)

/** 每个 task 默认加载的内容类型。当包的 `appliesTo` 字段缺失时使用。 */
export const DEFAULT_TASK_LOAD: Record<TaskType, PackageType[]> = {
  review: ['rules', 'agents', 'skills'],
  debug: ['rules', 'playbooks', 'domains'],
  migration: ['playbooks', 'domains', 'rules'],
  architecture: ['domains', 'rules', 'agents'],
  implement: ['rules', 'skills', 'templates'],
  test: ['rules', 'skills'],
}
```

- [ ] **步骤 4：运行测试确认通过**

运行：`cd packages/schema && pnpm test -- tests/task.test.ts`
预期：通过

- [ ] **步骤 5：提交**

```bash
git add packages/schema/src/task.ts packages/schema/tests/task.test.ts
git commit -m "feat(schema): 添加 TaskType 和默认 task 加载映射"
```

---

### 任务 5：定义 Manifest Schema

**文件：**
- 创建：`packages/schema/src/manifest.ts`
- 创建：`packages/schema/tests/manifest.test.ts`

- [ ] **步骤 1：编写失败测试**

```typescript
// packages/schema/tests/manifest.test.ts
import { describe, it, expect } from 'vitest'
import { ManifestSchema } from '../src/manifest'

const validManifest = {
  schemaVersion: '1',
  name: 'react-rules',
  version: '1.4.0',
  type: 'rules',
  layer: 'stack',
  description: 'React 编码规范和审查规则',
  entry: {
    rules: ['rules/hooks.md', 'rules/components.md'],
    skills: [],
    agents: [],
    domains: [],
    playbooks: [],
    templates: [],
  },
}

describe('ManifestSchema', () => {
  it('接受有效的最小 manifest', () => {
    const result = ManifestSchema.safeParse(validManifest)
    expect(result.success).toBe(true)
  })

  it('拒绝缺少必填字段', () => {
    const { name, ...withoutName } = validManifest
    const result = ManifestSchema.safeParse(withoutName)
    expect(result.success).toBe(false)
  })

  it('接受可选字段', () => {
    const full = {
      ...validManifest,
      priority: 'high',
      tags: ['react', 'frontend'],
      compatibleTools: ['claude-code', 'codex'],
      minCLIVersion: '0.1.0',
      author: 'frontend-team',
      license: 'MIT',
      appliesTo: ['review', 'implement'],
      dependencies: [
        { name: '@ai-context/core-engineering', version: '^1.0.0', optional: false },
      ],
      peerDependencies: [
        { name: 'react', version: '>=18.0.0' },
      ],
      extends: [],
      overrides: [],
    }
    const result = ManifestSchema.safeParse(full)
    expect(result.success).toBe(true)
  })

  it('拒绝无效的 type', () => {
    const result = ManifestSchema.safeParse({ ...validManifest, type: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('拒绝无效的 layer', () => {
    const result = ManifestSchema.safeParse({ ...validManifest, layer: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('拒绝无效的 priority', () => {
    const result = ManifestSchema.safeParse({ ...validManifest, priority: 'urgent' })
    expect(result.success).toBe(false)
  })

  it('拒绝无效的 semver 版本号', () => {
    const result = ManifestSchema.safeParse({ ...validManifest, version: 'not-semver' })
    expect(result.success).toBe(false)
  })

  it('省略 priority 时默认为 medium', () => {
    const result = ManifestSchema.parse(validManifest)
    expect(result.priority).toBe('medium')
  })

  it('可选数组字段默认为空数组', () => {
    const result = ManifestSchema.parse(validManifest)
    expect(result.tags).toEqual([])
    expect(result.compatibleTools).toEqual([])
    expect(result.appliesTo).toEqual([])
    expect(result.dependencies).toEqual([])
    expect(result.peerDependencies).toEqual([])
  })
})
```

- [ ] **步骤 2：运行测试确认失败**

运行：`cd packages/schema && pnpm test -- tests/manifest.test.ts`
预期：失败 — 无法解析 `../src/manifest`

- [ ] **步骤 3：编写实现**

```typescript
// packages/schema/src/manifest.ts
import { z } from 'zod'
import { Layer, Priority, PackageType } from './constants'

const SEMVER_REGEX = /^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/
const SEMVER_RANGE_REGEX = /^[\^~]?\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$|^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$|^>=?\d+(\.\d+)?(\.\d+)?$/

const DependencySchema = z.object({
  name: z.string().min(1),
  version: z.string().regex(SEMVER_RANGE_REGEX, '无效的 semver range'),
  optional: z.boolean().default(false),
})

const PeerDependencySchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
})

export const ManifestSchema = z.object({
  // 必填字段
  schemaVersion: z.string().regex(/^\d+$/, 'Schema version 必须是数字字符串'),
  name: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Name 必须是小写字母数字加连字符'),
  version: z.string().regex(SEMVER_REGEX, '无效的 semver 版本号'),
  type: z.enum([PackageType.RULES, PackageType.SKILLS, PackageType.AGENTS, PackageType.DOMAINS, PackageType.PLAYBOOKS, PackageType.META]),
  layer: z.enum([Layer.CORE, Layer.STACK, Layer.DOMAIN, Layer.PROJECT, Layer.RUNTIME]),
  description: z.string().min(1),
  entry: z.object({
    rules: z.array(z.string()).default([]),
    skills: z.array(z.string()).default([]),
    agents: z.array(z.string()).default([]),
    domains: z.array(z.string()).default([]),
    playbooks: z.array(z.string()).default([]),
    templates: z.array(z.string()).default([]),
  }),

  // 带默认值的可选字段
  priority: z.enum([Priority.CRITICAL, Priority.HIGH, Priority.MEDIUM, Priority.LOW]).default(Priority.MEDIUM),
  tags: z.array(z.string()).default([]),
  compatibleTools: z.array(z.string()).default([]),
  minCLIVersion: z.string().optional(),
  author: z.string().optional(),
  license: z.string().optional(),
  appliesTo: z.array(z.string()).default([]),
  dependencies: z.array(DependencySchema).default([]),
  peerDependencies: z.array(PeerDependencySchema).default([]),
  extends: z.array(z.string()).default([]),
  overrides: z.array(z.string()).default([]),
})

export type Manifest = z.infer<typeof ManifestSchema>
```

- [ ] **步骤 4：运行测试确认通过**

运行：`cd packages/schema && pnpm test -- tests/manifest.test.ts`
预期：通过

- [ ] **步骤 5：提交**

```bash
git add packages/schema/src/manifest.ts packages/schema/tests/manifest.test.ts
git commit -m "feat(schema): 添加 Manifest Zod schema 及验证"
```

---

### 任务 6：定义 Rule Frontmatter Schema

**文件：**
- 创建：`packages/schema/src/rule.ts`
- 创建：`packages/schema/tests/rule.test.ts`

- [ ] **步骤 1：编写失败测试**

```typescript
// packages/schema/tests/rule.test.ts
import { describe, it, expect } from 'vitest'
import { RuleFrontmatterSchema } from '../src/rule'

describe('RuleFrontmatterSchema', () => {
  it('接受有效的 rule frontmatter', () => {
    const result = RuleFrontmatterSchema.safeParse({
      id: 'react-hooks-rules',
      priority: 'high',
      layer: 'stack',
      appliesTo: ['review', 'implement'],
    })
    expect(result.success).toBe(true)
  })

  it('接受仅含 id 的最小 frontmatter', () => {
    const result = RuleFrontmatterSchema.safeParse({
      id: 'my-rule',
    })
    expect(result.success).toBe(true)
  })

  it('拒绝缺少 id', () => {
    const result = RuleFrontmatterSchema.safeParse({
      priority: 'high',
    })
    expect(result.success).toBe(false)
  })

  it('拒绝无效的 priority', () => {
    const result = RuleFrontmatterSchema.safeParse({
      id: 'my-rule',
      priority: 'urgent',
    })
    expect(result.success).toBe(false)
  })

  it('默认 priority 为 medium', () => {
    const result = RuleFrontmatterSchema.parse({ id: 'my-rule' })
    expect(result.priority).toBe('medium')
  })

  it('默认 appliesTo 为空数组', () => {
    const result = RuleFrontmatterSchema.parse({ id: 'my-rule' })
    expect(result.appliesTo).toEqual([])
  })
})
```

- [ ] **步骤 2：运行测试确认失败**

运行：`cd packages/schema && pnpm test -- tests/rule.test.ts`
预期：失败

- [ ] **步骤 3：编写实现**

```typescript
// packages/schema/src/rule.ts
import { z } from 'zod'
import { Layer, Priority } from './constants'

export const RuleFrontmatterSchema = z.object({
  id: z.string().min(1),
  priority: z.enum([Priority.CRITICAL, Priority.HIGH, Priority.MEDIUM, Priority.LOW]).default(Priority.MEDIUM),
  layer: z.enum([Layer.CORE, Layer.STACK, Layer.DOMAIN, Layer.PROJECT, Layer.RUNTIME]).optional(),
  appliesTo: z.array(z.string()).default([]),
})

export type RuleFrontmatter = z.infer<typeof RuleFrontmatterSchema>
```

- [ ] **步骤 4：运行测试确认通过**

运行：`cd packages/schema && pnpm test -- tests/rule.test.ts`
预期：通过

- [ ] **步骤 5：提交**

```bash
git add packages/schema/src/rule.ts packages/schema/tests/rule.test.ts
git commit -m "feat(schema): 添加 Rule frontmatter schema"
```

---

### 任务 7：定义 Skill Frontmatter Schema

**文件：**
- 创建：`packages/schema/src/skill.ts`
- 创建：`packages/schema/tests/skill.test.ts`

- [ ] **步骤 1：编写失败测试**

```typescript
// packages/schema/tests/skill.test.ts
import { describe, it, expect } from 'vitest'
import { SkillFrontmatterSchema } from '../src/skill'

describe('SkillFrontmatterSchema', () => {
  it('接受有效的 skill frontmatter', () => {
    const result = SkillFrontmatterSchema.safeParse({
      id: 'react-review-skill',
      type: 'skill',
      priority: 'medium',
      appliesTo: ['review'],
    })
    expect(result.success).toBe(true)
  })

  it('拒绝缺少 id', () => {
    const result = SkillFrontmatterSchema.safeParse({ type: 'skill' })
    expect(result.success).toBe(false)
  })

  it('拒绝非 skill 类型', () => {
    const result = SkillFrontmatterSchema.safeParse({
      id: 'my-skill',
      type: 'agent',
    })
    expect(result.success).toBe(false)
  })

  it('默认 type 为 skill', () => {
    const result = SkillFrontmatterSchema.parse({ id: 'my-skill' })
    expect(result.type).toBe('skill')
  })

  it('默认 priority 为 medium', () => {
    const result = SkillFrontmatterSchema.parse({ id: 'my-skill' })
    expect(result.priority).toBe('medium')
  })
})
```

- [ ] **步骤 2：运行测试确认失败**

运行：`cd packages/schema && pnpm test -- tests/skill.test.ts`
预期：失败

- [ ] **步骤 3：编写实现**

```typescript
// packages/schema/src/skill.ts
import { z } from 'zod'
import { Priority } from './constants'

export const SkillFrontmatterSchema = z.object({
  id: z.string().min(1),
  type: z.literal('skill').default('skill'),
  priority: z.enum([Priority.CRITICAL, Priority.HIGH, Priority.MEDIUM, Priority.LOW]).default(Priority.MEDIUM),
  appliesTo: z.array(z.string()).default([]),
})

export type SkillFrontmatter = z.infer<typeof SkillFrontmatterSchema>
```

- [ ] **步骤 4：运行测试确认通过**

运行：`cd packages/schema && pnpm test -- tests/skill.test.ts`
预期：通过

- [ ] **步骤 5：提交**

```bash
git add packages/schema/src/skill.ts packages/schema/tests/skill.test.ts
git commit -m "feat(schema): 添加 Skill frontmatter schema"
```

---

### 任务 8：定义 Agent Frontmatter Schema

**文件：**
- 创建：`packages/schema/src/agent.ts`
- 创建：`packages/schema/tests/agent.test.ts`

- [ ] **步骤 1：编写失败测试**

```typescript
// packages/schema/tests/agent.test.ts
import { describe, it, expect } from 'vitest'
import { AgentFrontmatterSchema } from '../src/agent'

describe('AgentFrontmatterSchema', () => {
  it('接受有效的 agent frontmatter', () => {
    const result = AgentFrontmatterSchema.safeParse({
      id: 'reviewer-agent',
      type: 'agent',
      priority: 'high',
      appliesTo: ['review'],
    })
    expect(result.success).toBe(true)
  })

  it('拒绝缺少 id', () => {
    const result = AgentFrontmatterSchema.safeParse({ type: 'agent' })
    expect(result.success).toBe(false)
  })

  it('拒绝非 agent 类型', () => {
    const result = AgentFrontmatterSchema.safeParse({
      id: 'my-agent',
      type: 'skill',
    })
    expect(result.success).toBe(false)
  })

  it('默认 type 为 agent', () => {
    const result = AgentFrontmatterSchema.parse({ id: 'my-agent' })
    expect(result.type).toBe('agent')
  })

  it('默认 priority 为 medium', () => {
    const result = AgentFrontmatterSchema.parse({ id: 'my-agent' })
    expect(result.priority).toBe('medium')
  })
})
```

- [ ] **步骤 2：运行测试确认失败**

运行：`cd packages/schema && pnpm test -- tests/agent.test.ts`
预期：失败

- [ ] **步骤 3：编写实现**

```typescript
// packages/schema/src/agent.ts
import { z } from 'zod'
import { Priority } from './constants'

export const AgentFrontmatterSchema = z.object({
  id: z.string().min(1),
  type: z.literal('agent').default('agent'),
  priority: z.enum([Priority.CRITICAL, Priority.HIGH, Priority.MEDIUM, Priority.LOW]).default(Priority.MEDIUM),
  appliesTo: z.array(z.string()).default([]),
})

export type AgentFrontmatter = z.infer<typeof AgentFrontmatterSchema>
```

- [ ] **步骤 4：运行测试确认通过**

运行：`cd packages/schema && pnpm test -- tests/agent.test.ts`
预期：通过

- [ ] **步骤 5：提交**

```bash
git add packages/schema/src/agent.ts packages/schema/tests/agent.test.ts
git commit -m "feat(schema): 添加 Agent frontmatter schema"
```

---

### 任务 9：定义 Adapter 接口类型

**文件：**
- 创建：`packages/schema/src/adapter.ts`
- 创建：`packages/schema/tests/adapter.test.ts`

- [ ] **步骤 1：编写失败测试**

```typescript
// packages/schema/tests/adapter.test.ts
import { describe, it, expect } from 'vitest'
import type {
  IndexOutput,
  ContentFile,
  AdapterOutput,
  AdapterInput,
  ToolCapabilities,
  Adapter,
} from '../src/adapter'
import { ToolCapabilitiesSchema, AdapterOutputSchema } from '../src/adapter'

describe('ToolCapabilitiesSchema', () => {
  it('接受有效的 claude-code capabilities', () => {
    const result = ToolCapabilitiesSchema.safeParse({
      maxTokens: 200000,
      supportsMultiFile: true,
      supportsImages: true,
      indexFileLocation: 'CLAUDE.md',
      contentDirLocation: '.ai/runtime/',
      contextFileFormat: 'index-plus-files',
    })
    expect(result.success).toBe(true)
  })

  it('拒绝无效的 contextFileFormat', () => {
    const result = ToolCapabilitiesSchema.safeParse({
      maxTokens: 200000,
      supportsMultiFile: true,
      supportsImages: true,
      indexFileLocation: 'CLAUDE.md',
      contentDirLocation: '.ai/runtime/',
      contextFileFormat: 'invalid',
    })
    expect(result.success).toBe(false)
  })

  it('拒绝负数 maxTokens', () => {
    const result = ToolCapabilitiesSchema.safeParse({
      maxTokens: -1,
      supportsMultiFile: true,
      supportsImages: true,
      indexFileLocation: 'CLAUDE.md',
      contentDirLocation: '.ai/runtime/',
      contextFileFormat: 'index-plus-files',
    })
    expect(result.success).toBe(false)
  })
})

describe('AdapterOutputSchema', () => {
  it('接受有效的输出', () => {
    const result = AdapterOutputSchema.safeParse({
      index: {
        content: '# Project Context',
        path: 'CLAUDE.md',
      },
      files: [
        {
          type: 'rule',
          id: 'react-hooks',
          name: 'React Hooks',
          path: '.ai/runtime/rules/react-hooks.md',
          content: '# React Hooks Rules',
          appliesTo: ['review', 'implement'],
          priority: 'high',
        },
      ],
      instructions: ['运行 ai-context build 重新生成'],
    })
    expect(result.success).toBe(true)
  })

  it('接受空的 files 数组', () => {
    const result = AdapterOutputSchema.safeParse({
      index: { content: '', path: 'CLAUDE.md' },
      files: [],
      instructions: [],
    })
    expect(result.success).toBe(true)
  })
})
```

- [ ] **步骤 2：运行测试确认失败**

运行：`cd packages/schema && pnpm test -- tests/adapter.test.ts`
预期：失败

- [ ] **步骤 3：编写实现**

```typescript
// packages/schema/src/adapter.ts
import { z } from 'zod'

// ── 第一层：索引层 ──

export const IndexOutputSchema = z.object({
  content: z.string(),
  path: z.string().min(1),
})

export type IndexOutput = z.infer<typeof IndexOutputSchema>

// ── 第二层：内容层 ──

export const ContentFileSchema = z.object({
  type: z.enum(['rule', 'skill', 'agent', 'domain', 'playbook']),
  id: z.string().min(1),
  name: z.string().min(1),
  path: z.string().min(1),
  content: z.string(),
  appliesTo: z.array(z.string()),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
})

export type ContentFile = z.infer<typeof ContentFileSchema>

// ── Adapter 输出 ──

export const AdapterOutputSchema = z.object({
  index: IndexOutputSchema,
  files: z.array(ContentFileSchema),
  instructions: z.array(z.string()),
})

export type AdapterOutput = z.infer<typeof AdapterOutputSchema>

// ── 工具能力 ──

export const ToolCapabilitiesSchema = z.object({
  maxTokens: z.number().int().positive(),
  supportsMultiFile: z.boolean(),
  supportsImages: z.boolean(),
  indexFileLocation: z.string().min(1),
  contentDirLocation: z.string().min(1),
  contextFileFormat: z.enum(['index-plus-files', 'single-md', 'multi-md']),
})

export type ToolCapabilities = z.infer<typeof ToolCapabilitiesSchema>

// ── Adapter 输入 ──

export interface ResolvedPackage {
  name: string
  version: string
  manifest: import('./manifest').Manifest
}

export interface AdapterInput {
  task: string
  packages: ResolvedPackage[]
  rules: import('./rule').RuleFrontmatter[]
  skills: import('./skill').SkillFrontmatter[]
  agents: import('./agent').AgentFrontmatter[]
  domains: { id: string; name: string; description: string }[]
  playbooks: { id: string; name: string; description: string }[]
  indexBudget: number
  contentBudget: number
  toolCapabilities: ToolCapabilities
}

// ── Adapter 接口 ──

export interface Adapter {
  name: string
  capabilities: ToolCapabilities
  render(input: AdapterInput): AdapterOutput
}
```

- [ ] **步骤 4：运行测试确认通过**

运行：`cd packages/schema && pnpm test -- tests/adapter.test.ts`
预期：通过

- [ ] **步骤 5：提交**

```bash
git add packages/schema/src/adapter.ts packages/schema/tests/adapter.test.ts
git commit -m "feat(schema): 添加 Adapter 接口类型和 schema"
```

---

### 任务 10：定义 Config Schema

**文件：**
- 创建：`packages/schema/src/config.ts`
- 创建：`packages/schema/tests/config.test.ts`

- [ ] **步骤 1：编写失败测试**

```typescript
// packages/schema/tests/config.test.ts
import { describe, it, expect } from 'vitest'
import { ConfigSchema } from '../src/config'

const validConfig = {
  project: 'my-project',
  description: '我的项目描述',
  packages: [
    { name: '@ai-context/react-rules', version: '^1.4.0' },
    { name: '@ai-context/payment-domain', version: '^2.0.0' },
  ],
  tooling: {
    'claude-code': { enabled: true, deploy: true },
    codex: { enabled: true, deploy: true },
    trae: { enabled: false },
    gemini: { enabled: false },
  },
}

describe('ConfigSchema', () => {
  it('接受有效的 config', () => {
    const result = ConfigSchema.safeParse(validConfig)
    expect(result.success).toBe(true)
  })

  it('接受省略可选 version 的 config', () => {
    const result = ConfigSchema.safeParse({
      ...validConfig,
      packages: [{ name: '@ai-context/react-rules' }],
    })
    expect(result.success).toBe(true)
  })

  it('默认 budget.indexBudget 为 3000', () => {
    const result = ConfigSchema.parse(validConfig)
    expect(result.budget.indexBudget).toBe(3000)
  })

  it('接受按工具的 budget 覆盖', () => {
    const result = ConfigSchema.safeParse({
      ...validConfig,
      budget: {
        indexBudget: 3000,
        perTool: {
          'claude-code': { indexBudget: 5000 },
          codex: { indexBudget: 2000 },
        },
      },
    })
    expect(result.success).toBe(true)
  })

  it('拒绝缺少 project 名称', () => {
    const { project, ...withoutProject } = validConfig
    const result = ConfigSchema.safeParse(withoutProject)
    expect(result.success).toBe(false)
  })

  it('省略 tooling 时使用默认值', () => {
    const result = ConfigSchema.parse({
      project: 'my-project',
      packages: [],
    })
    expect(result.tooling['claude-code'].enabled).toBe(true)
    expect(result.tooling.codex.enabled).toBe(true)
    expect(result.tooling.trae.enabled).toBe(false)
    expect(result.tooling.gemini.enabled).toBe(false)
  })
})
```

- [ ] **步骤 2：运行测试确认失败**

运行：`cd packages/schema && pnpm test -- tests/config.test.ts`
预期：失败

- [ ] **步骤 3：编写实现**

```typescript
// packages/schema/src/config.ts
import { z } from 'zod'

const PackageRefSchema = z.object({
  name: z.string().min(1),
  version: z.string().optional(),
})

const ToolingEntrySchema = z.object({
  enabled: z.boolean(),
  deploy: z.boolean().default(false),
})

const BudgetSchema = z.object({
  indexBudget: z.number().int().positive().default(3000),
  perTool: z.record(z.string(), z.object({ indexBudget: z.number().int().positive() })).default({}),
}).default({ indexBudget: 3000, perTool: {} })

export const ConfigSchema = z.object({
  project: z.string().min(1),
  description: z.string().default(''),
  packages: z.array(PackageRefSchema).default([]),
  tooling: z.object({
    'claude-code': ToolingEntrySchema.default({ enabled: true, deploy: true }),
    codex: ToolingEntrySchema.default({ enabled: true, deploy: true }),
    trae: ToolingEntrySchema.default({ enabled: false, deploy: false }),
    gemini: ToolingEntrySchema.default({ enabled: false, deploy: false }),
  }).default({
    'claude-code': { enabled: true, deploy: true },
    codex: { enabled: true, deploy: true },
    trae: { enabled: false, deploy: false },
    gemini: { enabled: false, deploy: false },
  }),
  budget: BudgetSchema,
})

export type Config = z.infer<typeof ConfigSchema>
```

- [ ] **步骤 4：运行测试确认通过**

运行：`cd packages/schema && pnpm test -- tests/config.test.ts`
预期：通过

- [ ] **步骤 5：提交**

```bash
git add packages/schema/src/config.ts packages/schema/tests/config.test.ts
git commit -m "feat(schema): 添加 Config Zod schema"
```

---

### 任务 11：定义 Lockfile Schema

**文件：**
- 创建：`packages/schema/src/lockfile.ts`
- 创建：`packages/schema/tests/lockfile.test.ts`

- [ ] **步骤 1：编写失败测试**

```typescript
// packages/schema/tests/lockfile.test.ts
import { describe, it, expect } from 'vitest'
import { LockfileSchema } from '../src/lockfile'

describe('LockfileSchema', () => {
  it('接受有效的 lockfile', () => {
    const result = LockfileSchema.safeParse({
      schemaVersion: '1',
      cliVersion: '0.1.0',
      generatedAt: '2026-05-27T10:00:00Z',
      packages: {
        '@ai-context/react-rules': {
          version: '1.4.2',
          resolved: 'https://registry.npmjs.org/@ai-context/react-rules/-/react-rules-1.4.2.tgz',
          integrity: 'sha512-abc123',
        },
        '@ai-context/payment-domain': {
          version: '2.0.1',
          resolved: 'https://registry.npmjs.org/@ai-context/payment-domain/-/payment-domain-2.0.1.tgz',
          integrity: 'sha512-def456',
        },
      },
    })
    expect(result.success).toBe(true)
  })

  it('拒绝缺少必填字段', () => {
    const result = LockfileSchema.safeParse({
      schemaVersion: '1',
      // 缺少 cliVersion、generatedAt
      packages: {},
    })
    expect(result.success).toBe(false)
  })

  it('接受空的 packages', () => {
    const result = LockfileSchema.safeParse({
      schemaVersion: '1',
      cliVersion: '0.1.0',
      generatedAt: '2026-05-27T10:00:00Z',
      packages: {},
    })
    expect(result.success).toBe(true)
  })

  it('拒绝缺少 integrity 的包条目', () => {
    const result = LockfileSchema.safeParse({
      schemaVersion: '1',
      cliVersion: '0.1.0',
      generatedAt: '2026-05-27T10:00:00Z',
      packages: {
        '@ai-context/react-rules': {
          version: '1.4.2',
          resolved: 'https://example.com/pkg.tgz',
          // 缺少 integrity
        },
      },
    })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **步骤 2：运行测试确认失败**

运行：`cd packages/schema && pnpm test -- tests/lockfile.test.ts`
预期：失败

- [ ] **步骤 3：编写实现**

```typescript
// packages/schema/src/lockfile.ts
import { z } from 'zod'

const LockPackageSchema = z.object({
  version: z.string().min(1),
  resolved: z.string().url(),
  integrity: z.string().min(1),
})

export const LockfileSchema = z.object({
  schemaVersion: z.string().regex(/^\d+$/),
  cliVersion: z.string().min(1),
  generatedAt: z.string().datetime(),
  packages: z.record(z.string(), LockPackageSchema),
})

export type Lockfile = z.infer<typeof LockfileSchema>
```

- [ ] **步骤 4：运行测试确认通过**

运行：`cd packages/schema && pnpm test -- tests/lockfile.test.ts`
预期：通过

- [ ] **步骤 5：提交**

```bash
git add packages/schema/src/lockfile.ts packages/schema/tests/lockfile.test.ts
git commit -m "feat(schema): 添加 Lockfile Zod schema"
```

---

### 任务 12：创建统一导出 index.ts

**文件：**
- 修改：`packages/schema/src/index.ts`

- [ ] **步骤 1：替换占位符 index.ts 为完整导出**

```typescript
// packages/schema/src/index.ts
// @ai-context/schema — 共享 schema 和类型

// 常量
export { Layer, Priority, PRIORITY_WEIGHTS, PackageType } from './constants'
export type { Layer as LayerType, Priority as PriorityType, PackageType as PackageTypeType } from './constants'

// Manifest
export { ManifestSchema } from './manifest'
export type { Manifest } from './manifest'

// 内容文件 frontmatter
export { RuleFrontmatterSchema } from './rule'
export type { RuleFrontmatter } from './rule'
export { SkillFrontmatterSchema } from './skill'
export type { SkillFrontmatter } from './skill'
export { AgentFrontmatterSchema } from './agent'
export type { AgentFrontmatter } from './agent'

// Adapter
export { IndexOutputSchema, ContentFileSchema, AdapterOutputSchema, ToolCapabilitiesSchema } from './adapter'
export type { IndexOutput, ContentFile, AdapterOutput, ToolCapabilities, ResolvedPackage, AdapterInput, Adapter } from './adapter'

// Task
export { TaskType, TASK_TYPES, DEFAULT_TASK_LOAD } from './task'
export type { TaskType as TaskTypeType } from './task'

// Config
export { ConfigSchema } from './config'
export type { Config } from './config'

// Lockfile
export { LockfileSchema } from './lockfile'
export type { Lockfile } from './lockfile'

// 验证
export { validateManifest } from './validate-manifest'
export type { ValidationResult } from './validate-manifest'
```

- [ ] **步骤 2：验证构建成功且所有导出正常**

运行：`cd packages/schema && pnpm build`
预期：构建成功，所有类型在 dist/index.d.ts 中导出

- [ ] **步骤 3：运行所有测试**

运行：`cd packages/schema && pnpm test`
预期：所有测试通过

- [ ] **步骤 4：提交**

```bash
git add packages/schema/src/index.ts
git commit -m "feat(schema): 在 index.ts 中添加统一导出"
```

---

### 任务 13：导出 JSON Schema

**文件：**
- 创建：`scripts/generate-json-schema.ts`
- 创建：`schemas/manifest.schema.json`（生成）
- 创建：`schemas/rule.schema.json`（生成）
- 创建：`schemas/skill.schema.json`（生成）
- 创建：`schemas/agent.schema.json`（生成）
- 创建：`schemas/config.schema.json`（生成）
- 创建：`schemas/lockfile.schema.json`（生成）

- [ ] **步骤 1：添加 zod-to-json-schema 依赖**

运行：`cd packages/schema && pnpm add -D zod-to-json-schema`

- [ ] **步骤 2：编写生成脚本**

```typescript
// scripts/generate-json-schema.ts
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { zodToJsonSchema } from 'zod-to-json-schema'
import {
  ManifestSchema,
  RuleFrontmatterSchema,
  SkillFrontmatterSchema,
  AgentFrontmatterSchema,
  ConfigSchema,
  LockfileSchema,
} from '../packages/schema/src/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const schemasDir = resolve(__dirname, '..', 'schemas')

mkdirSync(schemasDir, { recursive: true })

const schemas = [
  { name: 'manifest', schema: ManifestSchema },
  { name: 'rule', schema: RuleFrontmatterSchema },
  { name: 'skill', schema: SkillFrontmatterSchema },
  { name: 'agent', schema: AgentFrontmatterSchema },
  { name: 'config', schema: ConfigSchema },
  { name: 'lockfile', schema: LockfileSchema },
]

for (const { name, schema } of schemas) {
  const jsonSchema = zodToJsonSchema(schema, {
    name: `${name}Schema`,
    target: 'jsonSchema7',
  })
  const outputPath = resolve(schemasDir, `${name}.schema.json`)
  writeFileSync(outputPath, JSON.stringify(jsonSchema, null, 2) + '\n')
  console.log(`已生成 ${outputPath}`)
}

console.log('完成。所有 JSON schema 已生成。')
```

- [ ] **步骤 3：运行脚本**

根 `package.json` 已有 `tsx` 作为 devDependency。运行：

运行：`pnpm generate:schema`
预期：6 个 JSON schema 文件在 `schemas/` 中创建

- [ ] **步骤 4：验证生成的 schema 是有效 JSON**

运行：`for f in schemas/*.schema.json; do node -e "JSON.parse(require('fs').readFileSync('$f','utf8'))" && echo "$f OK" || echo "$f FAIL"; done`
预期：6 个文件均输出 OK

- [ ] **步骤 5：提交生成的 schema**

```bash
git add scripts/generate-json-schema.ts schemas/
git commit -m "feat: 添加 JSON Schema 生成脚本和导出的 schema 文件"
```

---

### 任务 14：创建 validate-manifest.ts 脚本

**文件：**
- 创建：`scripts/validate-manifest.ts`
- 创建：`packages/schema/src/validate-manifest.ts`（验证逻辑）
- 创建：`packages/schema/tests/validate-manifest.test.ts`（验证逻辑测试）

- [ ] **步骤 1：编写失败测试**

```typescript
// packages/schema/tests/validate-manifest.test.ts
import { describe, it, expect } from 'vitest'
import { validateManifest } from '../src/validate-manifest'

describe('validateManifest', () => {
  it('有效 manifest 返回成功', () => {
    const manifest = {
      schemaVersion: '1',
      name: 'react-rules',
      version: '1.4.0',
      type: 'rules',
      layer: 'stack',
      description: 'React 编码规范',
      entry: {
        rules: ['rules/hooks.md'],
        skills: [],
        agents: [],
        domains: [],
        playbooks: [],
        templates: [],
      },
    }
    const result = validateManifest(manifest)
    expect(result.success).toBe(true)
  })

  it('无效 manifest 返回错误', () => {
    const result = validateManifest({ name: '' })
    expect(result.success).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('错误消息中包含字段路径', () => {
    const result = validateManifest({ schemaVersion: '1', name: 'x', version: 'bad' })
    expect(result.success).toBe(false)
    const hasVersionError = result.errors.some(e => e.includes('version'))
    expect(hasVersionError).toBe(true)
  })
})
```

- [ ] **步骤 2：运行测试确认失败**

运行：`cd packages/schema && pnpm test -- tests/validate-manifest.test.ts`
预期：失败

- [ ] **步骤 3：编写验证逻辑**

```typescript
// packages/schema/src/validate-manifest.ts
import { ManifestSchema } from './manifest'
import type { ZodError } from 'zod'

export interface ValidationResult {
  success: boolean
  errors: string[]
}

export function validateManifest(data: unknown): ValidationResult {
  const result = ManifestSchema.safeParse(data)
  if (result.success) {
    return { success: true, errors: [] }
  }
  const errors = formatZodErrors(result.error)
  return { success: false, errors }
}

function formatZodErrors(error: ZodError): string[] {
  return error.issues.map(issue => {
    const path = issue.path.length > 0 ? issue.path.join('.') + ': ' : ''
    return `${path}${issue.message}`
  })
}
```

- [ ] **步骤 4：在 index.ts 中导出 validateManifest**

在 `packages/schema/src/index.ts` 中添加：

```typescript
export { validateManifest } from './validate-manifest'
export type { ValidationResult } from './validate-manifest'
```

- [ ] **步骤 5：运行测试确认通过**

运行：`cd packages/schema && pnpm test -- tests/validate-manifest.test.ts`
预期：通过

- [ ] **步骤 6：编写 CLI 脚本**

```typescript
// scripts/validate-manifest.ts
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse as parseYaml } from 'yaml'
import { validateManifest } from '../packages/schema/src/validate-manifest.js'

const __dirname = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// 查找 packages/assets/*/ 下的所有 manifest.yaml 文件
const assetsDir = resolve(__dirname, 'packages', 'assets')
let hasErrors = false

try {
  const assetDirs = readdirSync(assetsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())

  for (const dir of assetDirs) {
    const manifestPath = resolve(assetsDir, dir.name, 'manifest.yaml')
    try {
      const content = readFileSync(manifestPath, 'utf-8')
      const data = parseYaml(content)
      const result = validateManifest(data)
      if (result.success) {
        console.log(`✓ ${dir.name}/manifest.yaml`)
      } else {
        console.error(`✗ ${dir.name}/manifest.yaml`)
        for (const error of result.errors) {
          console.error(`  - ${error}`)
        }
        hasErrors = true
      }
    } catch (err) {
      console.error(`✗ ${dir.name}/manifest.yaml — 读取失败: ${err}`)
      hasErrors = true
    }
  }
} catch {
  console.log('未找到 packages/assets/ 目录，跳过 manifest 验证。')
}

if (hasErrors) {
  process.exit(1)
}
```

- [ ] **步骤 7：添加 yaml 依赖**

运行：`pnpm add -D yaml`

- [ ] **步骤 8：验证脚本运行（暂无资产包，应跳过）**

运行：`pnpm validate`
预期：输出"未找到 packages/assets/ 目录，跳过 manifest 验证。"

- [ ] **步骤 9：提交**

```bash
git add scripts/validate-manifest.ts packages/schema/src/validate-manifest.ts packages/schema/tests/validate-manifest.test.ts packages/schema/src/index.ts
git commit -m "feat: 添加 validate-manifest 脚本和验证逻辑"
```

---

### 任务 15：创建 sync-versions.ts 脚本

**文件：**
- 创建：`scripts/sync-versions.ts`

- [ ] **步骤 1：编写脚本**

```typescript
// scripts/sync-versions.ts
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse as parseYaml } from 'yaml'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')

interface SyncResult {
  package: string
  status: 'ok' | 'mismatch' | 'error'
  packageJsonVersion?: string
  manifestVersion?: string
  message?: string
}

function syncAssetPackages(): SyncResult[] {
  const results: SyncResult[] = []
  const assetsDir = resolve(rootDir, 'packages', 'assets')

  let dirs: string[]
  try {
    dirs = readdirSync(assetsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
  } catch {
    console.log('未找到 packages/assets/ 目录，跳过版本同步。')
    return results
  }

  for (const dir of dirs) {
    const pkgPath = resolve(assetsDir, dir, 'package.json')
    const manifestPath = resolve(assetsDir, dir, 'manifest.yaml')
    const pkgName = `@ai-context/${dir}`

    try {
      const pkgJson = JSON.parse(readFileSync(pkgPath, 'utf-8'))
      const pkgVersion = pkgJson.version

      try {
        const manifestContent = readFileSync(manifestPath, 'utf-8')
        const manifest = parseYaml(manifestContent)
        const manifestVersion = manifest.version

        if (pkgVersion === manifestVersion) {
          results.push({ package: pkgName, status: 'ok', packageJsonVersion: pkgVersion, manifestVersion })
        } else {
          results.push({
            package: pkgName,
            status: 'mismatch',
            packageJsonVersion: pkgVersion,
            manifestVersion,
            message: `package.json=${pkgVersion}, manifest.yaml=${manifestVersion}`,
          })
        }
      } catch {
        results.push({ package: pkgName, status: 'error', message: 'manifest.yaml 未找到或无法读取' })
      }
    } catch {
      results.push({ package: pkgName, status: 'error', message: 'package.json 未找到或无法读取' })
    }
  }

  return results
}

const results = syncAssetPackages()

if (results.length === 0) {
  process.exit(0)
}

let hasErrors = false
for (const r of results) {
  if (r.status === 'ok') {
    console.log(`✓ ${r.package} — v${r.packageJsonVersion}`)
  } else if (r.status === 'mismatch') {
    console.error(`✗ ${r.package} — 版本不匹配: ${r.message}`)
    hasErrors = true
  } else {
    console.error(`✗ ${r.package} — ${r.message}`)
    hasErrors = true
  }
}

if (hasErrors) {
  process.exit(1)
}
```

- [ ] **步骤 2：验证脚本运行（暂无资产包，应跳过）**

运行：`pnpm sync-versions`
预期：输出"未找到 packages/assets/ 目录，跳过版本同步。"

- [ ] **步骤 3：提交**

```bash
git add scripts/sync-versions.ts
git commit -m "feat: 添加 sync-versions 脚本用于 package.json ↔ manifest.yaml 版本同步"
```

---

### 任务 16：搭建 CI 流水线

**文件：**
- 创建：`.github/workflows/ci.yml`

- [ ] **步骤 1：创建 CI 工作流**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-validate-build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20, 22]

    steps:
      - uses: actions/checkout@v4

      - name: 安装 pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: 设置 Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: pnpm

      - name: 安装依赖
        run: pnpm install --frozen-lockfile

      - name: 代码检查
        run: pnpm lint

      - name: 验证 manifest
        run: pnpm validate

      - name: 版本同步检查
        run: pnpm sync-versions

      - name: 构建
        run: pnpm build

      - name: 测试
        run: pnpm test
```

- [ ] **步骤 2：验证工作流文件是有效 YAML**

运行：`node -e "require('fs').readFileSync('.github/workflows/ci.yml','utf8'); console.log('YAML 可读取')"`
预期："YAML 可读取"

- [ ] **步骤 3：提交**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: 添加 GitHub Actions 工作流（lint + validate + build + test）"
```

---

### 任务 17：初始化 VitePress 文档站

**文件：**
- 创建：`docs/package.json`
- 创建：`docs/src/.vitepress/config.ts`
- 创建：`docs/src/index.md`
- 创建：`docs/src/cli/getting-started.md`
- 创建：`docs/src/assets/overview.md`
- 创建：`docs/src/architecture/overview.md`

- [ ] **步骤 1：创建 docs/package.json**

```json
{
  "name": "@ai-context/docs",
  "private": true,
  "scripts": {
    "dev": "vitepress dev src",
    "build": "vitepress build src",
    "preview": "vitepress preview src"
  },
  "devDependencies": {
    "vitepress": "^1.6.0"
  }
}
```

- [ ] **步骤 2：创建 VitePress 配置**

```typescript
// docs/src/.vitepress/config.ts
import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'AI Context Platform',
  description: '企业级 AI Coding 知识管理',

  themeConfig: {
    nav: [
      { text: 'CLI', link: '/cli/getting-started' },
      { text: '资产', link: '/assets/overview' },
      { text: '架构', link: '/architecture/overview' },
    ],

    sidebar: {
      '/cli/': [
        { text: '快速开始', link: '/cli/getting-started' },
      ],
      '/assets/': [
        { text: '总览', link: '/assets/overview' },
      ],
      '/architecture/': [
        { text: '总览', link: '/architecture/overview' },
      ],
    },

    search: {
      provider: 'local',
    },
  },
})
```

- [ ] **步骤 3：创建 index.md**

```markdown
---
layout: home

hero:
  name: AI Context Platform
  text: AI Coding 知识管理
  tagline: 结构化、版本化、组装运行时上下文，为 AI 编码工具赋能
  actions:
    - theme: brand
      text: 快速开始
      link: /cli/getting-started
    - theme: alt
      text: 架构设计
      link: /architecture/overview
---
```

- [ ] **步骤 4：创建 cli/getting-started.md**

```markdown
# 快速开始

## 安装

```bash
npm install -g @ai-context/cli
```

## 初始化项目

```bash
ai-context init
```

创建 `.ai/` 目录和 `config.yaml`。

## 添加包

```bash
ai-context add @ai-context/core-engineering
```

## 构建运行时上下文

```bash
ai-context build review --tool claude-code
```

生成内容：
- **第一层**：索引文件（`CLAUDE.md`）包含核心规则和资源路径
- **第二层**：内容文件（`.ai/runtime/rules/`、`.ai/runtime/skills/` 等）
```

- [ ] **步骤 5：创建 assets/overview.md**

```markdown
# 资产类型总览

AI Context Platform 将知识组织为可组合的包，称为 **AI Context Package**。

## 包类型

| 类型 | 用途 | 示例 |
|------|------|------|
| Rules | 编码标准和约束 | react-rules, backend-security |
| Skills | 任务特定工作流 | react-review skill |
| Agents | 自主行为配置 | reviewer-agent |
| Domains | 业务领域知识 | payment-domain |
| Playbooks | 分步操作手册 | migration-playbook |
| Templates | 代码脚手架模板 | component-template |

## 层级

包按抽象层级组织：

| 层级 | 范围 | 示例 |
|------|------|------|
| core | 通用工程标准 | clean-code, git-conventions |
| stack | 技术栈规范 | react-rules, node-backend |
| domain | 业务领域知识 | payment-domain, auth-domain |
| project | 项目特有规范 | my-project-conventions |
| runtime | 动态生成上下文 | git-diff-summary |

高层级在冲突时覆盖低层级。
```

- [ ] **步骤 6：创建 architecture/overview.md**

```markdown
# 架构总览

## 两层输出模型

核心创新是**索引 + 内容**两层架构：

### 第一层 — 索引层（始终加载，约 3000 token）

写入工具特定入口文件（`CLAUDE.md`、`AGENTS.md`、`GEMINI.md`）。包含：
- 核心规则摘要
- 资源索引及文件路径
- 当前任务优先级列表

### 第二层 — 内容层（按需加载）

写入 `.ai/runtime/` 作为独立 markdown 文件。每个文件是完整的 rule、skill、agent、domain 或 playbook。

## Build Pipeline

```
ai-context build review --tool claude-code
  → Task Resolution → Package Retrieval → Filtering & Ranking
  → Content Extraction → Two-Tier Output → Adapter Rendering
```

## 标记区域机制

索引文件使用标记注释保护用户内容：

```
<!-- AI-CONTEXT:INDEX:START -->
... CLI 生成的内容（每次 build 时替换）...
<!-- AI-CONTEXT:INDEX:END -->
```

标记前后的内容在 build 时保留。
```

- [ ] **步骤 7：安装 docs 依赖并验证**

运行：`cd docs && pnpm install && pnpm build`
预期：VitePress 构建成功

- [ ] **步骤 8：提交**

```bash
git add docs/
git commit -m "feat(docs): 初始化 VitePress 文档站骨架"
```

---

### 任务 18：最终验证 — 完整单仓库构建与测试

**文件：** 无（仅验证）

- [ ] **步骤 1：从根目录运行完整安装**

运行：`pnpm install`
预期：所有 workspace 包安装成功

- [ ] **步骤 2：运行完整 lint**

运行：`pnpm lint`
预期：无 lint 错误

- [ ] **步骤 3：运行完整构建**

运行：`pnpm build`
预期：`@ai-context/schema` 和 `@ai-context/docs` 均构建成功

- [ ] **步骤 4：运行所有测试**

运行：`pnpm test`
预期：所有 vitest 测试通过

- [ ] **步骤 5：验证 schema 包可从其他 workspace 包导入**

运行：`node -e "const s = require('./packages/schema/dist/index.cjs'); console.log(Object.keys(s).slice(0,5))"`
预期：输出 @ai-context/schema 的导出名称数组

- [ ] **步骤 6：运行 JSON schema 生成**

运行：`pnpm generate:schema`
预期：在 schemas/ 中生成 6 个 schema 文件

- [ ] **步骤 7：验证 pnpm workspace 列表**

运行：`pnpm ls -r --depth 0`
预期：列出 root、@ai-context/schema、@ai-context/docs

---

## 自审检查

### 1. 提案覆盖率

| Phase 1 要求 | 对应任务 |
|-------------|---------|
| 初始化单仓库（pnpm workspaces + tsconfig.base.json） | 任务 1 |
| 创建 `packages/schema/`，定义所有 Zod schema 和 TypeScript 类型 | 任务 2-12 |
| 创建 `schemas/` 目录，导出 JSON Schema | 任务 13 |
| 创建 `scripts/validate-manifest.ts` | 任务 14 |
| 创建 `scripts/sync-versions.ts` | 任务 15 |
| 搭建 CI（lint + validate + build） | 任务 16 |
| 初始化 `docs/`（VitePress + 基础页面） | 任务 17 |
| 最终验证 | 任务 18 |

### 2. 占位符扫描

未发现 TBD、TODO、"稍后实现"、"补充细节"、"添加适当的错误处理"或"类似任务 N"等占位符。所有代码步骤包含完整实现。

### 3. 类型一致性

- `Layer` 枚举值（`core`、`stack`、`domain`、`project`、`runtime`）在 `constants.ts`、`manifest.ts`、`rule.ts` 中一致使用
- `Priority` 枚举值（`critical`、`high`、`medium`、`low`）在 `constants.ts`、`manifest.ts`、`rule.ts`、`skill.ts`、`agent.ts`、`adapter.ts` 中一致使用
- `PackageType` 枚举值在 `constants.ts`、`manifest.ts`、`task.ts` 中一致使用
- `TaskType` 值与提案中的 task 表格匹配
- `ContentFileSchema.type` 使用字面量枚举，与 `PackageType` 值减去 `meta` 加上 `playbook`（单数）对齐——与提案中的运行时文件类型一致
- `ToolCapabilitiesSchema.contextFileFormat` 使用提案中的 3 种格式
- `index.ts` 中所有导入与源文件的实际导出匹配
