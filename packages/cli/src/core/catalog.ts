import type { Manifest, Layer, PackageType } from '@coder-2100/schema'

export interface CatalogPackage {
  name: string
  version: string
  description: string
  type: PackageType
  layer: Layer
  tags: string[]
}

export interface FilterOptions {
  layer?: Layer
  type?: PackageType
  tag?: string
}

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
  }))
}

export function filterCatalog(
  packages: CatalogPackage[],
  options: FilterOptions,
): CatalogPackage[] {
  let result = packages
  if (options.layer) {
    result = result.filter((p) => p.layer === options.layer)
  }
  if (options.type) {
    result = result.filter((p) => p.type === options.type)
  }
  if (options.tag) {
    result = result.filter((p) => p.tags.includes(options.tag!))
  }
  return result
}

export function groupCatalogByLayer(
  packages: CatalogPackage[],
): Record<string, CatalogPackage[]> {
  const groups: Record<string, CatalogPackage[]> = {}
  for (const pkg of packages) {
    if (!groups[pkg.layer]) {
      groups[pkg.layer] = []
    }
    groups[pkg.layer].push(pkg)
  }
  return groups
}

export function groupCatalogByType(
  packages: CatalogPackage[],
): Record<string, CatalogPackage[]> {
  const groups: Record<string, CatalogPackage[]> = {}
  for (const pkg of packages) {
    if (!groups[pkg.type]) {
      groups[pkg.type] = []
    }
    groups[pkg.type].push(pkg)
  }
  return groups
}
