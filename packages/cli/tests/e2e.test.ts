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
  it(
    "完整的 init → add → build → remove 流程",
    async () => {
      // 1. init
      await initCommand({
        projectDir: TEST_DIR,
        projectName: "e2e-project",
        assetsDir: ASSETS_DIR,
      });
      expect(existsSync(join(TEST_DIR, ".ai", "config.yaml"))).toBe(true);
      expect(existsSync(join(TEST_DIR, "CLAUDE.md"))).toBe(true);

      // 2. add react-rules（会自动安装 core-engineering 依赖）
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
      // 所有包的 runtime 文件都写入
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
      // isEntry: true 的包出现在索引中
      expect(claudeMd).toContain("react-hooks-rules");
      expect(claudeMd).toContain("Current Task: review");
      // isEntry: false 的依赖包不在索引中
      expect(claudeMd).not.toContain("Core Coding Standards");

      // 4. remove — removeCommand 内部自动触发 build
      await removeCommand({
        projectDir: TEST_DIR,
        packageName: "@coder-2100/react-rules",
      });
      // 移除 react-rules 后，其依赖 core-engineering 也被级联移除
      const listAfterRemove = await listCommand({
        projectDir: TEST_DIR,
        assetsDir: ASSETS_DIR,
      });
      const names = listAfterRemove.map((p) => p.name);
      expect(names).not.toContain("@coder-2100/react-rules");
      expect(names).not.toContain("@coder-2100/core-engineering");
    },
    30000,
  );

  it(
    "build 不同 task 生成不同的索引高亮",
    async () => {
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
    },
    30000,
  );

  it("多包 build 正确处理冲突和排序", { timeout: 15000 }, async () => {
    await initCommand({
      projectDir: TEST_DIR,
      projectName: "e2e-pipeline",
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

    // 验证所有包的 runtime 文件都存在（entry + dependency 都被写入）
    expect(
      existsSync(join(TEST_DIR, ".ai", "runtime", "rules", "core-coding-standards.md")),
    ).toBe(true);
    expect(
      existsSync(join(TEST_DIR, ".ai", "runtime", "rules", "react-hooks-rules.md")),
    ).toBe(true);
    expect(
      existsSync(join(TEST_DIR, ".ai", "runtime", "skills", "react-review-skill.md")),
    ).toBe(true);

    // 验证 CLAUDE.md 索引：只包含 isEntry 包的内容
    const claudeMd = readFileSync(join(TEST_DIR, "CLAUDE.md"), "utf-8");
    expect(claudeMd).toContain("Current Task: review");
    expect(claudeMd).toContain("react-hooks-rules");
    // 依赖包 core-engineering 的内容不应进入索引
    expect(claudeMd).not.toContain("core-coding-standards");
  });

  it("不同 task 生成不同索引高亮", { timeout: 15000 }, async () => {
    await initCommand({
      projectDir: TEST_DIR,
      projectName: "e2e-tasks",
      assetsDir: ASSETS_DIR,
    });
    await addCommand({
      projectDir: TEST_DIR,
      packageNames: ["@coder-2100/migration-playbook"],
      assetsDir: ASSETS_DIR,
    });

    // review task
    await buildCommand({
      projectDir: TEST_DIR,
      task: "review",
      tool: "claude-code",
      assetsDir: ASSETS_DIR,
    });
    let claudeMd = readFileSync(join(TEST_DIR, "CLAUDE.md"), "utf-8");
    expect(claudeMd).toContain("Current Task: review");

    // migration task
    await buildCommand({
      projectDir: TEST_DIR,
      task: "migration",
      tool: "claude-code",
      assetsDir: ASSETS_DIR,
    });
    claudeMd = readFileSync(join(TEST_DIR, "CLAUDE.md"), "utf-8");
    expect(claudeMd).toContain("Current Task: migration");
  });

  it("Codex 适配器生成 AGENTS.md", { timeout: 15000 }, async () => {
    await initCommand({
      projectDir: TEST_DIR,
      projectName: "e2e-codex",
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
    const agentsMd = readFileSync(join(TEST_DIR, "AGENTS.md"), "utf-8");
    expect(agentsMd).toContain("core-coding-standards");
    expect(
      existsSync(join(TEST_DIR, ".ai", "runtime", "rules", "core-coding-standards.md")),
    ).toBe(true);
  });
});
