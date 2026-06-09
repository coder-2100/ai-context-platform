import type {
  Adapter,
  AdapterInput,
  AdapterOutput,
  ContentFile,
} from "@coder-2100/schema";
import type { ExtractedContent } from "../engine/content-extraction";
import { buildIndex } from "../engine/index-builder";
import { CLAUDE_CODE_CAPABILITIES } from "./types";

/** Claude Code 适配器，将内容渲染为 CLAUDE.md 索引 + .ai/runtime/ 目录下的内容文件 */
export class ClaudeCodeAdapter implements Adapter {
  name = "claude-code" as const;
  capabilities = CLAUDE_CODE_CAPABILITIES;

  /** 渲染适配器输出：生成索引内容和内容文件列表 */
  render(
    input: AdapterInput,
    contents: ExtractedContent[],
    projectName: string,
    /** 仅用于索引的内容列表，未传入时使用 contents（向后兼容） */
    indexOnlyContents?: ExtractedContent[],
  ): AdapterOutput {
    const indexTarget = indexOnlyContents ?? contents;
    const indexContent = `# Project Context\n\n${buildIndex({
      contents: indexTarget,
      task: input.task,
      projectName,
      runtimeDir: ".ai/runtime",
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
      "索引文件已写入 CLAUDE.md",
      "内容文件已写入 .ai/runtime/ 目录",
      "运行 `ai-context build` 重新生成索引",
    ];

    return {
      index: {
        content: indexContent,
        path: "CLAUDE.md",
      },
      files,
      instructions,
    };
  }
}
