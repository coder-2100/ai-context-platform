import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import type { Manifest } from '@coder-2100/schema'

export class CacheManager {
  constructor(private cacheDir: string) {}

  ensureCacheDir(): void {
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true })
    }
  }

  get(key: string): string | null {
    const filePath = this.getFilePath(key)
    try {
      return readFileSync(filePath, 'utf-8')
    } catch {
      return null
    }
  }

  set(key: string, content: string): void {
    const filePath = this.getFilePath(key)
    const dir = join(filePath, '..')
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    writeFileSync(filePath, content, 'utf-8')
  }

  getManifest(packageName: string, version: string): Manifest | null {
    const key = `manifests/${packageName}/${version}.yaml`
    const content = this.get(key)
    if (!content) return null
    return parseYaml(content) as Manifest
  }

  setManifest(packageName: string, version: string, manifest: Manifest): void {
    const key = `manifests/${packageName}/${version}.yaml`
    this.set(key, stringifyYaml(manifest, { lineWidth: 0 }))
  }

  clear(): void {
    if (existsSync(this.cacheDir)) {
      rmSync(this.cacheDir, { recursive: true, force: true })
    }
    this.ensureCacheDir()
  }

  private getFilePath(key: string): string {
    return join(this.cacheDir, key)
  }
}
