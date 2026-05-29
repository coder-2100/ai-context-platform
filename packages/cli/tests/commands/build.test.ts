import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { initCommand } from '../../src/commands/init'
import { addCommand } from '../../src/commands/add'
import { buildCommand } from '../../src/commands/build'

const TEST_DIR = join(import.meta.dirname, '__test_build__')
const ASSETS_DIR = join(import.meta.dirname, '..', '..', '..', '..', 'packages', 'assets')

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true })
})

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true })
})

describe('buildCommand', () => {
  it('生成内容文件到 .ai/runtime/', async () => {
    await initCommand({ projectDir: TEST_DIR, projectName: 'test-project', assetsDir: ASSETS_DIR })
    await addCommand({
      projectDir: TEST_DIR,
      packageNames: ['@coder-2100/core-engineering'],
      assetsDir: ASSETS_DIR,
    })
    await buildCommand({
      projectDir: TEST_DIR,
      task: 'review',
      tool: 'claude-code',
      assetsDir: ASSETS_DIR,
    })
    expect(existsSync(join(TEST_DIR, '.ai', 'runtime', 'rules', 'core-coding-standards.md'))).toBe(true)
    const content = readFileSync(join(TEST_DIR, '.ai', 'runtime', 'rules', 'core-coding-standards.md'), 'utf-8')
    expect(content).toContain('Core Coding Standards')
  })

  it('更新 CLAUDE.md 索引文件', async () => {
    await initCommand({ projectDir: TEST_DIR, projectName: 'test-project', assetsDir: ASSETS_DIR })
    await addCommand({
      projectDir: TEST_DIR,
      packageNames: ['@coder-2100/core-engineering'],
      assetsDir: ASSETS_DIR,
    })
    await buildCommand({
      projectDir: TEST_DIR,
      task: 'review',
      tool: 'claude-code',
      assetsDir: ASSETS_DIR,
    })
    expect(existsSync(join(TEST_DIR, 'CLAUDE.md'))).toBe(true)
    const content = readFileSync(join(TEST_DIR, 'CLAUDE.md'), 'utf-8')
    expect(content).toContain('core-coding-standards')
    expect(content).toContain('.ai/runtime/rules/core-coding-standards.md')
    expect(content).toContain('<!-- AI-CONTEXT:INDEX:START -->')
    expect(content).toContain('<!-- AI-CONTEXT:INDEX:END -->')
  })

  it('保留 CLAUDE.md 中标记区域外的用户内容', async () => {
    await initCommand({ projectDir: TEST_DIR, projectName: 'test-project', assetsDir: ASSETS_DIR })
    // 手动添加用户内容
    const claudeMd = join(TEST_DIR, 'CLAUDE.md')
    const original = readFileSync(claudeMd, 'utf-8')
    const userContent = `${original}\n\n## My Custom Section\nCustom content here.`
    require('node:fs').writeFileSync(claudeMd, userContent, 'utf-8')

    await addCommand({
      projectDir: TEST_DIR,
      packageNames: ['@coder-2100/core-engineering'],
      assetsDir: ASSETS_DIR,
    })
    await buildCommand({
      projectDir: TEST_DIR,
      task: 'review',
      tool: 'claude-code',
      assetsDir: ASSETS_DIR,
    })
    const content = readFileSync(claudeMd, 'utf-8')
    expect(content).toContain('## My Custom Section')
    expect(content).toContain('Custom content here.')
  })

  it('安装多个包时生成所有内容文件', async () => {
    await initCommand({ projectDir: TEST_DIR, projectName: 'test-project', assetsDir: ASSETS_DIR })
    await addCommand({
      projectDir: TEST_DIR,
      packageNames: ['@coder-2100/react-rules'],
      assetsDir: ASSETS_DIR,
    })
    await buildCommand({
      projectDir: TEST_DIR,
      task: 'review',
      tool: 'claude-code',
      assetsDir: ASSETS_DIR,
    })
    expect(existsSync(join(TEST_DIR, '.ai', 'runtime', 'rules', 'core-coding-standards.md'))).toBe(true)
    expect(existsSync(join(TEST_DIR, '.ai', 'runtime', 'rules', 'react-hooks-rules.md'))).toBe(true)
    expect(existsSync(join(TEST_DIR, '.ai', 'runtime', 'rules', 'react-components-rules.md'))).toBe(true)
    expect(existsSync(join(TEST_DIR, '.ai', 'runtime', 'skills', 'react-review-skill.md'))).toBe(true)
  })

  it('dry-run 模式不写入文件', async () => {
    await initCommand({ projectDir: TEST_DIR, projectName: 'test-project', assetsDir: ASSETS_DIR })
    await addCommand({
      projectDir: TEST_DIR,
      packageNames: ['@coder-2100/core-engineering'],
      assetsDir: ASSETS_DIR,
    })
    await buildCommand({
      projectDir: TEST_DIR,
      task: 'review',
      tool: 'claude-code',
      assetsDir: ASSETS_DIR,
      dryRun: true,
    })
    // 内容文件不应存在（dry-run 模式）
    const runtimeRules = join(TEST_DIR, '.ai', 'runtime', 'rules')
    expect(existsSync(join(runtimeRules, 'core-coding-standards.md'))).toBe(false)
  })
})
