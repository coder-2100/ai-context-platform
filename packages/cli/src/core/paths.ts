import os from "node:os";
import path from "node:path";

/** CLI 全局工作目录，统一存放跨项目共享的缓存、日志等数据 */
export const CLI_HOME: string = path.join(os.homedir(), ".ai-context");

/** CLI 全局包缓存目录，用于存放 npm tarball 解压内容与清单缓存 */
export const GLOBAL_CACHE_DIR: string = path.join(CLI_HOME, "cache");
