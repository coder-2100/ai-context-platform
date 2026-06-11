import { z } from "zod";
import { Priority } from "./constants";

/** 操作手册文件 frontmatter 的 Zod schema */
export const PlaybookFrontmatterSchema = z.object({
  id: z.string().min(1),
  priority: z
    .enum([Priority.CRITICAL, Priority.HIGH, Priority.MEDIUM, Priority.LOW])
    .default(Priority.MEDIUM),
  appliesTo: z.array(z.string()).default([]),
});

/** 操作手册文件 frontmatter 解析后的类型 */
export type PlaybookFrontmatter = z.infer<typeof PlaybookFrontmatterSchema>;
