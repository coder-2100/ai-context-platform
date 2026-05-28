import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { validateManifest } from "../packages/schema/src/validate-manifest.js";

const __dirname = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const assetsDir = resolve(__dirname, "packages", "assets");
let hasErrors = false;

try {
  const assetDirs = readdirSync(assetsDir, { withFileTypes: true }).filter(
    (d) => d.isDirectory(),
  );

  for (const dir of assetDirs) {
    const manifestPath = resolve(assetsDir, dir.name, "manifest.yaml");
    try {
      const content = readFileSync(manifestPath, "utf-8");
      const data = parseYaml(content);
      const result = validateManifest(data);
      if (result.success) {
        console.log(`✓ ${dir.name}/manifest.yaml`);
      } else {
        console.error(`✗ ${dir.name}/manifest.yaml`);
        for (const error of result.errors) {
          console.error(`  - ${error}`);
        }
        hasErrors = true;
      }
    } catch (err) {
      console.error(`✗ ${dir.name}/manifest.yaml — 读取失败: ${err}`);
      hasErrors = true;
    }
  }
} catch {
  console.log("未找到 packages/assets/ 目录，跳过 manifest 验证。");
}

if (hasErrors) {
  process.exit(1);
}
