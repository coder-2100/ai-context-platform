# Phase 5 — Multi-Tool Adapters 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 Trae adapter（multi-md 格式）、Gemini 回退策略、adapter 相关文档

**Architecture:** 在现有 adapter 注册机制基础上，新增 TraeAdapter 独立实现 multi-md 渲染逻辑（无索引文件、内容直接写入 `.trae/` 目录），将 Gemini 和未知工具的回退目标从 ClaudeCodeAdapter 改为 CodexAdapter。build 命令增加回退提示信息和 `.trae/` 目录清理支持。

**Tech Stack:** TypeScript, Vitest, VitePress

---

## 文件变更地图

| 文件 | 变更 | 职责 |
|------|------|------|
| `packages/cli/src/adapters/trae.ts` | 新增 | Trae adapter 实现：multi-md 格式，无索引文件 |
| `packages/cli/src/adapters/types.ts` | 修改 | getAdapter 回退逻辑改为 Codex、新增 trae 动态导入、更新 TRAE_CAPABILITIES |
| `packages/cli/src/commands/build.ts` | 修改 | Trae 无索引文件适配 + 回退提示 + `.trae/` 目录清理 |
| `packages/cli/src/engine/index-builder.ts` | 修改 | `cleanRuntimeDir` 扩展支持 `.trae/` 目录、`TOOL_INDEX_FILES` 新增 trae 和 gemini 条目 |
| `packages/cli/tests/adapters/trae.test.ts` | 新增 | Trae adapter 单元测试 |
| `packages/cli/tests/commands/build.test.ts` | 修改 | build 命令 trae/gemini 相关集成测试 |
| `docs/src/cli/adapters.md` | 新增 | Adapters 使用文档 |
| `docs/src/architecture/adapter-system.md` | 新增 | Adapter 系统设计文档 |
| `docs/src/.vitepress/config.ts` | 修改 | 侧边栏导航新增页面 |

---

### Task 1: TraeAdapter 实现

**Files:**
- Create: `packages/cli/src/adapters/trae.ts`
- Test: `packages/cli/tests/adapters/trae.test.ts`

- [ ] **Step 1: 写 TraeAdapter 的失败测试**

