import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  extractContent,
  parseFrontmatter,
  resolveInheritedContent,
} from "../../src/engine/content-extraction";

const ASSETS_DIR = join(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "..",
  "packages",
  "assets",
);

describe("parseFrontmatter", () => {
  it("解析包含 frontmatter 的 markdown", () => {
    const content = `---
id: test-rule
priority: high
layer: stack
appliesTo: [review, implement]
---

# Test Rule

Some content here.`;
    const result = parseFrontmatter(content);
    expect(result.frontmatter.id).toBe("test-rule");
    expect(result.frontmatter.priority).toBe("high");
    expect(result.frontmatter.layer).toBe("stack");
    expect(result.frontmatter.appliesTo).toEqual(["review", "implement"]);
    expect(result.body).toContain("# Test Rule");
  });

  it("解析无 frontmatter 的 markdown 返回空 frontmatter", () => {
    const content = "# Just a heading\n\nNo frontmatter here.";
    const result = parseFrontmatter(content);
    expect(result.frontmatter).toEqual({});
    expect(result.body).toBe(content);
  });
});

describe("extractContent", () => {
  it("从本地资产包提取所有内容文件", async () => {
    const contents = await extractContent(ASSETS_DIR, "core-engineering");
    expect(contents.length).toBeGreaterThan(0);
    expect(contents[0].type).toBe("rule");
    expect(contents[0].id).toBe("core-coding-standards");
    expect(contents[0].content).toContain("Core Coding Standards");
  });

  it("从 react-rules 包提取多个类型的内容文件", async () => {
    const contents = await extractContent(ASSETS_DIR, "react-rules");
    const types = contents.map((c) => c.type);
    expect(types).toContain("rule");
    expect(types).toContain("skill");
    expect(contents.length).toBeGreaterThanOrEqual(3);
  });

  it("提取不存在包返回空数组", async () => {
    const contents = await extractContent(ASSETS_DIR, "nonexistent");
    expect(contents).toEqual([]);
  });
});

describe("resolveInheritedContent", () => {
  it("无 extends 时不修改内容", async () => {
    const original = [
      {
        type: "rule" as const,
        id: "standalone-rule",
        name: "Standalone Rule",
        content: "Standalone content",
        priority: "medium" as const,
        appliesTo: ["implement"],
        sourcePath: "rules/standalone.md",
      },
    ];
    const contents = await resolveInheritedContent(
      ASSETS_DIR,
      original,
      [],
      "@coder-2100",
    );
    expect(contents).toEqual(original);
  });

  it("合并父包的 appliesTo 到子包", async () => {
    const contents = await resolveInheritedContent(
      ASSETS_DIR,
      [
        {
          type: "rule" as const,
          id: "extended-rule",
          name: "Extended Rule",
          content: "Extended content",
          priority: "high" as const,
          // 子包未指定 appliesTo 时，应继承父包所有 task 类型
          appliesTo: [],
          sourcePath: "rules/extended.md",
        },
      ],
      ["@coder-2100/core-engineering"],
      "@coder-2100",
    );
    // 父包 core-engineering 的 appliesTo 包含 review, implement, debug, migration, architecture, test
    // 子包无 appliesTo，合并后应包含所有父包的 task 类型
    expect(contents[0].appliesTo).toContain("review");
    expect(contents[0].appliesTo).toContain("implement");
    expect(contents[0].appliesTo).toContain("test");
    // 验证父包的 task 类型被合并进来
    expect(contents[0].appliesTo.length).toBeGreaterThan(1);
  });
});
