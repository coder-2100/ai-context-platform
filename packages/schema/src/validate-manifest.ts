import type { ZodError } from "zod";
import { ManifestSchema } from "./manifest";

export interface ValidationResult {
  success: boolean;
  errors: string[];
}

export function validateManifest(data: unknown): ValidationResult {
  const result = ManifestSchema.safeParse(data);
  if (result.success) {
    return { success: true, errors: [] };
  }
  const errors = formatZodErrors(result.error);
  return { success: false, errors };
}

function formatZodErrors(error: ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
    return `${path}${issue.message}`;
  });
}
