import { existsSync } from "node:fs";
import { join } from "node:path";
import chalk from "chalk";
import { PackageManager } from "../core/package-manager";
import { loadConfig } from "../core/config";
import { writeIndexFile } from "../engine/index-builder";

/** init 命令的选项 */
export interface InitOptions {
  projectDir: string;
  projectName: string;
  assetsDir?: string;
  /** 资产包的 npm scope，默认 @coder-2100 */
  scope?: string;
}

/** 初始化项目：创建 .ai/ 目录结构、config.yaml 和 CLAUDE.md 索引文件 */
export async function initCommand(options: InitOptions): Promise<void> {
  const aiDir = join(options.projectDir, ".ai");
  if (existsSync(join(aiDir, "config.yaml"))) {
    throw new Error("项目已初始化。如需重新初始化，请先删除 .ai/ 目录。");
  }

  const pm = new PackageManager({
    projectDir: options.projectDir,
    scope: options.scope,
  });

  await pm.init(options.projectName, options.assetsDir);

  // 创建 CLAUDE.md 标记区域
  const claudeMdPath = join(options.projectDir, "CLAUDE.md");
  writeIndexFile(
    claudeMdPath,
    "No packages installed yet. Run `ai-context add` to get started.",
  );

  console.log(chalk.green("✓ 项目已初始化"));
  console.log(`  创建 ${chalk.cyan(".ai/")} 目录结构`);
  console.log(`  创建 ${chalk.cyan("CLAUDE.md")} 索引文件`);
  if (options.assetsDir) {
    console.log(`  资产目录设置为 ${chalk.cyan(options.assetsDir)}`);
  }
  console.log(`\n运行 ${chalk.yellow("ai-context add")} 安装知识资产包`);
}

/** 解析资产目录路径，优先级：CLI 参数 > config.yaml 配置 > 抛错提示 */
export function resolveAssetsDir(
  projectDir: string,
  cliAssetsDir?: string,
): string {
  // 1. CLI 参数最高优先级
  if (cliAssetsDir) {
    if (!existsSync(cliAssetsDir)) {
      throw new Error(`指定的资产目录不存在: ${cliAssetsDir}`);
    }
    return cliAssetsDir;
  }

  // 2. 从 .ai/config.yaml 读取
  const configPath = join(projectDir, ".ai", "config.yaml");
  if (existsSync(configPath)) {
    const config = loadConfig(configPath);
    if (config.assetsDir) {
      if (!existsSync(config.assetsDir)) {
        throw new Error(
          `配置中的资产目录不存在: ${config.assetsDir}，请重新指定 --assets-dir`,
        );
      }
      return config.assetsDir;
    }
  }

  // 3. 无法解析，提示用户
  throw new Error(
    "未指定资产包目录。请通过 --assets-dir 指定路径，或先运行 ai-context init --assets-dir <path> 将路径写入配置。",
  );
}
