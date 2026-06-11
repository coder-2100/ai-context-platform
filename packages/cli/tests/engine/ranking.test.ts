import { describe, expect, it } from "vitest";
import type { ExtractedContent } from "../../src/engine/content-extraction";
import { compareContentRank, rankContents } from "../../src/engine/ranking";

/** 测试辅助：创建指定字段的 ExtractedContent，未指定字段填充默认值 */
function makeContent(overrides: Partial<ExtractedContent> & { id: string }): ExtractedContent {
  return {
    type: overrides.type ?? "rule",
    name: overrides.name ?? overrides.id,
    content: overrides.content ?? "",
    priority: overrides.priority ?? "medium",
    appliesTo: overrides.appliesTo ?? [],
    sourcePath: overrides.sourcePath ?? `rules/${overrides.id}.md`,
    ...overrides,
  };
}

describe("compareContentRank", () => {
  it("高层级排在前面", () => {
    const domain = makeContent({ id: "domain-1", type: "domain", priority: "medium" });
    const core = makeContent({ id: "core-1", type: "rule", priority: "medium" });
    // domain(layer=30) > core/stack(layer=20), so domain ranks higher (comes first)
    expect(compareContentRank(domain, core)).toBeLessThan(0);
  });

  it("同层级高优先级排在前面", () => {
    const high = makeContent({ id: "high-1", type: "rule", priority: "high" });
    const low = makeContent({ id: "low-1", type: "rule", priority: "low" });
    expect(compareContentRank(high, low)).toBeLessThan(0);
  });

  it("同层级同优先级时按声明顺序", () => {
    const a = makeContent({ id: "a", type: "rule", priority: "medium" });
    const b = makeContent({ id: "b", type: "rule", priority: "medium" });
    expect(compareContentRank(a, b, 0, 1)).toBeLessThan(0);
    expect(compareContentRank(a, b, 1, 0)).toBeGreaterThan(0);
  });

  it("无 index 参数时同层级同优先级视为相等", () => {
    const a = makeContent({ id: "a", type: "rule", priority: "medium" });
    const b = makeContent({ id: "b", type: "rule", priority: "medium" });
    expect(compareContentRank(a, b)).toBe(0);
  });
});

describe("rankContents", () => {
  it("按层级、优先级排序", () => {
    const contents = [
      makeContent({ id: "core-low", type: "rule", priority: "low" }),
      makeContent({ id: "domain-high", type: "domain", priority: "high" }),
      makeContent({ id: "stack-medium", type: "skill", priority: "medium" }),
      makeContent({ id: "core-critical", type: "rule", priority: "critical" }),
    ];
    const ranked = rankContents(contents);
    // 排序规则: layer 权重降序 → priority 权重降序 → 声明顺序升序
    // domain-high: layer=domain(30), priority=high(75) → 排第一
    // core-critical: type=rule→layer=stack(20), priority=critical(100) → 排第二
    // stack-medium: type=skill→layer=stack(20), priority=medium(50) → 排第三
    // core-low: type=rule→layer=stack(20), priority=low(25) → 排第四
    expect(ranked[0].id).toBe("domain-high");
    expect(ranked[1].id).toBe("core-critical");
    expect(ranked[2].id).toBe("stack-medium");
    expect(ranked[3].id).toBe("core-low");
  });

  it("空数组返回空数组", () => {
    expect(rankContents([])).toEqual([]);
  });

  it("不修改原数组", () => {
    const contents = [
      makeContent({ id: "low", type: "rule", priority: "low" }),
      makeContent({ id: "high", type: "rule", priority: "high" }),
    ];
    const copy = [...contents];
    rankContents(contents);
    expect(contents).toEqual(copy);
  });
});
