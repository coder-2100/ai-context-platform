import type { ToolCapabilities } from '@coder-2100/schema'

export const CLAUDE_CODE_CAPABILITIES: ToolCapabilities = {
  maxTokens: 200000,
  supportsMultiFile: true,
  supportsImages: true,
  indexFileLocation: 'CLAUDE.md',
  contentDirLocation: '.ai/runtime/',
  contextFileFormat: 'index-plus-files',
}

export const CODEX_CAPABILITIES: ToolCapabilities = {
  maxTokens: 32000,
  supportsMultiFile: true,
  supportsImages: false,
  indexFileLocation: 'AGENTS.md',
  contentDirLocation: '.ai/runtime/',
  contextFileFormat: 'index-plus-files',
}

export const TRAE_CAPABILITIES: ToolCapabilities = {
  maxTokens: 64000,
  supportsMultiFile: true,
  supportsImages: true,
  indexFileLocation: '.trae/rules/',
  contentDirLocation: '.trae/',
  contextFileFormat: 'multi-md',
}

export const GEMINI_CAPABILITIES: ToolCapabilities = {
  maxTokens: 128000,
  supportsMultiFile: true,
  supportsImages: true,
  indexFileLocation: 'GEMINI.md',
  contentDirLocation: '.ai/runtime/',
  contextFileFormat: 'index-plus-files',
}

export type ToolName = 'claude-code' | 'codex' | 'trae' | 'gemini'

export function getCapabilities(tool: ToolName): ToolCapabilities {
  switch (tool) {
    case 'claude-code': return CLAUDE_CODE_CAPABILITIES
    case 'codex': return CODEX_CAPABILITIES
    case 'trae': return TRAE_CAPABILITIES
    case 'gemini': return GEMINI_CAPABILITIES
  }
}
