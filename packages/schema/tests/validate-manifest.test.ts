import { describe, expect, it } from "vitest";
import { validateManifest } from "../src/validate-manifest";

describe("validateManifest", () => {
  it("有效 manifest 返回成功", () => {
    const manifest = {
      schemaVersion: "1",
      name: "react-rules",
      version: "1.4.0",
      type: "rules",
      layer: "stack",
      description: "React 编码规范",
      entry: {
        rules: ["rules/hooks.md"],
        skills: [],
        agents: [],
        domains: [],
        playbooks: [],
        templates: [],
      },
    };
    const result = validateManifest(manifest);
    expect(result.success).toBe(true);
  });

  it("无效 manifest 返回错误", () => {
    const result = validateManifest({ name: "" });
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("错误消息中包含字段路径", () => {
    const result = validateManifest({
      schemaVersion: "1",
      name: "x",
      version: "bad",
    });
    expect(result.success).toBe(false);
    const hasVersionError = result.errors.some((e) => e.includes("version"));
    expect(hasVersionError).toBe(true);
  });
});
