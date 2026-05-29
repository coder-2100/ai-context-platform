import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

/** 同步结果 */
interface SyncResult {
  /** 包名 */
  package: string;
  /** 同步状态 */
  status: "synced" | "updated" | "skipped" | "error";
  /** package.json 版本 */
  packageJsonVersion?: string;
  /** manifest.yaml 版本（同步前） */
  manifestVersion?: string;
  /** 附加信息 */
  message?: string;
}

/**
 * 扫描资产包并同步 manifest.yaml 版本
 * 以 package.json#version 为 source of truth
 */
function syncManifestVersions(): SyncResult[] {
  const results: SyncResult[] = [];
  const assetsDir = resolve(rootDir, "packages", "assets");

  let dirs: string[];
  try {
    dirs = readdirSync(assetsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    console.log("未找到 packages/assets/ 目录，跳过 manifest 版本同步。");
    return results;
  }

  for (const dir of dirs) {
    const pkgPath = resolve(assetsDir, dir, "package.json");
    const manifestPath = resolve(assetsDir, dir, "manifest.yaml");
    const pkgName = `@coder-2100/${dir}`;

    // 读取 package.json 版本
    let pkgVersion: string;
    try {
      const pkgJson = JSON.parse(readFileSync(pkgPath, "utf-8"));
      pkgVersion = pkgJson.version;
    } catch {
      results.push({
        package: pkgName,
        status: "error",
        message: "package.json 未找到或无法读取",
      });
      continue;
    }

    // 读取 manifest.yaml
    let manifestContent: string;
    let manifest: Record<string, unknown>;
    try {
      manifestContent = readFileSync(manifestPath, "utf-8");
      manifest = parseYaml(manifestContent);
    } catch {
      results.push({
        package: pkgName,
        status: "skipped",
        packageJsonVersion: pkgVersion,
        message: "manifest.yaml 未找到或无法读取，跳过",
      });
      continue;
    }

    const manifestVersion = String(manifest.version);

    // 版本一致，无需同步
    if (pkgVersion === manifestVersion) {
      results.push({
        package: pkgName,
        status: "synced",
        packageJsonVersion: pkgVersion,
        manifestVersion,
      });
      continue;
    }

    // 版本不一致，同步 manifest.yaml
    manifest.version = pkgVersion;
    const updatedContent = stringifyYaml(manifest, {
      lineWidth: 0, // 不自动换行
      singleQuote: false,
    });

    try {
      writeFileSync(manifestPath, updatedContent, "utf-8");
      results.push({
        package: pkgName,
        status: "updated",
        packageJsonVersion: pkgVersion,
        manifestVersion,
        message: `manifest.yaml: ${manifestVersion} → ${pkgVersion}`,
      });
    } catch {
      results.push({
        package: pkgName,
        status: "error",
        packageJsonVersion: pkgVersion,
        manifestVersion,
        message: "写入 manifest.yaml 失败",
      });
    }
  }

  return results;
}

const results = syncManifestVersions();

if (results.length === 0) {
  process.exit(0);
}

let hasErrors = false;
let hasUpdates = false;

for (const r of results) {
  switch (r.status) {
    case "synced":
      console.log(`  ✓ ${r.package} — v${r.packageJsonVersion} (已同步)`);
      break;
    case "updated":
      console.log(`  ↑ ${r.package} — ${r.message}`);
      hasUpdates = true;
      break;
    case "skipped":
      console.log(`  - ${r.package} — ${r.message}`);
      break;
    case "error":
      console.error(`  ✗ ${r.package} — ${r.message}`);
      hasErrors = true;
      break;
  }
}

if (hasUpdates) {
  console.log("\nmanifest.yaml 版本已同步。请将变更纳入本次 commit。");
}

if (hasErrors) {
  process.exit(1);
}
