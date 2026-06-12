# Phase 5 — Multi-Tool Adapters + 文档完善 设计文档

**日期**：2026-06-12
**阶段**：Phase 5
**前置依赖**：Phase 4（Builder Pipeline）已完成

---

## 一、目标

1. 实现 Trae adapter（`multi-md` 格式）
2. 实现 Gemini 回退策略（回退到 Codex 的 `AGENTS.md` 输出）
3. 完善 adapter 相关文档（最小可发布范围）
4. 确认文档站部署 workflow

---

## 二、Adapter 策略

### 2.1 三 + 一回退架构

| 工具 | Adapter 实现 | 输出格式 | 索引文件 | 内容目录 |
|------|-------------|----------|----------|----------|
| `claude-code` | `ClaudeCodeAdapter`（已有） | `index-plus-files` | `CLAUDE.md` | `.ai/runtime/` |
| `codex` | `CodexAdapter`（已有） | `index-plus-files` | `AGENTS.md` | `.ai/runtime/` |
| `trae` | `TraeAdapter`（新增） | `multi-md` | 无 | `.trae/` |
| `gemini` / 未知工具 | 回退到 `CodexAdapter` | `index-plus-files` | `AGENTS.md` | `.ai/runtime/` |

### 2.2 getAdapter() 改造

```typescript
function getAdapter(tool: ToolName): Adapter {
  switch (tool) {
    case 'claude-code':
      return new ClaudeCodeAdapter()
    case 'codex':
      return new CodexAdapter()
    case 'trae':
      return new TraeAdapter()
    case 'gemini':
    default:
      // Gemini 及未知工具回退到 Codex 模式
      return new CodexAdapter()
  }
}
```

### 2.3 回退提示

当 `--tool` 传入 `gemini` 或未知工具名时，build 命令输出信息提示：

```
ℹ Tool "gemini" uses Codex adapter (AGENTS.md format)
```

---

## 三、Trae Adapter 设计

### 3.1 输出结构

```
.trae/
├── rules/
│   ├── core-engineering.md
│   ├── react-hooks.md
│   └── backend-security.md
├── skills/
│   └── react-review.md
├── agents/
│   └── reviewer.md
├── domains/
│   └── payment.md
└── playbooks/
    └── migration.md
```

### 3.2 与 index-plus-files 的关键区别

| 维度 | Claude/Codex (`index-plus-files`) | Trae (`multi-md`) |
|------|----------------------------------|-------------------|
| 索引文件 | `CLAUDE.md` / `AGENTS.md` | 无 |
| 内容文件 | `.ai/runtime/{type}s/{id}.md` | `.trae/{type}s/{id}.md` |
| 核心规则 | 写入索引文件的 "Core Rules" 区域 | 写入 `.trae/rules/` 作为独立规则文件 |
| 任务引导 | 索引中 "Current Task" 区域高亮 | 不支持（无索引入口） |
| Token 预算 | 索引层 ~3000 token 预算控制 | 不适用 |

### 3.3 TraeAdapter.render() 逻辑

```typescript
class TraeAdapter implements Adapter {
  name = 'trae'
  capabilities = traeCapabilities

  render(
    input: AdapterInput,
    contents: CategorizedFrontmatters,
    projectName: string,
    indexOnlyContents?: Map<string, boolean>
  ): AdapterOutput {
    const files: ContentFile[] = []

    // 将所有内容文件映射到 .trae/{type}s/{id}.md
    for (const [type, items] of Object.entries(contents)) {
      for (const item of items) {
        files.push({
          type: type as ContentFile['type'],
          id: item.id,
          name: item.id,  // Trae 使用 id 作为显示名称
          path: `.trae/${type}s/${item.id}.md`,
          content: item.rawContent,
          appliesTo: item.appliesTo ?? [],
          priority: item.priority
        })
      }
    }

    return {
      index: { content: '', path: '' },  // 无索引文件
      files,
      instructions: [
        'Trae rules written to .trae/rules/',
        'Trae skills written to .trae/skills/',
        'Trae agents written to .trae/agents/',
      ]
    }
  }
}
```

