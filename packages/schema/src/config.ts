import { z } from "zod";

const PackageRefSchema = z.object({
  name: z.string().min(1),
  version: z.string().optional(),
});

const ToolingEntrySchema = z.object({
  enabled: z.boolean(),
  deploy: z.boolean().default(false),
});

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

export type Config = z.infer<typeof ConfigSchema>;
