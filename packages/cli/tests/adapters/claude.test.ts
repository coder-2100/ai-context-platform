import { describe, it, expect } from 'vitest'
import { ClaudeCodeAdapter } from '../../src/adapters/claude'
import type { AdapterInput } from '@coder-2100/schema'
import type { ExtractedContent } from '../../src/engine/content-extraction'

const mockContents: ExtractedContent[] = [
  {
    type: 'rule',
    id: 'core-coding-standards',
    name: 'Core Coding Standards',
    content: '# Core Coding Standards\n\n- Prefer composition over inheritance\n- Small functions',
    priority: 'high',
    appliesTo: ['review', 'implement'],
    sourcePath: 'rules/coding-standards.md',
  },
  {
    type: 'skill',
    id: 'react-review-skill',
    name: 'React Review Skill',
    content: '# React Review Skill\n\nFocus on rendering performance.',
    priority: 'medium',
    appliesTo: ['review'],
    sourcePath: 'skills/react-review.md',
  },
]

describe('ClaudeCodeAdapter', () => {
  const adapter = new ClaudeCodeAdapter()

  it('name 为 claude-code', () => {
    expect(adapter.name).toBe('claude-code')
  })

  it('capabilities 返回 Claude Code 工具能力', () => {
    const caps = adapter.capabilities
    expect(caps.maxTokens).toBe(200000)
    expect(caps.indexFileLocation).toBe('CLAUDE.md')
    expect(caps.contentDirLocation).toBe('.ai/runtime/')
    expect(caps.contextFileFormat).toBe('index-plus-files')
    expect(caps.supportsMultiFile).toBe(true)
  })

  it('render 生成索引层和内容层', () => {
    const input: AdapterInput = {
      task: 'review',
      packages: [{
        name: '@coder-2100/core-engineering',
        version: '1.0.0',
        manifest: {
          schemaVersion: '1',
          name: 'core-engineering',
          version: '1.0.0',
          type: 'rules',
          layer: 'core',
          description: '通用工程编码规范',
          entry: { rules: [], skills: [], agents: [], domains: [], playbooks: [], templates: [] },
        },
      }],
      rules: [],
      skills: [],
      agents: [],
      domains: [],
      playbooks: [],
      indexBudget: 3000,
      contentBudget: 10000,
      toolCapabilities: adapter.capabilities,
    }

    const output = adapter.render(input, mockContents, 'my-project')
    expect(output.index.path).toBe('CLAUDE.md')
    expect(output.index.content).toContain('Project Context')
    expect(output.files).toHaveLength(2)
    expect(output.files[0].type).toBe('rule')
    expect(output.files[0].id).toBe('core-coding-standards')
    expect(output.files[0].path).toBe('.ai/runtime/rules/core-coding-standards.md')
    expect(output.files[1].type).toBe('skill')
    expect(output.files[1].path).toBe('.ai/runtime/skills/react-review-skill.md')
    expect(output.instructions.length).toBeGreaterThan(0)
  })

  it('空内容时生成默认索引', () => {
    const input: AdapterInput = {
      task: 'review',
      packages: [],
      rules: [],
      skills: [],
      agents: [],
      domains: [],
      playbooks: [],
      indexBudget: 3000,
      contentBudget: 10000,
      toolCapabilities: adapter.capabilities,
    }

    const output = adapter.render(input, [], 'my-project')
    expect(output.index.content).toContain('No packages installed yet')
    expect(output.files).toHaveLength(0)
  })
})
