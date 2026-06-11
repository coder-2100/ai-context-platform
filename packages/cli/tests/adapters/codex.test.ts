import type { AdapterInput } from "@coder-2100/schema";
import { describe, expect, it } from "vitest";
import { CodexAdapter } from "../../src/adapters/codex";
import type { ExtractedContent } from "../../src/engine/content-extraction";

const mockContents: ExtractedContent[] = [
  {
    type: "rule",
    id: "core-coding-standards",
    name: "Core Coding Standards",
    content: "# Core Coding Standards\n\n- Prefer composition over inheritance",
    priority: "high",
    layer: "core",
    appliesTo: ["review", "implement"],
    sourcePath: "rules/coding-standards.md",
  },
  {
    type: "skill",
    id: "react-review-skill",
    name: "React Review Skill",
    content: "# React Review Skill\n\nFocus on rendering performance.",
    priority: "medium",
    layer: "stack",
    appliesTo: ["review"],
    sourcePath: "skills/react-review.md",
  },
  {
    type: "agent",
    id: "reviewer-agent",
    name: "Reviewer Agent",
    content: "# Reviewer Agent\n\nCode review focused on correctness.",
    priority: "high",
    layer: "stack",
    appliesTo: ["review"],
    sourcePath: "agents/reviewer.md",
  },
];

const mockInput: AdapterInput = {
  task: "review",
  packages: [
    {
      name: "@coder-2100/core-engineering",
      version: "1.0.0",
      manifest: {
        schemaVersion: "1",
        name: "core-engineering",
        version: "1.0.0",
        type: "rules",
        layer: "core",
        description: "通用工程编码规范",
        entry: { rules: [], skills: [], agents: [], domains: [], playbooks: [], templates: [] },
      },
    },
  ],
  rules: [],
  skills: [],
  agents: [],
  domains: [],
  playbooks: [],
  indexBudget: 2000,
  contentBudget: 10000,
  toolCapabilities: {
    maxTokens: 32000,
    supportsMultiFile: true,
    supportsImages: false,
    indexFileLocation: "AGENTS.md",
    contentDirLocation: ".ai/runtime/",
    contextFileFormat: "index-plus-files",
  },
};

describe("CodexAdapter", () => {
  const adapter = new CodexAdapter();

  it("name 为 codex", () => {
    expect(adapter.name).toBe("codex");
  });

  it("capabilities 返回 Codex 工具能力", () => {
    const caps = adapter.capabilities;
    expect(caps.maxTokens).toBe(32000);
    expect(caps.indexFileLocation).toBe("AGENTS.md");
    expect(caps.contentDirLocation).toBe(".ai/runtime/");
    expect(caps.contextFileFormat).toBe("index-plus-files");
    expect(caps.supportsImages).toBe(false);
  });

  it("render 生成 AGENTS.md 索引和内容文件", () => {
    const output = adapter.render(mockInput, mockContents, "my-project");
    expect(output.index.path).toBe("AGENTS.md");
    expect(output.index.content).toContain("Current Task: review");
    expect(output.files).toHaveLength(3);
    expect(output.files[0].path).toBe(".ai/runtime/rules/core-coding-standards.md");
  });

  it("空内容时生成默认索引", () => {
    const emptyInput = { ...mockInput, packages: [] };
    const output = adapter.render(emptyInput, [], "my-project");
    expect(output.index.content).toContain("No packages installed yet");
    expect(output.files).toHaveLength(0);
  });

  it("索引包含 task-oriented 资源推荐", () => {
    const output = adapter.render(mockInput, mockContents, "my-project");
    expect(output.index.content).toContain("Priority resources");
  });

  it("indexOnlyContents 参数控制索引内容", () => {
    const indexOnlyContents = [mockContents[0]];
    const output = adapter.render(mockInput, mockContents, "my-project", indexOnlyContents);
    expect(output.index.content).toContain("core-coding-standards");
    expect(output.files).toHaveLength(3);
  });
});
