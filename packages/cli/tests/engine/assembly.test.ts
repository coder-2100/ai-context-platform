import { describe, expect, it } from "vitest";
import type { ExtractedContent } from "../../src/engine/content-extraction";
import { assembleContents } from "../../src/engine/assembly";

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

describe("assembleContents", () => {
  it("不同 ID 的内容全部保留", () => {
    const contents = [
      makeContent({ id: "rule-a", content: "A" }),
      makeContent({ id: "rule-b", content: "B" }),
    ];
    const result = assembleContents(contents);
    expect(result.merged).toHaveLength(2);
    expect(result.conflicts).toHaveLength(0);
  });

  it("同 ID 去重：domain 层覆盖 stack 层", () => {
    const contents = [
      makeContent({ id: "same-rule", type: "skill", content: "stack version" }),
      makeContent({ id: "same-rule", type: "domain", content: "domain version" }),
    ];
    const result = assembleContents(contents);
    expect(result.merged).toHaveLength(1);
    expect(result.merged[0].content).toBe("domain version");
  });

  it("同 ID 同层级：高优先级覆盖低优先级", () => {
    const contents = [
      makeContent({ id: "same-rule", type: "rule", priority: "low", content: "low version" }),
      makeContent({ id: "same-rule", type: "rule", priority: "high", content: "high version" }),
    ];
    const result = assembleContents(contents);
    expect(result.merged).toHaveLength(1);
    expect(result.merged[0].content).toBe("high version");
  });

  it("同 ID 同层级同优先级：后声明覆盖先声明", () => {
    const contents = [
      makeContent({ id: "same-rule", type: "rule", priority: "medium", content: "first" }),
      makeContent({ id: "same-rule", type: "rule", priority: "medium", content: "second" }),
    ];
    const result = assembleContents(contents);
    expect(result.merged).toHaveLength(1);
    expect(result.merged[0].content).toBe("second");
  });

  it("检测冲突并记录", () => {
    const contents = [
      makeContent({ id: "conflict-rule", type: "rule", priority: "high", content: "version 1" }),
      makeContent({ id: "conflict-rule", type: "domain", priority: "medium", content: "version 2" }),
    ];
    const result = assembleContents(contents);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].id).toBe("conflict-rule");
    expect(result.conflicts[0].resolvedContent.content).toBe("version 2");
  });

  it("空内容返回空结果", () => {
    const result = assembleContents([]);
    expect(result.merged).toEqual([]);
    expect(result.conflicts).toEqual([]);
  });

  it("三个同 ID 内容，保留最高层级", () => {
    const contents = [
      makeContent({ id: "multi", type: "rule", priority: "low", content: "core-low" }),
      makeContent({ id: "multi", type: "skill", priority: "high", content: "stack-high" }),
      makeContent({ id: "multi", type: "domain", priority: "medium", content: "domain-medium" }),
    ];
    const result = assembleContents(contents);
    expect(result.merged).toHaveLength(1);
    // domain(layer=30) > skill/stack(layer=20) > rule/stack(layer=20)
    // domain-medium wins because layer weight dominates
    expect(result.merged[0].content).toBe("domain-medium");
  });
});
