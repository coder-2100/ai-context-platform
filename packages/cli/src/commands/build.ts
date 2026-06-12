import {
  existsSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { ResolvedPackage } from "@coder-2100/schema";
import chalk from "chalk";
import ora from "ora";
import { getAdapter } from "../adapters/types";
import { GLOBAL_CACHE_DIR } from "../core/paths";
import { PackageManager } from "../core/package-manager";
import { assembleContents } from "../engine/assembly";
import {
  extractContent,
  extractFrontmatterFromContents,
  resolveInheritedContent,
} from "../engine/content-extraction";
import {
  cleanRuntimeDir,
  cleanTraeDir,
  writeIndexFile,
} from "../engine/index-builder";
import { rankContents } from "../engine/ranking";
import { resolveTaskContents } from "../engine/task-resolver";

/** build 命令的选项 */
export interface BuildOptions {
  projectDir: string;
  task: string;
  /** 目标工具名称，如 claude-code / codex / trae / gemini */
  tool: string;
  assetsDir?: string;
  /** npm 包缓存目录，默认指向全局 ~/.ai-context/cache，测试可注入 */
  cacheDir?: string;
  dryRun?: boolean;
  verbose?: boolean;
  /** 为所有已启用的工具生成，开启时忽略 tool 参数 */
  allTools?: boolean;
}

/**
 * 判断工具名是否为回退到 Codex 的工具（gemini 或其他未特化适配器的工具）
 * 命中时使用 CodexAdapter 渲染并输出 AGENTS.md
 */
function isCodexFallback(tool: string): boolean {
  return tool !== "claude-code" && tool !== "codex" && tool !== "trae";
}

/**
 * 构建运行时上下文，串联完整 Pipeline：
 * Stage 1 内容提取 → Stage 2 合并与冲突解决 → Stage 3 排序 →
 * Stage 4 任务解析 → Stage 5 提取 frontmatter → Stage 6 适配器渲染
 */
export async function buildCommand(options: BuildOptions): Promise<void> {
  const spinner = ora("Building runtime context...").start();

  try {
    // 干跑模式不清理也不写入
    if (!options.dryRun) {
      cleanRuntimeDir(options.projectDir);
      cleanTraeDir(options.projectDir);
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

    // ── Stage 1: 内容提取 ──
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
      let contents = await extractContent(
        options.assetsDir,
        pkg.name,
        config.scope,
        cacheDir,
        lockEntry?.version,
      );

      // 解析 extends 继承
      if (pkg.manifest.extends.length > 0) {
        contents = await resolveInheritedContent(
          options.assetsDir,
          contents,
          pkg.manifest.extends,
          config.scope,
          cacheDir,
        );
      }

      allContents.push(...contents);
      if (entryPackageNames.has(pkg.name)) {
        indexContents.push(...contents);
      }
    }

    // ── Stage 2: 合并与冲突解决 ──
    const { merged: mergedAll, conflicts } = assembleContents(allContents);
    const { merged: mergedIndex } = assembleContents(indexContents);

    if (options.verbose && conflicts.length > 0) {
      for (const conflict of conflicts) {
        console.log(
          chalk.dim(
            `  冲突解决: ${conflict.id} — 保留 ${conflict.resolvedContent.sourcePath}`,
          ),
        );
      }
    }

    // ── Stage 3: 排序 ──
    const rankedAll = rankContents(mergedAll);
    const rankedIndex = rankContents(mergedIndex);

    // ── Stage 4: 任务解析（仅影响索引内容） ──
    const taskResult = resolveTaskContents(rankedIndex, options.task);

    if (options.verbose) {
      console.log(
        chalk.dim(
          `  任务解析: ${taskResult.taskContents.length} 条相关，${taskResult.otherContents.length} 条无关`,
        ),
      );
    }

    // ── Stage 5: 提取结构化 frontmatter ──
    const frontmatters = extractFrontmatterFromContents(rankedAll);

    // ── Stage 6: 适配器渲染 ──
    // 本次构建要渲染的工具列表：--allTools 时取所有已启用的工具，否则只渲染指定 tool
    const tools = options.allTools
      ? Object.entries(config.tooling)
          .filter(([, v]) => v.enabled)
          .map(([k]) => k)
      : [options.tool];

    for (const tool of tools) {
      // 回退提示：gemini 或其他未特化适配器的工具回退到 Codex 渲染（AGENTS.md 格式）
      if (isCodexFallback(tool)) {
        console.log(
          chalk.blue(
            `ℹ Tool "${tool}" uses Codex adapter (AGENTS.md format)`,
          ),
        );
      }
      const adapter = await getAdapter(
        tool as "claude-code" | "codex" | "trae" | "gemini",
      );
      const output = adapter.render(
        {
          task: options.task,
          packages: installedPackages,
          ...frontmatters,
          indexBudget:
            config.budget.perTool[tool]?.indexBudget ||
            config.budget.indexBudget,
          contentBudget: 10000,
          toolCapabilities: adapter.capabilities,
        },
        rankedAll,
        config.project.name,
        rankedIndex,
      );

      if (options.dryRun) {
        spinner.stop();
        if (output.index.path) {
          console.log(
            `${chalk.cyan("[dry-run]")} 工具 ${tool} 将生成的索引内容：`,
          );
          console.log(output.index.content);
        } else {
          console.log(
            `${chalk.cyan("[dry-run]")} 工具 ${tool} 无索引文件（multi-md 格式）`,
          );
        }
        console.log(
          `${chalk.cyan("[dry-run]")} 将写入 ${output.files.length} 个内容文件：`,
        );
        for (const f of output.files) {
          console.log(`  ${f.path}`);
        }
        continue;
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

      // 写入索引文件（Trae 等无索引文件工具时 path 为空，跳过写入）
      if (output.index.path) {
        const indexPath = join(options.projectDir, output.index.path);
        writeIndexFile(indexPath, output.index.content);
      }

      if (options.verbose) {
        console.log(chalk.dim(`  工具 ${tool}: 写入 ${output.files.length} 个内容文件`));
        if (output.index.path) {
          console.log(chalk.dim(`  索引文件: ${output.index.path}`));
        } else {
          console.log(chalk.dim(`  无索引文件（multi-md 格式）`));
        }
      }
    }

    spinner.succeed("Build 完成");
  } catch (err) {
    spinner.fail("Build 失败");
    throw err;
  }
}