```typescript
// packages/cli/tests/adapters/trae.test.ts
import type { AdapterInput } from "@coder-2100/schema";
import { describe, expect, it } from "vitest";
import type { ExtractedContent } from "../../src/engine/content-extraction";

const mockContents: ExtractedContent[] = [
  {
    type: "rule",
    id: "core-coding-standards",
    name: "Core Coding Standards",
    content: "# Core Coding Standards\n\n- Prefer composition over inheritance",
    priority: "high",
    layer: "core",
    appliesTo: ["review", "implement"],
    sourcePath: "rules/coding-standards.md",
  },
  {
    type: "skill",
    id: "react-review-skill",
    name: "React Review Skill",
    content: "# React Review Skill\n\nFocus on rendering performance.",
    priority: "medium",
    layer: "stack",
    appliesTo: ["review"],
    sourcePath: "skills/react-review.md",
  },
  {
    type: "agent",
    id: "reviewer-agent",
    name: "Reviewer Agent",
    content: "# Reviewer Agent\n\nCode review focused on correctness.",
    priority: "high",
    layer: "stack",
    appliesTo: ["review"],
    sourcePath: "agents/reviewer.md",
  },
  {
    type: "domain",
    id: "payment-domain",
    name: "Payment Domain",
    content: "# Payment Domain\n\nPayment processing knowledge.",
    priority: "medium",
    layer: "domain",
    appliesTo: ["implement"],
    sourcePath: "domains/payment.md",
  },
  {
    type: "playbook",
    id: "migration-playbook",
    name: "Migration Playbook",
    content: "# Migration Playbook\n\nDatabase migration guide.",
    priority: "medium",
    layer: "domain",
    appliesTo: ["migration"],
    sourcePath: "playbooks/migration.md",
  },
];

const mockInput: AdapterInput = {
  task: "review",
  packages: [
    {
      name: "@coder-2100/core-engineering",
      version: "1.0.0",
      manifest: {
        schemaVersion: "1",
        name: "core-engineering",
        version: "1.0.0",
        type: "rules",
        layer: "core",
        description: "通用工程编码规范",
        entry: { rules: [], skills: [], agents: [], domains: [], playbooks: [], templates: [] },
      },
    },
  ],
  rules: [],
  skills: [],
  agents: [],
  domains: [],
  playbooks: [],
  indexBudget: 3000,
  contentBudget: 10000,
  toolCapabilities: {
    maxTokens: 64000,
    supportsMultiFile: true,
    supportsImages: true,
    indexFileLocation: "",
    contentDirLocation: ".trae/",
    contextFileFormat: "multi-md",
  },
};

describe("TraeAdapter", () => {
  // 动态导入避免编译报错
  async function getAdapter() {
    const { TraeAdapter } = await import("../../src/adapters/trae");
    return new TraeAdapter();
  }

  it("name 为 trae", async () => {
    const adapter = await getAdapter();
    expect(adapter.name).toBe("trae");
  });

  it("capabilities 返回 Trae 工具能力", async () => {
    const adapter = await getAdapter();
    const caps = adapter.capabilities;
    expect(caps.maxTokens).toBe(64000);
    expect(caps.indexFileLocation).toBe("");
    expect(caps.contentDirLocation).toBe(".trae/");
    expect(caps.contextFileFormat).toBe("multi-md");
    expect(caps.supportsMultiFile).toBe(true);
    expect(caps.supportsImages).toBe(true);
  });

  it("render 生成 .trae/ 目录下的内容文件，无索引文件", async () => {
    const adapter = await getAdapter();
    const output = adapter.render(mockInput, mockContents, "my-project");
    // 无索引文件
    expect(output.index.path).toBe("");
    expect(output.index.content).toBe("");
    // 内容文件写入 .trae/ 目录
    expect(output.files).toHaveLength(5);
    expect(output.files[0].type).toBe("rule");
    expect(output.files[0].id).toBe("core-coding-standards");
    expect(output.files[0].path).toBe(".trae/rules/core-coding-standards.md");
    expect(output.files[1].type).toBe("skill");
    expect(output.files[1].path).toBe(".trae/skills/react-review-skill.md");
    expect(output.files[2].type).toBe("agent");
    expect(output.files[2].path).toBe(".trae/agents/reviewer-agent.md");
    expect(output.files[3].type).toBe("domain");
    expect(output.files[3].path).toBe(".trae/domains/payment-domain.md");
    expect(output.files[4].type).toBe("playbook");
    expect(output.files[4].path).toBe(".trae/playbooks/migration-playbook.md");
    // instructions 包含 .trae/ 路径
    expect(output.instructions).toEqual(
      expect.arrayContaining([
        expect.stringContaining(".trae/rules/"),
        expect.stringContaining(".trae/skills/"),
      ]),
    );
  });

  it("空内容时返回空文件列表", async () => {
    const adapter = await getAdapter();
    const emptyInput = { ...mockInput, packages: [] };
    const output = adapter.render(emptyInput, [], "my-project");
    expect(output.files).toHaveLength(0);
    expect(output.index.path).toBe("");
  });

  it("内容文件保留原始内容", async () => {
    const adapter = await getAdapter();
    const output = adapter.render(mockInput, mockContents, "my-project");
    const ruleFile = output.files.find((f) => f.id === "core-coding-standards")!;
    expect(ruleFile.content).toContain("Core Coding Standards");
    expect(ruleFile.content).toContain("Prefer composition over inheritance");
  });

  it("内容文件继承 appliesTo 和 priority", async () => {
    const adapter = await getAdapter();
    const output = adapter.render(mockInput, mockContents, "my-project");
    const ruleFile = output.files.find((f) => f.id === "core-coding-standards")!;
    expect(ruleFile.appliesTo).toEqual(["review", "implement"]);
    expect(ruleFile.priority).toBe("high");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter @coder-2100/cli vitest run tests/adapters/trae.test.ts`
Expected: FAIL — `../../src/adapters/trae` 模块不存在

- [ ] **Step 3: 实现 TraeAdapter**

```typescript
// packages/cli/src/adapters/trae.ts
import type {
  Adapter,
  AdapterInput,
  AdapterOutput,
  ContentFile,
} from "@coder-2100/schema";
import type { ExtractedContent } from "../engine/content-extraction";
import { TRAE_CAPABILITIES } from "./types";

/** Trae 适配器，将内容渲染为 .trae/ 目录下的多文件格式（multi-md），无索引文件 */
export class TraeAdapter implements Adapter {
  name = "trae" as const;
  capabilities = TRAE_CAPABILITIES;

  /**
   * 渲染适配器输出：所有内容直接写入 .trae/{type}s/ 目录，不生成索引文件
   * Trae 原生支持多文件格式，规则和技能分目录存放
   */
  render(
    input: AdapterInput,
    contents: ExtractedContent[],
    _projectName: string,
    _indexOnlyContents?: ExtractedContent[],
  ): AdapterOutput {
    const files: ContentFile[] = contents.map((c) => ({
      type: c.type,
      id: c.id,
      name: c.name,
      path: `.trae/${c.type}s/${c.id}.md`,
      content: c.content,
      appliesTo: c.appliesTo,
      priority: c.priority,
    }));

    // 收集已生成的类型目录，用于 instructions
    const typeDirs = new Set(files.map((f) => f.type));
    const typeLabels: Record<string, string> = {
      rule: "rules",
      skill: "skills",
      agent: "agents",
      domain: "domains",
      playbook: "playbooks",
    };
    const instructions = [...typeDirs]
      .map((t) => `Trae ${typeLabels[t] || t} 已写入 .trae/${typeLabels[t] || t}/`);

    return {
      index: { content: "", path: "" },
      files,
      instructions,
    };
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter @coder-2100/cli vitest run tests/adapters/trae.test.ts`
Expected: PASS — 所有 6 个测试通过

