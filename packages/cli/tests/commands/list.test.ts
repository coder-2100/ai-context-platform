import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { addCommand } from "../../src/commands/add";
import { initCommand } from "../../src/commands/init";
import { listCommand } from "../../src/commands/list";

const TEST_DIR = join(import.meta.dirname, "__test_list__");
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

describe("listCommand", () => {
  it("返回已安装包列表", async () => {
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
    const result = await listCommand({
      projectDir: TEST_DIR,
      assetsDir: ASSETS_DIR,
    });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("@coder-2100/core-engineering");
  });

  it("无包时返回空列表", async () => {
    await initCommand({
      projectDir: TEST_DIR,
      projectName: "test-project",
      assetsDir: ASSETS_DIR,
    });
    const result = await listCommand({
      projectDir: TEST_DIR,
      assetsDir: ASSETS_DIR,
    });
    expect(result).toHaveLength(0);
  });

  it("verbose 模式返回完整信息", async () => {
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
    const result = await listCommand({
      projectDir: TEST_DIR,
      assetsDir: ASSETS_DIR,
      verbose: true,
    });
    expect(result[0].manifest).toBeDefined();
    expect(result[0].manifest.type).toBe("rules");
    expect(result[0].manifest.layer).toBe("core");
  });
});
