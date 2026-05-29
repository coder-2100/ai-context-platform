import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Priority } from "@coder-2100/schema";
import matter from "gray-matter";
import { RegistryClient } from "../core/registry-client";

/** 从知识资产包中提取的结构化内容，包含类型、元信息和正文 */
export interface ExtractedContent {
  type: "rule" | "skill" | "agent" | "domain" | "playbook";
  id: string;
  name: string;
  content: string;
  priority: Priority;
  appliesTo: string[];
  sourcePath: string;
}

/** Markdown 文件解析结果，分离 frontmatter 元数据和正文 */
export interface ParsedFrontmatter {
  frontmatter: Record<string, unknown>;
  body: string;
}

/** 解析 Markdown 文件的 frontmatter 和正文 */
export function parseFrontmatter(content: string): ParsedFrontmatter {
  const parsed = matter(content);
  return {
    frontmatter: parsed.data as Record<string, unknown>,
    body: parsed.content,
  };
}

/** 清单 entry 字段名到内容类型的映射 */
const ENTRY_TYPE_MAP: Record<string, ExtractedContent["type"]> = {
  rules: "rule",
  skills: "skill",
  agents: "agent",
  domains: "domain",
  playbooks: "playbook",
};

/** 从指定包中提取所有内容，解析 frontmatter 并构建 ExtractedContent 列表 */
export async function extractContent(
  assetsDir: string,
  packageName: string,
): Promise<ExtractedContent[]> {
  const registry = new RegistryClient({ scope: "@coder-2100", registry: "" });
  const manifest = await registry.getLocalManifest(assetsDir, packageName);
  if (!manifest) return [];

  const pkgDir = join(assetsDir, packageName);
  const results: ExtractedContent[] = [];

  for (const [entryType, entries] of Object.entries(manifest.entry)) {
    const contentType = ENTRY_TYPE_MAP[entryType];
    if (!contentType) continue;

    for (const entryPath of entries) {
      const fullPath = join(pkgDir, entryPath);
      if (!existsSync(fullPath)) continue;

      const rawContent = readFileSync(fullPath, "utf-8");
      const { frontmatter, body } = parseFrontmatter(rawContent);

      const id =
        (frontmatter.id as string) ||
        entryPath.replace(/\.md$/, "").split("/").pop()!;
      const priority = (frontmatter.priority as Priority) || "medium";
      const appliesTo = (frontmatter.appliesTo as string[]) || [];
      const name = id
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

      results.push({
        type: contentType,
        id,
        name,
        content: body.trim(),
        priority,
        appliesTo,
        sourcePath: entryPath,
      });
    }
  }

  return results;
}
