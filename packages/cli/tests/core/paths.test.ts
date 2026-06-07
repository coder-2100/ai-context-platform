import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CLI_HOME, GLOBAL_CACHE_DIR } from "../../src/core/paths";

describe("paths", () => {
  it("CLI_HOME 指向用户目录下的 .ai-context", () => {
    expect(CLI_HOME).toBe(path.join(os.homedir(), ".ai-context"));
  });

  it("GLOBAL_CACHE_DIR 指向 CLI_HOME 下的 cache", () => {
    expect(GLOBAL_CACHE_DIR).toBe(path.join(CLI_HOME, "cache"));
  });
});
