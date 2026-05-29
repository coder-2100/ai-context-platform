import chalk from "chalk";
import { PackageManager } from "../core/package-manager";
import type { InstalledPackage } from "../core/package-manager";
import { RegistryClient } from "../core/registry-client";

/** list 命令的选项 */
export interface ListOptions {
  projectDir: string;
  assetsDir: string;
  verbose?: boolean;
}

/** 列出已安装的知识资产包，verbose 模式显示 layer/type/description */
export async function listCommand(
  options: ListOptions,
): Promise<InstalledPackage[]> {
  const registry = new RegistryClient({
    scope: "@coder-2100",
    registry: "https://registry.npmjs.org",
  });
  const pm = new PackageManager({
    projectDir: options.projectDir,
    assetsDir: options.assetsDir,
    registry,
    cliVersion: "0.1.0",
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
