import { maxSatisfying } from "semver";

/** NpmRegistryClient 构造选项 */
export interface NpmRegistryClientOptions {
  /** npm registry 地址 */
  registry: string;
}

/** 版本解析结果 */
export interface ResolvedVersion {
  /** 匹配的版本号 */
  version: string;
  /** tarball 下载 URL */
  tarballUrl: string;
  /** tarball 的 SHA-1 校验和 */
  shasum: string;
}

/** npm 包元数据中的版本信息 */
interface NpmVersionMeta {
  dist: {
    tarball: string;
    shasum: string;
    integrity?: string;
  };
}

/** npm registry API 返回的包元数据 */
export interface NpmPackageMetadata {
  "dist-tags": Record<string, string>;
  versions: Record<string, NpmVersionMeta>;
}

/** npm registry 客户端：从 registry 获取包元数据、解析版本、下载 tarball */
export class NpmRegistryClient {
  private registry: string;

  constructor(options: NpmRegistryClientOptions) {
    this.registry = options.registry.replace(/\/$/, "");
  }

  /** 获取包的完整元数据（所有版本、dist-tags） */
  async fetchPackageMetadata(name: string): Promise<NpmPackageMetadata> {
    const encodedName = encodeURIComponent(name);
    const url = `${this.registry}/${encodedName}`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`包 ${name} 未找到`);
      }
      throw new Error(`获取包 ${name} 元数据失败: HTTP ${response.status}`);
    }
    return (await response.json()) as NpmPackageMetadata;
  }

  /** 解析满足 semver range 的最高版本 */
  async resolveVersion(name: string, range: string | null): Promise<ResolvedVersion> {
    const metadata = await this.fetchPackageMetadata(name);

    if (!range) {
      const latest = metadata["dist-tags"]?.latest;
      if (!latest) {
        throw new Error(`包 ${name} 没有 latest 版本`);
      }
      const versionMeta = metadata.versions[latest];
      if (!versionMeta) {
        throw new Error(`包 ${name} 版本 ${latest} 元数据缺失`);
      }
      return {
        version: latest,
        tarballUrl: versionMeta.dist.tarball,
        shasum: versionMeta.dist.shasum,
      };
    }

    const availableVersions = Object.keys(metadata.versions);
    const matched = maxSatisfying(availableVersions, range, { includePrerelease: true });
    if (!matched) {
      throw new Error(
        `包 ${name} 没有满足 ${range} 的版本，可用版本: ${availableVersions.slice(-5).join(", ")}`,
      );
    }
    const versionMeta = metadata.versions[matched];
    return {
      version: matched,
      tarballUrl: versionMeta.dist.tarball,
      shasum: versionMeta.dist.shasum,
    };
  }

  /** 下载 tarball 并返回二进制内容 */
  async fetchTarball(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`下载 tarball 失败: HTTP ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
