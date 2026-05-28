# 快速开始

## 安装

```bash
npm install -g @coder-2100/cli
```

## 初始化项目

```bash
ai-context init
```

创建 `.ai/` 目录和 `config.yaml`。

## 添加包

```bash
ai-context add @coder-2100/core-engineering
```

## 构建运行时上下文

```bash
ai-context build review --tool claude-code
```

生成内容：
- **第一层**：索引文件（`CLAUDE.md`）包含核心规则和资源路径
- **第二层**：内容文件（`.ai/runtime/rules/`、`.ai/runtime/skills/` 等）
