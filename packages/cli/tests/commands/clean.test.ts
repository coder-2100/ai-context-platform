import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanCommand } from "../../src/commands/clean";
import { CacheManager } from "../../src/core/cache";

const TEST_DIR = join(import.meta.dirname, "__test_clean__");
const CACHE_DIR = join(TEST_DIR, "cache");

function seedCache(): void {
  const cache = new CacheManager(CACHE_DIR);
  cache.ensureCacheDir();
  const pkgDir = cache.getPackageCachePath("foo", "1.0.0");
  mkdirSync(pkgDir, { recursive: true });
  writeFileSync(join(pkgDir, "a.txt"), "hello");
  cache.setManifest("@scope/foo", "1.0.0", {
    schemaVersion: "1",
    name: "foo",
    version: "1.0.0",
    type: "rules" as const,
    layer: "core" as const,
    description: "test",
    entry: { rules: [], skills: [], agents: [], domains: [], playbooks: [], templates: [] },
  });
}

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe("cleanCommand", () => {
  it("默认清空整个缓存（packages 与 manifests）", async () => {
    seedCache();
    await cleanCommand({ cacheDir: CACHE_DIR });
    expect(existsSync(join(CACHE_DIR, "packages"))).toBe(false);
    expect(existsSync(join(CACHE_DIR, "manifests"))).toBe(false);
  });

  it("--packages 仅清空 packages", async () => {
    seedCache();
    await cleanCommand({ cacheDir: CACHE_DIR, packages: true });
    expect(existsSync(join(CACHE_DIR, "packages"))).toBe(false);
    expect(existsSync(join(CACHE_DIR, "manifests"))).toBe(true);
  });

  it("--manifests 仅清空 manifests", async () => {
    seedCache();
    await cleanCommand({ cacheDir: CACHE_DIR, manifests: true });
    expect(existsSync(join(CACHE_DIR, "manifests"))).toBe(false);
    expect(existsSync(join(CACHE_DIR, "packages"))).toBe(true);
  });

  it("--dry-run 不删除任何文件，仅打印摘要", async () => {
    seedCache();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await cleanCommand({ cacheDir: CACHE_DIR, dryRun: true });
    expect(existsSync(join(CACHE_DIR, "packages"))).toBe(true);
    expect(existsSync(join(CACHE_DIR, "manifests"))).toBe(true);
    const printed = logSpy.mock.calls.map((c) => String(c[0] ?? "")).join("\n");
    expect(printed.toLowerCase()).toContain("dry");
  });

  it("缓存目录不存在时友好提示，不抛错", async () => {
    const missing = join(TEST_DIR, "missing-cache");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await expect(cleanCommand({ cacheDir: missing })).resolves.toBeUndefined();
    expect(logSpy).toHaveBeenCalled();
  });

  it("同时传 --packages 和 --manifests 等价于全部清理", async () => {
    seedCache();
    await cleanCommand({ cacheDir: CACHE_DIR, packages: true, manifests: true });
    expect(existsSync(join(CACHE_DIR, "packages"))).toBe(false);
    expect(existsSync(join(CACHE_DIR, "manifests"))).toBe(false);
  });
});
