import { DEFAULT_TASK_LOAD, PRIORITY_WEIGHTS } from "@coder-2100/schema";
import type { ExtractedContent } from "./content-extraction";

/** Task 解析结果，包含与当前 task 相关的所有内容及其分类 */
export interface TaskResolveResult {
  /** 与当前 task 相关的所有内容 */
  taskContents: ExtractedContent[];
  /** 优先资源（priority >= medium），索引中优先展示 */
  priorityResources: ExtractedContent[];
  /** 参考资源（priority = low），索引中降级展示 */
  referenceResources: ExtractedContent[];
  /** 与当前 task 无关的内容 */
  otherContents: ExtractedContent[];
}

/** 内容 type（单数）到 manifest entry 类型（复数）的映射 */
const TYPE_TO_PLURAL: Record<string, string> = {
  rule: "rules",
  skill: "skills",
  agent: "agents",
  domain: "domains",
  playbook: "playbooks",
};

/**
 * 判断内容条目是否适用于指定 task
 * appliesTo 非空时精确匹配；appliesTo 为空时按 DEFAULT_TASK_LOAD 推断
 */
export function isContentApplicableToTask(
  content: ExtractedContent,
  task: string,
): boolean {
  if (content.appliesTo.length > 0) {
    return content.appliesTo.includes(task);
  }
  const defaultTypes = DEFAULT_TASK_LOAD[task as keyof typeof DEFAULT_TASK_LOAD];
  if (!defaultTypes) return false;
  const pluralType = TYPE_TO_PLURAL[content.type] ?? content.type;
  return defaultTypes.includes(pluralType as never);
}

/**
 * 解析与指定 task 相关的内容
 * 将内容分为 task 相关/无关，并按 priority 细分优先/参考
 */
export function resolveTaskContents(
  contents: ExtractedContent[],
  task: string,
): TaskResolveResult {
  const taskContents: ExtractedContent[] = [];
  const otherContents: ExtractedContent[] = [];
  const priorityResources: ExtractedContent[] = [];
  const referenceResources: ExtractedContent[] = [];

  for (const content of contents) {
    if (isContentApplicableToTask(content, task)) {
      taskContents.push(content);
      if (PRIORITY_WEIGHTS[content.priority] >= PRIORITY_WEIGHTS.medium) {
        priorityResources.push(content);
      } else {
        referenceResources.push(content);
      }
    } else {
      otherContents.push(content);
    }
  }

  return { taskContents, priorityResources, referenceResources, otherContents };
}
