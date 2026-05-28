import { describe, expect, it } from "vitest";
import { DEFAULT_TASK_LOAD, TASK_TYPES, TaskType } from "../src/task";

describe("TaskType", () => {
  it("包含正确的值", () => {
    expect(TaskType.REVIEW).toBe("review");
    expect(TaskType.DEBUG).toBe("debug");
    expect(TaskType.MIGRATION).toBe("migration");
    expect(TaskType.ARCHITECTURE).toBe("architecture");
    expect(TaskType.IMPLEMENT).toBe("implement");
    expect(TaskType.TEST).toBe("test");
  });

  it("TASK_TYPES 包含所有 task 类型", () => {
    expect(TASK_TYPES).toEqual([
      "review",
      "debug",
      "migration",
      "architecture",
      "implement",
      "test",
    ]);
  });
});

describe("DEFAULT_TASK_LOAD", () => {
  it("将每个 task 映射到内容类型", () => {
    expect(DEFAULT_TASK_LOAD.review).toContain("rules");
    expect(DEFAULT_TASK_LOAD.review).toContain("agents");
    expect(DEFAULT_TASK_LOAD.review).toContain("skills");

    expect(DEFAULT_TASK_LOAD.debug).toContain("rules");
    expect(DEFAULT_TASK_LOAD.debug).toContain("playbooks");
    expect(DEFAULT_TASK_LOAD.debug).toContain("domains");

    expect(DEFAULT_TASK_LOAD.migration).toContain("playbooks");
    expect(DEFAULT_TASK_LOAD.migration).toContain("domains");
    expect(DEFAULT_TASK_LOAD.migration).toContain("rules");

    expect(DEFAULT_TASK_LOAD.architecture).toContain("domains");
    expect(DEFAULT_TASK_LOAD.architecture).toContain("rules");
    expect(DEFAULT_TASK_LOAD.architecture).toContain("agents");

    expect(DEFAULT_TASK_LOAD.implement).toContain("rules");
    expect(DEFAULT_TASK_LOAD.implement).toContain("skills");
    expect(DEFAULT_TASK_LOAD.implement).toContain("templates");

    expect(DEFAULT_TASK_LOAD.test).toContain("rules");
    expect(DEFAULT_TASK_LOAD.test).toContain("skills");
  });
});
