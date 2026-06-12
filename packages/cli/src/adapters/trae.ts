import type {
  Adapter,
  AdapterInput,
  AdapterOutput,
  ContentFile,
} from "@coder-2100/schema";
import type { ExtractedContent } from "../engine/content-extraction";
import { TRAE_CAPABILITIES } from "./types";

/** Trae 适配器，将内容渲染为 .trae/ 目录下的多文件格式（multi-md），无索引文件 */
export class TraeAdapter implements Adapter {
  name = "trae" as const;
  capabilities = TRAE_CAPABILITIES;

  /**
   * 渲染适配器输出：所有内容直接写入 .trae/{type}s/ 目录，不生成索引文件
   * Trae 原生支持多文件格式，规则和技能分目录存放
   */
  render(
    input: AdapterInput,
    contents: ExtractedContent[],
    _projectName: string,
    _indexOnlyContents?: ExtractedContent[],
  ): AdapterOutput {
    const files: ContentFile[] = contents.map((c) => ({
      type: c.type,
      id: c.id,
      name: c.name,
      path: `.trae/${c.type}s/${c.id}.md`,
      content: c.content,
      appliesTo: c.appliesTo,
      priority: c.priority,
    }));

    // 收集已生成的类型目录，用于 instructions
    const typeDirs = new Set(files.map((f) => f.type));
    const typeLabels: Record<string, string> = {
      rule: "rules",
      skill: "skills",
      agent: "agents",
      domain: "domains",
      playbook: "playbooks",
    };
    const instructions = [...typeDirs]
      .map((t) => `Trae ${typeLabels[t] || t} 已写入 .trae/${typeLabels[t] || t}/`);

    return {
      index: { content: "", path: "" },
      files,
      instructions,
    };
  }
}
