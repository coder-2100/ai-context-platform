import { z } from "zod";
import { Priority } from "./constants";

/** 技能类型内容的 frontmatter schema */
export const SkillFrontmatterSchema = z.object({
  id: z.string().min(1),
  type: z.literal("skill").default("skill"),
  priority: z
    .enum([Priority.CRITICAL, Priority.HIGH, Priority.MEDIUM, Priority.LOW])
    .default(Priority.MEDIUM),
  appliesTo: z.array(z.string()).default([]),
});

/** 技能 frontmatter 解析后的类型 */
export type SkillFrontmatter = z.infer<typeof SkillFrontmatterSchema>;
