import { readFileSync, writeFileSync } from 'node:fs'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { ConfigSchema, type Config } from '@coder-2100/schema'
import { join } from 'node:path'

export function createDefaultConfig(project: string): Config {
  return ConfigSchema.parse({
    project,
    packages: [],
  })
}

export function loadConfig(configPath: string): Config {
  const content = readFileSync(configPath, 'utf-8')
  const raw = parseYaml(content)
  const result = ConfigSchema.safeParse(raw)
  if (!result.success) {
    const errors = result.error.issues.map(
      (i) => `${i.path.join('.')}: ${i.message}`,
    )
    throw new Error(`配置文件验证失败:\n  ${errors.join('\n  ')}`)
  }
  return result.data
}

export function saveConfig(configPath: string, config: Config): void {
  const yaml = stringifyYaml(config, { lineWidth: 0 })
  writeFileSync(configPath, yaml, 'utf-8')
}

export function findConfigFile(projectDir: string): string | null {
  const configPath = join(projectDir, '.ai', 'config.yaml')
  try {
    readFileSync(configPath)
    return configPath
  } catch {
    return null
  }
}