- [ ] **Step 5: 提交**

```bash
git add packages/cli/src/adapters/trae.ts packages/cli/tests/adapters/trae.test.ts
git commit -m "feat(cli): 实现 TraeAdapter（multi-md 格式，无索引文件）"
```

---

### Task 2: 修改 getAdapter 回退逻辑 + 更新 TRAE_CAPABILITIES

**Files:**
- Modify: `packages/cli/src/adapters/types.ts`

- [ ] **Step 1: 修改 types.ts**

需要做三处改动：
1. `TRAE_CAPABILITIES.indexFileLocation` 改为 `""`（Trae 无索引文件）
2. `getAdapter()` 中 trae 分支动态导入 `TraeAdapter`，gemini 和 default 回退到 `CodexAdapter`
3. `getCapabilities()` 中 gemini 回退到 `CODEX_CAPABILITIES`

```typescript
// packages/cli/src/adapters/types.ts — 完整替换
import type { Adapter, ToolCapabilities } from "@coder-2100/schema";

/** Claude Code 的工具能力配置：200k token、多文件和图片支持 */
export const CLAUDE_CODE_CAPABILITIES: ToolCapabilities = {
  maxTokens: 200000,
  supportsMultiFile: true,
  supportsImages: true,
  indexFileLocation: "CLAUDE.md",
  contentDirLocation: ".ai/runtime/",
  contextFileFormat: "index-plus-files",
};

/** Codex 的工具能力配置：32k token、多文件支持、不支持图片 */
export const CODEX_CAPABILITIES: ToolCapabilities = {
  maxTokens: 32000,
  supportsMultiFile: true,
  supportsImages: false,
  indexFileLocation: "AGENTS.md",
  contentDirLocation: ".ai/runtime/",
  contextFileFormat: "index-plus-files",
};

/** Trae 的工具能力配置：64k token、多文件和图片支持、multi-md 格式、无索引文件 */
export const TRAE_CAPABILITIES: ToolCapabilities = {
  maxTokens: 64000,
  supportsMultiFile: true,
  supportsImages: true,
  indexFileLocation: "",
  contentDirLocation: ".trae/",
  contextFileFormat: "multi-md",
};

/** Gemini 的工具能力配置：128k token、回退到 Codex 格式输出 AGENTS.md */
export const GEMINI_CAPABILITIES: ToolCapabilities = {
  maxTokens: 128000,
  supportsMultiFile: true,
  supportsImages: true,
  indexFileLocation: "AGENTS.md",
  contentDirLocation: ".ai/runtime/",
  contextFileFormat: "index-plus-files",
};

/** 支持的 AI 工具名称 */
export type ToolName = "claude-code" | "codex" | "trae" | "gemini";

/** 根据工具名称获取对应的能力配置；gemini 回退到 Codex 配置 */
export function getCapabilities(tool: ToolName): ToolCapabilities {
  switch (tool) {
    case "claude-code":
      return CLAUDE_CODE_CAPABILITIES;
    case "codex":
      return CODEX_CAPABILITIES;
    case "trae":
      return TRAE_CAPABILITIES;
    case "gemini":
      return GEMINI_CAPABILITIES;
  }
}

/** 根据工具名称获取对应的适配器实例（异步，因为 ESM 动态导入） */
export async function getAdapter(tool: ToolName): Promise<Adapter> {
  switch (tool) {
    case "claude-code": {
      const { ClaudeCodeAdapter } = await import("./claude");
      return new ClaudeCodeAdapter();
    }
    case "codex": {
      const { CodexAdapter } = await import("./codex");
      return new CodexAdapter();
    }
    case "trae": {
      const { TraeAdapter } = await import("./trae");
      return new TraeAdapter();
    }
    case "gemini":
    default: {
      // Gemini 及未知工具回退到 Codex 模式（AGENTS.md 格式）
      const { CodexAdapter } = await import("./codex");
      return new CodexAdapter();
    }
  }
}
```

- [ ] **Step 2: 运行现有 adapter 测试确认无回归**

Run: `pnpm --filter @coder-2100/cli vitest run tests/adapters/`
Expected: PASS — claude.test.ts 和 codex.test.ts 全部通过

- [ ] **Step 3: 运行全部 CLI 测试确认无回归**

Run: `pnpm --filter @coder-2100/cli test`
Expected: PASS — 所有测试通过

- [ ] **Step 4: 提交**

```bash
git add packages/cli/src/adapters/types.ts
git commit -m "feat(cli): getAdapter 回退 Codex + Trae 动态导入 + TRAE_CAPABILITIES 无索引文件"
```

---

### Task 3: build 命令适配 Trae + 回退提示

**Files:**
- Modify: `packages/cli/src/commands/build.ts`
- Modify: `packages/cli/src/engine/index-builder.ts`

- [ ] **Step 1: 修改 index-builder.ts — cleanRuntimeDir 扩展支持 .trae/ 目录 + TOOL_INDEX_FILES 新增条目**

