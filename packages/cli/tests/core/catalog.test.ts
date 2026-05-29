import { describe, expect, it } from "vitest";
import {
  type CatalogPackage,
  createCatalogFromManifests,
  filterCatalog,
  groupCatalogByLayer,
  groupCatalogByType,
} from "../../src/core/catalog";

const mockPackages: CatalogPackage[] = [
  {
    name: "@coder-2100/core-engineering",
    version: "1.0.0",
    description: "通用工程编码规范",
    type: "rules",
    layer: "core",
    tags: ["engineering", "standards"],
  },
  {
    name: "@coder-2100/react-rules",
    version: "1.0.0",
    description: "React 编码规范和审查规则",
    type: "rules",
    layer: "stack",
    tags: ["react", "frontend"],
  },
];

describe("filterCatalog", () => {
  it("按 layer 过滤", () => {
    const result = filterCatalog(mockPackages, { layer: "core" });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("@coder-2100/core-engineering");
  });

  it("按 type 过滤", () => {
    const result = filterCatalog(mockPackages, { type: "rules" });
    expect(result).toHaveLength(2);
  });

  it("按 tag 过滤", () => {
    const result = filterCatalog(mockPackages, { tag: "react" });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("@coder-2100/react-rules");
  });

  it("无过滤条件返回全部", () => {
    const result = filterCatalog(mockPackages, {});
    expect(result).toHaveLength(2);
  });
});

describe("groupCatalogByLayer", () => {
  it("按 layer 分组", () => {
    const groups = groupCatalogByLayer(mockPackages);
    expect(groups.core).toHaveLength(1);
    expect(groups.stack).toHaveLength(1);
    expect(groups.domain).toBeUndefined();
  });
});

describe("groupCatalogByType", () => {
  it("按 type 分组", () => {
    const groups = groupCatalogByType(mockPackages);
    expect(groups.rules).toHaveLength(2);
    expect(groups.skills).toBeUndefined();
  });
});

describe("createCatalogFromManifests", () => {
  it("从 manifest 列表创建 catalog 条目", () => {
    const manifests = [
      {
        schemaVersion: "1",
        name: "core-engineering",
        version: "1.0.0",
        type: "rules" as const,
        layer: "core" as const,
        description: "通用工程编码规范",
        entry: {
          rules: ["rules/coding-standards.md"],
          skills: [],
          agents: [],
          domains: [],
          playbooks: [],
          templates: [],
        },
        tags: ["engineering"],
      },
    ];
    const catalog = createCatalogFromManifests(manifests, "@coder-2100");
    expect(catalog).toHaveLength(1);
    expect(catalog[0].name).toBe("@coder-2100/core-engineering");
    expect(catalog[0].type).toBe("rules");
    expect(catalog[0].layer).toBe("core");
  });
});
