import chalk from "chalk";
import { PackageManager } from "../core/package-manager";
import { buildCommand } from "./build";
import type { ToolName } from "../adapters/types";

/** remove 命令的选项 */
export interface RemoveOptions {
  projectDir: string;
  packageName: string;
}

/** 移除已安装的知识资产包，级联移除孤立依赖后自动重新构建运行时上下文 */
export async function removeCommand(options: RemoveOptions): Promise<void> {
  const pm = new PackageManager({
    projectDir: options.projectDir,
  });

  pm.loadExisting();
  const config = pm.getConfig();
  const result = await pm.remove(options.packageName);

  // 输出被依赖警告
  for (const warning of result.warnings) {
    console.log(chalk.yellow(`⚠ ${warning}`));
  }

  // 输出移除的包
  for (const name of result.removed) {
    console.log(`${chalk.red(" -")} ${name}`);
  }

  console.log(
    `\n已更新 ${chalk.cyan(".ai/config.yaml")} 和 ${chalk.cyan(".ai/lock.yaml")}`,
  );

  // 自动重新构建，清理残留的 runtime 文件
  await buildCommand({
    projectDir: options.projectDir,
    task: "review",
    tool: "claude-code" as ToolName,
    assetsDir: config.assetsDir,
  });
}
