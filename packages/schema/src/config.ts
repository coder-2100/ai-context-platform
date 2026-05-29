import { z } from "zod";

/** 项目配置中的包引用 */
const PackageRefSchema = z.object({
  name: z.string().min(1),
  version: z.string().optional(),
});

/** 单个 AI 工具的启用和部署配置 */
const ToolingEntrySchema = z.object({
  enabled: z.boolean(),
  deploy: z.boolean().default(false),
});

/** 索引生成预算配置，控制输出内容的 token 上限 */
const BudgetSchema = z
  .object({
    indexBudget: z.number().int().positive().default(3000),
    perTool: z
      .record(
        z.string(),
        z.object({ indexBudget: z.number().int().positive() }),
      )
      .default({}),
  })
  .default({ indexBudget: 3000, perTool: {} });

/** 项目配置 schema，定义 .ai/config.yaml 的结构 */
export const ConfigSchema = z.object({
  project: z.string().min(1),
  description: z.string().default(""),
  packages: z.array(PackageRefSchema).default([]),
  tooling: z
    .object({
      "claude-code": ToolingEntrySchema.default({
        enabled: true,
        deploy: true,
      }),
      codex: ToolingEntrySchema.default({ enabled: true, deploy: true }),
      trae: ToolingEntrySchema.default({ enabled: false, deploy: false }),
      gemini: ToolingEntrySchema.default({ enabled: false, deploy: false }),
    })
    .default({
      "claude-code": { enabled: true, deploy: true },
      codex: { enabled: true, deploy: true },
      trae: { enabled: false, deploy: false },
      gemini: { enabled: false, deploy: false },
    }),
  budget: BudgetSchema,
});

/** 项目配置解析后的类型 */
export type Config = z.infer<typeof ConfigSchema>;
