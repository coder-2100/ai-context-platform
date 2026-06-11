import { describe, expect, it } from "vitest";
import type { ExtractedContent } from "../../src/engine/content-extraction";
import {
  isContentApplicableToTask,
  resolveTaskContents,
} from "../../src/engine/task-resolver";

function makeContent(overrides: Partial<ExtractedContent> & { id: string }): ExtractedContent {
  return {
    type: overrides.type ?? "rule",
    name: overrides.name ?? overrides.id,
    content: overrides.content ?? `Content for ${overrides.id}`,
    priority: overrides.priority ?? "medium",
    appliesTo: overrides.appliesTo ?? [],
    sourcePath: overrides.sourcePath ?? `rules/${overrides.id}.md`,
    ...overrides,
  };
}

describe("isContentApplicableToTask", () => {
  it("appliesTo 包含目标 task 时返回 true", () => {
    const content = makeContent({ id: "review-rule", appliesTo: ["review", "implement"] });
    expect(isContentApplicableToTask(content, "review")).toBe(true);
  });

  it("appliesTo 不包含目标 task 时返回 false", () => {
    const content = makeContent({ id: "impl-rule", appliesTo: ["implement"] });
    expect(isContentApplicableToTask(content, "review")).toBe(false);
  });

  it("appliesTo 为空时，type 在 DEFAULT_TASK_LOAD 中返回 true", () => {
    const rule = makeContent({ id: "generic-rule", type: "rule", appliesTo: [] });
    const domain = makeContent({ id: "generic-domain", type: "domain", appliesTo: [] });
    expect(isContentApplicableToTask(rule, "review")).toBe(true);
    expect(isContentApplicableToTask(domain, "review")).toBe(false);
  });

  it("appliesTo 为空且 type 不在 DEFAULT_TASK_LOAD 中时返回 false", () => {
    const domain = makeContent({ id: "domain-1", type: "domain", appliesTo: [] });
    expect(isContentApplicableToTask(domain, "test")).toBe(false);
  });
});

describe("resolveTaskContents", () => {
  const contents: ExtractedContent[] = [
    makeContent({ id: "core-rule", type: "rule", priority: "critical", appliesTo: ["review", "implement", "migration"] }),
    makeContent({ id: "review-agent", type: "agent", priority: "high", appliesTo: ["review"] }),
    makeContent({ id: "react-skill", type: "skill", priority: "medium", appliesTo: ["review"] }),
    makeContent({ id: "payment-domain", type: "domain", priority: "medium", appliesTo: ["review", "implement", "migration"] }),
    makeContent({ id: "migration-playbook", type: "playbook", priority: "low", appliesTo: ["migration"] }),
    makeContent({ id: "generic-rule", type: "rule", priority: "low", appliesTo: [] }),
  ];

  it("返回与 task 相关的内容", () => {
    const result = resolveTaskContents(contents, "review");
    expect(result.taskContents.map((c) => c.id)).toContain("core-rule");
    expect(result.taskContents.map((c) => c.id)).toContain("review-agent");
    expect(result.taskContents.map((c) => c.id)).toContain("payment-domain");
    expect(result.taskContents.map((c) => c.id)).not.toContain("migration-playbook");
  });

  it("区分 priorityResources 和 referenceResources", () => {
    const result = resolveTaskContents(contents, "review");
    expect(result.priorityResources.map((c) => c.id)).toContain("core-rule");
    expect(result.priorityResources.map((c) => c.id)).toContain("review-agent");
    expect(result.priorityResources.map((c) => c.id)).toContain("react-skill");
    expect(result.priorityResources.map((c) => c.id)).toContain("payment-domain");
    expect(result.referenceResources.map((c) => c.id)).toContain("generic-rule");
  });

  it("空内容时返回空结果", () => {
    const result = resolveTaskContents([], "review");
    expect(result.taskContents).toEqual([]);
    expect(result.priorityResources).toEqual([]);
    expect(result.referenceResources).toEqual([]);
  });

  it("migration task 正确筛选 playbook 和 domain", () => {
    const result = resolveTaskContents(contents, "migration");
    expect(result.taskContents.map((c) => c.id)).toContain("migration-playbook");
    expect(result.taskContents.map((c) => c.id)).toContain("payment-domain");
    expect(result.taskContents.map((c) => c.id)).toContain("core-rule");
    expect(result.taskContents.map((c) => c.id)).not.toContain("review-agent");
  });
});
