import { readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse as parseYaml } from 'yaml'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')

interface SyncResult {
  package: string
  status: 'ok' | 'mismatch' | 'error'
  packageJsonVersion?: string
  manifestVersion?: string
  message?: string
}

function syncAssetPackages(): SyncResult[] {
  const results: SyncResult[] = []
  const assetsDir = resolve(rootDir, 'packages', 'assets')

  let dirs: string[]
  try {
    dirs = readdirSync(assetsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
  } catch {
    console.log('未找到 packages/assets/ 目录，跳过版本同步。')
    return results
  }

  for (const dir of dirs) {
    const pkgPath = resolve(assetsDir, dir, 'package.json')
    const manifestPath = resolve(assetsDir, dir, 'manifest.yaml')
    const pkgName = `@ai-context/${dir}`

    try {
      const pkgJson = JSON.parse(readFileSync(pkgPath, 'utf-8'))
      const pkgVersion = pkgJson.version

      try {
        const manifestContent = readFileSync(manifestPath, 'utf-8')
        const manifest = parseYaml(manifestContent)
        const manifestVersion = manifest.version

        if (pkgVersion === manifestVersion) {
          results.push({ package: pkgName, status: 'ok', packageJsonVersion: pkgVersion, manifestVersion })
        } else {
          results.push({
            package: pkgName,
            status: 'mismatch',
            packageJsonVersion: pkgVersion,
            manifestVersion,
            message: `package.json=${pkgVersion}, manifest.yaml=${manifestVersion}`,
          })
        }
      } catch {
        results.push({ package: pkgName, status: 'error', message: 'manifest.yaml 未找到或无法读取' })
      }
    } catch {
      results.push({ package: pkgName, status: 'error', message: 'package.json 未找到或无法读取' })
    }
  }

  return results
}

const results = syncAssetPackages()

if (results.length === 0) {
  process.exit(0)
}

let hasErrors = false
for (const r of results) {
  if (r.status === 'ok') {
    console.log(`✓ ${r.package} — v${r.packageJsonVersion}`)
  } else if (r.status === 'mismatch') {
    console.error(`✗ ${r.package} — 版本不匹配: ${r.message}`)
    hasErrors = true
  } else {
    console.error(`✗ ${r.package} — ${r.message}`)
    hasErrors = true
  }
}

if (hasErrors) {
  process.exit(1)
}
