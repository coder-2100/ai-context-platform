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