### 3.4 Trae ToolCapabilities

```typescript
const traeCapabilities: ToolCapabilities = {
  maxTokens: 64000,
  supportsMultiFile: true,
  supportsImages: true,
  indexFileLocation: '',           // 无索引文件
  contentDirLocation: '.trae/',
  contextFileFormat: 'multi-md'
}
```

### 3.5 isEntry 处理

所有包的内容都写入 `.trae/` 目录（与 Claude/Codex 写入 `.ai/runtime/` 的行为一致——内容层不受 `isEntry` 过滤）。`indexOnlyContents` 参数在 Trae 中不影响输出行为。

### 3.6 build 命令对 Trae 的适配

当 `--tool trae` 时：
- 不调用 `writeIndexFile()`（Trae 无索引文件）
- 直接写入 `.trae/{type}s/` 目录下的内容文件
- `cleanRuntimeDir()` 需扩展为同时清理 `.trae/` 目录
- `--dry-run` 模式正常输出预览

---

## 四、ToolCapabilities 更新

| 工具 | maxTokens | 输出格式 | 索引文件 | 内容目录 |
|------|-----------|----------|----------|----------|
| `claude-code` | 200000 | `index-plus-files` | `CLAUDE.md` | `.ai/runtime/` |
| `codex` | 32000 | `index-plus-files` | `AGENTS.md` | `.ai/runtime/` |
| `trae` | 64000 | `multi-md` | 无 | `.trae/` |
| `gemini` | 128000 | 回退 Codex | `AGENTS.md` | `.ai/runtime/` |

---

## 五、文档范围（最小可发布）

### 5.1 新增页面

| 页面 | 路径 | 内容 |
|------|------|------|
| Adapters 文档 | `docs/src/cli/adapters.md` | 各工具适配说明、输出格式对比、`--tool` 用法、Gemini 回退说明、扩展新 adapter 指南 |
| Adapter 系统设计 | `docs/src/architecture/adapter-system.md` | `Adapter` 接口、两层输出架构、`ToolCapabilities`、扩展新 adapter 的方法 |

### 5.2 VitePress 配置更新

在 `docs/src/.vitepress/config.ts` 中为两个新页面添加侧边栏导航项。

### 5.3 不做 generate-docs.ts

当前只有 6 个资产包，手动维护成本可接受。自动生成脚本放到后续阶段。

---

## 六、Docs 部署

当前已有 `.github/workflows/deploy-docs.yml`。新增文档页面后，VitePress 构建会自动包含，workflow 无需修改。只需确认 workflow 能正常触发和部署。

---

## 七、不改动的部分

- `ClaudeCodeAdapter` 和 `CodexAdapter` 的现有代码不做重构
- `Adapter` 接口签名不做变更
- `index-builder.ts` 的逻辑不做变更（Trae 不使用索引构建器）
- 现有测试不做大规模重写，只新增 Trae adapter 的测试
- 不做 `generate-docs.ts` 自动生成脚本
- 不新增 `deploy` 子命令

---

## 八、受影响的文件

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `packages/cli/src/adapters/trae.ts` | 新增 | Trae adapter 实现 |
| `packages/cli/src/adapters/types.ts` | 修改 | getAdapter 回退逻辑 + trae capabilities |
| `packages/cli/src/commands/build.ts` | 修改 | 回退提示 + Trae 目录清理 + Trae 无索引文件适配 |
| `packages/cli/src/engine/index-builder.ts` | 修改 | `cleanRuntimeDir` 扩展支持 `.trae/` 目录 |
| `packages/cli/tests/adapters/trae.test.ts` | 新增 | Trae adapter 测试 |
| `packages/cli/tests/commands/build.test.ts` | 修改 | build 命令 trae 相关测试 |
| `docs/src/cli/adapters.md` | 新增 | Adapters 文档 |
| `docs/src/architecture/adapter-system.md` | 新增 | Adapter 系统设计文档 |
| `docs/src/.vitepress/config.ts` | 修改 | 侧边栏导航 |
