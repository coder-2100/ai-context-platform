import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as tar from "tar";
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

describe("CacheManager - npm 包缓存", () => {
  /** 创建模拟 npm tarball（内含 package/ 前缀目录，符合 npm 格式） */
  async function createNpmTarball(
    stagingDir: string,
    packageContent: Record<string, string>,
  ): Promise<Buffer> {
    // 在 staging 目录下创建 package 子目录及文件（模拟 npm tarball 结构）
    const packageDir = join(stagingDir, "package");
    mkdirSync(packageDir, { recursive: true });
    for (const [relativePath, content] of Object.entries(packageContent)) {
      const filePath = join(packageDir, relativePath);
      const fileDir = join(filePath, "..");
      if (!existsSync(fileDir)) {
        mkdirSync(fileDir, { recursive: true });
      }
      writeFileSync(filePath, content, "utf-8");
    }

    // 打包为 .tgz，内含 package/ 前缀
    const tarPath = join(stagingDir, "package.tgz");
    await tar.c(
      {
        gzip: true,
        file: tarPath,
        cwd: stagingDir,
      },
      ["package"],
    );

    return readFileSync(tarPath);
  }

  it("getPackageCachePath 返回正确的路径", () => {
    const cache = new CacheManager(join(TEST_DIR, "cache"));
    const path = cache.getPackageCachePath("core-engineering", "1.0.0");
    expect(path).toBe(join(TEST_DIR, "cache", "packages", "core-engineering", "1.0.0"));
  });

  it("hasPackageCache 检查缓存是否存在", () => {
    const cache = new CacheManager(join(TEST_DIR, "cache"));
    cache.ensureCacheDir();

    // 不存在时返回 false
    expect(cache.hasPackageCache("core-engineering", "1.0.0")).toBe(false);

    // 创建缓存目录后返回 true
    const pkgDir = cache.getPackageCachePath("core-engineering", "1.0.0");
    mkdirSync(pkgDir, { recursive: true });
    expect(cache.hasPackageCache("core-engineering", "1.0.0")).toBe(true);
  });

  it("解压 tarball 到缓存目录", async () => {
    const cache = new CacheManager(join(TEST_DIR, "cache"));
    cache.ensureCacheDir();

    const stagingDir = join(TEST_DIR, "staging");
    mkdirSync(stagingDir, { recursive: true });

    const tarballBuffer = await createNpmTarball(stagingDir, {
      "manifest.yaml": "schemaVersion: '1'\nname: core-engineering\nversion: 1.0.0\n",
      "rules/test.md": "# Test Rule\n",
    });

    const targetDir = await cache.extractPackageTarball(
      "core-engineering",
      "1.0.0",
      tarballBuffer,
    );

    // 验证返回的路径正确
    expect(targetDir).toBe(cache.getPackageCachePath("core-engineering", "1.0.0"));

    // 验证解压后文件存在（strip: 1 剥掉 package/ 前缀）
    expect(existsSync(join(targetDir, "manifest.yaml"))).toBe(true);
    expect(existsSync(join(targetDir, "rules", "test.md"))).toBe(true);

    // 验证文件内容
    const manifestContent = readFileSync(join(targetDir, "manifest.yaml"), "utf-8");
    expect(manifestContent).toContain("core-engineering");
  });

  it("版本变更时清除旧版本缓存", async () => {
    const cache = new CacheManager(join(TEST_DIR, "cache"));
    cache.ensureCacheDir();

    const stagingV1 = join(TEST_DIR, "staging-v1");
    mkdirSync(stagingV1, { recursive: true });
    const tarballV1 = await createNpmTarball(stagingV1, {
      "manifest.yaml": "schemaVersion: '1'\nname: core-engineering\nversion: 1.0.0\n",
    });

    const stagingV2 = join(TEST_DIR, "staging-v2");
    mkdirSync(stagingV2, { recursive: true });
    const tarballV2 = await createNpmTarball(stagingV2, {
      "manifest.yaml": "schemaVersion: '1'\nname: core-engineering\nversion: 2.0.0\n",
    });

    // 安装 v1
    await cache.extractPackageTarball("core-engineering", "1.0.0", tarballV1);
    expect(cache.hasPackageCache("core-engineering", "1.0.0")).toBe(true);

    // 安装 v2，应清除 v1 缓存
    await cache.extractPackageTarball("core-engineering", "2.0.0", tarballV2);
    expect(cache.hasPackageCache("core-engineering", "1.0.0")).toBe(false);
    expect(cache.hasPackageCache("core-engineering", "2.0.0")).toBe(true);

    // 验证 v2 的 manifest 内容
    const v2Dir = cache.getPackageCachePath("core-engineering", "2.0.0");
    const manifestContent = readFileSync(join(v2Dir, "manifest.yaml"), "utf-8");
    expect(manifestContent).toContain("2.0.0");
  });
});

