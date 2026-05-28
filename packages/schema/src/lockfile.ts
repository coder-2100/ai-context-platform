import { z } from 'zod'

const LockPackageSchema = z.object({
  version: z.string().min(1),
  resolved: z.string().url(),
  integrity: z.string().min(1),
})

export const LockfileSchema = z.object({
  schemaVersion: z.string().regex(/^\d+$/),
  cliVersion: z.string().min(1),
  generatedAt: z.string().datetime(),
  packages: z.record(z.string(), LockPackageSchema),
})

export type Lockfile = z.infer<typeof LockfileSchema>
