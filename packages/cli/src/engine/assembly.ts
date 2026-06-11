import { LAYER_WEIGHTS, PRIORITY_WEIGHTS } from "@coder-2100/schema";
import type { Layer } from "@coder-2100/schema";
import type { ExtractedContent } from "./content-extraction";

/** 内容类型到默认层级的映射，用于在缺少显式 layer 字段时推断权重 */
const TYPE_TO_DEFAULT_LAYER: Record<ExtractedContent["type"], Layer> = {
  rule: "stack",
  skill: "stack",
  agent: "stack",
  domain: "domain",
  playbook: "domain",
};

/** 冲突记录，描述同一 ID 在不同包中出现时的解决结果 */
export interface ConflictRecord {
  /** 冲突的内容 ID */
  id: string;
  /** 被覆盖的内容列表 */
  superseded: ExtractedContent[];
  /** 最终保留的内容 */
  resolvedContent: ExtractedContent;
}

/** 合并结果，包含去重后的内容列表和冲突记录 */
export interface AssemblyResult {
  merged: ExtractedContent[];
  conflicts: ConflictRecord[];
}

/** 从内容条目推断层级权重，通过类型映射到默认层级后查 LAYER_WEIGHTS */
function inferLayerWeight(content: ExtractedContent): number {
  return LAYER_WEIGHTS[TYPE_TO_DEFAULT_LAYER[content.type]];
}

/**
 * 比较两个同 ID 内容条目的优先级
 * 返回正数表示 b 应保留，负数表示 a 应保留
 * 规则：层级权重降序 → 优先级权重降序 → 声明顺序（后声明优先）
 */
function compareForConflict(
  a: ExtractedContent,
  b: ExtractedContent,
  indexA: number,
  indexB: number,
): number {
  // 层级权重更高者优先
  const layerDiff = inferLayerWeight(b) - inferLayerWeight(a);
  if (layerDiff !== 0) return layerDiff;

  // 同层级时优先级更高者优先
  const priorityDiff = PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority];
  if (priorityDiff !== 0) return priorityDiff;

  // 同层级同优先级时后声明覆盖先声明
  return indexB - indexA;
}

/**
 * 对内容列表进行去重和冲突合并
 * 同 ID 的内容条目按层级→优先级→声明顺序决定保留哪个版本
 * @param contents 从各知识资产包提取的原始内容列表
 * @returns 包含去重后内容与冲突记录的合并结果
 */
export function assembleContents(contents: ExtractedContent[]): AssemblyResult {
  // 按 ID 分组，保留每个内容在原数组中的索引用于声明顺序比较
  const idMap = new Map<string, { content: ExtractedContent; index: number }[]>();

  for (let i = 0; i < contents.length; i++) {
    const c = contents[i];
    if (!idMap.has(c.id)) {
      idMap.set(c.id, []);
    }
    idMap.get(c.id)!.push({ content: c, index: i });
  }

  const merged: ExtractedContent[] = [];
  const conflicts: ConflictRecord[] = [];

  for (const [, items] of idMap) {
    if (items.length === 1) {
      // 唯一 ID：直接保留
      merged.push(items[0].content);
      continue;
    }

    // 同 ID 多版本：按层级→优先级→声明顺序排序，第一个为赢家
    const sorted = items.sort((a, b) =>
      compareForConflict(a.content, b.content, a.index, b.index),
    );
    const winner = sorted[0].content;
    const superseded = sorted.slice(1).map((s) => s.content);

    merged.push(winner);
    conflicts.push({
      id: winner.id,
      superseded,
      resolvedContent: winner,
    });
  }

  return { merged, conflicts };
}
