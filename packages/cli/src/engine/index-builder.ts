import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { ExtractedContent } from './content-extraction'
import { PRIORITY_WEIGHTS } from '@coder-2100/schema'

/** 索引文件中托管内容的起始标记 */
export const MARKER_START = '<!-- AI-CONTEXT:INDEX:START -->'
/** 索引文件中托管内容的结束标记 */
export const MARKER_END = '<!-- AI-CONTEXT:INDEX:END -->'

/** 构建索引的选项 */
export interface BuildIndexOptions {
  contents: ExtractedContent[]
  task: string
  projectName: string
  runtimeDir: string
}

/** 根据内容列表构建结构化索引，包含 Core Rules、Current Task 和 Available Resources 三个区域 */
export function buildIndex(options: BuildIndexOptions): string {
  const { contents, task, projectName, runtimeDir } = options

  if (contents.length === 0) {
    return `No packages installed yet. Run \`ai-context add\` or \`ai-context browse\` to get started.`
  }

  const lines: string[] = []

  // Core rules section (critical + high priority rules)
  const coreRules = contents
    .filter((c) => c.type === 'rule' && (c.priority === 'critical' || c.priority === 'high'))
    .sort((a, b) => PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority])

  if (coreRules.length > 0) {
    lines.push('## Core Rules')
    for (const rule of coreRules) {
      lines.push(`- ${extractRuleSummary(rule.content)}`)
    }
    lines.push('')
  }

  // Current task section
  const taskContents = contents.filter(
    (c) => c.appliesTo.length === 0 || c.appliesTo.includes(task),
  )
  const priorityResources = taskContents
    .filter((c) => PRIORITY_WEIGHTS[c.priority] >= 50)
    .sort((a, b) => PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority])
  const referenceResources = taskContents.filter(
    (c) => PRIORITY_WEIGHTS[c.priority] < 50,
  )

  lines.push(`## Current Task: ${task}`)
  lines.push('')
  if (priorityResources.length > 0) {
    lines.push('Priority resources for this task (read first):')
    for (const r of priorityResources) {
      lines.push(
        `- **${r.name}** (${r.type}) — ${runtimeDir}/${r.type}s/${r.id}.md`,
      )
    }
    lines.push('')
  }
  if (referenceResources.length > 0) {
    lines.push('Reference resources (read if needed):')
    for (const r of referenceResources) {
      lines.push(
        `- **${r.name}** — ${runtimeDir}/${r.type}s/${r.id}.md`,
      )
    }
    lines.push('')
  }

  // Full resource index
  lines.push('## Available Resources')
  lines.push('')
  lines.push('When performing specific tasks, read the relevant files below for detailed guidance.')
  lines.push('')

  const grouped = groupByType(contents)
  const typeLabels: Record<string, string> = {
    rule: 'Rules',
    skill: 'Skills',
    agent: 'Agents',
    domain: 'Domains',
    playbook: 'Playbooks',
  }

  for (const [type, items] of Object.entries(grouped)) {
    const label = typeLabels[type] || type
    lines.push(`### ${label}`)
    for (const item of items) {
      const desc = extractDescription(item.content)
      lines.push(
        `- **${item.name}** — ${runtimeDir}/${type}s/${item.id}.md${desc ? ` — ${desc}` : ''}`,
      )
    }
    lines.push('')
  }

  return lines.join('\n').trim()
}

/** 将生成的内容写入索引文件，自动处理标记区域的新增和替换 */
export function writeIndexFile(filePath: string, generatedContent: string): void {
  const dir = dirname(filePath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  if (!existsSync(filePath)) {
    const content = `# Project Context\n\n${MARKER_START}\n<!-- Managed by ai-context. Do not edit between START and END markers. -->\n<!-- Run \`ai-context build\` to update this section. -->\n\n${generatedContent}\n\n${MARKER_END}\n`
    writeFileSync(filePath, content, 'utf-8')
    return
  }

  const existing = readFileSync(filePath, 'utf-8')
  const startIdx = existing.indexOf(MARKER_START)
  const endIdx = existing.indexOf(MARKER_END)

  if (startIdx === -1 || endIdx === -1) {
    const content = `${existing}\n\n${MARKER_START}\n${generatedContent}\n${MARKER_END}\n`
    writeFileSync(filePath, content, 'utf-8')
    return
  }

  const header = existing.slice(0, startIdx)
  const footer = existing.slice(endIdx + MARKER_END.length)
  const content = `${header}${MARKER_START}\n${generatedContent}\n${MARKER_END}${footer}`
  writeFileSync(filePath, content, 'utf-8')
}

/** 从规则内容中提取首行摘要 */
function extractRuleSummary(content: string): string {
  const lines = content.split('\n').filter((l) => l.trim() && !l.startsWith('#'))
  return lines[0]?.replace(/^[-*]\s*/, '').trim() || ''
}

/** 从内容中提取首段描述文本，截断至 80 字符 */
function extractDescription(content: string): string {
  const lines = content.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('---')) {
      return trimmed.replace(/^[-*]\s*/, '').slice(0, 80)
    }
  }
  return ''
}

/** 按内容类型分组 */
function groupByType(
  contents: ExtractedContent[],
): Record<string, ExtractedContent[]> {
  const groups: Record<string, ExtractedContent[]> = {}
  for (const c of contents) {
    if (!groups[c.type]) groups[c.type] = []
    groups[c.type].push(c)
  }
  return groups
}
