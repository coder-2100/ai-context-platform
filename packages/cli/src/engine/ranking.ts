import type { Layer } from "@coder-2100/schema";
import { LAYER_WEIGHTS, PRIORITY_WEIGHTS } from "@coder-2100/schema";
import type { ExtractedContent } from "./content-extraction";

/** 内容类型到默认层级的映射，用于 ExtractedContent 缺少显式 layer 信息时的推断 */
const TYPE_TO_DEFAULT_LAYER: Record<ExtractedContent["type"], Layer> = {
  rule: "stack",
  skill: "stack",
  agent: "stack",
  domain: "domain",
  playbook: "domain",
};

/** 从内容中推断层级权重，当前 ExtractedContent 无 layer 字段，按类型推断 */
function getContentLayerWeight(content: ExtractedContent): number {
  const inferredLayer = TYPE_TO_DEFAULT_LAYER[content.type];
  return LAYER_WEIGHTS[inferredLayer];
}

/**
 * 比较两个内容条目的排序优先级
 * 排序规则：layer 权重降序 → priority 权重降序 → 声明顺序升序
 * 返回负数表示 a 排在 b 前面，返回正数表示 b 排在 a 前面，返回 0 表示相等
 */
export function compareContentRank(
  a: ExtractedContent,
  b: ExtractedContent,
  indexA?: number,
  indexB?: number,
): number {
  // 优先比较层级权重，层级越高越靠前
  const layerDiff = getContentLayerWeight(b) - getContentLayerWeight(a);
  if (layerDiff !== 0) return layerDiff;

  // 同层级时比较优先级权重，优先级越高越靠前
  const priorityDiff = PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority];
  if (priorityDiff !== 0) return priorityDiff;

  // 同层级同优先级时按声明顺序，升序排列
  if (indexA !== undefined && indexB !== undefined) {
    return indexA - indexB;
  }

  return 0;
}

/**
 * 对内容列表进行多维排序
 * 按 layer 权重降序 → priority 权重降序 → 声明顺序升序排序，返回新数组不修改原数组
 */
export function rankContents(contents: ExtractedContent[]): ExtractedContent[] {
  // 记录每个元素在原数组中的声明顺序，用于稳定排序
  const originalIndexes = new Map<ExtractedContent, number>();
  contents.forEach((item, idx) => {
    originalIndexes.set(item, idx);
  });

  return [...contents].sort((a, b) => {
    const indexA = originalIndexes.get(a) ?? 0;
    const indexB = originalIndexes.get(b) ?? 0;
    return compareContentRank(a, b, indexA, indexB);
  });
}
