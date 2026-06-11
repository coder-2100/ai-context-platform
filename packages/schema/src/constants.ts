/** 知识资产包的分层架构，从底层到顶层依次为 core → runtime */
export const Layer = {
  CORE: "core",
  STACK: "stack",
  DOMAIN: "domain",
  PROJECT: "project",
  RUNTIME: "runtime",
} as const;

export type Layer = (typeof Layer)[keyof typeof Layer];

/** 优先级等级，数值越高越重要，用于控制索引生成和内容加载顺序 */
export const Priority = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
} as const;

export type Priority = (typeof Priority)[keyof typeof Priority];

/** 优先级对应的权重分数，用于排序和预算分配 */
export const PRIORITY_WEIGHTS: Record<Priority, number> = {
  critical: 100,
  high: 75,
  medium: 50,
  low: 25,
};

/** 层级对应的权重分数，层级越高权重越大，用于冲突解决和排序 */
export const LAYER_WEIGHTS: Record<Layer, number> = {
  core: 10,
  stack: 20,
  domain: 30,
  project: 40,
  runtime: 50,
};

/** 知识资产包的类型分类 */
export const PackageType = {
  RULES: "rules",
  SKILLS: "skills",
  AGENTS: "agents",
  DOMAINS: "domains",
  PLAYBOOKS: "playbooks",
  META: "meta",
  TEMPLATES: "templates",
} as const;

export type PackageType = (typeof PackageType)[keyof typeof PackageType];
