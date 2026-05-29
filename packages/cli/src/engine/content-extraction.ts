import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'
import type { Priority } from '@coder-2100/schema'
import { RegistryClient } from '../core/registry-client'

export interface ExtractedContent {
  type: 'rule' | 'skill' | 'agent' | 'domain' | 'playbook'
  id: string
  name: string
  content: string
  priority: Priority
  appliesTo: string[]
  sourcePath: string
}

export interface ParsedFrontmatter {
  frontmatter: Record<string, unknown>
  body: string
}

export function parseFrontmatter(content: string): ParsedFrontmatter {
  const parsed = matter(content)
  return {
    frontmatter: parsed.data as Record<string, unknown>,
    body: parsed.content,
  }
}

const ENTRY_TYPE_MAP: Record<string, ExtractedContent['type']> = {
  rules: 'rule',
  skills: 'skill',
  agents: 'agent',
  domains: 'domain',
  playbooks: 'playbook',
}

export async function extractContent(
  assetsDir: string,
  packageName: string,
): Promise<ExtractedContent[]> {
  const registry = new RegistryClient({ scope: '@coder-2100', registry: '' })
  const manifest = await registry.getLocalManifest(assetsDir, packageName)
  if (!manifest) return []

  const pkgDir = join(assetsDir, packageName)
  const results: ExtractedContent[] = []

  for (const [entryType, entries] of Object.entries(manifest.entry)) {
    const contentType = ENTRY_TYPE_MAP[entryType]
    if (!contentType) continue

    for (const entryPath of entries) {
      const fullPath = join(pkgDir, entryPath)
      if (!existsSync(fullPath)) continue

      const rawContent = readFileSync(fullPath, 'utf-8')
      const { frontmatter, body } = parseFrontmatter(rawContent)

      const id = (frontmatter.id as string) || entryPath.replace(/\.md$/, '').split('/').pop()!
      const priority = (frontmatter.priority as Priority) || 'medium'
      const appliesTo = (frontmatter.appliesTo as string[]) || []
      const name = id.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

      results.push({
        type: contentType,
        id,
        name,
        content: body.trim(),
        priority,
        appliesTo,
        sourcePath: entryPath,
      })
    }
  }

  return results
}