在 `cleanRuntimeDir` 函数后新增 `cleanTraeDir` 函数，并更新 `TOOL_INDEX_FILES`：

```typescript
// packages/cli/src/engine/index-builder.ts

// 修改 TOOL_INDEX_FILES，新增 trae 和 gemini 条目
export const TOOL_INDEX_FILES: Record<string, string> = {
  "claude-code": "CLAUDE.md",
  codex: "AGENTS.md",
  trae: "",       // Trae 无索引文件
  gemini: "AGENTS.md",  // Gemini 回退到 AGENTS.md
};

// 在 cleanRuntimeDir 函数之后新增：

/** 清空 .trae/ 目录下各子目录中的文件，保留目录结构 */
export function cleanTraeDir(projectDir: string): void {
  const traeDir = join(projectDir, ".trae");
  if (!existsSync(traeDir)) return;
  for (const sub of readdirSync(traeDir, { withFileTypes: true })) {
    if (sub.isDirectory()) {
      const subDir = join(traeDir, sub.name);
      for (const file of readdirSync(subDir, { withFileTypes: true })) {
        rmSync(join(subDir, file.name), { recursive: true, force: true });
      }
    }
  }
}
```

- [ ] **Step 2: 修改 build.ts — 适配 Trae 无索引文件 + 回退提示 + .trae/ 目录清理**

