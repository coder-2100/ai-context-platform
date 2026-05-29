import type { Layer, Manifest, PackageType } from "@coder-2100/schema";

/** 目录中的包条目，包含展示和筛选所需的元信息 */
export interface CatalogPackage {
  name: string;
  version: string;
  description: string;
  type: PackageType;
  layer: Layer;
  tags: string[];
}

/** 目录筛选选项，支持按 layer、type 和 tag 过滤 */
export interface FilterOptions {
  layer?: Layer;
  type?: PackageType;
  tag?: string;
}

/** 从清单列表创建目录，自动为包名添加 scope 前缀 */
export function createCatalogFromManifests(
  manifests: Manifest[],
  scope: string,
): CatalogPackage[] {
  return manifests.map((m) => ({
    name: `${scope}/${m.name}`,
    version: m.version,
    description: m.description,
    type: m.type,
    layer: m.layer,
    tags: m.tags,
  }));
}

/** 按条件筛选目录中的包 */
export function filterCatalog(
  packages: CatalogPackage[],
  options: FilterOptions,
): CatalogPackage[] {
  let result = packages;
  if (options.layer) {
    result = result.filter((p) => p.layer === options.layer);
  }
  if (options.type) {
    result = result.filter((p) => p.type === options.type);
  }
  if (options.tag) {
    result = result.filter((p) => p.tags.includes(options.tag!));
  }
  return result;
}

/** 按 layer 分组包 */
export function groupCatalogByLayer(
  packages: CatalogPackage[],
): Record<string, CatalogPackage[]> {
  const groups: Record<string, CatalogPackage[]> = {};
  for (const pkg of packages) {
    if (!groups[pkg.layer]) {
      groups[pkg.layer] = [];
    }
    groups[pkg.layer].push(pkg);
  }
  return groups;
}

/** 按 type 分组包 */
export function groupCatalogByType(
  packages: CatalogPackage[],
): Record<string, CatalogPackage[]> {
  const groups: Record<string, CatalogPackage[]> = {};
  for (const pkg of packages) {
    if (!groups[pkg.type]) {
      groups[pkg.type] = [];
    }
    groups[pkg.type].push(pkg);
  }
  return groups;
}
