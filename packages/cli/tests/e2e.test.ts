import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { addCommand } from "../src/commands/add";
import { buildCommand } from "../src/commands/build";
import { initCommand } from "../src/commands/init";
import { listCommand } from "../src/commands/list";
import { removeCommand } from "../src/commands/remove";

const TEST_DIR = join(import.meta.dirname, "__test_e2e__");
const ASSETS_DIR = join(import.meta.dirname, "..", "..", "assets");

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("端到端流程", () => {
  it("完整的 init → add → build → remove 流程", async () => {
    // 1. init
    await initCommand({
      projectDir: TEST_DIR,
      projectName: "e2e-project",
      assetsDir: ASSETS_DIR,
    });
    expect(existsSync(join(TEST_DIR, ".ai", "config.yaml"))).toBe(true);
    expect(existsSync(join(TEST_DIR, "CLAUDE.md"))).toBe(true);

    // 2. add
    await addCommand({
      projectDir: TEST_DIR,
      packageNames: ["@coder-2100/react-rules"],
      assetsDir: ASSETS_DIR,
    });
    const listAfterAdd = await listCommand({
      projectDir: TEST_DIR,
      assetsDir: ASSETS_DIR,
    });
    expect(listAfterAdd.length).toBeGreaterThanOrEqual(2); // react-rules + core-engineering

    // 3. build
    await buildCommand({
      projectDir: TEST_DIR,
      task: "review",
      tool: "claude-code",
      assetsDir: ASSETS_DIR,
    });
    expect(
      existsSync(
        join(TEST_DIR, ".ai", "runtime", "rules", "core-coding-standards.md"),
      ),
    ).toBe(true);
    expect(
      existsSync(
        join(TEST_DIR, ".ai", "runtime", "rules", "react-hooks-rules.md"),
      ),
    ).toBe(true);
    expect(
      existsSync(
        join(TEST_DIR, ".ai", "runtime", "skills", "react-review-skill.md"),
      ),
    ).toBe(true);

    const claudeMd = readFileSync(join(TEST_DIR, "CLAUDE.md"), "utf-8");
    expect(claudeMd).toContain("Core Coding Standards");
    expect(claudeMd).toContain("react-hooks-rules");
    expect(claudeMd).toContain("Current Task: review");

    // 4. remove
    await removeCommand({
      projectDir: TEST_DIR,
      packageName: "@coder-2100/core-engineering",
      assetsDir: ASSETS_DIR,
    });
    const listAfterRemove = await listCommand({
      projectDir: TEST_DIR,
      assetsDir: ASSETS_DIR,
    });
    const names = listAfterRemove.map((p) => p.name);
    expect(names).not.toContain("@coder-2100/core-engineering");
    expect(names).toContain("@coder-2100/react-rules");
  });

  it("build 不同 task 生成不同的索引高亮", async () => {
    await initCommand({
      projectDir: TEST_DIR,
      projectName: "e2e-project",
      assetsDir: ASSETS_DIR,
    });
    await addCommand({
      projectDir: TEST_DIR,
      packageNames: ["@coder-2100/react-rules"],
      assetsDir: ASSETS_DIR,
    });

    await buildCommand({
      projectDir: TEST_DIR,
      task: "review",
      tool: "claude-code",
      assetsDir: ASSETS_DIR,
    });
    let claudeMd = readFileSync(join(TEST_DIR, "CLAUDE.md"), "utf-8");
    expect(claudeMd).toContain("Current Task: review");

    await buildCommand({
      projectDir: TEST_DIR,
      task: "implement",
      tool: "claude-code",
      assetsDir: ASSETS_DIR,
    });
    claudeMd = readFileSync(join(TEST_DIR, "CLAUDE.md"), "utf-8");
    expect(claudeMd).toContain("Current Task: implement");
    expect(claudeMd).not.toContain("Current Task: review");
  });
});
