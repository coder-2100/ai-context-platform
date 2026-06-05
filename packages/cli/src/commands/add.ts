import chalk from "chalk";
import { PackageManager } from "../core/package-manager";

/** add 命令的选项 */
export interface AddOptions {
  projectDir: string;
  packageNames: string[];
  assetsDir?: string;
  /** npm registry 地址 */
  registry?: string;
}

/** 添加知识资产包到项目，更新 config.yaml 和 lock.yaml */
export async function addCommand(options: AddOptions): Promise<void> {
  const pm = new PackageManager({
    projectDir: options.projectDir,
    assetsDir: options.assetsDir,
    registry: options.registry,
  });

  pm.loadExisting();

  const installed = await pm.add(options.packageNames);

  if (installed.length === 0) {
    console.log(chalk.yellow("没有新包需要安装。"));
  } else {
    for (const name of installed) {
      console.log(`${chalk.green("  +")} ${name}`);
    }
    console.log(
      `\n已更新 ${chalk.cyan(".ai/config.yaml")} 和 ${chalk.cyan(".ai/lock.yaml")}`,
    );
    console.log(`运行 ${chalk.yellow("ai-context build")} 生成运行时上下文。`);
  }
}
