import { checkbox, select } from '@inquirer/prompts'
import { PackageManager } from '../core/package-manager'
import { RegistryClient } from '../core/registry-client'
import { filterCatalog, groupCatalogByLayer, groupCatalogByType, type CatalogPackage } from '../core/catalog'
import chalk from 'chalk'

/** browse 命令的选项 */
export interface BrowseOptions {
  projectDir: string
  assetsDir: string
  layer?: string
  type?: string
  tag?: string
}

/** 浏览可用知识资产包，支持按 layer/type/tag 筛选，交互式选择并安装 */
export async function browseCommand(options: BrowseOptions): Promise<void> {
  const registry = new RegistryClient({ scope: '@coder-2100', registry: 'https://registry.npmjs.org' })
  const pm = new PackageManager({
    projectDir: options.projectDir,
    assetsDir: options.assetsDir,
    registry,
    cliVersion: '0.1.0',
  })

  const catalog = await registry.scanLocalAssets(options.assetsDir)
  if (catalog.length === 0) {
    console.log(chalk.yellow('没有可用的包。'))
    return
  }

  // 如果指定了过滤条件，直接进入选择
  if (options.layer || options.type || options.tag) {
    const filtered = filterCatalog(catalog, {
      layer: options.layer as any,
      type: options.type as any,
      tag: options.tag,
    })
    await selectAndInstall(pm, filtered)
    return
  }

  // 否则提供分类浏览
  const browseMode = await select({
    message: 'Browse by:',
    choices: [
      { name: 'All packages', value: 'all' },
      { name: 'By Layer', value: 'layer' },
      { name: 'By Type', value: 'type' },
    ],
  })

  if (browseMode === 'all') {
    await selectAndInstall(pm, catalog)
  } else if (browseMode === 'layer') {
    const groups = groupCatalogByLayer(catalog)
    const layerChoices = Object.keys(groups).map((layer) => ({
      name: `${layer} (${groups[layer].length} packages)`,
      value: layer,
    }))
    const selectedLayer = await select({ message: 'Select layer:', choices: layerChoices })
    await selectAndInstall(pm, groups[selectedLayer])
  } else if (browseMode === 'type') {
    const groups = groupCatalogByType(catalog)
    const typeChoices = Object.keys(groups).map((type) => ({
      name: `${type} (${groups[type].length} packages)`,
      value: type,
    }))
    const selectedType = await select({ message: 'Select type:', choices: typeChoices })
    await selectAndInstall(pm, groups[selectedType])
  }
}

/** 交互式选择并安装包，自动跳过已安装的包 */
async function selectAndInstall(pm: PackageManager, packages: CatalogPackage[]): Promise<void> {
  const installedNames = new Set(
    pm.isInitialized() ? pm.getConfig().packages.map((p) => p.name) : [],
  )

  if (packages.length === 0) {
    console.log(chalk.yellow('没有匹配的包。'))
    return
  }

  const choices = packages.map((pkg) => ({
    name: `${pkg.name}  ${chalk.gray(pkg.layer)}  v${pkg.version}  ${chalk.dim(pkg.description)}`,
    value: pkg.name,
    checked: installedNames.has(pkg.name),
    disabled: installedNames.has(pkg.name) ? 'installed' : false,
  }))

  const selected = await checkbox({
    message: 'Select packages to install:',
    choices,
  })

  // 过滤掉已安装的（disabled 的）
  const newPackages = selected.filter((name) => !installedNames.has(name))

  if (newPackages.length === 0) {
    console.log(chalk.yellow('没有新包需要安装。'))
    return
  }

  pm.loadExisting()
  const installed = await pm.add(newPackages)
  for (const name of installed) {
    console.log(chalk.green('  +') + ` ${name}`)
  }
  console.log(`\n已更新 ${chalk.cyan('.ai/config.yaml')} 和 ${chalk.cyan('.ai/lock.yaml')}`)
  console.log(`运行 ${chalk.yellow('ai-context build')} 生成运行时上下文。`)
}
