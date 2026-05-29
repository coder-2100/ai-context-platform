# AI Context Platform

企业级 AI Coding 知识管理与运行时系统，为 AI 辅助编码提供上下文管理、知识索引与运行时支持。

## 技术栈

- **包管理**: pnpm (monorepo)
- **语言**: TypeScript
- **文档**: VitePress
- **校验**: Zod
- **代码检查**: Biome

## 项目结构

```
ai-context-platform/
├── docs/            # VitePress 文档站点
├── packages/
│   └── schema/      # 核心 Schema 定义
├── schemas/         # JSON Schema 输出
├── scripts/         # 工具脚本
└── pnpm-workspace.yaml
```

## 快速开始

```bash
# 安装依赖
pnpm install

# 构建所有子包
pnpm build

# 启动文档开发服务器
pnpm docs:dev

# 构建文档站点
pnpm docs:build
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm build` | 构建所有子包 |
| `pnpm test` | 运行所有子包测试 |
| `pnpm lint` | 代码检查 |
| `pnpm lint:fix` | 代码检查并自动修复 |
| `pnpm docs:dev` | 启动文档开发服务器 |
| `pnpm docs:build` | 构建文档站点 |
| `pnpm validate` | 校验 Manifest 清单 |
| `pnpm generate:schema` | 生成 JSON Schema |
| `pnpm sync-versions` | 同步依赖版本 |

## 许可证

[MIT](LICENSE)
