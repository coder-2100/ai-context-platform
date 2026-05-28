import { z } from "zod";

// ── 第一层：索引层 ──

export const IndexOutputSchema = z.object({
  content: z.string(),
  path: z.string().min(1),
});

export type IndexOutput = z.infer<typeof IndexOutputSchema>;

// ── 第二层：内容层 ──

export const ContentFileSchema = z.object({
  type: z.enum(["rule", "skill", "agent", "domain", "playbook"]),
  id: z.string().min(1),
  name: z.string().min(1),
  path: z.string().min(1),
  content: z.string(),
  appliesTo: z.array(z.string()),
  priority: z.enum(["critical", "high", "medium", "low"]),
});

export type ContentFile = z.infer<typeof ContentFileSchema>;

// ── Adapter 输出 ──

export const AdapterOutputSchema = z.object({
  index: IndexOutputSchema,
  files: z.array(ContentFileSchema),
  instructions: z.array(z.string()),
});

export type AdapterOutput = z.infer<typeof AdapterOutputSchema>;

// ── 工具能力 ──

export const ToolCapabilitiesSchema = z.object({
  maxTokens: z.number().int().positive(),
  supportsMultiFile: z.boolean(),
  supportsImages: z.boolean(),
  indexFileLocation: z.string().min(1),
  contentDirLocation: z.string().min(1),
  contextFileFormat: z.enum(["index-plus-files", "single-md", "multi-md"]),
});

export type ToolCapabilities = z.infer<typeof ToolCapabilitiesSchema>;

// ── Adapter 输入 ──

export interface ResolvedPackage {
  name: string;
  version: string;
  manifest: import("./manifest").Manifest;
}

export interface AdapterInput {
  task: string;
  packages: ResolvedPackage[];
  rules: import("./rule").RuleFrontmatter[];
  skills: import("./skill").SkillFrontmatter[];
  agents: import("./agent").AgentFrontmatter[];
  domains: { id: string; name: string; description: string }[];
  playbooks: { id: string; name: string; description: string }[];
  indexBudget: number;
  contentBudget: number;
  toolCapabilities: ToolCapabilities;
}

// ── Adapter 接口 ──

export interface Adapter {
  name: string;
  capabilities: ToolCapabilities;
  render(input: AdapterInput): AdapterOutput;
}
