import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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

/** 清空 .ai/runtime/ 下各子目录中的文件，保留目录结构 */
function cleanRuntimeDir(projectDir: string): void {
  const runtimeDir = join(projectDir, ".ai", "runtime");
  if (!existsSync(runtimeDir)) return;
  for (const sub of readdirSync(runtimeDir, { withFileTypes: true })) {
    if (sub.isDirectory()) {
      const subDir = join(runtimeDir, sub.name);
      for (const file of readdirSync(subDir, { withFileTypes: true })) {
        rmSync(join(subDir, file.name), { recursive: true, force: true });
      }
    }
  }
}

/** 构建运行时上下文：清理旧文件 → 提取内容 → 适配器渲染 → 写入索引和内容文件 */
export async function buildCommand(options: BuildOptions): Promise<void> {
  const spinner = ora("Building runtime context...").start();

  try {
    // 干跑模式不清理也不写入
    if (!options.dryRun) {
      cleanRuntimeDir(options.projectDir);
    }

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
    /** 只有 isEntry 包的内容进入索引 */
    const indexContents = [];

    const cacheDir = options.cacheDir ?? GLOBAL_CACHE_DIR;
    const lockfile = pm.getLockfile();
    /** 标记哪些包是用户直接添加的（isEntry） */
    const entryPackageNames = new Set(
      config.packages.filter((p) => p.isEntry).map((p) => p.name),
    );
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
      if (entryPackageNames.has(pkg.name)) {
        indexContents.push(...contents);
      }
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
      indexContents,
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
