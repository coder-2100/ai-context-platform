import path from "node:path";
import { Command } from "commander";
import type { ToolName } from "./adapters/types";
import { addCommand } from "./commands/add";
import { browseCommand } from "./commands/browse";
import { buildCommand } from "./commands/build";
import { findAssetsDir, initCommand } from "./commands/init";
import { listCommand } from "./commands/list";
import { removeCommand } from "./commands/remove";

const program = new Command();

program
  .name("ai-context")
  .description("AI Context Platform CLI — 结构化 Prompt 管理 + 运行时组装")
  .version("0.1.0");

program
  .command("init")
  .description("初始化项目（创建 .ai/ 目录和 config.yaml）")
  .option("-n, --name <name>", "项目名称")
  .action(async (opts) => {
    const projectName = opts.name || path.basename(process.cwd());
    const assetsDir = findAssetsDir();
    await initCommand({ projectDir: process.cwd(), projectName, assetsDir });
  });

program
  .command("add [packages...]")
  .description("添加包（不带参数时交互式选择）")
  .option("--assets-dir <path>", "资产包目录路径")
  .action(async (packageNames: string[], opts) => {
    const assetsDir = opts.assetsDir || findAssetsDir();
    if (packageNames.length === 0) {
      // 无参数时进入 browse 模式
      await browseCommand({ projectDir: process.cwd(), assetsDir });
    } else {
      await addCommand({ projectDir: process.cwd(), packageNames, assetsDir });
    }
  });

program
  .command("browse")
  .description("浏览可用资源，交互式选择批量安装")
  .option("--layer <layer>", "按 layer 筛选")
  .option("--type <type>", "按 type 筛选")
  .option("--tag <tag>", "按 tag 筛选")
  .option("--assets-dir <path>", "资产包目录路径")
  .action(async (opts) => {
    const assetsDir = opts.assetsDir || findAssetsDir();
    await browseCommand({
      projectDir: process.cwd(),
      assetsDir,
      layer: opts.layer,
      type: opts.type,
      tag: opts.tag,
    });
  });

program
  .command("remove <package>")
  .description("移除包")
  .option("--assets-dir <path>", "资产包目录路径")
  .action(async (packageName: string, opts) => {
    const assetsDir = opts.assetsDir || findAssetsDir();
    await removeCommand({ projectDir: process.cwd(), packageName, assetsDir });
  });

program
  .command("list")
  .description("列出已安装的包")
  .option("--verbose", "显示详细信息")
  .option("--assets-dir <path>", "资产包目录路径")
  .action(async (opts) => {
    const assetsDir = opts.assetsDir || findAssetsDir();
    await listCommand({
      projectDir: process.cwd(),
      assetsDir,
      verbose: opts.verbose,
    });
  });

program
  .command("build [task]")
  .description("构建运行时上下文")
  .option("--tool <tool>", "目标工具", "claude-code")
  .option("--all-tools", "为所有已启用的工具生成")
  .option("--dry-run", "仅预览，不写入文件")
  .option("--verbose", "详细输出")
  .option("--assets-dir <path>", "资产包目录路径")
  .action(async (task: string | undefined, opts) => {
    const assetsDir = opts.assetsDir || findAssetsDir();
    await buildCommand({
      projectDir: process.cwd(),
      task: task || "review",
      tool: opts.tool as ToolName,
      assetsDir,
      dryRun: opts.dryRun,
      verbose: opts.verbose,
    });
  });

program.parse();
