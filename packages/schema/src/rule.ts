import { z } from "zod";
import { Layer, Priority } from "./constants";

export const RuleFrontmatterSchema = z.object({
  id: z.string().min(1),
  priority: z
    .enum([Priority.CRITICAL, Priority.HIGH, Priority.MEDIUM, Priority.LOW])
    .default(Priority.MEDIUM),
  layer: z
    .enum([Layer.CORE, Layer.STACK, Layer.DOMAIN, Layer.PROJECT, Layer.RUNTIME])
    .optional(),
  appliesTo: z.array(z.string()).default([]),
});

export type RuleFrontmatter = z.infer<typeof RuleFrontmatterSchema>;
