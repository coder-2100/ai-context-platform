import chalk from "chalk";
import { PackageManager } from "../core/package-manager";
import type { InstalledPackage } from "../core/package-manager";

/** list 命令的选项 */
export interface ListOptions {
  projectDir: string;
  verbose?: boolean;
}

/** 列出已安装的知识资产包，verbose 模式显示 layer/type/description */
export async function listCommand(
  options: ListOptions,
): Promise<InstalledPackage[]> {
  const pm = new PackageManager({
    projectDir: options.projectDir,
  });

  pm.loadExisting();
  const packages = pm.list();

  if (packages.length === 0) {
    console.log(chalk.yellow("没有已安装的包。"));
    return [];
  }

  if (options.verbose) {
    console.log(
      chalk.bold(
        "Package                         Version  Layer   Type     Description",
      ),
    );
    for (const pkg of packages) {
      const name = pkg.name.padEnd(32);
      const version = pkg.version.padEnd(9);
      const layer = pkg.manifest.layer.padEnd(8);
      const type = pkg.manifest.type.padEnd(9);
      console.log(
        `${name} ${version} ${layer} ${type} ${pkg.manifest.description}`,
      );
    }
  } else {
    for (const pkg of packages) {
      console.log(`${pkg.name}  ${chalk.gray(pkg.version)}`);
    }
  }

  return packages;
}
