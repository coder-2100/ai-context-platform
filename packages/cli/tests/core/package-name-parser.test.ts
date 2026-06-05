import { describe, expect, it } from "vitest";
import { PackageNameParser } from "../../src/core/package-name-parser";

describe("PackageNameParser", () => {
  const parser = new PackageNameParser("@coder-2100");

  it("解析短名为带 scope 的完整名", () => {
    const result = parser.parse("core-engineering");
    expect(result).toEqual({ name: "@coder-2100/core-engineering", range: null });
  });

  it("解析完整 scope 包名无版本", () => {
    const result = parser.parse("@coder-2100/core-engineering");
    expect(result).toEqual({ name: "@coder-2100/core-engineering", range: null });
  });

  it("解析带 semver 范围的包名", () => {
    const result = parser.parse("@coder-2100/core-engineering@^1.0.0");
    expect(result).toEqual({ name: "@coder-2100/core-engineering", range: "^1.0.0" });
  });

  it("解析带精确版本的包名", () => {
    const result = parser.parse("@coder-2100/core-engineering@1.2.3");
    expect(result).toEqual({ name: "@coder-2100/core-engineering", range: "1.2.3" });
  });

  it("解析带波浪号范围的包名", () => {
    const result = parser.parse("@coder-2100/core-engineering@~1.0.0");
    expect(result).toEqual({ name: "@coder-2100/core-engineering", range: "~1.0.0" });
  });

  it("解析带大于等于范围的包名", () => {
    const result = parser.parse("@coder-2100/core-engineering@>=1.0.0");
    expect(result).toEqual({ name: "@coder-2100/core-engineering", range: ">=1.0.0" });
  });

  it("非当前 scope 的包名保持原样", () => {
    const result = parser.parse("@other-scope/some-pkg@^2.0.0");
    expect(result).toEqual({ name: "@other-scope/some-pkg", range: "^2.0.0" });
  });

  it("非 scoped 包名直接拼接 scope", () => {
    const result = parser.parse("my-pkg@^1.0.0");
    expect(result).toEqual({ name: "@coder-2100/my-pkg", range: "^1.0.0" });
  });
});
