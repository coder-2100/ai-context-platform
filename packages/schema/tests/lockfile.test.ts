import { describe, expect, it } from "vitest";
import { LockfileSchema } from "../src/lockfile";

describe("LockfileSchema", () => {
  it("接受有效的 lockfile", () => {
    const result = LockfileSchema.safeParse({
      schemaVersion: "1",
      cliVersion: "0.1.0",
      generatedAt: "2026-05-27T10:00:00Z",
      packages: {
        "@coder-2100/react-rules": {
          version: "1.4.2",
          resolved:
            "https://registry.npmjs.org/@coder-2100/react-rules/-/react-rules-1.4.2.tgz",
          integrity: "sha512-abc123",
        },
        "@coder-2100/payment-domain": {
          version: "2.0.1",
          resolved:
            "https://registry.npmjs.org/@coder-2100/payment-domain/-/payment-domain-2.0.1.tgz",
          integrity: "sha512-def456",
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it("拒绝缺少必填字段", () => {
    const result = LockfileSchema.safeParse({
      schemaVersion: "1",
      packages: {},
    });
    expect(result.success).toBe(false);
  });

  it("接受空的 packages", () => {
    const result = LockfileSchema.safeParse({
      schemaVersion: "1",
      cliVersion: "0.1.0",
      generatedAt: "2026-05-27T10:00:00Z",
      packages: {},
    });
    expect(result.success).toBe(true);
  });

  it("拒绝缺少 integrity 的包条目", () => {
    const result = LockfileSchema.safeParse({
      schemaVersion: "1",
      cliVersion: "0.1.0",
      generatedAt: "2026-05-27T10:00:00Z",
      packages: {
        "@coder-2100/react-rules": {
          version: "1.4.2",
          resolved: "https://example.com/pkg.tgz",
        },
      },
    });
    expect(result.success).toBe(false);
  });
});
