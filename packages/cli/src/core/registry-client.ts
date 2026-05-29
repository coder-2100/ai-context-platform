import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { type Manifest, ManifestSchema } from "@coder-2100/schema";
import { parse as parseYaml } from "yaml";
import { type CatalogPackage, createCatalogFromManifests } from "./catalog";

/** 注册中心客户端构造选项 */
export interface RegistryClientOptions {
  scope: string;
  registry: string;
}

/** 注册中心客户端：从本地资产目录扫描和解析知识资产包 */
export class RegistryClient {
  private scope: string;
  private registry: string;

  constructor(options: RegistryClientOptions) {
    this.scope = options.scope;
    this.registry = options.registry;
  }

  /** 扫描本地资产目录，返回所有可用包的目录 */
  async scanLocalAssets(assetsDir: string): Promise<CatalogPackage[]> {
    if (!existsSync(assetsDir)) return [];

    const dirs = readdirSync(assetsDir, { withFileTypes: true }).filter((d) =>
      d.isDirectory(),
    );

    const manifests: Manifest[] = [];
    for (const dir of dirs) {
      const manifest = this.parseManifest(
        join(assetsDir, dir.name, "manifest.yaml"),
      );
      if (manifest) {
        manifests.push(manifest);
      }
    }

    return createCatalogFromManifests(manifests, this.scope);
  }

  /** 获取指定包的本地清单 */
  async getLocalManifest(
    assetsDir: string,
    packageName: string,
  ): Promise<Manifest | null> {
    const manifestPath = join(assetsDir, packageName, "manifest.yaml");
    return this.parseManifest(manifestPath);
  }

  /** 获取指定包的所有内容文件路径 */
  async getLocalContentPaths(
    assetsDir: string,
    packageName: string,
  ): Promise<string[]> {
    const manifest = await this.getLocalManifest(assetsDir, packageName);
    if (!manifest) return [];

    const paths: string[] = [];
    const pkgDir = join(assetsDir, packageName);
    for (const [_type, entries] of Object.entries(manifest.entry)) {
      for (const entry of entries) {
        paths.push(join(pkgDir, entry));
      }
    }
    return paths;
  }

  /** 解析并验证单个 manifest.yaml 文件 */
  parseManifest(manifestPath: string): Manifest | null {
    try {
      const content = readFileSync(manifestPath, "utf-8");
      const raw = parseYaml(content);
      const result = ManifestSchema.safeParse(raw);
      if (!result.success) return null;
      return result.data;
    } catch {
      return null;
    }
  }
}
