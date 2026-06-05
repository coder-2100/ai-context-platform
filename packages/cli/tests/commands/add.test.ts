import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { addCommand } from "../../src/commands/add";
import { initCommand } from "../../src/commands/init";

const TEST_DIR = join(import.meta.dirname, "__test_add__");
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

describe("addCommand", () => {
  it("安装指定包名的包", async () => {
    await initCommand({
      projectDir: TEST_DIR,
      projectName: "test-project",
      assetsDir: ASSETS_DIR,
    });
    await addCommand({
      projectDir: TEST_DIR,
      packageNames: ["@coder-2100/core-engineering"],
      assetsDir: ASSETS_DIR,
    });
    const config = readFileSync(join(TEST_DIR, ".ai", "config.yaml"), "utf-8");
    expect(config).toContain("core-engineering");
  });

  it("安装不存在的包时抛出错误", async () => {
    await initCommand({
      projectDir: TEST_DIR,
      projectName: "test-project",
      assetsDir: ASSETS_DIR,
    });
    await expect(
      addCommand({
        projectDir: TEST_DIR,
        packageNames: ["@coder-2100/nonexistent"],
        assetsDir: ASSETS_DIR,
      }),
    ).rejects.toThrow();
  });

  it("安装带依赖的包自动安装依赖", async () => {
    await initCommand({
      projectDir: TEST_DIR,
      projectName: "test-project",
      assetsDir: ASSETS_DIR,
    });
    await addCommand({
      projectDir: TEST_DIR,
      packageNames: ["@coder-2100/react-rules"],
      assetsDir: ASSETS_DIR,
    });
    const config = readFileSync(join(TEST_DIR, ".ai", "config.yaml"), "utf-8");
    expect(config).toContain("react-rules");
    expect(config).toContain("core-engineering");
  });

  it("重复安装已安装的包时跳过", async () => {
    await initCommand({
      projectDir: TEST_DIR,
      projectName: "test-project",
      assetsDir: ASSETS_DIR,
    });
    await addCommand({
      projectDir: TEST_DIR,
      packageNames: ["@coder-2100/core-engineering"],
      assetsDir: ASSETS_DIR,
    });
    // 第二次安装不应报错
    await addCommand({
      projectDir: TEST_DIR,
      packageNames: ["@coder-2100/core-engineering"],
      assetsDir: ASSETS_DIR,
    });
    const config = readFileSync(join(TEST_DIR, ".ai", "config.yaml"), "utf-8");
    // 只出现一次
    const matches = config.match(/core-engineering/g);
    expect(matches).toHaveLength(1);
  });

  it("无 assetsDir 时从 npm 安装包", async () => {
    await initCommand({
      projectDir: TEST_DIR,
      projectName: "test-npm-project",
    });
    await addCommand({
      projectDir: TEST_DIR,
      packageNames: ["@coder-2100/core-engineering"],
      // 不指定 assetsDir，从 npm 安装
    });
    const config = readFileSync(join(TEST_DIR, ".ai", "config.yaml"), "utf-8");
    expect(config).toContain("core-engineering");

    const lockfile = readFileSync(join(TEST_DIR, ".ai", "lock.yaml"), "utf-8");
    expect(lockfile).toContain("registry.npmjs.org");
  });

  it("指定版本范围从 npm 安装包", async () => {
    await initCommand({
      projectDir: TEST_DIR,
      projectName: "test-npm-version",
    });
    await addCommand({
      projectDir: TEST_DIR,
      packageNames: ["@coder-2100/core-engineering@^1.0.0"],
    });
    const config = readFileSync(join(TEST_DIR, ".ai", "config.yaml"), "utf-8");
    expect(config).toContain("core-engineering");
  });
});
