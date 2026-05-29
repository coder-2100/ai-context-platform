import { PackageManager } from '../core/package-manager'
import { RegistryClient } from '../core/registry-client'
import chalk from 'chalk'

/** remove 命令的选项 */
export interface RemoveOptions {
  projectDir: string
  packageName: string
  assetsDir: string
}

/** 移除已安装的知识资产包，更新 config.yaml 和 lock.yaml */
export async function removeCommand(options: RemoveOptions): Promise<void> {
  const registry = new RegistryClient({ scope: '@coder-2100', registry: 'https://registry.npmjs.org' })
  const pm = new PackageManager({
    projectDir: options.projectDir,
    assetsDir: options.assetsDir,
    registry,
    cliVersion: '0.1.0',
  })

  pm.loadExisting()
  await pm.remove(options.packageName)
  console.log(chalk.red('  -') + ` ${options.packageName}`)
  console.log(`\n已更新 ${chalk.cyan('.ai/config.yaml')} 和 ${chalk.cyan('.ai/lock.yaml')}`)
  console.log(`运行 ${chalk.yellow('ai-context build')} 重新生成运行时上下文。`)
}
