import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  extractContent,
  parseFrontmatter,
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