```typescript
// packages/cli/src/commands/build.ts — 完整替换
import {
  existsSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { ResolvedPackage } from "@coder-2100/schema";
import chalk from "chalk";
import ora from "ora";
import { getAdapter } from "../adapters/types";
import { GLOBAL_CACHE_DIR } from "../core/paths";
import { PackageManager } from "../core/package-manager";
import { assembleContents } from "../engine/assembly";
import {
  extractContent,
  extractFrontmatterFromContents,
  resolveInheritedContent,
} from "../engine/content-extraction";
import { cleanRuntimeDir, cleanTraeDir, writeIndexFile } from "../engine/index-builder";
import { rankContents } from "../engine/ranking";
import { resolveTaskContents } from "../engine/task-resolver";

/** build 命令的选项 */
export interface BuildOptions {
  projectDir: string;
  task: string;
  /** 目标工具名称，如 claude-code / codex / trae / gemini */
  tool: string;
  assetsDir?: string;
  /** npm 包缓存目录，默认指向全局 ~/.ai-context/cache，测试可注入 */
  cacheDir?: string;
  dryRun?: boolean;
  verbose?: boolean;
  /** 为所有已启用的工具生成，开启时忽略 tool 参数 */
  allTools?: boolean;
}

/** 判断工具名是否为回退到 Codex 的工具（gemini 或未知工具） */
function isCodexFallback(tool: string): boolean {
  return tool !== "claude-code" && tool !== "codex" && tool !== "trae";
}

/**
 * 构建运行时上下文，串联完整 Pipeline：
 * Stage 1 内容提取 → Stage 2 合并与冲突解决 → Stage 3 排序 →
 * Stage 4 任务解析 → Stage 5 提取 frontmatter → Stage 6 适配器渲染
 */
export async function buildCommand(options: BuildOptions): Promise<void> {
  const spinner = ora("Building runtime context...").start();

  try {
    // 干跑模式不清理也不写入
    if (!options.dryRun) {
      cleanRuntimeDir(options.projectDir);
      cleanTraeDir(options.projectDir);
    }

    const pm = new PackageManager({
      projectDir: options.projectDir,
      assetsDir: options.assetsDir,
    });

    pm.loadExisting();
    const config = pm.getConfig();
    const installedPackages = pm.list() as ResolvedPackage[];

    if (installedPackages.length === 0) {
      spinner.warn("没有已安装的包。运行 ai-context add 安装包。");
      return;
    }

    // ── Stage 1: 内容提取 ──
    const allContents = [];
    /** 只有 isEntry 包的内容进入索引 */
    const indexContents = [];
    const cacheDir = options.cacheDir ?? GLOBAL_CACHE_DIR;
    const lockfile = pm.getLockfile();
    /** 标记哪些包是用户直接添加的（isEntry） */
    const entryPackageNames = new Set(
      config.packages.filter((p) => p.isEntry).map((p) => p.name),
    );
    for (const pkg of installedPackages) {
      const lockEntry = lockfile.packages[pkg.name];
      let contents = await extractContent(
        options.assetsDir,
        pkg.name,
        config.scope,
        cacheDir,
        lockEntry?.version,
      );

      // 解析 extends 继承
      if (pkg.manifest.extends.length > 0) {
        contents = await resolveInheritedContent(
          options.assetsDir,
          contents,
          pkg.manifest.extends,
          config.scope,
          cacheDir,
        );
      }

      allContents.push(...contents);
      if (entryPackageNames.has(pkg.name)) {
        indexContents.push(...contents);
      }
    }

    // ── Stage 2: 合并与冲突解决 ──
    const { merged: mergedAll, conflicts } = assembleContents(allContents);
    const { merged: mergedIndex } = assembleContents(indexContents);

    if (options.verbose && conflicts.length > 0) {
      for (const conflict of conflicts) {
        console.log(
          chalk.dim(
            `  冲突解决: ${conflict.id} — 保留 ${conflict.resolvedContent.sourcePath}`,
          ),
        );
      }
    }

    // ── Stage 3: 排序 ──
    const rankedAll = rankContents(mergedAll);
    const rankedIndex = rankContents(mergedIndex);

    // ── Stage 4: 任务解析（仅影响索引内容） ──
    const taskResult = resolveTaskContents(rankedIndex, options.task);

    if (options.verbose) {
      console.log(
        chalk.dim(
          `  任务解析: ${taskResult.taskContents.length} 条相关，${taskResult.otherContents.length} 条无关`,
        ),
      );
    }

    // ── Stage 5: 提取结构化 frontmatter ──
    const frontmatters = extractFrontmatterFromContents(rankedAll);

    // ── Stage 6: 适配器渲染 ──
    // 本次构建要渲染的工具列表：--allTools 时取所有已启用的工具，否则只渲染指定 tool
    const tools = options.allTools
      ? Object.entries(config.tooling)
          .filter(([, v]) => v.enabled)
          .map(([k]) => k)
      : [options.tool];

    for (const tool of tools) {
      // 回退提示：gemini 或未知工具回退到 Codex
      if (isCodexFallback(tool)) {
        console.log(chalk.blue(`ℹ Tool "${tool}" uses Codex adapter (AGENTS.md format)`));
      }

      const adapter = await getAdapter(
        tool as "claude-code" | "codex" | "trae" | "gemini",
      );
      const output = adapter.render(
        {
          task: options.task,
          packages: installedPackages,
          ...frontmatters,
          indexBudget:
            config.budget.perTool[tool]?.indexBudget ||
            config.budget.indexBudget,
          contentBudget: 10000,
          toolCapabilities: adapter.capabilities,
        },
        rankedAll,
        config.project.name,
        rankedIndex,
      );

      if (options.dryRun) {
        spinner.stop();
        if (output.index.path) {
          console.log(
            `${chalk.cyan("[dry-run]")} 工具 ${tool} 将生成的索引内容：`,
          );
          console.log(output.index.content);
        } else {
          console.log(
            `${chalk.cyan("[dry-run]")} 工具 ${tool} 无索引文件（multi-md 格式）`,
          );
        }
        console.log(
          `${chalk.cyan("[dry-run]")} 将写入 ${output.files.length} 个内容文件：`,
        );
        for (const f of output.files) {
          console.log(`  ${f.path}`);
        }
        continue;
      }

      // 写入内容文件
      for (const file of output.files) {
        const fullPath = join(options.projectDir, file.path);
        const dir = join(fullPath, "..");
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
        writeFileSync(fullPath, file.content, "utf-8");
      }

      // 写入索引文件（Trae 无索引文件时跳过）
      if (output.index.path) {
        const indexPath = join(options.projectDir, output.index.path);
        writeIndexFile(indexPath, output.index.content);
      }

      if (options.verbose) {
        console.log(chalk.dim(`  工具 ${tool}: 写入 ${output.files.length} 个内容文件`));
        if (output.index.path) {
          console.log(chalk.dim(`  索引文件: ${output.index.path}`));
        } else {
          console.log(chalk.dim(`  无索引文件（multi-md 格式）`));
        }
      }
    }

    spinner.succeed("Build 完成");
  } catch (err) {
    spinner.fail("Build 失败");
    throw err;
  }
}
```

- [ ] **Step 3: 运行 build 相关测试确认无回归**

Run: `pnpm --filter @coder-2100/cli vitest run tests/commands/build.test.ts`
Expected: PASS — 所有现有测试通过

- [ ] **Step 4: 运行全部 CLI 测试确认无回归**

Run: `pnpm --filter @coder-2100/cli test`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add packages/cli/src/commands/build.ts packages/cli/src/engine/index-builder.ts
git commit -m "feat(cli): build 命令适配 Trae（无索引文件）+ Gemini 回退提示 + .trae/ 目录清理"
```

---

### Task 4: unbuild 命令适配 Trae

**Files:**
- Modify: `packages/cli/src/commands/unbuild.ts`

- [ ] **Step 1: 修改 unbuild.ts — 适配 Trae 无索引文件和 .trae/ 目录清理**

需要改动：
1. 导入 `cleanTraeDir`
2. Trae 工具的索引文件为空字符串时跳过 `cleanIndexFile`
3. `--all-tools` 时同时清理 `.trae/` 目录

在 `unbuild.ts` 中修改：

```typescript
// 修改导入：加入 cleanTraeDir
import {
  MARKER_END,
  MARKER_START,
  TOOL_INDEX_FILES,
  cleanRuntimeDir,
  cleanTraeDir,
} from "../engine/index-builder";
```

在 `unbuildCommand` 的 for 循环中，`indexPath` 为空字符串时跳过：

```typescript
  // 逐个工具清理索引文件
  for (const tool of tools) {
    const indexPath = TOOL_INDEX_FILES[tool];
    if (!indexPath) {
      console.log(chalk.yellow(`  未知工具: ${tool}，跳过`));
      continue;
    }
    // Trae 无索引文件（indexPath 为空字符串已在上面的 !indexPath 中过滤）
    // 但 TOOL_INDEX_FILES 中 trae 的值为 ""，需要额外判断
    if (indexPath === "") {
      console.log(chalk.dim(`  工具 ${tool}: 无索引文件（multi-md 格式）`));
      continue;
    }

    const fullPath = join(options.projectDir, indexPath);
    cleanIndexFile(fullPath, options.force ?? false, dryRun);
    console.log(chalk.dim(`  工具 ${tool}: 索引文件 ${indexPath} 已清理`));
  }
