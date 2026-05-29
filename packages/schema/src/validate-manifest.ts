import type { ZodError } from "zod";
import { ManifestSchema } from "./manifest";

/** 清单验证结果，包含是否成功和错误信息列表 */
export interface ValidationResult {
  success: boolean;
  errors: string[];
}

/** 验证清单数据是否符合 ManifestSchema */
export function validateManifest(data: unknown): ValidationResult {
  const result = ManifestSchema.safeParse(data);
  if (result.success) {
    return { success: true, errors: [] };
  }
  const errors = formatZodErrors(result.error);
  return { success: false, errors };
}

/** 将 Zod 错误格式化为可读的字符串列表 */
function formatZodErrors(error: ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
    return `${path}${issue.message}`;
  });
}
