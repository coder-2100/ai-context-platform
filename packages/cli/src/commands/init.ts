import { existsSync } from "node:fs";
import { join } from "node:path";
import chalk from "chalk";
import { PackageManager } from "../core/package-manager";
import { loadConfig } from "../core/config";

/** init 命令的选项 */
export interface InitOptions {
  projectDir: string;
  projectName: string;
  assetsDir?: string;
  /** 资产包的 npm scope，默认 @coder-2100 */
  scope?: string;
}

/** 初始化项目：创建 .ai/ 目录结构和 config.yaml，索引文件在 build 命令中按目标工具生成 */
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

  console.log(chalk.green("✓ 项目已初始化"));
  console.log(`  创建 ${chalk.cyan(".ai/")} 目录结构`);
  if (options.assetsDir) {
    console.log(`  资产目录设置为 ${chalk.cyan(options.assetsDir)}`);
  }
  console.log(`\n运行 ${chalk.yellow("ai-context add")} 安装知识资产包`);
  console.log(
    `运行 ${chalk.yellow("ai-context build")} 生成运行时上下文和索引文件`,
  );
}

/** 解析资产目录路径，优先级：CLI 参数 > config.yaml 配置 > 返回 undefined（将使用 npm） */
export function resolveAssetsDir(
  projectDir: string,
  cliAssetsDir?: string,
): string | undefined {
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

  // 3. 无法解析，返回 undefined（将使用 npm 安装）
  return undefined;
}
