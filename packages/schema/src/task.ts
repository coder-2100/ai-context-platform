import type { PackageType } from "./constants";

/** 支持的任务类型，决定 build 时加载哪些内容 */
export const TaskType = {
  REVIEW: "review",
  DEBUG: "debug",
  MIGRATION: "migration",
  ARCHITECTURE: "architecture",
  IMPLEMENT: "implement",
  TEST: "test",
} as const;

export type TaskType = (typeof TaskType)[keyof typeof TaskType];

/** 所有任务类型的列表 */
export const TASK_TYPES: TaskType[] = Object.values(TaskType);

/** 每个 task 默认加载的内容类型。当包的 `appliesTo` 字段缺失时使用。 */
export const DEFAULT_TASK_LOAD: Record<TaskType, PackageType[]> = {
  review: ["rules", "agents", "skills"],
  debug: ["rules", "playbooks", "domains"],
  migration: ["playbooks", "domains", "rules"],
  architecture: ["domains", "rules", "agents"],
  implement: ["rules", "skills", "templates"],
  test: ["rules", "skills"],
};
