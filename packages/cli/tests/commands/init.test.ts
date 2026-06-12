import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initCommand } from "../../src/commands/init";

const TEST_DIR = join(import.meta.dirname, "__test_init__");
const ASSETS_DIR = join(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "..",
  "packages",
  "assets",
);

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("initCommand", () => {
  it("创建 .ai 目录结构", async () => {
    await initCommand({
      projectDir: TEST_DIR,
      projectName: "test-project",
      assetsDir: ASSETS_DIR,
    });
    expect(existsSync(join(TEST_DIR, ".ai"))).toBe(true);
    expect(existsSync(join(TEST_DIR, ".ai", "config.yaml"))).toBe(true);
    expect(existsSync(join(TEST_DIR, ".ai", "lock.yaml"))).toBe(true);
    expect(existsSync(join(TEST_DIR, ".ai", "runtime", "rules"))).toBe(true);
    expect(existsSync(join(TEST_DIR, ".ai", "runtime", "skills"))).toBe(true);
    expect(existsSync(join(TEST_DIR, ".ai", "runtime", "agents"))).toBe(true);
    expect(existsSync(join(TEST_DIR, ".ai", "cache"))).toBe(false);
    expect(existsSync(join(TEST_DIR, ".ai", "logs"))).toBe(true);
  });

  it("config.yaml 包含项目名", async () => {
    await initCommand({
      projectDir: TEST_DIR,
      projectName: "my-app",
      assetsDir: ASSETS_DIR,
    });
    const config = readFileSync(join(TEST_DIR, ".ai", "config.yaml"), "utf-8");
    expect(config).toContain("my-app");
  });

  it("已初始化时抛出错误", async () => {
    await initCommand({
      projectDir: TEST_DIR,
      projectName: "first",
      assetsDir: ASSETS_DIR,
    });
    await expect(
      initCommand({
        projectDir: TEST_DIR,
        projectName: "second",
        assetsDir: ASSETS_DIR,
      }),
    ).rejects.toThrow();
  });

  it("init 不创建索引文件（索引文件由 build 命令按工具生成）", async () => {
    await initCommand({
      projectDir: TEST_DIR,
      projectName: "test-project",
      assetsDir: ASSETS_DIR,
    });
    expect(existsSync(join(TEST_DIR, "CLAUDE.md"))).toBe(false);
    expect(existsSync(join(TEST_DIR, "AGENTS.md"))).toBe(false);
  });
});
