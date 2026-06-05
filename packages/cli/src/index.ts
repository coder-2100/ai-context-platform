import path from "node:path";
import { Command } from "commander";
import type { ToolName } from "./adapters/types";
import { addCommand } from "./commands/add";
import { buildCommand } from "./commands/build";
import { initCommand, resolveAssetsDir } from "./commands/init";
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
  .option("--assets-dir <path>", "资产包目录路径（将保存到配置中）")
  .option("--scope <scope>", "资产包的 npm scope", "@coder-2100")
  .action(async (opts) => {
    const projectName = opts.name || path.basename(process.cwd());
    await initCommand({
      projectDir: process.cwd(),
      projectName,
      assetsDir: opts.assetsDir,
      scope: opts.scope,
    });
  });

program
  .command("add <packages...>")
  .description("添加知识资产包")
  .option("--assets-dir <path>", "资产包目录路径")
  .option("--registry <url>", "npm registry 地址", "https://registry.npmjs.org")
  .action(async (packageNames: string[], opts) => {
    const assetsDir = resolveAssetsDir(process.cwd(), opts.assetsDir);
    await addCommand({
      projectDir: process.cwd(),
      packageNames,
      assetsDir,
      registry: opts.registry,
    });
  });

program
  .command("remove <package>")
  .description("移除包")
  .action(async (packageName: string) => {
    await removeCommand({ projectDir: process.cwd(), packageName });
  });

program
  .command("list")
  .description("列出已安装的包")
  .option("--verbose", "显示详细信息")
  .action(async (opts) => {
    await listCommand({
      projectDir: process.cwd(),
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
    const assetsDir = resolveAssetsDir(process.cwd(), opts.assetsDir);
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
