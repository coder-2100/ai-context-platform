import { describe, expect, it } from "vitest";
import { Layer, PackageType, Priority } from "../src/constants";

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
