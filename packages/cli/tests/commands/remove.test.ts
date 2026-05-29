import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { addCommand } from "../../src/commands/add";
import { initCommand } from "../../src/commands/init";
import { removeCommand } from "../../src/commands/remove";

const TEST_DIR = join(import.meta.dirname, "__test_remove__");
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

describe("removeCommand", () => {
  it("移除已安装的包", async () => {
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
    await removeCommand({
      projectDir: TEST_DIR,
      packageName: "@coder-2100/core-engineering",
      assetsDir: ASSETS_DIR,
    });
    const config = readFileSync(join(TEST_DIR, ".ai", "config.yaml"), "utf-8");
    expect(config).not.toContain("core-engineering");
  });

  it("移除未安装的包时抛出错误", async () => {
    await initCommand({
      projectDir: TEST_DIR,
      projectName: "test-project",
      assetsDir: ASSETS_DIR,
    });
    await expect(
      removeCommand({
        projectDir: TEST_DIR,
        packageName: "@coder-2100/nonexistent",
        assetsDir: ASSETS_DIR,
      }),
    ).rejects.toThrow();
  });
});