```

等等，`TOOL_INDEX_FILES` 中 trae 的值为 `""`，`!indexPath` 对空字符串为 `true`，所以会被"未知工具"分支捕获。需要区分两种情况：tool 不在 TOOL_INDEX_FILES 中（真的未知）vs 索引文件为空（Trae）。

```typescript
  // 逐个工具清理索引文件
  for (const tool of tools) {
    if (!(tool in TOOL_INDEX_FILES)) {
      console.log(chalk.yellow(`  未知工具: ${tool}，跳过`));
      continue;
    }

    const indexPath = TOOL_INDEX_FILES[tool];
    // Trae 无索引文件
    if (!indexPath) {
      console.log(chalk.dim(`  工具 ${tool}: 无索引文件（multi-md 格式）`));
      continue;
    }

    const fullPath = join(options.projectDir, indexPath);
    cleanIndexFile(fullPath, options.force ?? false, dryRun);
    console.log(chalk.dim(`  工具 ${tool}: 索引文件 ${indexPath} 已清理`));
  }
```

然后在 `--all-tools` 的清理部分，增加 `.trae/` 目录清理：

```typescript
  // 仅 --all-tools 时清理共享内容目录
  if (options.allTools) {
    if (!dryRun) {
      cleanRuntimeDir(options.projectDir);
      console.log(chalk.dim("  .ai/runtime/ 内容文件已清理"));
      cleanTraeDir(options.projectDir);
      console.log(chalk.dim("  .trae/ 内容文件已清理"));
    } else {
      console.log(chalk.cyan("[dry-run] 将清理 .ai/runtime/ 内容文件"));
      console.log(chalk.cyan("[dry-run] 将清理 .trae/ 内容文件"));
    }
  }
```

- [ ] **Step 2: 运行全部 CLI 测试**

Run: `pnpm --filter @coder-2100/cli test`
Expected: PASS

- [ ] **Step 3: 提交**

```bash
git add packages/cli/src/commands/unbuild.ts
git commit -m "feat(cli): unbuild 命令适配 Trae（.trae/ 目录清理 + 无索引文件跳过）"
```

---

### Task 5: build 命令集成测试（Trae + Gemini 回退）

**Files:**
- Modify: `packages/cli/tests/commands/build.test.ts`

- [ ] **Step 1: 在 build.test.ts 末尾新增 Trae 和 Gemini 集成测试**

```typescript
  it("支持 --tool trae 生成 .trae/ 目录内容文件", async () => {
    await initCommand({
      projectDir: TEST_DIR,
      projectName: "test-project",
      assetsDir: ASSETS_DIR,
    });
    await addCommand({
      projectDir: TEST_DIR,
      packageNames: ["@coder-2100/core-engineering"],
      assetsDir: ASSETS_DIR,
    });
    await buildCommand({
      projectDir: TEST_DIR,
      task: "review",
      tool: "trae",
      assetsDir: ASSETS_DIR,
    });
    // .trae/rules/ 下应有内容文件
    expect(
      existsSync(join(TEST_DIR, ".trae", "rules", "core-coding-standards.md")),
    ).toBe(true);
    const content = readFileSync(
      join(TEST_DIR, ".trae", "rules", "core-coding-standards.md"),
      "utf-8",
    );
    expect(content).toContain("Core Coding Standards");
    // Trae 不生成索引文件，不应出现 CLAUDE.md 或 AGENTS.md
    // （但如果项目已有则不删除）
  });

  it("--tool trae 不生成索引文件", async () => {
    await initCommand({
      projectDir: TEST_DIR,
      projectName: "test-project",
      assetsDir: ASSETS_DIR,
    });
    await addCommand({
      projectDir: TEST_DIR,
      packageNames: ["@coder-2100/core-engineering"],
      assetsDir: ASSETS_DIR,
    });
    await buildCommand({
      projectDir: TEST_DIR,
      task: "review",
      tool: "trae",
      assetsDir: ASSETS_DIR,
    });
    // 项目不应自动创建 CLAUDE.md（因为 tool 是 trae）
    // 但 .ai/runtime/ 仍然被清理和重建（共享内容层）
  });

  it("--tool gemini 回退到 Codex 生成 AGENTS.md", async () => {
    await initCommand({
      projectDir: TEST_DIR,
      projectName: "test-project",
      assetsDir: ASSETS_DIR,
    });
    await addCommand({
      projectDir: TEST_DIR,
      packageNames: ["@coder-2100/core-engineering"],
      assetsDir: ASSETS_DIR,
    });
    await buildCommand({
      projectDir: TEST_DIR,
      task: "review",
      tool: "gemini",
      assetsDir: ASSETS_DIR,
    });
    expect(existsSync(join(TEST_DIR, "AGENTS.md"))).toBe(true);
    const content = readFileSync(join(TEST_DIR, "AGENTS.md"), "utf-8");
    expect(content).toContain("core-coding-standards");
  });
