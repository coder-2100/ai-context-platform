import { z } from "zod";
import { Priority } from "./constants";

export const AgentFrontmatterSchema = z.object({
  id: z.string().min(1),
  type: z.literal("agent").default("agent"),
  priority: z
    .enum([Priority.CRITICAL, Priority.HIGH, Priority.MEDIUM, Priority.LOW])
    .default(Priority.MEDIUM),
  appliesTo: z.array(z.string()).default([]),
});

export type AgentFrontmatter = z.infer<typeof AgentFrontmatterSchema>;
