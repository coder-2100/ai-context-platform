import { mkdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import type { Config, Lockfile, Manifest } from "@coder-2100/schema";
import {
  createDefaultConfig,
  findConfigFile,
  loadConfig,
  saveConfig,
} from "./config";
import {
  addPackageToLockfile,
  createEmptyLockfile,
  loadLockfile,
  lockfileExists,
  removePackageFromLockfile,
  saveLockfile,
} from "./lockfile";
import type { RegistryClient } from "./registry-client";

/** PackageManager 构造选项 */
export interface PackageManagerOptions {
  projectDir: string;
  assetsDir: string;
  registry: RegistryClient;
  cliVersion: string;
}

/** 已安装的包信息，包含名称、版本和完整清单 */
export interface InstalledPackage {
  name: string;
  version: string;
  manifest: Manifest;
}

/** 包管理器：统一管理知识资产包的初始化、安装、移除和查询 */
export class PackageManager {
  private projectDir: string;
  private assetsDir: string;
  private registry: RegistryClient;
  private cliVersion: string;
  private config: Config | null = null;
  private lockfile: Lockfile | null = null;

  constructor(options: PackageManagerOptions) {
    this.projectDir = options.projectDir;
    this.assetsDir = options.assetsDir;
    this.registry = options.registry;
    this.cliVersion = options.cliVersion;
  }

  /** 初始化项目：创建 .ai/ 目录结构、默认配置和锁文件 */
  async init(projectName: string): Promise<void> {
    const aiDir = join(this.projectDir, ".ai");
    mkdirSync(aiDir, { recursive: true });
    mkdirSync(join(aiDir, "runtime", "rules"), { recursive: true });
    mkdirSync(join(aiDir, "runtime", "skills"), { recursive: true });
    mkdirSync(join(aiDir, "runtime", "agents"), { recursive: true });
    mkdirSync(join(aiDir, "runtime", "domains"), { recursive: true });
    mkdirSync(join(aiDir, "runtime", "playbooks"), { recursive: true });
    mkdirSync(join(aiDir, "cache"), { recursive: true });
    mkdirSync(join(aiDir, "logs"), { recursive: true });

    this.config = createDefaultConfig(projectName);
    saveConfig(join(aiDir, "config.yaml"), this.config);

    this.lockfile = createEmptyLockfile(this.cliVersion);
    saveLockfile(join(aiDir, "lock.yaml"), this.lockfile);
  }

  /** 添加包到项目，自动解析并安装非可选依赖，返回新安装的包名列表 */
  async add(packageNames: string[]): Promise<string[]> {
    this.ensureInitialized();
    const installed: string[] = [];
    const existingNames = new Set(this.config!.packages.map((p) => p.name));

    for (const name of packageNames) {
      if (existingNames.has(name)) continue;

      const shortName = name.replace(/^@coder-2100\//, "");
      const manifest = await this.registry.getLocalManifest(
        this.assetsDir,
        shortName,
      );
      if (!manifest) {
        throw new Error(`包 ${name} 未找到`);
      }

      await this.installPackageWithDependencies(name, manifest);
      installed.push(name);
      existingNames.add(name);
    }

    return installed;
  }

  /** 从项目中移除包，更新配置和锁文件 */
  async remove(packageName: string): Promise<void> {
    this.ensureInitialized();
    const pkgIndex = this.config!.packages.findIndex(
      (p) => p.name === packageName,
    );
    if (pkgIndex === -1) {
      throw new Error(`包 ${packageName} 未安装`);
    }
    this.config!.packages.splice(pkgIndex, 1);
    this.lockfile = removePackageFromLockfile(this.lockfile!, packageName);
    this.persist();
  }

  /** 列出所有已安装的包及其清单信息 */
  list(): InstalledPackage[] {
    this.ensureInitialized();
    const result: InstalledPackage[] = [];
    for (const pkgRef of this.config!.packages) {
      const lockEntry = this.lockfile!.packages[pkgRef.name];
      if (!lockEntry) continue;
      const shortName = pkgRef.name.replace(/^@coder-2100\//, "");
      const manifest = this.registry.parseManifest(
        join(this.assetsDir, shortName, "manifest.yaml"),
      );
      if (manifest) {
        result.push({
          name: pkgRef.name,
          version: lockEntry.version,
          manifest,
        });
      }
    }
    return result;
  }

  /** 获取当前项目配置 */
  getConfig(): Config {
    this.ensureInitialized();
    return this.config!;
  }

  /** 获取当前锁文件 */
  getLockfile(): Lockfile {
    this.ensureInitialized();
    return this.lockfile!;
  }

  /** 检查项目是否已初始化 */
  isInitialized(): boolean {
    return findConfigFile(this.projectDir) !== null;
  }

  /** 从磁盘加载已有的配置和锁文件 */
  loadExisting(): void {
    const configPath = findConfigFile(this.projectDir);
    if (!configPath) throw new Error("项目未初始化，请先运行 ai-context init");
    this.config = loadConfig(configPath);
    const lockPath = join(dirname(configPath), "lock.yaml");
    if (lockfileExists(lockPath)) {
      this.lockfile = loadLockfile(lockPath);
    } else {
      this.lockfile = createEmptyLockfile(this.cliVersion);
    }
  }

  /** 递归安装包及其非可选依赖 */
  private async installPackageWithDependencies(
    name: string,
    manifest: Manifest,
  ): Promise<void> {
    for (const dep of manifest.dependencies) {
      if (
        !dep.optional &&
        !this.config!.packages.some((p) => p.name === dep.name)
      ) {
        const depShort = dep.name.replace(/^@coder-2100\//, "");
        const depManifest = await this.registry.getLocalManifest(
          this.assetsDir,
          depShort,
        );
        if (depManifest) {
          await this.installPackageWithDependencies(dep.name, depManifest);
        }
      }
    }

    this.config!.packages.push({ name, version: `^${manifest.version}` });
    this.lockfile = addPackageToLockfile(this.lockfile!, {
      name,
      version: manifest.version,
      resolved: `file:${relative(this.projectDir, join(this.assetsDir, name.replace(/^@coder-2100\//, "")))}`,
      integrity: `local-${manifest.version}`,
    });
    this.persist();
  }

  /** 将配置和锁文件持久化到磁盘 */
  private persist(): void {
    const aiDir = join(this.projectDir, ".ai");
    saveConfig(join(aiDir, "config.yaml"), this.config!);
    saveLockfile(join(aiDir, "lock.yaml"), this.lockfile!);
  }

  /** 检查项目是否已初始化，未初始化则抛出错误 */
  private ensureInitialized(): void {
    if (!this.config || !this.lockfile) {
      throw new Error("项目未初始化，请先运行 ai-context init");
    }
  }
}
