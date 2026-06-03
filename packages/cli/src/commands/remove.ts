import chalk from "chalk";
import { PackageManager } from "../core/package-manager";

/** remove 命令的选项 */
export interface RemoveOptions {
  projectDir: string;
  packageName: string;
}

/** 移除已安装的知识资产包，更新 config.yaml 和 lock.yaml */
export async function removeCommand(options: RemoveOptions): Promise<void> {
  const pm = new PackageManager({
    projectDir: options.projectDir,
  });

  pm.loadExisting();
  await pm.remove(options.packageName);
  console.log(`${chalk.red(" -")} ${options.packageName}`);
  console.log(
    `\n已更新 ${chalk.cyan(".ai/config.yaml")} 和 ${chalk.cyan(".ai/lock.yaml")}`,
  );
  console.log(
    `运行 ${chalk.yellow("ai-context build")} 重新生成运行时上下文。`,
  );
}
