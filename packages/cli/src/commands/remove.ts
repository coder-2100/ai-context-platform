import chalk from "chalk";
import { PackageManager } from "../core/package-manager";
import { buildCommand } from "./build";
import type { ToolName } from "../adapters/types";

/** remove 命令的选项 */
export interface RemoveOptions {
  projectDir: string;
  packageName: string;
}

/** 移除已安装的知识资产包，更新配置和锁文件后自动重新构建运行时上下文 */
export async function removeCommand(options: RemoveOptions): Promise<void> {
  const pm = new PackageManager({
    projectDir: options.projectDir,
  });

  pm.loadExisting();
  const config = pm.getConfig();
  await pm.remove(options.packageName);
  console.log(`${chalk.red(" -")} ${options.packageName}`);
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
