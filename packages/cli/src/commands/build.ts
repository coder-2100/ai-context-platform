import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { PackageManager } from '../core/package-manager'
import { RegistryClient } from '../core/registry-client'
import { extractContent } from '../engine/content-extraction'
import { writeIndexFile } from '../engine/index-builder'
import { ClaudeCodeAdapter } from '../adapters/claude'
import { getCapabilities, type ToolName } from '../adapters/types'
import chalk from 'chalk'
import ora from 'ora'
import type { ResolvedPackage } from '@coder-2100/schema'

export interface BuildOptions {
  projectDir: string
  task: string
  tool: ToolName
  assetsDir: string
  dryRun?: boolean
  verbose?: boolean
}

export async function buildCommand(options: BuildOptions): Promise<void> {
  const spinner = ora('Building runtime context...').start()

  try {
    const registry = new RegistryClient({ scope: '@coder-2100', registry: 'https://registry.npmjs.org' })
    const pm = new PackageManager({
      projectDir: options.projectDir,
      assetsDir: options.assetsDir,
      registry,
      cliVersion: '0.1.0',
    })

    pm.loadExisting()
    const installedPackages = pm.list() as ResolvedPackage[]

    if (installedPackages.length === 0) {
      spinner.warn('没有已安装的包。运行 ai-context add 安装包。')
      return
    }

    // 提取所有内容
    const allContents = []
    for (const pkg of installedPackages) {
      const shortName = pkg.name.replace(/^@coder-2100\//, '')
      const contents = await extractContent(options.assetsDir, shortName)
      allContents.push(...contents)
    }

    // 使用 adapter 渲染输出
    const capabilities = getCapabilities(options.tool)
    const adapter = new ClaudeCodeAdapter()
    const config = pm.getConfig()
    const output = adapter.render(
      {
        task: options.task,
        packages: installedPackages,
        rules: [],
        skills: [],
        agents: [],
        domains: [],
        playbooks: [],
        indexBudget: config.budget.perTool[options.tool]?.indexBudget || config.budget.indexBudget,
        contentBudget: 10000,
        toolCapabilities: capabilities,
      },
      allContents,
      config.project.name,
    )

    if (options.dryRun) {
      spinner.stop()
      console.log(chalk.cyan('[dry-run]') + ' 将生成的索引内容：')
      console.log(output.index.content)
      console.log(chalk.cyan('[dry-run]') + ` 将写入 ${output.files.length} 个内容文件：`)
      for (const f of output.files) {
        console.log(`  ${f.path}`)
      }
      return
    }

    // 写入内容文件
    for (const file of output.files) {
      const fullPath = join(options.projectDir, file.path)
      const dir = join(fullPath, '..')
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
      writeFileSync(fullPath, file.content, 'utf-8')
    }

    // 写入索引文件
    const indexPath = join(options.projectDir, output.index.path)
    writeIndexFile(indexPath, output.index.content)

    spinner.succeed('Build 完成')
    for (const instruction of output.instructions) {
      console.log(chalk.dim(`  ${instruction}`))
    }
    if (options.verbose) {
      console.log(chalk.dim(`\n  写入 ${output.files.length} 个内容文件`))
      console.log(chalk.dim(`  索引文件: ${output.index.path}`))
    }
  } catch (err) {
    spinner.fail('Build 失败')
    throw err
  }
}
