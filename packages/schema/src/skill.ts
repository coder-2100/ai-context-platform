import { z } from 'zod'
import { Priority } from './constants'

export const SkillFrontmatterSchema = z.object({
  id: z.string().min(1),
  type: z.literal('skill').default('skill'),
  priority: z.enum([Priority.CRITICAL, Priority.HIGH, Priority.MEDIUM, Priority.LOW]).default(Priority.MEDIUM),
  appliesTo: z.array(z.string()).default([]),
})

export type SkillFrontmatter = z.infer<typeof SkillFrontmatterSchema>
