import { z } from "zod";
import { Priority } from "./constants";

/** 智能体类型内容的 frontmatter schema */
export const AgentFrontmatterSchema = z.object({
  id: z.string().min(1),
  type: z.literal("agent").default("agent"),
  priority: z
    .enum([Priority.CRITICAL, Priority.HIGH, Priority.MEDIUM, Priority.LOW])
    .default(Priority.MEDIUM),
  appliesTo: z.array(z.string()).default([]),
});

/** 智能体 frontmatter 解析后的类型 */
export type AgentFrontmatter = z.infer<typeof AgentFrontmatterSchema>;
