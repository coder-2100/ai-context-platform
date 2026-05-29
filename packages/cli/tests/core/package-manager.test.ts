import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PackageManager } from "../../src/core/package-manager";
import { RegistryClient } from "../../src/core/registry-client";

const TEST_DIR = join(import.meta.dirname, "__test_pm__");
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

describe("PackageManager", () => {
  function createPM() {
    const registry = new RegistryClient({
      scope: "@coder-2100",
      registry: "https://registry.npmjs.org",
    });
    return new PackageManager({
      projectDir: TEST_DIR,
      assetsDir: ASSETS_DIR,
      registry,
      cliVersion: "0.1.0",
    });
  }

  it("init 创建 .ai 目录和默认配置", async () => {
    const pm = createPM();
    await pm.init("test-project");
    expect(existsSync(join(TEST_DIR, ".ai", "config.yaml"))).toBe(true);
    expect(existsSync(join(TEST_DIR, ".ai", "lock.yaml"))).toBe(true);
  });

  it("add 安装包并更新配置和 lockfile", async () => {
    const pm = createPM();
    await pm.init("test-project");
    await pm.add(["@coder-2100/core-engineering"]);
    const config = pm.getConfig();
    expect(config.packages).toHaveLength(1);
    expect(config.packages[0].name).toBe("@coder-2100/core-engineering");
    const lockfile = pm.getLockfile();
    expect(lockfile.packages["@coder-2100/core-engineering"]).toBeDefined();
  });

  it("add 安装带依赖的包时自动安装依赖", async () => {
    const pm = createPM();
    await pm.init("test-project");
    await pm.add(["@coder-2100/react-rules"]);
    const config = pm.getConfig();
    const names = config.packages.map((p) => p.name);
    expect(names).toContain("@coder-2100/react-rules");
    expect(names).toContain("@coder-2100/core-engineering");
  });

  it("add 安装已安装的包时跳过", async () => {
    const pm = createPM();
    await pm.init("test-project");
    await pm.add(["@coder-2100/core-engineering"]);
    await pm.add(["@coder-2100/core-engineering"]);
    const config = pm.getConfig();
    const coreCount = config.packages.filter(
      (p) => p.name === "@coder-2100/core-engineering",
    ).length;
    expect(coreCount).toBe(1);
  });

  it("remove 移除包并更新配置和 lockfile", async () => {
    const pm = createPM();
    await pm.init("test-project");
    await pm.add(["@coder-2100/core-engineering"]);
    await pm.remove("@coder-2100/core-engineering");
    const config = pm.getConfig();
    expect(config.packages).toHaveLength(0);
    const lockfile = pm.getLockfile();
    expect(lockfile.packages["@coder-2100/core-engineering"]).toBeUndefined();
  });

  it("remove 移除不存在的包时抛出错误", async () => {
    const pm = createPM();
    await pm.init("test-project");
    await expect(pm.remove("@coder-2100/nonexistent")).rejects.toThrow();
  });

  it("list 返回已安装包列表", async () => {
    const pm = createPM();
    await pm.init("test-project");
    await pm.add(["@coder-2100/core-engineering"]);
    const list = pm.list();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("@coder-2100/core-engineering");
    expect(list[0].version).toBe("1.0.0");
  });

  it("getConfig 在未初始化时抛出错误", () => {
    const pm = createPM();
    expect(() => pm.getConfig()).toThrow();
  });
});
