import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { encodingForModel } from "js-tiktoken";
import { PRIORITY_WEIGHTS } from "@coder-2100/schema";
import type { ExtractedContent } from "./content-extraction";

/** 索引文件中托管内容的起始标记 */
export const MARKER_START = "<!-- AI-CONTEXT:INDEX:START -->";
/** 索引文件中托管内容的结束标记 */
export const MARKER_END = "<!-- AI-CONTEXT:INDEX:END -->";

/** 索引构建选项 */
export interface BuildIndexOptions {
  contents: ExtractedContent[];
  task: string;
  projectName: string;
  runtimeDir: string;
  /** 索引层 token 预算上限，默认不限 */
  indexBudget?: number;
}

/** js-tiktoken 编码器，懒加载以减少启动开销 */
let _encoder: ReturnType<typeof encodingForModel> | null = null;

/** 使用 cl100k_base（gpt-4）编码估算文本的 token 数量（粗略值，仅用于预算控制） */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  if (!_encoder) {
    _encoder = encodingForModel("gpt-4");
  }
  return _encoder.encode(text).length;
}

/** 资源行在索引中的逻辑位置，用于预算裁剪时决定如何处理 */
type Section = "task-priority" | "task-reference" | "available";

/**
 * 资源行结构：
 * - text：当前行文本
 * - priority：资源优先级权重
 * - section：该行所属区域
 * - hasDescription：是否包含可被裁剪的描述部分
 * - groupKey：Available Resources 区域下的分组标识（typeLabel），用于重新组织分组
 */
interface ResourceLine {
  text: string;
  priority: number;
  section: Section;
  hasDescription: boolean;
  groupKey?: string;
}

