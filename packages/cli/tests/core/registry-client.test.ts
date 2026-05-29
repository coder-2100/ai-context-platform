import { describe, it, expect, vi, beforeEach } from 'vitest'
import { join } from 'node:path'
import { RegistryClient } from '../../src/core/registry-client'

const ASSETS_DIR = join(import.meta.dirname, '..', '..', '..', '..', 'packages', 'assets')

describe('RegistryClient', () => {
  let client: RegistryClient

  beforeEach(() => {
    client = new RegistryClient({ scope: '@coder-2100', registry: 'https://registry.npmjs.org' })
  })

  it('从本地资产目录扫描包列表', async () => {
    const catalog = await client.scanLocalAssets(ASSETS_DIR)
    expect(catalog.length).toBeGreaterThanOrEqual(2)
    const names = catalog.map((p) => p.name)
    expect(names).toContain('@coder-2100/core-engineering')
    expect(names).toContain('@coder-2100/react-rules')
  })

  it('获取本地包的 manifest', async () => {
    const manifest = await client.getLocalManifest(ASSETS_DIR, 'core-engineering')
    expect(manifest).not.toBeNull()
    expect(manifest!.name).toBe('core-engineering')
    expect(manifest!.type).toBe('rules')
    expect(manifest!.layer).toBe('core')
  })

  it('获取不存在的包返回 null', async () => {
    const manifest = await client.getLocalManifest(ASSETS_DIR, 'nonexistent-package')
    expect(manifest).toBeNull()
  })

  it('获取本地包的内容文件路径', async () => {
    const files = await client.getLocalContentPaths(ASSETS_DIR, 'core-engineering')
    expect(files.length).toBeGreaterThan(0)
    expect(files[0]).toContain('coding-standards.md')
  })
})
