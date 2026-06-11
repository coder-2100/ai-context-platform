import { describe, expect, it } from "vitest";
import { DomainFrontmatterSchema } from "../src/domain";

describe("DomainFrontmatterSchema", () => {
  it("接受有效的 domain frontmatter", () => {
    const result = DomainFrontmatterSchema.safeParse({
      id: "payment-domain",
      priority: "high",
      appliesTo: ["review", "implement"],
    });
    expect(result.success).toBe(true);
  });

  it("接受仅含 id 的最小 frontmatter", () => {
    const result = DomainFrontmatterSchema.safeParse({ id: "my-domain" });
    expect(result.success).toBe(true);
  });

  it("拒绝缺少 id", () => {
    const result = DomainFrontmatterSchema.safeParse({ priority: "high" });
    expect(result.success).toBe(false);
  });

  it("拒绝空 id", () => {
    const result = DomainFrontmatterSchema.safeParse({ id: "" });
    expect(result.success).toBe(false);
  });

  it("拒绝无效的 priority", () => {
    const result = DomainFrontmatterSchema.safeParse({
      id: "my-domain",
      priority: "urgent",
    });
    expect(result.success).toBe(false);
  });

  it("默认 priority 为 medium", () => {
    const result = DomainFrontmatterSchema.parse({ id: "my-domain" });
    expect(result.priority).toBe("medium");
  });

  it("默认 appliesTo 为空数组", () => {
    const result = DomainFrontmatterSchema.parse({ id: "my-domain" });
    expect(result.appliesTo).toEqual([]);
  });
});
