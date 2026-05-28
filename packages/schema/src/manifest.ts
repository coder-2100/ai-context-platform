import { z } from "zod";
import { Layer, PackageType, Priority } from "./constants";

const SEMVER_REGEX = /^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/;
const SEMVER_RANGE_REGEX =
  /^[\^~]?\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$|^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$|^>=?\d+(\.\d+)?(\.\d+)?$/;

const DependencySchema = z.object({
  name: z.string().min(1),
  version: z.string().regex(SEMVER_RANGE_REGEX, "无效的 semver range"),
  optional: z.boolean().default(false),
});

const PeerDependencySchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
});

export const ManifestSchema = z.object({
  // 必填字段
  schemaVersion: z.string().regex(/^\d+$/, "Schema version 必须是数字字符串"),
  name: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Name 必须是小写字母数字加连字符"),
  version: z.string().regex(SEMVER_REGEX, "无效的 semver 版本号"),
  type: z.enum([
    PackageType.RULES,
    PackageType.SKILLS,
    PackageType.AGENTS,
    PackageType.DOMAINS,
    PackageType.PLAYBOOKS,
    PackageType.META,
  ]),
  layer: z.enum([
    Layer.CORE,
    Layer.STACK,
    Layer.DOMAIN,
    Layer.PROJECT,
    Layer.RUNTIME,
  ]),
  description: z.string().min(1),
  entry: z.object({
    rules: z.array(z.string()).default([]),
    skills: z.array(z.string()).default([]),
    agents: z.array(z.string()).default([]),
    domains: z.array(z.string()).default([]),
    playbooks: z.array(z.string()).default([]),
    templates: z.array(z.string()).default([]),
  }),

  // 带默认值的可选字段
  priority: z
    .enum([Priority.CRITICAL, Priority.HIGH, Priority.MEDIUM, Priority.LOW])
    .default(Priority.MEDIUM),
  tags: z.array(z.string()).default([]),
  compatibleTools: z.array(z.string()).default([]),
  minCLIVersion: z.string().optional(),
  author: z.string().optional(),
  license: z.string().optional(),
  appliesTo: z.array(z.string()).default([]),
  dependencies: z.array(DependencySchema).default([]),
  peerDependencies: z.array(PeerDependencySchema).default([]),
  extends: z.array(z.string()).default([]),
  overrides: z.array(z.string()).default([]),
});

export type Manifest = z.infer<typeof ManifestSchema>;
