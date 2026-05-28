export const Layer = {
  CORE: "core",
  STACK: "stack",
  DOMAIN: "domain",
  PROJECT: "project",
  RUNTIME: "runtime",
} as const;

export type Layer = (typeof Layer)[keyof typeof Layer];

export const Priority = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
} as const;

export type Priority = (typeof Priority)[keyof typeof Priority];

export const PRIORITY_WEIGHTS: Record<Priority, number> = {
  critical: 100,
  high: 75,
  medium: 50,
  low: 25,
};

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
