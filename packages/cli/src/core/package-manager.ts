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
import { PackageNameParser } from "./package-name-parser";
import { NpmRegistryClient } from "./npm-registry-client";
import { CacheManager } from "./cache";

/** PackageManager 构造选项 */
export interface PackageManagerOptions {
  projectDir: string;
  /** 资产目录路径，可选。未指定时从 npm 安装 */
  assetsDir?: string;
  /** 资产包的 npm scope，默认 @coder-2100 */
  scope?: string;
  /** npm registry 地址，默认 https://registry.npmjs.org */
  registry?: string;
}

/** 已安装的包信息，包含名称、版本和完整清单 */
export interface InstalledPackage {
  name: string;
  version: string;
  manifest: Manifest;
}

/** 已解析的包信息，包含来源详情 */
interface ResolvedPackageInfo {
  manifest: Manifest;
  source: "local" | "npm";
  version: string;
  tarballUrl?: string;
  shasum?: string;
}

/** 包管理器：统一管理知识资产包的初始化、安装、移除和查询 */
export class PackageManager {
  private projectDir: string;
  private assetsDir: string | undefined;
  /** 资产包的 npm scope，用于包名与目录名的转换 */
  private scope: string;
  private localRegistry: RegistryClient;
  private npmRegistry: NpmRegistryClient;
  /** CLI 版本号，从 package.json 中自动读取 */
  private cliVersion: string;
  private config: Config | null = null;
  private lockfile: Lockfile | null = null;
  private _cacheManager: CacheManager | null = null;

