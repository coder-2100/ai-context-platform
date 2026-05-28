import { describe, it, expect } from 'vitest'
import type {
  IndexOutput,
  ContentFile,
  AdapterOutput,
  AdapterInput,
  ToolCapabilities,
  Adapter,
} from '../src/adapter'
import { ToolCapabilitiesSchema, AdapterOutputSchema } from '../src/adapter'

describe('ToolCapabilitiesSchema', () => {
  it('接受有效的 claude-code capabilities', () => {
    const result = ToolCapabilitiesSchema.safeParse({
      maxTokens: 200000,
      supportsMultiFile: true,
      supportsImages: true,
      indexFileLocation: 'CLAUDE.md',
      contentDirLocation: '.ai/runtime/',
      contextFileFormat: 'index-plus-files',
    })
    expect(result.success).toBe(true)
  })

  it('拒绝无效的 contextFileFormat', () => {
    const result = ToolCapabilitiesSchema.safeParse({
      maxTokens: 200000,
      supportsMultiFile: true,
      supportsImages: true,
      indexFileLocation: 'CLAUDE.md',
      contentDirLocation: '.ai/runtime/',
      contextFileFormat: 'invalid',
    })
    expect(result.success).toBe(false)
  })

  it('拒绝负数 maxTokens', () => {
    const result = ToolCapabilitiesSchema.safeParse({
      maxTokens: -1,
      supportsMultiFile: true,
      supportsImages: true,
      indexFileLocation: 'CLAUDE.md',
      contentDirLocation: '.ai/runtime/',
      contextFileFormat: 'index-plus-files',
    })
    expect(result.success).toBe(false)
  })
})

describe('AdapterOutputSchema', () => {
  it('接受有效的输出', () => {
    const result = AdapterOutputSchema.safeParse({
      index: {
        content: '# Project Context',
        path: 'CLAUDE.md',
      },
      files: [
        {
          type: 'rule',
          id: 'react-hooks',
          name: 'React Hooks',
          path: '.ai/runtime/rules/react-hooks.md',
          content: '# React Hooks Rules',
          appliesTo: ['review', 'implement'],
          priority: 'high',
        },
      ],
      instructions: ['运行 ai-context build 重新生成'],
    })
    expect(result.success).toBe(true)
  })

  it('接受空的 files 数组', () => {
    const result = AdapterOutputSchema.safeParse({
      index: { content: '', path: 'CLAUDE.md' },
      files: [],
      instructions: [],
    })
    expect(result.success).toBe(true)
  })
})
