import { z } from "zod";

/** 锁文件中单个包的记录，包含版本、来源和完整性校验 */
const LockPackageSchema = z.object({
  version: z.string().min(1),
  resolved: z.string().min(1),
  integrity: z.string().min(1),
});

/** 锁文件 schema，记录已安装包的确切版本和来源，确保可复现性 */
export const LockfileSchema = z.object({
  schemaVersion: z.string().regex(/^\d+$/),
  cliVersion: z.string().min(1),
  generatedAt: z.string().datetime(),
  packages: z.record(z.string(), LockPackageSchema),
});

/** 锁文件解析后的类型 */
export type Lockfile = z.infer<typeof LockfileSchema>;
