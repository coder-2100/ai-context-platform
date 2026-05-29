import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { PackageManager } from '../core/package-manager'
import { RegistryClient } from '../core/registry-client'
import { writeIndexFile } from '../engine/index-builder'
import chalk from 'chalk'

export interface InitOptions {
  projectDir: string
  projectName: string
  assetsDir?: string
}

export async function initCommand(options: InitOptions): Promise<void> {
  const aiDir = join(options.projectDir, '.ai')
  if (existsSync(join(aiDir, 'config.yaml'))) {
    throw new Error('项目已初始化。如需重新初始化，请先删除 .ai/ 目录。')
  }

  const assetsDir = options.assetsDir || findAssetsDir()
  const registry = new RegistryClient({ scope: '@coder-2100', registry: 'https://registry.npmjs.org' })
  const pm = new PackageManager({
    projectDir: options.projectDir,
    assetsDir,
    registry,
    cliVersion: '0.1.0',
  })

  await pm.init(options.projectName)

  // 创建 CLAUDE.md 标记区域
  const claudeMdPath = join(options.projectDir, 'CLAUDE.md')
  writeIndexFile(claudeMdPath, `No packages installed yet. Run \`ai-context add\` or \`ai-context browse\` to get started.`)

  console.log(chalk.green('✓ 项目已初始化'))
  console.log(`  创建 ${chalk.cyan('.ai/')} 目录结构`)
  console.log(`  创建 ${chalk.cyan('CLAUDE.md')} 索引文件`)
  console.log(`\n运行 ${chalk.yellow('ai-context add')} 安装知识资产包`)
}

function findAssetsDir(): string {
  // MVP 阶段：使用 monorepo 内的 assets 目录
  // 从 CLI 包向上查找 assets 目录
  const cliDir = import.meta.dirname
  const monorepoRoot = join(cliDir, '..', '..', '..')
  const assetsDir = join(monorepoRoot, 'packages', 'assets')
  if (existsSync(assetsDir)) return assetsDir
  throw new Error('未找到资产包目录。请使用 --assets-dir 指定路径。')
}

export { findAssetsDir }
