import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import chalk from "chalk";
import { PackageManager } from "../core/package-manager";
import {
  MARKER_END,
  MARKER_START,
  TOOL_INDEX_FILES,
  cleanRuntimeDir,
  cleanTraeDir,
} from "../engine/index-builder";

/** unbuild 命令的选项 */
export interface UnbuildOptions {
  projectDir: string;
  /** 清理指定工具的索引文件 */
  tool?: string;
  /** 清理所有已启用工具的索引文件 */
  allTools?: boolean;
  /** 删除整个索引文件而非仅清理标记区域 */
  force?: boolean;
  /** 预览将清理的内容，不实际操作 */
  dryRun?: boolean;
}

/**
 * 清理索引文件中的托管标记区域：
 * - 移除 AI-CONTEXT:INDEX:START/END 之间的托管内容及配套的 # Project Context 标题
 * - 清理后若文件无用户内容则删除整个文件
 * - force 为 true 时直接删除文件
 */
function cleanIndexFile(
  filePath: string,
  force: boolean,
  dryRun: boolean,
): void {
  // 文件不存在无需处理
  if (!existsSync(filePath)) return;

  // 强制模式直接删除整个文件
  if (force) {
    if (dryRun) {
      console.log(chalk.cyan(`[dry-run] 将删除文件: ${filePath}`));
      return;
    }
    rmSync(filePath, { force: true });
    return;
  }

  const content = readFileSync(filePath, "utf-8");
  const startIdx = content.indexOf(MARKER_START);
  const endIdx = content.indexOf(MARKER_END);

  // 无标记内容时，检查是否仅剩 # Project Context 残留
  if (startIdx === -1 || endIdx === -1) {
    if (content.trim() === "# Project Context") {
      if (dryRun) {
        console.log(chalk.cyan(`[dry-run] 将删除文件: ${filePath}`));
        return;
      }
      rmSync(filePath, { force: true });
    }
    return;
  }

  const before = content.slice(0, startIdx).trim();
  const after = content.slice(endIdx + MARKER_END.length).trim();

  // # Project Context 标题由 writeIndexFile 生成，属于托管内容的一部分
  const realUserContent = before === "# Project Context" ? "" : before;

  if (!realUserContent && !after) {
    if (dryRun) {
      console.log(chalk.cyan(`[dry-run] 将删除文件: ${filePath}`));
      return;
    }
    // 文件仅包含托管内容，删除整个文件
    rmSync(filePath, { force: true });
  } else {
    if (dryRun) {
      console.log(chalk.cyan(`[dry-run] 将清理标记区域: ${filePath}`));
      return;
    }
    // 文件包含用户内容，仅移除托管区域
    const parts = [realUserContent, after].filter(Boolean).join("\n\n");
    writeFileSync(filePath, `${parts}\n`, "utf-8");
  }
}

/** unbuild 命令：清理指定工具的索引文件和 .ai/runtime/ 内容文件 */
export async function unbuildCommand(options: UnbuildOptions): Promise<void> {
  // 必须明确指定清理目标
  if (!options.tool && !options.allTools) {
    throw new Error("请指定 --tool <tool> 或 --all-tools 来确定清理目标");
  }

  // 加载项目配置以确定已启用的工具列表
  const pm = new PackageManager({ projectDir: options.projectDir });
  pm.loadExisting();
  const config = pm.getConfig();

  // 确定要清理的工具列表
  const tools: string[] = options.allTools
    ? Object.entries(config.tooling)
        .filter(([, v]) => v.enabled)
        .map(([k]) => k)
    : [options.tool!];

  const dryRun = options.dryRun ?? false;

  // 逐个工具清理索引文件
  for (const tool of tools) {
    if (!(tool in TOOL_INDEX_FILES)) {
      console.log(chalk.yellow(`  未知工具: ${tool}，跳过`));
      continue;
    }

    const indexPath = TOOL_INDEX_FILES[tool];
    // Trae 无索引文件（multi-md 格式）
    if (!indexPath) {
      console.log(chalk.dim(`  工具 ${tool}: 无索引文件（multi-md 格式）`));
      continue;
    }

    const fullPath = join(options.projectDir, indexPath);
    cleanIndexFile(fullPath, options.force ?? false, dryRun);
    console.log(chalk.dim(`  工具 ${tool}: 索引文件 ${indexPath} 已清理`));
  }

  // 仅 --all-tools 时清理共享内容目录（内容文件是所有工具共享的，
  // 指定单工具清理时不应删除，否则会破坏其他工具的上下文）
  if (options.allTools) {
    if (!dryRun) {
      cleanRuntimeDir(options.projectDir);
      console.log(chalk.dim("  .ai/runtime/ 内容文件已清理"));
      cleanTraeDir(options.projectDir);
      console.log(chalk.dim("  .trae/ 内容文件已清理"));
    } else {
      console.log(chalk.cyan("[dry-run] 将清理 .ai/runtime/ 内容文件"));
      console.log(chalk.cyan("[dry-run] 将清理 .trae/ 内容文件"));
    }
  }

  console.log(chalk.green("\n✓ Unbuild 完成"));
}
