import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { addCommand } from "../../src/commands/add";
import { buildCommand } from "../../src/commands/build";
import { initCommand } from "../../src/commands/init";

const TEST_DIR = join(import.meta.dirname, "__test_build__");
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

describe("buildCommand", () => {
  it("生成内容文件到 .ai/runtime/", async () => {
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
    const content = readFileSync(
      join(TEST_DIR, ".ai", "runtime", "rules", "core-coding-standards.md"),
      "utf-8",
    );
    expect(content).toContain("Core Coding Standards");
  });

  it("更新 CLAUDE.md 索引文件", async () => {
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
    await buildCommand({
      projectDir: TEST_DIR,
      task: "review",
      tool: "claude-code",
      assetsDir: ASSETS_DIR,
    });
    expect(existsSync(join(TEST_DIR, "CLAUDE.md"))).toBe(true);
    const content = readFileSync(join(TEST_DIR, "CLAUDE.md"), "utf-8");
    expect(content).toContain("core-coding-standards");
    expect(content).toContain(".ai/runtime/rules/core-coding-standards.md");
    expect(content).toContain("<!-- AI-CONTEXT:INDEX:START -->");
    expect(content).toContain("<!-- AI-CONTEXT:INDEX:END -->");
  });

  it("保留 CLAUDE.md 中标记区域外的用户内容", async () => {
    await initCommand({
      projectDir: TEST_DIR,
      projectName: "test-project",
      assetsDir: ASSETS_DIR,
    });
    // 手动创建带用户内容的 CLAUDE.md
    const claudeMd = join(TEST_DIR, "CLAUDE.md");
    const userContent = `## My Custom Section\nCustom content here.`;
    require("node:fs").writeFileSync(claudeMd, userContent, "utf-8");

    await addCommand({
      projectDir: TEST_DIR,
      packageNames: ["@coder-2100/core-engineering"],
      assetsDir: ASSETS_DIR,
    });
    await buildCommand({
      projectDir: TEST_DIR,
      task: "review",
      tool: "claude-code",
      assetsDir: ASSETS_DIR,
    });
    const content = readFileSync(claudeMd, "utf-8");
    expect(content).toContain("## My Custom Section");
    expect(content).toContain("Custom content here.");
  });

  it("安装多个包时生成所有内容文件", { timeout: 15000 }, async () => {
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
        join(TEST_DIR, ".ai", "runtime", "rules", "react-components-rules.md"),
      ),
    ).toBe(true);
    expect(
      existsSync(
        join(TEST_DIR, ".ai", "runtime", "skills", "react-review-skill.md"),
      ),
    ).toBe(true);
  });

  it("dry-run 模式不写入文件", async () => {
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
    await buildCommand({
      projectDir: TEST_DIR,
      task: "review",
      tool: "claude-code",
      assetsDir: ASSETS_DIR,
      dryRun: true,
    });
    // 内容文件不应存在（dry-run 模式）
    const runtimeRules = join(TEST_DIR, ".ai", "runtime", "rules");
    expect(existsSync(join(runtimeRules, "core-coding-standards.md"))).toBe(
      false,
    );
  });

  // 回归测试：未传 assetsDir 时，build 必须从 cacheDir（全局缓存）读取内容
  // 并写入 .ai/runtime/，而不是因找不到缓存而生成空文件
  it("从 cacheDir 读取已缓存的包并生成 runtime 内容", async () => {
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

    // 模拟全局缓存：将 assets 包复制为 <cacheDir>/packages/<shortName>/<version>/
    const cacheDir = join(TEST_DIR, "__cache__");
    const cachedPkgDir = join(
      cacheDir,
      "packages",
      "core-engineering",
      "1.1.0-beta.1",
    );
    mkdirSync(cachedPkgDir, { recursive: true });
    cpSync(join(ASSETS_DIR, "core-engineering"), cachedPkgDir, {
      recursive: true,
    });

    // 关键：不传 assetsDir，强制走 cacheDir 分支
    await buildCommand({
      projectDir: TEST_DIR,
      task: "review",
      tool: "claude-code",
      cacheDir,
    });

    const ruleFile = join(
      TEST_DIR,
      ".ai",
      "runtime",
      "rules",
      "core-coding-standards.md",
    );
    expect(existsSync(ruleFile)).toBe(true);
    expect(readFileSync(ruleFile, "utf-8")).toContain("Core Coding Standards");
  });

  it("支持 --tool codex 生成 AGENTS.md", async () => {
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
    await buildCommand({
      projectDir: TEST_DIR,
      task: "review",
      tool: "codex",
      assetsDir: ASSETS_DIR,
    });
    expect(existsSync(join(TEST_DIR, "AGENTS.md"))).toBe(true);
    const content = readFileSync(join(TEST_DIR, "AGENTS.md"), "utf-8");
    expect(content).toContain("core-coding-standards");
  });

  it("verbose 模式输出详细构建信息", async () => {
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
    await buildCommand({
      projectDir: TEST_DIR,
      task: "review",
      tool: "claude-code",
      assetsDir: ASSETS_DIR,
      verbose: true,
    });
    expect(
      existsSync(
        join(TEST_DIR, ".ai", "runtime", "rules", "core-coding-standards.md"),
      ),
    ).toBe(true);
  });

  it("--tool codex 不自动清理 CLAUDE.md", async () => {
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
    // 先构建 claude-code
    await buildCommand({
      projectDir: TEST_DIR,
      task: "review",
      tool: "claude-code",
      assetsDir: ASSETS_DIR,
    });
    expect(existsSync(join(TEST_DIR, "CLAUDE.md"))).toBe(true);

    // 再构建 codex，CLAUDE.md 应保留
    await buildCommand({
      projectDir: TEST_DIR,
      task: "review",
      tool: "codex",
      assetsDir: ASSETS_DIR,
    });
    expect(existsSync(join(TEST_DIR, "CLAUDE.md"))).toBe(true);
    expect(existsSync(join(TEST_DIR, "AGENTS.md"))).toBe(true);
  });

  it("支持 --tool trae 生成 .trae/ 目录内容文件", async () => {
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
    await buildCommand({
      projectDir: TEST_DIR,
      task: "review",
      tool: "trae",
      assetsDir: ASSETS_DIR,
    });
    // .trae/rules/ 下应有内容文件
    expect(
      existsSync(join(TEST_DIR, ".trae", "rules", "core-coding-standards.md")),
    ).toBe(true);
    const content = readFileSync(
      join(TEST_DIR, ".trae", "rules", "core-coding-standards.md"),
      "utf-8",
    );
    expect(content).toContain("Core Coding Standards");
  });

  it("--tool trae 不生成索引文件", async () => {
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
    await buildCommand({
      projectDir: TEST_DIR,
      task: "review",
      tool: "trae",
      assetsDir: ASSETS_DIR,
    });
    // Trae 不生成 CLAUDE.md 索引文件
    expect(existsSync(join(TEST_DIR, "CLAUDE.md"))).toBe(false);
  });

  it("--tool gemini 回退到 Codex 生成 AGENTS.md", async () => {
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
    await buildCommand({
      projectDir: TEST_DIR,
      task: "review",
      tool: "gemini",
      assetsDir: ASSETS_DIR,
    });
    expect(existsSync(join(TEST_DIR, "AGENTS.md"))).toBe(true);
    const content = readFileSync(join(TEST_DIR, "AGENTS.md"), "utf-8");
    expect(content).toContain("core-coding-standards");
  });
});
