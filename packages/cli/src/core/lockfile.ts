import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { LockfileSchema, type Lockfile } from '@coder-2100/schema'

export function createEmptyLockfile(cliVersion: string): Lockfile {
  return {
    schemaVersion: '1',
    cliVersion,
    generatedAt: new Date().toISOString(),
    packages: {},
  }
}

export interface AddPackageInput {
  name: string
  version: string
  resolved: string
  integrity: string
}

export function addPackageToLockfile(lockfile: Lockfile, pkg: AddPackageInput): Lockfile {
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
  }
}

export function removePackageFromLockfile(lockfile: Lockfile, packageName: string): Lockfile {
  const { [packageName]: _, ...remaining } = lockfile.packages
  return {
    ...lockfile,
    generatedAt: new Date().toISOString(),
    packages: remaining,
  }
}

export function loadLockfile(lockPath: string): Lockfile {
  const content = readFileSync(lockPath, 'utf-8')
  const raw = parseYaml(content)
  const result = LockfileSchema.safeParse(raw)
  if (!result.success) {
    const errors = result.error.issues.map(
      (i) => `${i.path.join('.')}: ${i.message}`,
    )
    throw new Error(`Lockfile 验证失败:\n  ${errors.join('\n  ')}`)
  }
  return result.data
}

export function saveLockfile(lockPath: string, lockfile: Lockfile): void {
  const yaml = stringifyYaml(lockfile, { lineWidth: 0 })
  writeFileSync(lockPath, yaml, 'utf-8')
}

export function lockfileExists(lockPath: string): boolean {
  return existsSync(lockPath)
}
