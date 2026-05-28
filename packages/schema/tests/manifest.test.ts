import { describe, expect, it } from "vitest";
import { ManifestSchema } from "../src/manifest";

const validManifest = {
  schemaVersion: "1",
  name: "react-rules",
  version: "1.4.0",
  type: "rules",
  layer: "stack",
  description: "React 编码规范和审查规则",
  entry: {
    rules: ["rules/hooks.md", "rules/components.md"],
    skills: [],
    agents: [],
    domains: [],
    playbooks: [],
    templates: [],
  },
};

describe("ManifestSchema", () => {
  it("接受有效的最小 manifest", () => {
    const result = ManifestSchema.safeParse(validManifest);
    expect(result.success).toBe(true);
  });

  it("拒绝缺少必填字段", () => {
    const { name, ...withoutName } = validManifest;
    const result = ManifestSchema.safeParse(withoutName);
    expect(result.success).toBe(false);
  });

  it("接受可选字段", () => {
    const full = {
      ...validManifest,
      priority: "high",
      tags: ["react", "frontend"],
      compatibleTools: ["claude-code", "codex"],
      minCLIVersion: "0.1.0",
      author: "frontend-team",
      license: "MIT",
      appliesTo: ["review", "implement"],
      dependencies: [
        {
          name: "@coder-2100/core-engineering",
          version: "^1.0.0",
          optional: false,
        },
      ],
      peerDependencies: [{ name: "react", version: ">=18.0.0" }],
      extends: [],
      overrides: [],
    };
    const result = ManifestSchema.safeParse(full);
    expect(result.success).toBe(true);
  });

  it("拒绝无效的 type", () => {
    const result = ManifestSchema.safeParse({
      ...validManifest,
      type: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("拒绝无效的 layer", () => {
    const result = ManifestSchema.safeParse({
      ...validManifest,
      layer: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("拒绝无效的 priority", () => {
    const result = ManifestSchema.safeParse({
      ...validManifest,
      priority: "urgent",
    });
    expect(result.success).toBe(false);
  });

  it("拒绝无效的 semver 版本号", () => {
    const result = ManifestSchema.safeParse({
      ...validManifest,
      version: "not-semver",
    });
    expect(result.success).toBe(false);
  });

  it("省略 priority 时默认为 medium", () => {
    const result = ManifestSchema.parse(validManifest);
    expect(result.priority).toBe("medium");
  });

  it("可选数组字段默认为空数组", () => {
    const result = ManifestSchema.parse(validManifest);
    expect(result.tags).toEqual([]);
    expect(result.compatibleTools).toEqual([]);
    expect(result.appliesTo).toEqual([]);
    expect(result.dependencies).toEqual([]);
    expect(result.peerDependencies).toEqual([]);
  });
});
