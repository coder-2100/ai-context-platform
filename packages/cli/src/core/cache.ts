import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import * as tar from "tar";
import type { Manifest } from "@coder-2100/schema";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

/** 基于文件系统的缓存管理器，支持通用的 key-value 缓存和清单专用缓存 */
export class CacheManager {
  constructor(private cacheDir: string) {}

  /** 确保缓存目录存在 */
  ensureCacheDir(): void {
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /** 根据 key 获取缓存内容，不存在则返回 null */
  get(key: string): string | null {
    const filePath = this.getFilePath(key);
    try {
      return readFileSync(filePath, "utf-8");
    } catch {
      return null;
    }
  }

  /** 将内容写入缓存 */
  set(key: string, content: string): void {
    const filePath = this.getFilePath(key);
    const dir = join(filePath, "..");
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(filePath, content, "utf-8");
  }

  /** 获取缓存的包清单，存储路径为 manifests/<name>/<version>.yaml */
  getManifest(packageName: string, version: string): Manifest | null {
    const key = `manifests/${packageName}/${version}.yaml`;
    const content = this.get(key);
    if (!content) return null;
    return parseYaml(content) as Manifest;
  }

  /** 将包清单写入缓存 */
  setManifest(packageName: string, version: string, manifest: Manifest): void {
    const key = `manifests/${packageName}/${version}.yaml`;
    this.set(key, stringifyYaml(manifest, { lineWidth: 0 }));
  }

  /** 清空整个缓存目录 */
  clear(): void {
    if (existsSync(this.cacheDir)) {
      rmSync(this.cacheDir, { recursive: true, force: true });
    }
    this.ensureCacheDir();
  }

  /** 获取 npm 包缓存目录路径，格式为 packages/<shortName>/<version>/ */
  getPackageCachePath(packageName: string, version: string): string {
    return join(this.cacheDir, "packages", packageName, version);
  }

  /** 检查 npm 包缓存是否存在 */
  hasPackageCache(packageName: string, version: string): boolean {
    return existsSync(this.getPackageCachePath(packageName, version));
  }

  /** 解压 npm tarball 到缓存目录，版本变更时清除旧版本缓存 */
  async extractPackageTarball(
    packageName: string,
    version: string,
    tarballBuffer: Buffer,
  ): Promise<string> {
    const packageDir = join(this.cacheDir, "packages", packageName);

    // 清除同名包的旧版本缓存（版本变更时覆盖）
    if (existsSync(packageDir)) {
      rmSync(packageDir, { recursive: true, force: true });
    }

    const targetDir = this.getPackageCachePath(packageName, version);
    mkdirSync(targetDir, { recursive: true });

    // 将 Buffer 写入临时文件后用 tar 解压
    const tmpTarPath = join(this.cacheDir, `.tmp-${packageName}-${version}.tgz`);
    writeFileSync(tmpTarPath, tarballBuffer);

    try {
      await tar.x({
        file: tmpTarPath,
        cwd: targetDir,
        strip: 1, // npm tarball 内有一层 package/ 目录，需要剥掉
      });
    } finally {
      if (existsSync(tmpTarPath)) {
        rmSync(tmpTarPath, { force: true });
      }
    }

    return targetDir;
  }

  private getFilePath(key: string): string {
    return join(this.cacheDir, key);
  }
}
