import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { ManifestSchema, type Manifest } from '@coder-2100/schema'
import { createCatalogFromManifests, type CatalogPackage } from './catalog'

export interface RegistryClientOptions {
  scope: string
  registry: string
}

export class RegistryClient {
  private scope: string
  private registry: string

  constructor(options: RegistryClientOptions) {
    this.scope = options.scope
    this.registry = options.registry
  }

  async scanLocalAssets(assetsDir: string): Promise<CatalogPackage[]> {
    if (!existsSync(assetsDir)) return []

    const dirs = readdirSync(assetsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())

    const manifests: Manifest[] = []
    for (const dir of dirs) {
      const manifest = this.parseManifest(join(assetsDir, dir.name, 'manifest.yaml'))
      if (manifest) {
        manifests.push(manifest)
      }
    }

    return createCatalogFromManifests(manifests, this.scope)
  }

  async getLocalManifest(assetsDir: string, packageName: string): Promise<Manifest | null> {
    const manifestPath = join(assetsDir, packageName, 'manifest.yaml')
    return this.parseManifest(manifestPath)
  }

  async getLocalContentPaths(assetsDir: string, packageName: string): Promise<string[]> {
    const manifest = await this.getLocalManifest(assetsDir, packageName)
    if (!manifest) return []

    const paths: string[] = []
    const pkgDir = join(assetsDir, packageName)
    for (const [type, entries] of Object.entries(manifest.entry)) {
      for (const entry of entries) {
        paths.push(join(pkgDir, entry))
      }
    }
    return paths
  }

  parseManifest(manifestPath: string): Manifest | null {
    try {
      const content = readFileSync(manifestPath, 'utf-8')
      const raw = parseYaml(content)
      const result = ManifestSchema.safeParse(raw)
      if (!result.success) return null
      return result.data
    } catch {
      return null
    }
  }
}
