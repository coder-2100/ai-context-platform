import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ResolvedPackage } from "@coder-2100/schema";
import chalk from "chalk";
import ora from "ora";
import { ClaudeCodeAdapter } from "../adapters/claude";
import { type ToolName, getCapabilities } from "../adapters/types";
import { GLOBAL_CACHE_DIR } from "../core/paths";
import { PackageManager } from "../core/package-manager";
import { extractContent } from "../engine/content-extraction";
import { writeIndexFile } from "../engine/index-builder";

/** build 命令的选项 */
export interface BuildOptions {
  projectDir: string;
  task: string;
  tool: ToolName;
  assetsDir?: string;
  /** npm 包缓存目录，默认指向全局 ~/.ai-context/cache，测试可注入 */
  cacheDir?: string;
  dryRun?: boolean;
  verbose?: boolean;
}

/** 构建运行时上下文：提取内容 → 适配器渲染 → 写入索引和内容文件 */
export async function buildCommand(options: BuildOptions): Promise<void> {
  const spinner = ora("Building runtime context...").start();

  try {
    const pm = new PackageManager({
      projectDir: options.projectDir,
      assetsDir: options.assetsDir,
    });

    pm.loadExisting();
    const config = pm.getConfig();
    const installedPackages = pm.list() as ResolvedPackage[];

    if (installedPackages.length === 0) {
      spinner.warn("没有已安装的包。运行 ai-context add 安装包。");
      return;
    }

    // 提取所有内容
    const allContents = [];
    const cacheDir = options.cacheDir ?? GLOBAL_CACHE_DIR;
    const lockfile = pm.getLockfile();
    for (const pkg of installedPackages) {
      const lockEntry = lockfile.packages[pkg.name];
      const contents = await extractContent(
        options.assetsDir,
        pkg.name,
        config.scope,
        cacheDir,
        lockEntry?.version,
      );
      allContents.push(...contents);
    }

    // 使用 adapter 渲染输出
    const capabilities = getCapabilities(options.tool);
    const adapter = new ClaudeCodeAdapter();
    const output = adapter.render(
      {
        task: options.task,
        packages: installedPackages,
        rules: [],
        skills: [],
        agents: [],
        domains: [],
        playbooks: [],
        indexBudget:
          config.budget.perTool[options.tool]?.indexBudget ||
          config.budget.indexBudget,
        contentBudget: 10000,
        toolCapabilities: capabilities,
      },
      allContents,
      config.project.name,
    );

    if (options.dryRun) {
      spinner.stop();
      console.log(`${chalk.cyan("[dry-run]")}·将生成的索引内容：`);
      console.log(output.index.content);
      console.log(
        `${chalk.cyan("[dry-run]")} 将写入 ${output.files.length} 个内容文件：`,
      );
      for (const f of output.files) {
        console.log(`  ${f.path}`);
      }
      return;
    }

    // 写入内容文件
    for (const file of output.files) {
      const fullPath = join(options.projectDir, file.path);
      const dir = join(fullPath, "..");
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(fullPath, file.content, "utf-8");
    }

    // 写入索引文件
    const indexPath = join(options.projectDir, output.index.path);
    writeIndexFile(indexPath, output.index.content);

    spinner.succeed("Build 完成");
    for (const instruction of output.instructions) {
      console.log(chalk.dim(`  ${instruction}`));
    }
    if (options.verbose) {
      console.log(chalk.dim(`\n  写入 ${output.files.length} 个内容文件`));
      console.log(chalk.dim(`  索引文件: ${output.index.path}`));
    }
  } catch (err) {
    spinner.fail("Build 失败");
    throw err;
  }
}
