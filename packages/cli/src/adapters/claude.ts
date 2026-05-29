import type { Adapter, AdapterOutput, AdapterInput, ContentFile } from '@coder-2100/schema'
import { CLAUDE_CODE_CAPABILITIES } from './types'
import { buildIndex } from '../engine/index-builder'
import type { ExtractedContent } from '../engine/content-extraction'

export class ClaudeCodeAdapter implements Adapter {
  name = 'claude-code' as const
  capabilities = CLAUDE_CODE_CAPABILITIES

  render(
    input: AdapterInput,
    contents: ExtractedContent[],
    projectName: string,
  ): AdapterOutput {
    const indexContent = `# Project Context\n\n${buildIndex({
      contents,
      task: input.task,
      projectName,
      runtimeDir: '.ai/runtime',
    })}`

    const files: ContentFile[] = contents.map((c) => ({
      type: c.type,
      id: c.id,
      name: c.name,
      path: `.ai/runtime/${c.type}s/${c.id}.md`,
      content: c.content,
      appliesTo: c.appliesTo,
      priority: c.priority,
    }))

    const instructions: string[] = [
      `索引文件已写入 CLAUDE.md`,
      `内容文件已写入 .ai/runtime/ 目录`,
      `运行 \`ai-context build\` 重新生成索引`,
    ]

    return {
      index: {
        content: indexContent,
        path: 'CLAUDE.md',
      },
      files,
      instructions,
    }
  }
}
