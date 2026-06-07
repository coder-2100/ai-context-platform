import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
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

  /** 清空 npm 包缓存（packages/ 子目录），保留清单缓存 */
  clearPackages(): void {
    const dir = join(this.cacheDir, "packages");
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  /** 清空清单缓存（manifests/ 子目录），保留 npm 包缓存 */
  clearManifests(): void {
    const dir = join(this.cacheDir, "manifests");
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  /** 统计 npm 包缓存的文件数量与总大小（字节） */
  statPackages(): { fileCount: number; totalBytes: number } {
    return statDir(join(this.cacheDir, "packages"));
  }

  /** 统计清单缓存的文件数量与总大小（字节） */
  statManifests(): { fileCount: number; totalBytes: number } {
    return statDir(join(this.cacheDir, "manifests"));
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

/** 递归统计目录下所有文件的数量与字节总数，目录不存在时返回零值 */
function statDir(dir: string): { fileCount: number; totalBytes: number } {
  if (!existsSync(dir)) {
    return { fileCount: 0, totalBytes: 0 };
  }
  let fileCount = 0;
  let totalBytes = 0;
  const stack: string[] = [dir];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    const entries = readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else if (entry.isFile()) {
        fileCount += 1;
        totalBytes += statSync(entryPath).size;
      }
    }
  }
  return { fileCount, totalBytes };
}
