import type {
  Adapter,
  AdapterInput,
  AdapterOutput,
  ContentFile,
} from "@coder-2100/schema";
import type { ExtractedContent } from "../engine/content-extraction";
import { buildIndex } from "../engine/index-builder";
import { CODEX_CAPABILITIES } from "./types";

/**
 * Codex 适配器，将内容渲染为 AGENTS.md 索引 + .ai/runtime/ 目录下的内容文件
 * 针对 Codex 的 32k 短上下文优化，索引更精简
 */
export class CodexAdapter implements Adapter {
  name = "codex" as const;
  capabilities = CODEX_CAPABILITIES;

  /** 渲染适配器输出：生成 task-oriented 索引和内容文件列表 */
  render(
    input: AdapterInput,
    contents: ExtractedContent[],
    projectName: string,
    /** 仅用于索引的内容列表（isEntry 筛选后），未传入时使用 contents */
    indexOnlyContents?: ExtractedContent[],
  ): AdapterOutput {
    const indexTarget = indexOnlyContents ?? contents;
    const indexContent = `# Project Context\n\n${buildIndex({
      contents: indexTarget,
      task: input.task,
      projectName,
      runtimeDir: ".ai/runtime",
      indexBudget: input.indexBudget,
    })}`;

    const files: ContentFile[] = contents.map((c) => ({
      type: c.type,
      id: c.id,
      name: c.name,
      path: `.ai/runtime/${c.type}s/${c.id}.md`,
      content: c.content,
      appliesTo: c.appliesTo,
      priority: c.priority,
    }));

    const instructions: string[] = [
      "索引文件已写入 AGENTS.md",
      "内容文件已写入 .ai/runtime/ 目录",
      "运行 `ai-context build` 重新生成索引",
    ];

    return {
      index: {
        content: indexContent,
        path: "AGENTS.md",
      },
      files,
      instructions,
    };
  }
}
