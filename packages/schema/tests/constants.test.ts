import { describe, expect, it } from "vitest";
import { Layer, LAYER_WEIGHTS, PackageType, PRIORITY_WEIGHTS, Priority } from "../src/constants";

describe("Layer", () => {
  it("包含正确的值", () => {
    expect(Layer.CORE).toBe("core");
    expect(Layer.STACK).toBe("stack");
    expect(Layer.DOMAIN).toBe("domain");
    expect(Layer.PROJECT).toBe("project");
    expect(Layer.RUNTIME).toBe("runtime");
  });

  it("恰好有 5 个值", () => {
    expect(Object.values(Layer)).toHaveLength(5);
  });
});

describe("Priority", () => {
  it("包含正确的值", () => {
    expect(Priority.CRITICAL).toBe("critical");
    expect(Priority.HIGH).toBe("high");
    expect(Priority.MEDIUM).toBe("medium");
    expect(Priority.LOW).toBe("low");
  });

  it("恰好有 4 个值", () => {
    expect(Object.values(Priority)).toHaveLength(4);
  });
});

describe("PRIORITY_WEIGHTS", () => {
  it("包含所有优先级对应的权重分数", () => {
    expect(PRIORITY_WEIGHTS.critical).toBe(100);
    expect(PRIORITY_WEIGHTS.high).toBe(75);
    expect(PRIORITY_WEIGHTS.medium).toBe(50);
    expect(PRIORITY_WEIGHTS.low).toBe(25);
  });

  it("权重分数按优先级降序", () => {
    expect(PRIORITY_WEIGHTS.critical).toBeGreaterThan(PRIORITY_WEIGHTS.high);
    expect(PRIORITY_WEIGHTS.high).toBeGreaterThan(PRIORITY_WEIGHTS.medium);
    expect(PRIORITY_WEIGHTS.medium).toBeGreaterThan(PRIORITY_WEIGHTS.low);
  });
});

describe("LAYER_WEIGHTS", () => {
  it("包含所有层级对应的权重分数", () => {
    expect(LAYER_WEIGHTS.core).toBe(10);
    expect(LAYER_WEIGHTS.stack).toBe(20);
    expect(LAYER_WEIGHTS.domain).toBe(30);
    expect(LAYER_WEIGHTS.project).toBe(40);
    expect(LAYER_WEIGHTS.runtime).toBe(50);
  });

  it("权重分数按层级升序", () => {
    expect(LAYER_WEIGHTS.core).toBeLessThan(LAYER_WEIGHTS.stack);
    expect(LAYER_WEIGHTS.stack).toBeLessThan(LAYER_WEIGHTS.domain);
    expect(LAYER_WEIGHTS.domain).toBeLessThan(LAYER_WEIGHTS.project);
    expect(LAYER_WEIGHTS.project).toBeLessThan(LAYER_WEIGHTS.runtime);
  });

  it("每个层级的权重都是正数", () => {
    Object.values(LAYER_WEIGHTS).forEach((weight) => {
      expect(weight).toBeGreaterThan(0);
    });
  });
});

describe("PackageType", () => {
  it("包含正确的值", () => {
    expect(PackageType.RULES).toBe("rules");
    expect(PackageType.SKILLS).toBe("skills");
    expect(PackageType.AGENTS).toBe("agents");
    expect(PackageType.DOMAINS).toBe("domains");
    expect(PackageType.PLAYBOOKS).toBe("playbooks");
    expect(PackageType.META).toBe("meta");
    expect(PackageType.TEMPLATES).toBe("templates");
  });

  it("恰好有 7 个值", () => {
    expect(Object.values(PackageType)).toHaveLength(7);
  });
});