/** 根据内容列表构建结构化索引，包含 Core Rules、Current Task 和 Available Resources 三个区域 */
export function buildIndex(options: BuildIndexOptions): string {
  const { contents, task, runtimeDir, indexBudget } = options;

  if (contents.length === 0) {
    return "No packages installed yet. Run `ai-context add` or `ai-context browse` to get started.";
  }

  // 同 id 去重：保留最高优先级版本
  const deduplicated = deduplicateById(contents);

  // 头部静态行（Core Rules、Current Task 标题、Available Resources 介绍等）
  const headerLines: string[] = [];

  // Core rules section (critical + high priority rules)
  const coreRules = deduplicated
    .filter(
      (c) =>
        c.type === "rule" &&
        (c.priority === "critical" || c.priority === "high"),
    )
    .sort(
      (a, b) => PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority],
    );

  if (coreRules.length > 0) {
    headerLines.push("## Core Rules");
    for (const rule of coreRules) {
      headerLines.push(`- ${extractRuleSummary(rule.content)}`);
    }
    headerLines.push("");
  }

  // Current task section
  const taskContents = deduplicated.filter(
    (c) => c.appliesTo.length === 0 || c.appliesTo.includes(task),
  );
  const priorityResources = taskContents
    .filter((c) => PRIORITY_WEIGHTS[c.priority] >= 50)
    .sort(
      (a, b) => PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority],
    );
  const referenceResources = taskContents.filter(
    (c) => PRIORITY_WEIGHTS[c.priority] < 50,
  );

  // 收集所有可被预算裁剪的资源行（带优先级、区域和分组信息）
  const resourceLines: ResourceLine[] = [];

  headerLines.push(`## Current Task: ${task}`);
  headerLines.push("");
  if (priorityResources.length > 0) {
    headerLines.push("Priority resources for this task (read first):");
    for (const r of priorityResources) {
      const text = `- **${r.name}** (${r.type}) — ${runtimeDir}/${r.type}s/${r.id}.md`;
      resourceLines.push({
        text,
        priority: PRIORITY_WEIGHTS[r.priority],
        section: "task-priority",
        hasDescription: false,
      });
    }
    headerLines.push("");
  }
  if (referenceResources.length > 0) {
    headerLines.push("Reference resources (read if needed):");
    for (const r of referenceResources) {
      const text = `- **${r.name}** — ${runtimeDir}/${r.type}s/${r.id}.md`;
      resourceLines.push({
        text,
        priority: PRIORITY_WEIGHTS[r.priority],
        section: "task-reference",
        hasDescription: false,
      });
    }
    headerLines.push("");
  }

  // Available Resources 区域
  const availableHeader: string[] = [
    "## Available Resources",
    "",
    "When performing specific tasks, read the relevant files below for detailed guidance.",
    "",
  ];

  const grouped = groupByType(deduplicated);
  const typeLabels: Record<string, string> = {
    rule: "Rules",
    skill: "Skills",
    agent: "Agents",
    domain: "Domains",
    playbook: "Playbooks",
  };

  // 记录各分组原始顺序（按 type 遍历顺序），用于渲染时分组
  const groupOrder: string[] = [];
  for (const [type, items] of Object.entries(grouped)) {
    const label = typeLabels[type] || type;
    groupOrder.push(label);
    for (const item of items) {
      const desc = extractDescription(item.content);
      const text = `- **${item.name}** — ${runtimeDir}/${type}s/${item.id}.md${desc ? ` — ${desc}` : ""}`;
      resourceLines.push({
        text,
        priority: PRIORITY_WEIGHTS[item.priority],
        section: "available",
        hasDescription: Boolean(desc),
        groupKey: label,
      });
    }
  }

  // 把当前所有资源行拍平为单一列表
  const currentLines = (): ResourceLine[] => [...resourceLines];

  // 渲染完整索引文本
  const renderAll = (lines: ResourceLine[]): string => {
    const parts: string[] = [...headerLines];

    // 任务区段：按原有结构渲染（priority 段 + reference 段）
    const taskPriorities = lines.filter((l) => l.section === "task-priority");
    const taskReferences = lines.filter((l) => l.section === "task-reference");
    if (taskPriorities.length > 0) {
      parts.push("Priority resources for this task (read first):");
      for (const l of taskPriorities) parts.push(l.text);
      parts.push("");
    }
    if (taskReferences.length > 0) {
      parts.push("Reference resources (read if needed):");
      for (const l of taskReferences) parts.push(l.text);
      parts.push("");
    }

    // Available 区域
    parts.push(...availableHeader);

    // 按 groupOrder 重新分组渲染
    for (const groupKey of groupOrder) {
      const groupItems = lines.filter(
        (l) => l.section === "available" && l.groupKey === groupKey,
      );
      if (groupItems.length === 0) continue;
      parts.push(`### ${groupKey}`);
      for (const item of groupItems) parts.push(item.text);
      parts.push("");
    }

    return parts.join("\n").trim();
  };

  // 预算控制：当设置 indexBudget 且超出时，按阶段渐进裁剪
  if (typeof indexBudget === "number" && indexBudget > 0) {
    const fullText = renderAll(currentLines());
    if (estimateTokenCount(fullText) > indexBudget) {
      let lines = currentLines();

      // Stage 1：移除低优先级资源中可裁剪的描述（仅 available 段有描述）
      lines = lines.map((l) => trimLineDescription(l, PRIORITY_WEIGHTS.low));

      // Stage 2：移除整个 Reference resources 区域（task-reference 全部移除）
      if (estimateTokenCount(renderAll(lines)) > indexBudget) {
        lines = lines.filter((l) => l.section !== "task-reference");
      }

      // Stage 3：进一步移除中等优先级资源中可裁剪的描述
      if (estimateTokenCount(renderAll(lines)) > indexBudget) {
        lines = lines.map((l) => trimLineDescription(l, PRIORITY_WEIGHTS.medium));
      }

      // Stage 4：丢弃低优先级资源（剩余 task-priority 和 available 中）
      if (estimateTokenCount(renderAll(lines)) > indexBudget) {
        lines = lines.filter((l) => l.priority > PRIORITY_WEIGHTS.low);
      }

      // Stage 5：丢弃中等优先级资源
      if (estimateTokenCount(renderAll(lines)) > indexBudget) {
        lines = lines.filter((l) => l.priority > PRIORITY_WEIGHTS.medium);
      }

      return renderAll(lines);
    }
  }

  // 无预算限制或在预算内时，输出完整内容
  return renderAll(currentLines());
}

