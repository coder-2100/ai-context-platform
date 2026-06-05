/** 包名解析结果，包含完整包名和可选的 semver 版本范围 */
export interface ParsedPackageName {
  name: string;
  range: string | null;
}

/** 包名解析器：将用户输入的包名（可能带版本范围）解析为标准格式 */
export class PackageNameParser {
  /** @param scope - npm scope 前缀，如 @coder-2100 */
  constructor(private scope: string) {}

  /** 解析包名输入，返回完整包名和版本范围 */
  parse(input: string): ParsedPackageName {
    const { name, range } = this.splitNameAndRange(input);
    const fullName = this.ensureScope(name);
    return { name: fullName, range };
  }

  /** 分离包名和版本范围，处理 @scope/name@range 格式 */
  private splitNameAndRange(input: string): { name: string; range: string | null } {
    // 如果以 @ 开头，第一个 @ 是 scope 前缀，第二个 @ 是版本分隔符
    if (input.startsWith("@")) {
      const afterScope = input.indexOf("/", 1);
      if (afterScope === -1) {
        return { name: input, range: null };
      }
      const afterName = input.indexOf("@", afterScope + 1);
      if (afterName === -1) {
        return { name: input, range: null };
      }
      return {
        name: input.slice(0, afterName),
        range: input.slice(afterName + 1) || null,
      };
    }
    // 非 scoped 包名，@ 是版本分隔符
    const atIndex = input.indexOf("@");
    if (atIndex === -1) {
      return { name: input, range: null };
    }
    return {
      name: input.slice(0, atIndex),
      range: input.slice(atIndex + 1) || null,
    };
  }

  /** 为不带 scope 的包名添加 scope 前缀 */
  private ensureScope(name: string): string {
    if (name.startsWith("@")) return name;
    return `${this.scope}/${name}`;
  }
}
