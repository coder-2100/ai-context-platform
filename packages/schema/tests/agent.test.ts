import { describe, expect, it } from "vitest";
import { AgentFrontmatterSchema } from "../src/agent";

describe("AgentFrontmatterSchema", () => {
  it("接受有效的 agent frontmatter", () => {
    const result = AgentFrontmatterSchema.safeParse({
      id: "reviewer-agent",
      type: "agent",
      priority: "high",
      appliesTo: ["review"],
    });
    expect(result.success).toBe(true);
  });

  it("拒绝缺少 id", () => {
    const result = AgentFrontmatterSchema.safeParse({ type: "agent" });
    expect(result.success).toBe(false);
  });

  it("拒绝非 agent 类型", () => {
    const result = AgentFrontmatterSchema.safeParse({
      id: "my-agent",
      type: "skill",
    });
    expect(result.success).toBe(false);
  });

  it("默认 type 为 agent", () => {
    const result = AgentFrontmatterSchema.parse({ id: "my-agent" });
    expect(result.type).toBe("agent");
  });

  it("默认 priority 为 medium", () => {
    const result = AgentFrontmatterSchema.parse({ id: "my-agent" });
    expect(result.priority).toBe("medium");
  });
});
