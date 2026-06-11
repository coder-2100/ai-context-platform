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

/** 将带 scope 的包名转换为目录名 */
function toShortName(fullName: string, scope: string): string {
  const prefix = `${scope}/`;
  if (fullName.startsWith(prefix)) {
    return fullName.slice(prefix.length);
  }
  return fullName;
}

/** 从知识资产包中提取内容，支持本地 assetsDir 和 npm 缓存目录 */
export async function extractContent(
  assetsDir: string | undefined,
  packageName: string,
  scope = "@coder-2100",
  cacheDir?: string,
  /** 包的精确版本号，用于从缓存目录定位，避免字典序猜测 */
  version?: string,
): Promise<ExtractedContent[]> {
  const registry = new RegistryClient({ scope, registry: "" });
  const shortName = toShortName(packageName, scope);

  let pkgDir: string | null = null;
  let manifest: import("@coder-2100/schema").Manifest | null = null;

  // 尝试从本地 assetsDir 读取
  if (assetsDir) {
    manifest = await registry.getLocalManifest(assetsDir, shortName);
    if (manifest) {
      pkgDir = join(assetsDir, shortName);
    }
  }

  // 如果本地没有，尝试从缓存读取
  if (!manifest && cacheDir) {
    // 优先使用精确版本号定位缓存
    const targetVersion = version;
    if (targetVersion) {
      const versionDir = join(cacheDir, "packages", shortName, targetVersion);
      if (existsSync(versionDir)) {
        pkgDir = versionDir;
        manifest = registry.parseManifest(join(pkgDir, "manifest.yaml"));
      }
    }
  }

  if (!manifest || !pkgDir) return [];

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

/** 继承解析的最大深度，防止无限递归 */
const MAX_EXTENDS_DEPTH = 5;

/**
 * 解析 extends 继承关系，合并父包的 appliesTo 到子包内容
 * @param assetsDir 资产目录路径
 * @param contents 子包的已提取内容
 * @param extendsList 子包声明的继承包列表
 * @param scope 包的 npm scope
 * @param cacheDir 缓存目录路径
 * @param depth 当前递归深度
 */
export async function resolveInheritedContent(
  assetsDir: string | undefined,
  contents: ExtractedContent[],
  extendsList: string[],
  scope = "@coder-2100",
  cacheDir?: string,
  depth = 0,
): Promise<ExtractedContent[]> {
  if (extendsList.length === 0 || depth >= MAX_EXTENDS_DEPTH) {
    return contents;
  }

  const mergedAppliesTo = new Set<string>();
  for (const c of contents) {
    for (const task of c.appliesTo) {
      mergedAppliesTo.add(task);
    }
  }

  // 收集父包的 appliesTo
  for (const parentName of extendsList) {
    const parentContents = await extractContent(assetsDir, parentName, scope, cacheDir);
    for (const pc of parentContents) {
      for (const task of pc.appliesTo) {
        mergedAppliesTo.add(task);
      }
    }

    // 递归解析父包的 extends
    if (parentContents.length > 0) {
      const registry = new RegistryClient({ scope, registry: "" });
      const shortName = toShortName(parentName, scope);
      let parentManifest: import("@coder-2100/schema").Manifest | null = null;

      if (assetsDir) {
        parentManifest = await registry.getLocalManifest(assetsDir, shortName);
      }

      if (parentManifest && parentManifest.extends.length > 0) {
        const resolvedParent = await resolveInheritedContent(
          assetsDir,
          parentContents,
          parentManifest.extends,
          scope,
          cacheDir,
          depth + 1,
        );
        for (const pc of resolvedParent) {
          for (const task of pc.appliesTo) {
            mergedAppliesTo.add(task);
          }
        }
      }
    }
  }

  // 合并 appliesTo 到子包内容
  const allTasks = [...mergedAppliesTo];
  return contents.map((c) => ({
    ...c,
    appliesTo: c.appliesTo.length === 0 ? allTasks : c.appliesTo,
  }));
}
