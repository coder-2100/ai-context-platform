import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { addCommand } from "../../src/commands/add";
import { buildCommand } from "../../src/commands/build";
import { initCommand } from "../../src/commands/init";
import { unbuildCommand } from "../../src/commands/unbuild";

const TEST_DIR = join(import.meta.dirname, "__test_unbuild__");
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

/** 辅助：init + add + build，生成完整项目上下文 */
async function setupProject(tool: string = "claude-code") {
  await initCommand({
    projectDir: TEST_DIR,
    projectName: "test-unbuild",
    assetsDir: ASSETS_DIR,
  });
  await addCommand({
    projectDir: TEST_DIR,
    packageNames: ["@coder-2100/core-engineering"],
    assetsDir: ASSETS_DIR,
  });
  await buildCommand({
    projectDir: TEST_DIR,
    task: "review",
    tool,
    assetsDir: ASSETS_DIR,
  });
}

describe("unbuildCommand", () => {
  it("--tool claude-code 清理 CLAUDE.md 标记区域并删除空文件", async () => {
    await setupProject("claude-code");
    expect(existsSync(join(TEST_DIR, "CLAUDE.md"))).toBe(true);

    await unbuildCommand({
      projectDir: TEST_DIR,
      tool: "claude-code",
    });
    // 文件仅含托管内容，应被删除
    expect(existsSync(join(TEST_DIR, "CLAUDE.md"))).toBe(false);
  });

  it("--tool codex 清理 AGENTS.md 标记区域并删除空文件", async () => {
    await setupProject("codex");
    expect(existsSync(join(TEST_DIR, "AGENTS.md"))).toBe(true);

    await unbuildCommand({
      projectDir: TEST_DIR,
      tool: "codex",
    });
    expect(existsSync(join(TEST_DIR, "AGENTS.md"))).toBe(false);
  });

  it("清理标记区域后保留用户内容", async () => {
    await setupProject("claude-code");
    // 在 CLAUDE.md 末尾追加用户内容
    const claudeMd = join(TEST_DIR, "CLAUDE.md");
    const original = readFileSync(claudeMd, "utf-8");
    writeFileSync(claudeMd, `${original}\n\n## My Notes\nSome user content.`, "utf-8");

    await unbuildCommand({
      projectDir: TEST_DIR,
      tool: "claude-code",
    });
    // 文件保留，用户内容仍在
    expect(existsSync(claudeMd)).toBe(true);
    const content = readFileSync(claudeMd, "utf-8");
    expect(content).toContain("## My Notes");
    expect(content).toContain("Some user content.");
    // 托管标记已移除
    expect(content).not.toContain("AI-CONTEXT:INDEX:START");
  });

  it("--force 删除整个索引文件", async () => {
    await setupProject("claude-code");
    // 追加用户内容
    const claudeMd = join(TEST_DIR, "CLAUDE.md");
    const original = readFileSync(claudeMd, "utf-8");
    writeFileSync(claudeMd, `${original}\n\n## My Notes\nUser content.`, "utf-8");

    await unbuildCommand({
      projectDir: TEST_DIR,
      tool: "claude-code",
      force: true,
    });
    // --force 直接删除文件，不管有没有用户内容
    expect(existsSync(claudeMd)).toBe(false);
  });

  it("--all-tools 清理所有启用工具的索引", async () => {
    await setupProject("claude-code");
    // 再为 codex 构建
    await buildCommand({
      projectDir: TEST_DIR,
      task: "review",
      tool: "codex",
      assetsDir: ASSETS_DIR,
    });
    expect(existsSync(join(TEST_DIR, "CLAUDE.md"))).toBe(true);
    expect(existsSync(join(TEST_DIR, "AGENTS.md"))).toBe(true);

    await unbuildCommand({
      projectDir: TEST_DIR,
      allTools: true,
    });
    expect(existsSync(join(TEST_DIR, "CLAUDE.md"))).toBe(false);
    expect(existsSync(join(TEST_DIR, "AGENTS.md"))).toBe(false);
  });

  it("同时清理 .ai/runtime/ 内容文件", async () => {
    await setupProject("claude-code");
    expect(
      existsSync(join(TEST_DIR, ".ai", "runtime", "rules", "core-coding-standards.md")),
    ).toBe(true);

    await unbuildCommand({
      projectDir: TEST_DIR,
      tool: "claude-code",
    });
    expect(
      existsSync(join(TEST_DIR, ".ai", "runtime", "rules", "core-coding-standards.md")),
    ).toBe(false);
  });

  it("--dry-run 不实际删除", async () => {
    await setupProject("claude-code");

    await unbuildCommand({
      projectDir: TEST_DIR,
      tool: "claude-code",
      dryRun: true,
    });
    // 文件仍存在
    expect(existsSync(join(TEST_DIR, "CLAUDE.md"))).toBe(true);
    expect(
      existsSync(join(TEST_DIR, ".ai", "runtime", "rules", "core-coding-standards.md")),
    ).toBe(true);
  });

  it("未指定 tool 和 allTools 时抛出错误", async () => {
    await expect(
      unbuildCommand({ projectDir: TEST_DIR }),
    ).rejects.toThrow("请指定");
  });
});
