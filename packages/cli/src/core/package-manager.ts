import { mkdirSync, copyFileSync, existsSync, readFileSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import {
  loadConfig,
  saveConfig,
  createDefaultConfig,
  findConfigFile,
} from './config'
import {
  loadLockfile,
  saveLockfile,
  createEmptyLockfile,
  addPackageToLockfile,
  removePackageFromLockfile,
  lockfileExists,
} from './lockfile'
import type { Config, Lockfile, Manifest } from '@coder-2100/schema'
import type { RegistryClient } from './registry-client'
import type { CatalogPackage } from './catalog'

export interface PackageManagerOptions {
  projectDir: string
  assetsDir: string
  registry: RegistryClient
  cliVersion: string
}

export interface InstalledPackage {
  name: string
  version: string
  manifest: Manifest
}

export class PackageManager {
  private projectDir: string
  private assetsDir: string
  private registry: RegistryClient
  private cliVersion: string
  private config: Config | null = null
  private lockfile: Lockfile | null = null

  constructor(options: PackageManagerOptions) {
    this.projectDir = options.projectDir
    this.assetsDir = options.assetsDir
    this.registry = options.registry
    this.cliVersion = options.cliVersion
  }

  async init(projectName: string): Promise<void> {
    const aiDir = join(this.projectDir, '.ai')
    mkdirSync(aiDir, { recursive: true })
    mkdirSync(join(aiDir, 'runtime', 'rules'), { recursive: true })
    mkdirSync(join(aiDir, 'runtime', 'skills'), { recursive: true })
    mkdirSync(join(aiDir, 'runtime', 'agents'), { recursive: true })
    mkdirSync(join(aiDir, 'runtime', 'domains'), { recursive: true })
    mkdirSync(join(aiDir, 'runtime', 'playbooks'), { recursive: true })
    mkdirSync(join(aiDir, 'cache'), { recursive: true })
    mkdirSync(join(aiDir, 'logs'), { recursive: true })

    this.config = createDefaultConfig(projectName)
    saveConfig(join(aiDir, 'config.yaml'), this.config)

    this.lockfile = createEmptyLockfile(this.cliVersion)
    saveLockfile(join(aiDir, 'lock.yaml'), this.lockfile)
  }

  async add(packageNames: string[]): Promise<string[]> {
    this.ensureInitialized()
    const installed: string[] = []
    const existingNames = new Set(this.config!.packages.map((p) => p.name))

    for (const name of packageNames) {
      if (existingNames.has(name)) continue

      const shortName = name.replace(/^@coder-2100\//, '')
      const manifest = await this.registry.getLocalManifest(this.assetsDir, shortName)
      if (!manifest) {
        throw new Error(`包 ${name} 未找到`)
      }

      await this.installPackageWithDependencies(name, manifest)
      installed.push(name)
      existingNames.add(name)
    }

    return installed
  }

  async remove(packageName: string): Promise<void> {
    this.ensureInitialized()
    const pkgIndex = this.config!.packages.findIndex((p) => p.name === packageName)
    if (pkgIndex === -1) {
      throw new Error(`包 ${packageName} 未安装`)
    }
    this.config!.packages.splice(pkgIndex, 1)
    this.lockfile = removePackageFromLockfile(this.lockfile!, packageName)
    this.persist()
  }

  list(): InstalledPackage[] {
    this.ensureInitialized()
    const result: InstalledPackage[] = []
    for (const pkgRef of this.config!.packages) {
      const lockEntry = this.lockfile!.packages[pkgRef.name]
      if (!lockEntry) continue
      const shortName = pkgRef.name.replace(/^@coder-2100\//, '')
      const manifest = this.registry.parseManifest(
        join(this.assetsDir, shortName, 'manifest.yaml'),
      )
      if (manifest) {
        result.push({ name: pkgRef.name, version: lockEntry.version, manifest })
      }
    }
    return result
  }

  getConfig(): Config {
    this.ensureInitialized()
    return this.config!
  }

  getLockfile(): Lockfile {
    this.ensureInitialized()
    return this.lockfile!
  }

  isInitialized(): boolean {
    return findConfigFile(this.projectDir) !== null
  }

  loadExisting(): void {
    const configPath = findConfigFile(this.projectDir)
    if (!configPath) throw new Error('项目未初始化，请先运行 ai-context init')
    this.config = loadConfig(configPath)
    const lockPath = join(dirname(configPath), 'lock.yaml')
    if (lockfileExists(lockPath)) {
      this.lockfile = loadLockfile(lockPath)
    } else {
      this.lockfile = createEmptyLockfile(this.cliVersion)
    }
  }

  private async installPackageWithDependencies(
    name: string,
    manifest: Manifest,
  ): Promise<void> {
    for (const dep of manifest.dependencies) {
      if (!dep.optional && !this.config!.packages.some((p) => p.name === dep.name)) {
        const depShort = dep.name.replace(/^@coder-2100\//, '')
        const depManifest = await this.registry.getLocalManifest(this.assetsDir, depShort)
        if (depManifest) {
          await this.installPackageWithDependencies(dep.name, depManifest)
        }
      }
    }

    this.config!.packages.push({ name, version: `^${manifest.version}` })
    this.lockfile = addPackageToLockfile(this.lockfile!, {
      name,
      version: manifest.version,
      resolved: `file:${relative(this.projectDir, join(this.assetsDir, name.replace(/^@coder-2100\//, '')))}`,
      integrity: `local-${manifest.version}`,
    })
    this.persist()
  }

  private persist(): void {
    const aiDir = join(this.projectDir, '.ai')
    saveConfig(join(aiDir, 'config.yaml'), this.config!)
    saveLockfile(join(aiDir, 'lock.yaml'), this.lockfile!)
  }

  private ensureInitialized(): void {
    if (!this.config || !this.lockfile) {
      throw new Error('项目未初始化，请先运行 ai-context init')
    }
  }
}
