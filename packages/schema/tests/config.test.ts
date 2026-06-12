import { describe, expect, it } from "vitest";
import { ConfigSchema } from "../src/config";

const validConfig = {
  project: "my-project",
  description: "我的项目描述",
  packages: [
    { name: "@coder-2100/react-rules", version: "^1.4.0" },
    { name: "@coder-2100/payment-domain", version: "^2.0.0" },
  ],
  tooling: {
    "claude-code": { enabled: true, deploy: true },
    codex: { enabled: true, deploy: true },
    trae: { enabled: false },
    gemini: { enabled: false },
  },
};

describe("ConfigSchema", () => {
  it("接受有效的 config", () => {
    const result = ConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  it("接受省略可选 version 的 config", () => {
    const result = ConfigSchema.safeParse({
      ...validConfig,
      packages: [{ name: "@coder-2100/react-rules" }],
    });
    expect(result.success).toBe(true);
  });

  it("默认 budget.indexBudget 为 3000", () => {
    const result = ConfigSchema.parse(validConfig);
    expect(result.budget.indexBudget).toBe(3000);
  });

  it("接受按工具的 budget 覆盖", () => {
    const result = ConfigSchema.safeParse({
      ...validConfig,
      budget: {
        indexBudget: 3000,
        perTool: {
          "claude-code": { indexBudget: 5000 },
          codex: { indexBudget: 2000 },
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it("拒绝缺少 project 名称", () => {
    const { project, ...withoutProject } = validConfig;
    const result = ConfigSchema.safeParse(withoutProject);
    expect(result.success).toBe(false);
  });

  it("省略 tooling 时使用默认值", () => {
    const result = ConfigSchema.parse({
      project: "my-project",
      packages: [],
    });
    expect(result.tooling["claude-code"].enabled).toBe(true);
    expect(result.tooling.codex.enabled).toBe(true);
    expect(result.tooling.trae.enabled).toBe(true);
    expect(result.tooling.gemini.enabled).toBe(false);
  });
});
