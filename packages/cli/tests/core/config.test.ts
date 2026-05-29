import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadConfig, saveConfig, createDefaultConfig, findConfigFile } from '../../src/core/config'
import type { Config } from '@coder-2100/schema'

const TEST_DIR = join(import.meta.dirname, '__test_config__')

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true })
})

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true })
})

describe('createDefaultConfig', () => {
  it('创建包含项目名的默认配置', () => {
    const config = createDefaultConfig('my-project')
    expect(config.project).toBe('my-project')
    expect(config.packages).toEqual([])
    expect(config.tooling['claude-code'].enabled).toBe(true)
    expect(config.tooling.codex.enabled).toBe(true)
    expect(config.tooling.trae.enabled).toBe(false)
    expect(config.tooling.gemini.enabled).toBe(false)
    expect(config.budget.indexBudget).toBe(3000)
  })
})

describe('saveConfig + loadConfig', () => {
  it('保存并加载 config.yaml', () => {
    const config = createDefaultConfig('test-project')
    config.packages = [{ name: '@coder-2100/core-engineering', version: '^1.0.0' }]
    const configPath = join(TEST_DIR, 'config.yaml')
    saveConfig(configPath, config)
    const loaded = loadConfig(configPath)
    expect(loaded.project).toBe('test-project')
    expect(loaded.packages).toHaveLength(1)
    expect(loaded.packages[0].name).toBe('@coder-2100/core-engineering')
  })

  it('加载不存在的文件时抛出错误', () => {
    expect(() => loadConfig(join(TEST_DIR, 'nonexistent.yaml'))).toThrow()
  })

  it('加载无效的 YAML 时抛出验证错误', () => {
    const configPath = join(TEST_DIR, 'config.yaml')
    writeFileSync(configPath, 'invalid: {broken')
    expect(() => loadConfig(configPath)).toThrow()
  })

  it('加载缺少必填字段时抛出验证错误', () => {
    const configPath = join(TEST_DIR, 'config.yaml')
    writeFileSync(configPath, 'description: "no project name"')
    expect(() => loadConfig(configPath)).toThrow()
  })
})

describe('findConfigFile', () => {
  it('在指定目录下找到 .ai/config.yaml', () => {
    const aiDir = join(TEST_DIR, '.ai')
    mkdirSync(aiDir, { recursive: true })
    const config = createDefaultConfig('found-project')
    saveConfig(join(aiDir, 'config.yaml'), config)
    const found = findConfigFile(TEST_DIR)
    expect(found).toBe(join(aiDir, 'config.yaml'))
  })

  it('未找到时返回 null', () => {
    const found = findConfigFile(TEST_DIR)
    expect(found).toBeNull()
  })
})
