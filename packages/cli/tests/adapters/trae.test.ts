import type { AdapterInput } from "@coder-2100/schema";
import { describe, expect, it } from "vitest";
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
  {
    type: "domain",
    id: "payment-domain",
    name: "Payment Domain",
    content: "# Payment Domain\n\nPayment processing knowledge.",
    priority: "medium",
    layer: "domain",
    appliesTo: ["implement"],
    sourcePath: "domains/payment.md",
  },
  {
    type: "playbook",
    id: "migration-playbook",
    name: "Migration Playbook",
    content: "# Migration Playbook\n\nDatabase migration guide.",
    priority: "medium",
    layer: "domain",
    appliesTo: ["migration"],
    sourcePath: "playbooks/migration.md",
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
  indexBudget: 3000,
  contentBudget: 10000,
  toolCapabilities: {
    maxTokens: 64000,
    supportsMultiFile: true,
    supportsImages: true,
    indexFileLocation: "",
    contentDirLocation: ".trae/",
    contextFileFormat: "multi-md",
  },
};

describe("TraeAdapter", () => {
  async function getAdapter() {
    const { TraeAdapter } = await import("../../src/adapters/trae");
    return new TraeAdapter();
  }

  it("name 为 trae", async () => {
    const adapter = await getAdapter();
    expect(adapter.name).toBe("trae");
  });

  it("capabilities 返回 Trae 工具能力", async () => {
    const adapter = await getAdapter();
    const caps = adapter.capabilities;
    expect(caps.maxTokens).toBe(64000);
    expect(caps.indexFileLocation).toBe("");
    expect(caps.contentDirLocation).toBe(".trae/");
    expect(caps.contextFileFormat).toBe("multi-md");
    expect(caps.supportsMultiFile).toBe(true);
    expect(caps.supportsImages).toBe(true);
  });

  it("render 生成 .trae/ 目录下的内容文件，无索引文件", async () => {
    const adapter = await getAdapter();
    const output = adapter.render(mockInput, mockContents, "my-project");
    expect(output.index.path).toBe("");
    expect(output.index.content).toBe("");
    expect(output.files).toHaveLength(5);
    expect(output.files[0].type).toBe("rule");
    expect(output.files[0].id).toBe("core-coding-standards");
    expect(output.files[0].path).toBe(".trae/rules/core-coding-standards.md");
    expect(output.files[1].type).toBe("skill");
    expect(output.files[1].path).toBe(".trae/skills/react-review-skill.md");
    expect(output.files[2].type).toBe("agent");
    expect(output.files[2].path).toBe(".trae/agents/reviewer-agent.md");
    expect(output.files[3].type).toBe("domain");
    expect(output.files[3].path).toBe(".trae/domains/payment-domain.md");
    expect(output.files[4].type).toBe("playbook");
    expect(output.files[4].path).toBe(".trae/playbooks/migration-playbook.md");
    expect(output.instructions).toEqual(
      expect.arrayContaining([
        expect.stringContaining(".trae/rules/"),
        expect.stringContaining(".trae/skills/"),
      ]),
    );
  });

  it("空内容时返回空文件列表", async () => {
    const adapter = await getAdapter();
    const emptyInput = { ...mockInput, packages: [] };
    const output = adapter.render(emptyInput, [], "my-project");
    expect(output.files).toHaveLength(0);
    expect(output.index.path).toBe("");
  });

  it("内容文件保留原始内容", async () => {
    const adapter = await getAdapter();
    const output = adapter.render(mockInput, mockContents, "my-project");
    const ruleFile = output.files.find((f) => f.id === "core-coding-standards")!;
    expect(ruleFile.content).toContain("Core Coding Standards");
    expect(ruleFile.content).toContain("Prefer composition over inheritance");
  });

  it("内容文件继承 appliesTo 和 priority", async () => {
    const adapter = await getAdapter();
    const output = adapter.render(mockInput, mockContents, "my-project");
    const ruleFile = output.files.find((f) => f.id === "core-coding-standards")!;
    expect(ruleFile.appliesTo).toEqual(["review", "implement"]);
    expect(ruleFile.priority).toBe("high");
  });
});