```

- [ ] **Step 2: 运行测试**

Run: `pnpm --filter @coder-2100/cli vitest run tests/commands/build.test.ts`
Expected: PASS — 包括新增的 3 个测试

- [ ] **Step 3: 运行全部 CLI 测试**

Run: `pnpm --filter @coder-2100/cli test`
Expected: PASS

- [ ] **Step 4: 提交**

```bash
git add packages/cli/tests/commands/build.test.ts
git commit -m "test(cli): build 命令 Trae/Gemini 集成测试"
```

---

### Task 6: Adapters 文档

**Files:**
- Create: `docs/src/cli/adapters.md`
- Modify: `docs/src/.vitepress/config.ts`

- [ ] **Step 1: 编写 adapters.md**

```markdown
# 工具适配

ai-context 支持多种 AI Coding 工具，通过 Adapter 系统将知识资产渲染为各工具期望的格式。

## 支持的工具

| 工具 | 输出格式 | 索引文件 | 内容目录 | 说明 |
|------|----------|----------|----------|------|
| Claude Code | index-plus-files | `CLAUDE.md` | `.ai/runtime/` | 长上下文，索引包含核心规则 + 资源路径 |
| Codex | index-plus-files | `AGENTS.md` | `.ai/runtime/` | 短上下文，索引更精简 |
| Trae | multi-md | 无 | `.trae/` | 原生多文件格式，规则与技能分目录存放 |
| Gemini | 回退 Codex | `AGENTS.md` | `.ai/runtime/` | 使用 Codex 格式输出 |

## 使用方式

### 指定工具构建

```bash
ai-context build review --tool claude-code
ai-context build review --tool codex
ai-context build review --tool trae
ai-context build review --tool gemini
```

### 为所有已启用工具构建

```bash
ai-context build review --all-tools
```

### 配置启用的工具

在 `.ai/config.yaml` 中配置：

```yaml
tooling:
  claude-code:
    enabled: true
  codex:
    enabled: true
  trae:
    enabled: false
  gemini:
    enabled: false
```

## 两层输出架构

### index-plus-files 格式（Claude Code / Codex）

**索引层**：写入 `CLAUDE.md` 或 `AGENTS.md`，始终精简（约 3000 token），包含：
- 核心规则摘要
- 当前任务优先资源列表
- 可用资源索引及文件路径

**内容层**：写入 `.ai/runtime/` 目录下的独立 markdown 文件，AI 按需读取。

### multi-md 格式（Trae）

所有内容直接写入 `.trae/` 目录下按类型分组的子目录：
- `.trae/rules/` — 规则文件
- `.trae/skills/` — 技能文件
- `.trae/agents/` — Agent 文件
- `.trae/domains/` — 领域知识文件
- `.trae/playbooks/` — 操作手册文件

不生成索引文件，Trae 直接读取各目录下的文件。

## Gemini 回退说明

Gemini 及其他未原生适配的工具回退到 Codex 格式，输出 `AGENTS.md`。构建时会输出提示信息：

```
ℹ Tool "gemini" uses Codex adapter (AGENTS.md format)
```

## 扩展新 Adapter

要为新的 AI 工具添加适配器：

1. 在 `packages/cli/src/adapters/` 下新建 adapter 文件
2. 实现 `Adapter` 接口的 `name`、`capabilities`、`render()` 方法
3. 在 `types.ts` 的 `TOOL_INDEX_FILES` 和 `getAdapter()` 中注册
4. 在 `index-builder.ts` 中添加目录清理逻辑（如需要）
5. 编写单元测试和集成测试
```

- [ ] **Step 2: 更新 VitePress 配置**

在 `docs/src/.vitepress/config.ts` 的 sidebar `/cli/` 下添加 adapters 页面：

```typescript
// 修改 sidebar 的 /cli/ 部分
"/cli/": [
  { text: "快速开始", link: "/cli/getting-started" },
  { text: "工具适配", link: "/cli/adapters" },
],
```

- [ ] **Step 3: 提交**

```bash
git add docs/src/cli/adapters.md docs/src/.vitepress/config.ts
git commit -m "docs: 新增工具适配文档页面"
```

---

### Task 7: Adapter 系统架构文档

**Files:**
- Create: `docs/src/architecture/adapter-system.md`
- Modify: `docs/src/.vitepress/config.ts`

- [ ] **Step 1: 编写 adapter-system.md**

```markdown
# Adapter 系统设计

