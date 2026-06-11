import { describe, expect, it } from "vitest";
import { PlaybookFrontmatterSchema } from "../src/playbook";

describe("PlaybookFrontmatterSchema", () => {
  it("接受有效的 playbook frontmatter", () => {
    const result = PlaybookFrontmatterSchema.safeParse({
      id: "migration-playbook",
      priority: "high",
      appliesTo: ["migrate", "deploy"],
    });
    expect(result.success).toBe(true);
  });

  it("接受仅含 id 的最小 frontmatter", () => {
    const result = PlaybookFrontmatterSchema.safeParse({ id: "my-playbook" });
    expect(result.success).toBe(true);
  });

  it("拒绝缺少 id", () => {
    const result = PlaybookFrontmatterSchema.safeParse({ priority: "high" });
    expect(result.success).toBe(false);
  });

  it("拒绝空 id", () => {
    const result = PlaybookFrontmatterSchema.safeParse({ id: "" });
    expect(result.success).toBe(false);
  });

  it("拒绝无效的 priority", () => {
    const result = PlaybookFrontmatterSchema.safeParse({
      id: "my-playbook",
      priority: "urgent",
    });
    expect(result.success).toBe(false);
  });

  it("默认 priority 为 medium", () => {
    const result = PlaybookFrontmatterSchema.parse({ id: "my-playbook" });
    expect(result.priority).toBe("medium");
  });

  it("默认 appliesTo 为空数组", () => {
    const result = PlaybookFrontmatterSchema.parse({ id: "my-playbook" });
    expect(result.appliesTo).toEqual([]);
  });
});
