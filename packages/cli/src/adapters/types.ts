import type { ToolCapabilities } from "@coder-2100/schema";

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

/** Trae 的工具能力配置：64k token、多文件和图片支持、多 md 格式 */
export const TRAE_CAPABILITIES: ToolCapabilities = {
  maxTokens: 64000,
  supportsMultiFile: true,
  supportsImages: true,
  indexFileLocation: ".trae/rules/",
  contentDirLocation: ".trae/",
  contextFileFormat: "multi-md",
};

/** Gemini 的工具能力配置：128k token、多文件和图片支持 */
export const GEMINI_CAPABILITIES: ToolCapabilities = {
  maxTokens: 128000,
  supportsMultiFile: true,
  supportsImages: true,
  indexFileLocation: "GEMINI.md",
  contentDirLocation: ".ai/runtime/",
  contextFileFormat: "index-plus-files",
};

/** 支持的 AI 工具名称 */
export type ToolName = "claude-code" | "codex" | "trae" | "gemini";

/** 根据工具名称获取对应的能力配置 */
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