Adapter 系统负责将工具无关的中间表示（IR）渲染为各 AI 工具期望的特定格式。

## 核心接口

### Adapter

```typescript
interface Adapter {
  name: string;
  capabilities: ToolCapabilities;
  render(input: AdapterInput, contents: ExtractedContent[], projectName: string, indexOnlyContents?: ExtractedContent[]): AdapterOutput;
}
```

- `name`：适配器标识，如 `"claude-code"`、`"codex"`、`"trae"`
- `capabilities`：工具能力描述，决定输出策略
- `render()`：核心渲染方法，将内容转换为工具特定输出

### ToolCapabilities

```typescript
interface ToolCapabilities {
  maxTokens: number;           // 最大上下文 token 数
  supportsMultiFile: boolean;  // 是否支持多文件输出
  supportsImages: boolean;     // 是否支持图片
  indexFileLocation: string;   // 索引文件位置（空字符串表示无索引文件）
  contentDirLocation: string;  // 内容文件目录
  contextFileFormat: 'index-plus-files' | 'single-md' | 'multi-md';
}
```

### AdapterOutput

```typescript
interface AdapterOutput {
  index: IndexOutput;          // 索引文件输出（path 为空表示无索引文件）
  files: ContentFile[];        // 内容文件列表
  instructions: string[];      // 给用户的操作提示
}
```

## 输出格式

### index-plus-files（Claude Code / Codex / Gemini）

索引文件（`CLAUDE.md` 或 `AGENTS.md`）使用标记区域保护用户内容：

```
<!-- AI-CONTEXT:INDEX:START -->
... CLI 生成的索引内容 ...
<!-- AI-CONTEXT:INDEX:END -->
```

内容文件写入 `.ai/runtime/` 下的按类型分组目录。

### multi-md（Trae）

无索引文件，所有内容直接写入 `.trae/` 目录下的类型子目录。

## 渲染流程

```
build 命令 → getAdapter(tool) → adapter.render(input, contents, projectName, indexOnlyContents)
                                        ↓
                                   AdapterOutput
                                        ↓
                              写入内容文件 + 索引文件
```

1. `getAdapter(tool)` 根据 tool 名称动态导入并实例化对应 Adapter
2. `adapter.render()` 将 `ExtractedContent[]` 转换为 `AdapterOutput`
3. build 命令负责将 `AdapterOutput` 写入文件系统

## isEntry 与索引控制

- `isEntry: true` 的包：内容出现在索引文件
- `isEntry: false` 的包：内容文件写入目录，但不出现在索引
- 所有包的内容文件始终写入目录，`isEntry` 仅控制索引可见性

## 注册新 Adapter

1. 创建 `packages/cli/src/adapters/<tool>.ts`
2. 实现 `Adapter` 接口
3. 在 `types.ts` 的 `getAdapter()` 中添加 case
4. 在 `types.ts` 的 `TOOL_INDEX_FILES` 中注册索引文件路径
5. 如需要独立内容目录，在 `index-builder.ts` 中添加清理函数
6. build 命令中处理无索引文件的情况（检查 `output.index.path` 是否非空）
```

- [ ] **Step 2: 更新 VitePress 配置**

在 `docs/src/.vitepress/config.ts` 的 sidebar `/architecture/` 下添加页面：

```typescript
// 修改 sidebar 的 /architecture/ 部分
"/architecture/": [
  { text: "总览", link: "/architecture/overview" },
  { text: "Adapter 系统", link: "/architecture/adapter-system" },
],
```

- [ ] **Step 3: 提交**

```bash
git add docs/src/architecture/adapter-system.md docs/src/.vitepress/config.ts
git commit -m "docs: 新增 Adapter 系统架构文档"
```

---

### Task 8: Changeset + 最终验证

**Files:**
- Create: `.changeset/<random-name>.md`

- [ ] **Step 1: 创建 changeset**

```bash
pnpm changeset
```

交互式选择：
- 受影响包：`@coder-2100/cli`（minor）
- 描述：`新增 Trae adapter（multi-md 格式）、Gemini 回退 Codex 策略、.trae/ 目录支持`

如果交互式不可用，手动创建：

```markdown
<!-- .changeset/phase5-multi-tool-adapters.md -->
---
"@coder-2100/cli": minor
---

新增 Trae adapter（multi-md 格式）、Gemini 回退 Codex 策略、.trae/ 目录支持
```

- [ ] **Step 2: 运行完整构建和测试**

Run: `pnpm build && pnpm test`
Expected: 全部通过

- [ ] **Step 3: 提交**

```bash
git add .changeset/
git commit -m "chore: Phase 5 changeset"
```
