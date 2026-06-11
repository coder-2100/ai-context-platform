import { describe, expect, it } from "vitest";
import { detectCircularDependency } from "../../src/core/dependency-graph";

describe("detectCircularDependency", () => {
  it("无环依赖图返回 null", () => {
    const graph = new Map<string, Set<string>>([
      ["a", new Set(["b"])],
      ["b", new Set(["c"])],
      ["c", new Set()],
    ]);
    expect(detectCircularDependency(graph)).toBeNull();
  });

  it("检测到环路返回环路路径", () => {
    const graph = new Map<string, Set<string>>([
      ["a", new Set(["b"])],
      ["b", new Set(["c"])],
      ["c", new Set(["a"])],
    ]);
    const cycle = detectCircularDependency(graph);
    expect(cycle).not.toBeNull();
    expect(cycle!.length).toBeGreaterThanOrEqual(3);
    expect(cycle![0]).toBe(cycle![cycle!.length - 1]);
  });

  it("自依赖检测", () => {
    const graph = new Map<string, Set<string>>([
      ["a", new Set(["a"])],
    ]);
    const cycle = detectCircularDependency(graph);
    expect(cycle).not.toBeNull();
    expect(cycle).toEqual(["a", "a"]);
  });

  it("空图返回 null", () => {
    const graph = new Map<string, Set<string>>();
    expect(detectCircularDependency(graph)).toBeNull();
  });

  it("复杂图中的环路检测", () => {
    const graph = new Map<string, Set<string>>([
      ["a", new Set(["b"])],
      ["b", new Set(["c"])],
      ["c", new Set(["d"])],
      ["d", new Set(["b"])],
      ["e", new Set(["f"])],
      ["f", new Set()],
    ]);
    const cycle = detectCircularDependency(graph);
    expect(cycle).not.toBeNull();
    expect(cycle).toContain("b");
    expect(cycle).toContain("c");
    expect(cycle).toContain("d");
  });
});
