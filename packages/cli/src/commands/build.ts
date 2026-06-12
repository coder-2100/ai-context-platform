import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
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
  MARKER_END,
  MARKER_START,
  TOOL_INDEX_FILES,
  cleanRuntimeDir,
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
 * 清理不属于当前构建工具的旧索引文件：
 * 移除标记区域内的托管内容及配套的 # Project Context 标题，
 * 若文件仅含托管内容则整体删除
 */
function cleanStaleIndexFiles(
  projectDir: string,
  activeTools: string[],
): void {
  for (const [tool, indexPath] of Object.entries(TOOL_INDEX_FILES)) {
    if (activeTools.includes(tool)) continue;
    const fullPath = join(projectDir, indexPath);
    if (!existsSync(fullPath)) continue;

    const content = readFileSync(fullPath, "utf-8");
    const startIdx = content.indexOf(MARKER_START);
    const endIdx = content.indexOf(MARKER_END);

    // 无标记内容时，检查是否仅剩 # Project Context 残留（前次清理的遗留）
    if (startIdx === -1 || endIdx === -1) {
      if (content.trim() === "# Project Context") {
        rmSync(fullPath, { force: true });
      }
      continue;
    }

    const before = content.slice(0, startIdx).trim();
    const after = content.slice(endIdx + MARKER_END.length).trim();

    // # Project Context 标题由 writeIndexFile 生成，属于托管内容的一部分
    const realUserContent =
      before === "# Project Context" ? "" : before;

    if (!realUserContent && !after) {
      // 文件仅包含托管内容，删除整个文件
      rmSync(fullPath, { force: true });
    } else {
      // 文件包含用户内容，仅移除托管区域
      const parts = [realUserContent, after].filter(Boolean).join("\n\n");
      writeFileSync(fullPath, `${parts}\n`, "utf-8");
    }
  }
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
    }

    const pm = new PackageManager({
      projectDir: options.projectDir,
      assetsDir: options.assetsDir,
    });

    pm.loadExisting();
    const config = pm.getConfig();
    const installedPackages = pm.list() as ResolvedPackage[];

    // 确定本次构建的目标工具列表
    const activeTools = options.allTools
      ? Object.entries(config.tooling)
          .filter(([, v]) => v.enabled)
          .map(([k]) => k)
      : [options.tool];

    // 清理不属于当前工具的旧索引文件
    if (!options.dryRun) {
      cleanStaleIndexFiles(options.projectDir, activeTools);
    }

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
    for (const tool of activeTools) {
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
        console.log(
          `${chalk.cyan("[dry-run]")} 工具 ${tool} 将生成的索引内容：`,
        );
        console.log(output.index.content);
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

      // 写入索引文件
      const indexPath = join(options.projectDir, output.index.path);
      writeIndexFile(indexPath, output.index.content);

      if (options.verbose) {
        console.log(chalk.dim(`  工具 ${tool}: 写入 ${output.files.length} 个内容文件`));
        console.log(chalk.dim(`  索引文件: ${output.index.path}`));
      }
    }

    spinner.succeed("Build 完成");
  } catch (err) {
    spinner.fail("Build 失败");
    throw err;
  }
}