/**
 * 移除资源行末尾的描述部分（仅对 hasDescription 为 true 且优先级匹配的行生效）
 * @param line 资源行
 * @param maxPriority 该阶段允许裁剪的最大优先级权重（包含）
 */
function trimLineDescription(line: ResourceLine, maxPriority: number): ResourceLine {
  if (line.priority > maxPriority || !line.hasDescription) {
    return line;
  }
  // 行格式为 `- **name** — path — desc`，按 " — " 拆分后保留前两段
  const parts = line.text.split(" — ");
  if (parts.length >= 3) {
    return { ...line, text: `${parts[0]} — ${parts[1]}` };
  }
  return line;
}

/** 将生成的内容写入索引文件，自动处理标记区域的新增和替换 */
export function writeIndexFile(
  filePath: string,
  generatedContent: string,
): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  if (!existsSync(filePath)) {
    const content = `# Project Context\n\n${MARKER_START}\n<!-- Managed by ai-context. Do not edit between START and END markers. -->\n<!-- Run \`ai-context build\` to update this section. -->\n\n${generatedContent}\n\n${MARKER_END}\n`;
    writeFileSync(filePath, content, "utf-8");
    return;
  }

  const existing = readFileSync(filePath, "utf-8");
  const startIdx = existing.indexOf(MARKER_START);
  const endIdx = existing.indexOf(MARKER_END);

  if (startIdx === -1 || endIdx === -1) {
    const content = `${existing}\n\n${MARKER_START}\n${generatedContent}\n${MARKER_END}\n`;
    writeFileSync(filePath, content, "utf-8");
    return;
  }

  const header = existing.slice(0, startIdx);
  const footer = existing.slice(endIdx + MARKER_END.length);
  const content = `${header}${MARKER_START}\n${generatedContent}\n${MARKER_END}${footer}`;
  writeFileSync(filePath, content, "utf-8");
}

/** 从规则内容中提取首行摘要 */
function extractRuleSummary(content: string): string {
  const lines = content
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"));
  return lines[0]?.replace(/^[-*]\s*/, "").trim() || "";
}

/** 从内容中提取首段描述文本，截断至 80 字符 */
function extractDescription(content: string): string {
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("---")) {
      return trimmed.replace(/^[-*]\s*/, "").slice(0, 80);
    }
  }
  return "";
}

/** 对同 id 的内容去重，保留最高优先级版本 */
function deduplicateById(contents: ExtractedContent[]): ExtractedContent[] {
  const map = new Map<string, ExtractedContent>();
  for (const c of contents) {
    const existing = map.get(c.id);
    if (!existing || PRIORITY_WEIGHTS[c.priority] > PRIORITY_WEIGHTS[existing.priority]) {
      map.set(c.id, c);
    }
  }
  return [...map.values()];
}

/** 按内容类型分组 */
function groupByType(
  contents: ExtractedContent[],
): Record<string, ExtractedContent[]> {
  const groups: Record<string, ExtractedContent[]> = {};
  for (const c of contents) {
    if (!groups[c.type]) groups[c.type] = [];
    groups[c.type].push(c);
  }
  return groups;
}

/** 所有已知工具的索引文件路径 */
export const TOOL_INDEX_FILES: Record<string, string> = {
  "claude-code": "CLAUDE.md",
  codex: "AGENTS.md",
  // Phase 5: trae → .trae/rules/, gemini → GEMINI.md
};

/** 清空 .ai/runtime/ 下各子目录中的文件，保留目录结构 */
export function cleanRuntimeDir(projectDir: string): void {
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
