import { existsSync } from "node:fs";
import chalk from "chalk";
import { CacheManager } from "../core/cache";
import { GLOBAL_CACHE_DIR } from "../core/paths";

/** clean 命令的选项 */
export interface CleanOptions {
  /** 缓存目录，默认全局缓存 GLOBAL_CACHE_DIR；测试时可注入临时路径 */
  cacheDir?: string;
  /** 仅清理 npm 包缓存（packages 子目录） */
  packages?: boolean;
  /** 仅清理清单缓存（manifests 子目录） */
  manifests?: boolean;
  /** 仅打印将要删除的内容，不实际删除 */
  dryRun?: boolean;
}

/** 将字节数格式化为可读字符串 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/** 清理 CLI 全局缓存。默认清空全部；可通过选项指定只清 packages 或 manifests；--dry-run 仅打印不删除 */
export async function cleanCommand(options: CleanOptions = {}): Promise<void> {
  const cacheDir = options.cacheDir ?? GLOBAL_CACHE_DIR;

  if (!existsSync(cacheDir)) {
    console.log(chalk.gray(`缓存目录不存在: ${cacheDir}`));
    console.log(chalk.gray("无需清理"));
    return;
  }

  const cache = new CacheManager(cacheDir);

  // 未指定任何范围 → 全清；显式指定一个 → 只清那个；两个都指定 → 等价于全清
  const noneSpecified = !options.packages && !options.manifests;
  const cleanPackages = noneSpecified || options.packages === true;
  const cleanManifests = noneSpecified || options.manifests === true;

  console.log(chalk.cyan(`缓存目录: ${cacheDir}`));
  if (cleanPackages) {
    const stat = cache.statPackages();
    console.log(`  packages: ${stat.fileCount} 个文件, ${formatBytes(stat.totalBytes)}`);
  }
  if (cleanManifests) {
    const stat = cache.statManifests();
    console.log(`  manifests: ${stat.fileCount} 个文件, ${formatBytes(stat.totalBytes)}`);
  }

  if (options.dryRun) {
    console.log(chalk.yellow("\n[dry-run] 未执行删除"));
    return;
  }

  if (cleanPackages) cache.clearPackages();
  if (cleanManifests) cache.clearManifests();

  console.log(chalk.green("\n✓ 缓存清理完成"));
}
