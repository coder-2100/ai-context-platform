import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CacheManager } from "../../src/core/cache";

const TEST_DIR = join(import.meta.dirname, "__test_cache__");

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("CacheManager", () => {
  it("初始化时创建缓存目录", () => {
    const cache = new CacheManager(join(TEST_DIR, "cache"));
    cache.ensureCacheDir();
    expect(existsSync(join(TEST_DIR, "cache"))).toBe(true);
  });

  it("缓存并读取文件", () => {
    const cache = new CacheManager(join(TEST_DIR, "cache"));
    cache.ensureCacheDir();
    cache.set("test-key", "hello world");
    const result = cache.get("test-key");
    expect(result).toBe("hello world");
  });

  it("读取不存在的缓存返回 null", () => {
    const cache = new CacheManager(join(TEST_DIR, "cache"));
    cache.ensureCacheDir();
    const result = cache.get("nonexistent");
    expect(result).toBeNull();
  });

  it("缓存 manifest 对象", () => {
    const cache = new CacheManager(join(TEST_DIR, "cache"));
    cache.ensureCacheDir();
    const manifest = {
      schemaVersion: "1",
      name: "core-engineering",
      version: "1.0.0",
      type: "rules" as const,
      layer: "core" as const,
      description: "test",
      entry: {
        rules: [],
        skills: [],
        agents: [],
        domains: [],
        playbooks: [],
        templates: [],
      },
    };
    cache.setManifest("@coder-2100/core-engineering", "1.0.0", manifest);
    const loaded = cache.getManifest("@coder-2100/core-engineering", "1.0.0");
    expect(loaded).not.toBeNull();
    expect(loaded?.name).toBe("core-engineering");
  });

  it("清除缓存", () => {
    const cache = new CacheManager(join(TEST_DIR, "cache"));
    cache.ensureCacheDir();
    cache.set("test", "data");
    cache.clear();
    expect(cache.get("test")).toBeNull();
  });
});