describe("CacheManager - 分类清理与统计", () => {
  it("clearPackages 只清空 packages 子目录", () => {
    const cache = new CacheManager(join(TEST_DIR, "cache"));
    cache.ensureCacheDir();
    mkdirSync(cache.getPackageCachePath("foo", "1.0.0"), { recursive: true });
    writeFileSync(join(cache.getPackageCachePath("foo", "1.0.0"), "a.txt"), "x");
    cache.setManifest("@scope/foo", "1.0.0", {
      schemaVersion: "1",
      name: "foo",
      version: "1.0.0",
      type: "rules" as const,
      layer: "core" as const,
      description: "test",
      entry: { rules: [], skills: [], agents: [], domains: [], playbooks: [], templates: [] },
    });

    cache.clearPackages();

    expect(cache.hasPackageCache("foo", "1.0.0")).toBe(false);
    expect(cache.getManifest("@scope/foo", "1.0.0")).not.toBeNull();
  });

  it("clearManifests 只清空 manifests 子目录", () => {
    const cache = new CacheManager(join(TEST_DIR, "cache"));
    cache.ensureCacheDir();
    mkdirSync(cache.getPackageCachePath("foo", "1.0.0"), { recursive: true });
    cache.setManifest("@scope/foo", "1.0.0", {
      schemaVersion: "1",
      name: "foo",
      version: "1.0.0",
      type: "rules" as const,
      layer: "core" as const,
      description: "test",
      entry: { rules: [], skills: [], agents: [], domains: [], playbooks: [], templates: [] },
    });

    cache.clearManifests();

    expect(cache.getManifest("@scope/foo", "1.0.0")).toBeNull();
    expect(cache.hasPackageCache("foo", "1.0.0")).toBe(true);
  });

  it("statPackages 返回文件数和总大小", () => {
    const cache = new CacheManager(join(TEST_DIR, "cache"));
    cache.ensureCacheDir();
    const dir = cache.getPackageCachePath("foo", "1.0.0");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "a.txt"), "hello");
    writeFileSync(join(dir, "b.txt"), "world!");

    const stat = cache.statPackages();
    expect(stat.fileCount).toBe(2);
    expect(stat.totalBytes).toBe(11);
  });

  it("statManifests 返回文件数和总大小", () => {
    const cache = new CacheManager(join(TEST_DIR, "cache"));
    cache.ensureCacheDir();
    cache.setManifest("@scope/foo", "1.0.0", {
      schemaVersion: "1",
      name: "foo",
      version: "1.0.0",
      type: "rules" as const,
      layer: "core" as const,
      description: "test",
      entry: { rules: [], skills: [], agents: [], domains: [], playbooks: [], templates: [] },
    });

    const stat = cache.statManifests();
    expect(stat.fileCount).toBe(1);
    expect(stat.totalBytes).toBeGreaterThan(0);
  });

  it("stat* 在目录不存在时返回零值", () => {
    const cache = new CacheManager(join(TEST_DIR, "cache-empty"));
    expect(cache.statPackages()).toEqual({ fileCount: 0, totalBytes: 0 });
    expect(cache.statManifests()).toEqual({ fileCount: 0, totalBytes: 0 });
  });

  it("clear* 在目录不存在时不抛错", () => {
    const cache = new CacheManager(join(TEST_DIR, "cache-empty"));
    expect(() => cache.clearPackages()).not.toThrow();
    expect(() => cache.clearManifests()).not.toThrow();
  });
});
