import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { type Lockfile, LockfileSchema } from "@coder-2100/schema";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

/** 创建空的锁文件，包含 schema 版本、CLI 版本和空的包映射 */
export function createEmptyLockfile(cliVersion: string): Lockfile {
  return {
    schemaVersion: "1",
    cliVersion,
    generatedAt: new Date().toISOString(),
    packages: {},
  };
}

/** 添加包到锁文件时的输入参数 */
export interface AddPackageInput {
  name: string;
  version: string;
  resolved: string;
  integrity: string;
}

/** 向锁文件中添加包记录，返回新的锁文件（不可变更新） */
export function addPackageToLockfile(
  lockfile: Lockfile,
  pkg: AddPackageInput,
): Lockfile {
  return {
    ...lockfile,
    generatedAt: new Date().toISOString(),
    packages: {
      ...lockfile.packages,
      [pkg.name]: {
        version: pkg.version,
        resolved: pkg.resolved,
        integrity: pkg.integrity,
      },
    },
  };
}

/** 从锁文件中移除包记录，返回新的锁文件（不可变更新） */
export function removePackageFromLockfile(
  lockfile: Lockfile,
  packageName: string,
): Lockfile {
  const { [packageName]: _, ...remaining } = lockfile.packages;
  return {
    ...lockfile,
    generatedAt: new Date().toISOString(),
    packages: remaining,
  };
}

/** 从 YAML 文件加载并验证锁文件 */
export function loadLockfile(lockPath: string): Lockfile {
  const content = readFileSync(lockPath, "utf-8");
  const raw = parseYaml(content);
  const result = LockfileSchema.safeParse(raw);
  if (!result.success) {
    const errors = result.error.issues.map(
      (i) => `${i.path.join(".")}: ${i.message}`,
    );
    throw new Error(`Lockfile 验证失败:\n  ${errors.join("\n  ")}`);
  }
  return result.data;
}

/** 将锁文件序列化为 YAML 并写入磁盘 */
export function saveLockfile(lockPath: string, lockfile: Lockfile): void {
  const yaml = stringifyYaml(lockfile, { lineWidth: 0 });
  writeFileSync(lockPath, yaml, "utf-8");
}

/** 检查锁文件是否存在于磁盘 */
export function lockfileExists(lockPath: string): boolean {
  return existsSync(lockPath);
}