  constructor(options: PackageManagerOptions) {
    this.projectDir = options.projectDir;
    this.assetsDir = options.assetsDir;
    this.scope = options.scope || "@coder-2100";
    this.localRegistry = new RegistryClient({
      scope: this.scope,
      registry: "https://registry.npmjs.org",
    });
    this.npmRegistry = new NpmRegistryClient({
      registry: options.registry || "https://registry.npmjs.org",
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

  /** 添加包到项目，自动判断本地/npm 来源，解析并安装依赖，返回新安装的包名列表 */
  async add(packageNames: string[]): Promise<string[]> {
    this.ensureInitialized();
    const installed: string[] = [];
    const existingNames = new Set(this.config!.packages.map((p) => p.name));
    const parser = new PackageNameParser(this.scope);

    for (const input of packageNames) {
      const { name, range } = parser.parse(input);
      if (existingNames.has(name)) continue;

      const resolved = await this.resolveManifest(name, range);
      if (!resolved) {
        throw new Error(`包 ${name} 未找到`);
      }

      await this.installPackageWithDependencies(name, resolved);
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
      let manifest: Manifest | null = null;

      // 根据 lockfile 中的 resolved 判断来源
      if (lockEntry.resolved.startsWith("file:") && this.assetsDir) {
        manifest = this.localRegistry.parseManifest(
          join(this.assetsDir, shortName, "manifest.yaml"),
        );
      } else if (lockEntry.resolved.startsWith("http")) {
        manifest = this.readCachedManifest(shortName, lockEntry.version);
      }

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
    if (!this.assetsDir && this.config.assetsDir) {
      this.assetsDir = this.config.assetsDir;
    }
    if (this.config.scope) {
      this.scope = this.config.scope;
      this.localRegistry = new RegistryClient({
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

  /** 解析包清单：先查本地 assetsDir，再查 npm */
  private async resolveManifest(
    name: string,
    range: string | null,
  ): Promise<ResolvedPackageInfo | null> {
    // 1. 尝试本地 assetsDir
    if (this.assetsDir) {
      const shortName = this.toShortName(name);
      const localManifest = await this.localRegistry.getLocalManifest(
        this.assetsDir,
        shortName,
      );
      if (localManifest) {
        // 如果指定了版本范围，检查本地版本是否匹配
        if (range && localManifest.version) {
          const { satisfies } = await import("semver");
          if (!satisfies(localManifest.version, range)) {
            return this.resolveFromNpm(name, range);
          }
        }
        return {
          manifest: localManifest,
          source: "local",
          version: localManifest.version,
        };
      }
    }

    // 2. 从 npm 获取
    return this.resolveFromNpm(name, range);
  }

  /** 从 npm registry 解析包清单 */
  private async resolveFromNpm(
    name: string,
    range: string | null,
  ): Promise<ResolvedPackageInfo | null> {
    try {
      const resolved = await this.npmRegistry.resolveVersion(name, range);
      const cacheManager = this.getCacheManager();
      const shortName = this.toShortName(name);

      // 检查缓存
      if (cacheManager.hasPackageCache(shortName, resolved.version)) {
        const cachedManifest = this.readCachedManifest(
          shortName,
          resolved.version,
        );
        if (cachedManifest) {
          return {
            manifest: cachedManifest,
            source: "npm",
            version: resolved.version,
            tarballUrl: resolved.tarballUrl,
            shasum: resolved.shasum,
          };
        }
      }

      // 下载并解压到缓存
      const tarball = await this.npmRegistry.fetchTarball(
        resolved.tarballUrl,
      );
      await cacheManager.extractPackageTarball(
        shortName,
        resolved.version,
        tarball,
      );
      const manifest = this.readCachedManifest(shortName, resolved.version);
      if (!manifest) return null;

      return {
        manifest,
        source: "npm",
        version: resolved.version,
        tarballUrl: resolved.tarballUrl,
        shasum: resolved.shasum,
      };
    } catch {
      return null;
    }
  }

  /** 从缓存目录读取 manifest.yaml */
  private readCachedManifest(
    shortName: string,
    version: string,
  ): Manifest | null {
    const cacheManager = this.getCacheManager();
    const cachePath = cacheManager.getPackageCachePath(shortName, version);
    return this.localRegistry.parseManifest(join(cachePath, "manifest.yaml"));
  }

  /** 获取缓存管理器实例 */
  private getCacheManager(): CacheManager {
    if (!this._cacheManager) {
      this._cacheManager = new CacheManager(
        join(this.projectDir, ".ai", "cache"),
      );
    }
    return this._cacheManager;
  }

  /** 递归安装包及其非可选依赖，支持本地和 npm 来源 */
  private async installPackageWithDependencies(
    name: string,
    resolved: ResolvedPackageInfo,
  ): Promise<void> {
    // 先安装非可选依赖
    for (const dep of resolved.manifest.dependencies) {
      if (
        !dep.optional &&
        !this.config!.packages.some((p) => p.name === dep.name)
      ) {
        const depResolved = await this.resolveManifest(dep.name, dep.version);
        if (depResolved) {
          await this.installPackageWithDependencies(dep.name, depResolved);
        }
      }
    }

    // 写入 config
    this.config!.packages.push({
      name,
      version: `^${resolved.manifest.version}`,
    });

    // 写入 lockfile
    const shortName = this.toShortName(name);
    if (resolved.source === "npm") {
      this.lockfile = addPackageToLockfile(this.lockfile!, {
        name,
        version: resolved.version,
        resolved: resolved.tarballUrl || "",
        integrity: `sha512-${resolved.shasum || "unknown"}`,
      });
    } else {
      const resolvedPath = this.assetsDir
        ? `file:${relative(this.projectDir, join(this.assetsDir, shortName))}`
        : "";
      this.lockfile = addPackageToLockfile(this.lockfile!, {
        name,
        version: resolved.manifest.version,
        resolved: resolvedPath,
        integrity: `local-${resolved.manifest.version}`,
      });
    }

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

/** 从 CLI 包的 package.json 中读取版本号 */
function getCliVersion(): string {
  const pkgPath = join(import.meta.dirname, "..", "..", "package.json");
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    return pkg.version || "0.0.0";
  }
  return "0.0.0";
}
