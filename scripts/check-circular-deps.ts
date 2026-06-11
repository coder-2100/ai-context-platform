import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { detectCircularDependency } from "../packages/cli/src/core/dependency-graph.js";

const __dirname = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = resolve(__dirname, "packages", "assets");

/** 从 assets 目录构建全量依赖图 */
function buildAssetsDependencyGraph(): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();

  try {
    const assetDirs = readdirSync(assetsDir, { withFileTypes: true }).filter(
      (d) => d.isDirectory(),
    );

    for (const dir of assetDirs) {
      const manifestPath = resolve(assetsDir, dir.name, "manifest.yaml");
      try {
        const content = readFileSync(manifestPath, "utf-8");
        const data = parseYaml(content);
        const deps = new Set<string>();
        if (data.dependencies && Array.isArray(data.dependencies)) {
          for (const dep of data.dependencies) {
            if (dep.name && !dep.optional) {
              deps.add(dep.name);
            }
          }
        }
        const fullName = data.name
          ? `@coder-2100/${data.name}`
          : dir.name;
        graph.set(fullName, deps);
      } catch {
        console.error(`✗ ${dir.name}/manifest.yaml — 读取失败`);
      }
    }
  } catch {
    console.log("未找到 packages/assets/ 目录，跳过循环依赖检测。");
    return graph;
  }

  return graph;
}

console.log("检查 packages/assets/ 中的循环依赖...\n");

const graph = buildAssetsDependencyGraph();

// 打印依赖图
for (const [pkg, deps] of graph) {
  if (deps.size > 0) {
    console.log(`  ${pkg} → ${[...deps].join(", ")}`);
  }
}
console.log("");

const cycle = detectCircularDependency(graph);
if (cycle) {
  console.error(`✗ 检测到循环依赖: ${cycle.join(" → ")}`);
  process.exit(1);
}

console.log("✓ 未检测到循环依赖");
