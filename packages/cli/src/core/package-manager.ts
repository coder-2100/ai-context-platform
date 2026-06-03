import { existsSync, mkdirSync, readFileSync } from "node:fs";
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
import { RegistryClient } from "./registry-client";

/** PackageManager 构造选项 */
export interface PackageManagerOptions {
  projectDir: string;
  /** 资产目录路径，add/browse/list/build 等命令必须提供，init 可省略 */
  assetsDir?: string;
  /** 资产包的 npm scope，默认 @coder-2100 */
  scope?: string;
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
  private assetsDir: string | undefined;
  /** 资产包的 npm scope，用于包名与目录名的转换 */
  private scope: string;
  private registry: RegistryClient;
  /** CLI 版本号，从 package.json 中自动读取 */
  private cliVersion: string;
  private config: Config | null = null;
  private lockfile: Lockfile | null = null;

  constructor(options: PackageManagerOptions) {
    this.projectDir = options.projectDir;
    this.assetsDir = options.assetsDir;
    this.scope = options.scope || "@coder-2100";
    this.registry = new RegistryClient({
      scope: this.scope,
      registry: "https://registry.npmjs.org",
    });
    this.cliVersion = getCliVersion();
  }

  /** 初始化项目：创建 .ai/ 目录结构、默认配置和锁文件，可选保存 assetsDir 和 scope 到配置 */
  async init(projectName: string, assetsDir?: string): Promise<void> {
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
    if (assetsDir) {
      this.config.assetsDir = assetsDir;
    }
    this.config.scope = this.scope;
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

      const shortName = this.toShortName(name);
      const manifest = await this.registry.getLocalManifest(
        this.ensureAssetsDir(),
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
      const shortName = this.toShortName(pkgRef.name);
      const manifest = this.registry.parseManifest(
        join(this.ensureAssetsDir(), shortName, "manifest.yaml"),
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

  /** 从磁盘加载已有的配置和锁文件，若构造时未指定 assetsDir/scope 则从配置中读取 */
  loadExisting(): void {
    const configPath = findConfigFile(this.projectDir);
    if (!configPath) throw new Error("项目未初始化，请先运行 ai-context init");
    this.config = loadConfig(configPath);
    // 构造时未指定 assetsDir 时，使用配置中保存的值
    if (!this.assetsDir && this.config.assetsDir) {
      this.assetsDir = this.config.assetsDir;
    }
    // 构造时未指定 scope 或使用默认值时，使用配置中保存的值
    if (this.config.scope) {
      this.scope = this.config.scope;
      this.registry = new RegistryClient({
        scope: this.scope,
        registry: "https://registry.npmjs.org",
      });
    }
    const lockPath = join(dirname(configPath), "lock.yaml");
    if (lockfileExists(lockPath)) {
      this.lockfile = loadLockfile(lockPath);
    } else {
      this.lockfile = createEmptyLockfile(this.cliVersion);
    }
  }

  /** 将带 scope 的包名转换为目录名（如 @coder-2100/react-rules → react-rules） */
  private toShortName(fullName: string): string {
    const prefix = `${this.scope}/`;
    if (fullName.startsWith(prefix)) {
      return fullName.slice(prefix.length);
    }
    return fullName;
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
        const depShort = this.toShortName(dep.name);
        const depManifest = await this.registry.getLocalManifest(
          this.ensureAssetsDir(),
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
      resolved: `file:${relative(this.projectDir, join(this.ensureAssetsDir(), this.toShortName(name)))}`,
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

  /** 确保 assetsDir 已设置，未设置则抛出错误 */
  private ensureAssetsDir(): string {
    if (!this.assetsDir) {
      throw new Error(
        "未指定资产包目录。请通过 --assets-dir 指定路径，或先运行 ai-context init --assets-dir <path>。",
      );
    }
    return this.assetsDir;
  }
}

/** 从 CLI 包的 package.json 中读取版本号 */
function getCliVersion(): string {
  const pkgPath = join(import.meta.dirname, "..", "..", "package.json");
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    return pkg.version || "0.0.0";
  }
  return "0.0.0";
}
