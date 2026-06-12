import type { Adapter, ToolCapabilities } from "@coder-2100/schema";

/** Claude Code 的工具能力配置：200k token、多文件和图片支持 */
export const CLAUDE_CODE_CAPABILITIES: ToolCapabilities = {
  maxTokens: 200000,
  supportsMultiFile: true,
  supportsImages: true,
  indexFileLocation: "CLAUDE.md",
  contentDirLocation: ".ai/runtime/",
  contextFileFormat: "index-plus-files",
};

/** Codex 的工具能力配置：32k token、多文件支持、不支持图片 */
export const CODEX_CAPABILITIES: ToolCapabilities = {
  maxTokens: 32000,
  supportsMultiFile: true,
  supportsImages: false,
  indexFileLocation: "AGENTS.md",
  contentDirLocation: ".ai/runtime/",
  contextFileFormat: "index-plus-files",
};

/** Trae 的工具能力配置：64k token、多文件和图片支持、多 md 格式（无索引文件） */
export const TRAE_CAPABILITIES: ToolCapabilities = {
  maxTokens: 64000,
  supportsMultiFile: true,
  supportsImages: true,
  // Trae 使用 multi-md 格式，无独立的索引文件，因此 indexFileLocation 留空
  indexFileLocation: "",
  contentDirLocation: ".trae/",
  contextFileFormat: "multi-md",
};

/** Gemini 的工具能力配置：128k token、回退到 Codex 格式输出 AGENTS.md */
export const GEMINI_CAPABILITIES: ToolCapabilities = {
  maxTokens: 128000,
  supportsMultiFile: true,
  supportsImages: true,
  // Gemini 回退到 Codex 适配器，索引文件与 Codex 一致
  indexFileLocation: "AGENTS.md",
  contentDirLocation: ".ai/runtime/",
  contextFileFormat: "index-plus-files",
};

/** 支持的 AI 工具名称 */
export type ToolName = "claude-code" | "codex" | "trae" | "gemini";

/** 根据工具名称获取对应的能力配置；gemini 返回回退 Codex 的配置 */
export function getCapabilities(tool: ToolName): ToolCapabilities {
  switch (tool) {
    case "claude-code":
      return CLAUDE_CODE_CAPABILITIES;
    case "codex":
      return CODEX_CAPABILITIES;
    case "trae":
      return TRAE_CAPABILITIES;
    case "gemini":
      return GEMINI_CAPABILITIES;
  }
}

/** 根据工具名称获取对应的适配器实例（异步，因为 ESM 动态导入） */
export async function getAdapter(tool: ToolName): Promise<Adapter> {
  switch (tool) {
    case "claude-code": {
      const { ClaudeCodeAdapter } = await import("./claude");
      return new ClaudeCodeAdapter();
    }
    case "codex": {
      const { CodexAdapter } = await import("./codex");
      return new CodexAdapter();
    }
    case "trae": {
      const { TraeAdapter } = await import("./trae");
      return new TraeAdapter();
    }
    case "gemini":
    default: {
      // Gemini 及未知工具回退到 Codex 模式（AGENTS.md 格式）
      const { CodexAdapter } = await import("./codex");
      return new CodexAdapter();
    }
  }
}
