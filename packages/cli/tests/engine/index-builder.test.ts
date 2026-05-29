import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ExtractedContent } from "../../src/engine/content-extraction";
import {
  MARKER_END,
  MARKER_START,
  buildIndex,
  writeIndexFile,
} from "../../src/engine/index-builder";

const TEST_DIR = join(import.meta.dirname, "__test_index__");

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

const mockContents: ExtractedContent[] = [
  {
    type: "rule",
    id: "core-coding-standards",
    name: "Core Coding Standards",
    content: "# Core Coding Standards\n\nRules here.",
    priority: "high",
    appliesTo: ["review", "implement"],
    sourcePath: "rules/coding-standards.md",
  },
  {
    type: "rule",
    id: "react-hooks-rules",
    name: "React Hooks Rules",
    content: "# React Hooks Rules\n\nHooks rules here.",
    priority: "high",
    appliesTo: ["review", "implement"],
    sourcePath: "rules/hooks.md",
  },
  {
    type: "skill",
    id: "react-review-skill",
    name: "React Review Skill",
    content: "# React Review Skill\n\nSkill content.",
    priority: "medium",
    appliesTo: ["review"],
    sourcePath: "skills/react-review.md",
  },
];

describe("buildIndex", () => {
  it("生成包含所有资源索引的 markdown", () => {
    const index = buildIndex({
      contents: mockContents,
      task: "review",
      projectName: "my-project",
      runtimeDir: ".ai/runtime",
    });
    expect(index).toContain("## Core Rules");
    expect(index).toContain("core-coding-standards");
    expect(index).toContain(".ai/runtime/rules/core-coding-standards.md");
    expect(index).toContain("## Available Resources");
    expect(index).toContain("React Hooks Rules");
    expect(index).toContain(".ai/runtime/rules/react-hooks-rules.md");
    expect(index).toContain(".ai/runtime/skills/react-review-skill.md");
  });

  it("按 task 筛选优先资源", () => {
    const index = buildIndex({
      contents: mockContents,
      task: "review",
      projectName: "my-project",
      runtimeDir: ".ai/runtime",
    });
    expect(index).toContain("## Current Task: review");
    expect(index).toContain("Priority resources for this task");
  });

  it("空内容时生成空索引", () => {
    const index = buildIndex({
      contents: [],
      task: "review",
      projectName: "my-project",
      runtimeDir: ".ai/runtime",
    });
    expect(index).toContain("No packages installed yet");
  });
});

describe("writeIndexFile", () => {
  it("首次创建包含标记区域的文件", () => {
    const filePath = join(TEST_DIR, "CLAUDE.md");
    writeIndexFile(filePath, "generated content");
    const written = readFileSync(filePath, "utf-8");
    expect(written).toContain(MARKER_START);
    expect(written).toContain(MARKER_END);
    expect(written).toContain("generated content");
  });

  it("保留标记区域外的用户内容", () => {
    const filePath = join(TEST_DIR, "CLAUDE.md");
    const existingContent = `# My Project\n\nUser content here.\n\n${MARKER_START}\nold content\n${MARKER_END}\n\n## Footer\nFooter content.`;
    writeFileSync(filePath, existingContent, "utf-8");

    writeIndexFile(filePath, "new content");
    const written = readFileSync(filePath, "utf-8");
    expect(written).toContain("# My Project");
    expect(written).toContain("User content here.");
    expect(written).toContain("new content");
    expect(written).not.toContain("old content");
    expect(written).toContain("## Footer");
    expect(written).toContain("Footer content.");
  });
});
