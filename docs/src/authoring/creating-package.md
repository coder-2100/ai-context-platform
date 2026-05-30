# 创建知识资产包

本文档介绍如何使用 `pnpm generate` 脚手架快速创建新的 AI Context 知识资产包。

## 快速开始

在仓库根目录运行：

```bash
pnpm generate
```

然后按提示依次输入包信息。

## 交互式提示说明

| 提示项 | 说明 | 示例 |
|--------|------|------|
| 包短名 | 用于 `@coder-2100/<name>`，仅小写字母、数字、连字符 | `backend-security` |
| 包类型 | `rules` / `skills` / `agents` / `domains` / `playbooks` / `meta` | `rules` |
| 层级 | `core` / `stack` / `domain` / `project` | `stack` |
| 描述 | 包的简短描述 | `后端安全编码规范` |
| 优先级 | `critical` / `high` / `medium` / `low`，默认 `medium` | `high` |
| 标签 | 逗号分隔的标签 | `security,backend` |
| 适配工具 | 多选，默认勾选 `claude-code` | `claude-code, codex` |
| 作者 | 可留空 | `backend-team` |

## 生成的文件

脚手架会在 `packages/assets/<name>/` 下生成：

```
packages/assets/<name>/
├── package.json        # 包配置，name 为 @coder-2100/<name>
├── manifest.yaml       # AI Context 清单文件
├── README.md           # 包说明文档
├── CHANGELOG.md        # 变更日志
└── <entry-dir>/        # 入口目录（根据类型自动创建）
    └── .gitkeep
```

入口目录根据包类型自动创建：

| 包类型 | 入口目录 |
|--------|----------|
| rules | `rules/` |
| skills | `skills/` |
| agents | `agents/` |
| domains | `domains/` |
| playbooks | `playbooks/` |
| meta | `rules/` |

## 创建后的下一步

1. **编写内容文件**：在入口目录下创建 Markdown 文件（如 `rules/coding-standards.md`）
2. **更新 entry 字段**：编辑 `manifest.yaml`，将 `.gitkeep` 替换为实际文件路径
3. **设置 appliesTo**：指定适用的 task 类型（如 `review`、`implement`）
4. **添加依赖**：如需依赖其他包，编辑 `dependencies` 字段
5. **验证格式**：运行 `pnpm validate` 检查 manifest 格式和版本一致性

## 示例：创建后端安全规范包

```bash
pnpm generate
```

交互过程：

```
? 包短名（用于 @coder-2100/<name>） backend-security
? 包类型 rules
? 层级 stack
? 描述 后端安全编码规范
? 优先级 high
? 标签（逗号分隔） security,backend
? 适配工具 ◉ claude-code ◯ codex ◯ trae ◯ gemini
? 作者（可留空） backend-team
```

生成后编辑 `manifest.yaml`：

```yaml
entry:
  rules:
    - rules/api-security.md     # 替换 .gitkeep
    - rules/input-validation.md

appliesTo:
  - review
  - implement
```

运行验证：

```bash
pnpm validate
```
