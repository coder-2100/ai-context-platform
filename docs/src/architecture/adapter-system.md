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
4. 在 `index-builder.ts` 的 `TOOL_INDEX_FILES` 中注册索引文件路径
5. 如需要独立内容目录，在 `index-builder.ts` 中添加清理函数
6. build 命令中处理无索引文件的情况（检查 `output.index.path` 是否非空）
