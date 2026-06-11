import { z } from "zod";

// ── 第一层：索引层 ──

/** 索引文件输出结构，包含文件内容和目标路径 */
export const IndexOutputSchema = z.object({
  content: z.string(),
  path: z.string().min(1),
});

/** 索引文件解析后的类型 */
export type IndexOutput = z.infer<typeof IndexOutputSchema>;

// ── 第二层：内容层 ──

/** 单个内容文件的元信息和内容 */
export const ContentFileSchema = z.object({
  type: z.enum(["rule", "skill", "agent", "domain", "playbook"]),
  id: z.string().min(1),
  name: z.string().min(1),
  path: z.string().min(1),
  content: z.string(),
  appliesTo: z.array(z.string()),
  priority: z.enum(["critical", "high", "medium", "low"]),
});

/** 内容文件解析后的类型 */
export type ContentFile = z.infer<typeof ContentFileSchema>;

// ── Adapter 输出 ──

/** 适配器的完整输出，包含索引文件、内容文件列表和操作提示 */
export const AdapterOutputSchema = z.object({
  index: IndexOutputSchema,
  files: z.array(ContentFileSchema),
  instructions: z.array(z.string()),
});

/** 适配器输出解析后的类型 */
export type AdapterOutput = z.infer<typeof AdapterOutputSchema>;

// ── 工具能力 ──

/** 目标 AI 工具的能力描述，用于适配器根据工具特性调整输出格式 */
export const ToolCapabilitiesSchema = z.object({
  maxTokens: z.number().int().positive(),
  supportsMultiFile: z.boolean(),
  supportsImages: z.boolean(),
  indexFileLocation: z.string().min(1),
  contentDirLocation: z.string().min(1),
  contextFileFormat: z.enum(["index-plus-files", "single-md", "multi-md"]),
});

/** 工具能力解析后的类型 */
export type ToolCapabilities = z.infer<typeof ToolCapabilitiesSchema>;

// ── Adapter 输入 ──

/** 已解析的包信息，包含名称、版本和完整清单 */
export interface ResolvedPackage {
  name: string;
  version: string;
  manifest: import("./manifest").Manifest;
}

/** 适配器渲染输入，包含任务上下文、包列表、内容 frontmatter 和工具能力 */
export interface AdapterInput {
  task: string;
  packages: ResolvedPackage[];
  rules: import("./rule").RuleFrontmatter[];
  skills: import("./skill").SkillFrontmatter[];
  agents: import("./agent").AgentFrontmatter[];
  // domains/playbooks 复用包内领域与操作手册的 frontmatter 类型，避免重复定义
  domains: import("./domain").DomainFrontmatter[];
  playbooks: import("./playbook").PlaybookFrontmatter[];
  indexBudget: number;
  contentBudget: number;
  toolCapabilities: ToolCapabilities;
}

// ── Adapter 接口 ──

/** 适配器接口，不同 AI 工具实现此接口以生成对应的上下文输出 */
export interface Adapter {
  name: string;
  capabilities: ToolCapabilities;
  render(
    input: AdapterInput,
    contents: ContentFile[],
    projectName: string,
    /** 仅用于索引的内容列表（isEntry 筛选后），未传入时使用 contents */
    indexOnlyContents?: ContentFile[],
  ): AdapterOutput;
}
