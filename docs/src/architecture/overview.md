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
