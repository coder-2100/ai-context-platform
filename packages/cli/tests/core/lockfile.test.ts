import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { loadLockfile, saveLockfile, createEmptyLockfile, addPackageToLockfile, removePackageFromLockfile } from '../../src/core/lockfile'
import type { Lockfile } from '@coder-2100/schema'

const TEST_DIR = join(import.meta.dirname, '__test_lockfile__')

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true })
})

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true })
})

describe('createEmptyLockfile', () => {
  it('创建空的 lockfile', () => {
    const lockfile = createEmptyLockfile('0.1.0')
    expect(lockfile.schemaVersion).toBe('1')
    expect(lockfile.cliVersion).toBe('0.1.0')
    expect(lockfile.packages).toEqual({})
  })
})

describe('addPackageToLockfile', () => {
  it('添加包条目', () => {
    const lockfile = createEmptyLockfile('0.1.0')
    const updated = addPackageToLockfile(lockfile, {
      name: '@coder-2100/core-engineering',
      version: '1.0.0',
      resolved: 'https://registry.npmjs.org/@coder-2100/core-engineering/-/core-engineering-1.0.0.tgz',
      integrity: 'sha512-abc123',
    })
    expect(updated.packages['@coder-2100/core-engineering']).toBeDefined()
    expect(updated.packages['@coder-2100/core-engineering'].version).toBe('1.0.0')
  })

  it('覆盖同名包', () => {
    let lockfile = createEmptyLockfile('0.1.0')
    lockfile = addPackageToLockfile(lockfile, {
      name: '@coder-2100/core-engineering',
      version: '1.0.0',
      resolved: 'https://example.com/v1.0.0.tgz',
      integrity: 'sha512-abc',
    })
    lockfile = addPackageToLockfile(lockfile, {
      name: '@coder-2100/core-engineering',
      version: '1.1.0',
      resolved: 'https://example.com/v1.1.0.tgz',
      integrity: 'sha512-def',
    })
    expect(lockfile.packages['@coder-2100/core-engineering'].version).toBe('1.1.0')
  })
})

describe('removePackageFromLockfile', () => {
  it('移除存在的包', () => {
    let lockfile = createEmptyLockfile('0.1.0')
    lockfile = addPackageToLockfile(lockfile, {
      name: '@coder-2100/core-engineering',
      version: '1.0.0',
      resolved: 'https://example.com/pkg.tgz',
      integrity: 'sha512-abc',
    })
    const updated = removePackageFromLockfile(lockfile, '@coder-2100/core-engineering')
    expect(updated.packages['@coder-2100/core-engineering']).toBeUndefined()
  })

  it('移除不存在的包时不报错', () => {
    const lockfile = createEmptyLockfile('0.1.0')
    const updated = removePackageFromLockfile(lockfile, '@coder-2100/nonexistent')
    expect(updated.packages).toEqual({})
  })
})

describe('saveLockfile + loadLockfile', () => {
  it('保存并加载 lock.yaml', () => {
    let lockfile = createEmptyLockfile('0.1.0')
    lockfile = addPackageToLockfile(lockfile, {
      name: '@coder-2100/core-engineering',
      version: '1.0.0',
      resolved: 'https://registry.npmjs.org/pkg.tgz',
      integrity: 'sha512-abc123',
    })
    const lockPath = join(TEST_DIR, 'lock.yaml')
    saveLockfile(lockPath, lockfile)
    const loaded = loadLockfile(lockPath)
    expect(loaded.schemaVersion).toBe('1')
    expect(loaded.cliVersion).toBe('0.1.0')
    expect(loaded.packages['@coder-2100/core-engineering'].version).toBe('1.0.0')
  })
})
