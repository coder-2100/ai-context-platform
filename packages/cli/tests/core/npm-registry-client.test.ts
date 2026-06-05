import { describe, expect, it, beforeEach } from "vitest";
import { NpmRegistryClient } from "../../src/core/npm-registry-client";

describe("NpmRegistryClient", () => {
  let client: NpmRegistryClient;

  beforeEach(() => {
    client = new NpmRegistryClient({ registry: "https://registry.npmjs.org" });
  });

  describe("resolveVersion", () => {
    it("range 为 null 时返回最新版本", async () => {
      const result = await client.resolveVersion("@coder-2100/core-engineering", null);
      expect(result).toBeDefined();
      expect(result.version).toMatch(/^\d+\.\d+\.\d+/);
      expect(result.tarballUrl).toContain("registry.npmjs.org");
      expect(result.shasum).toBeDefined();
    });

    it("range 为 ^1.0.0 时返回匹配的最高版本", async () => {
      const result = await client.resolveVersion("@coder-2100/core-engineering", "^1.0.0");
      expect(result).toBeDefined();
      expect(result.version).toMatch(/^1\.\d+\.\d+/);
    });

    it("包不存在时抛出错误", async () => {
      await expect(
        client.resolveVersion("@coder-2100/this-package-does-not-exist-xyz", null),
      ).rejects.toThrow("未找到");
    });

    it("版本范围无匹配时抛出错误", async () => {
      await expect(
        client.resolveVersion("@coder-2100/core-engineering", ">=99.0.0"),
      ).rejects.toThrow();
    });
  });

  describe("fetchTarball", () => {
    it("下载 tarball 返回 Buffer", async () => {
      const resolved = await client.resolveVersion("@coder-2100/core-engineering", null);
      const buffer = await client.fetchTarball(resolved.tarballUrl);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });
});
