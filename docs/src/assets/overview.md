# 资产类型总览

AI Context Platform 将知识组织为可组合的包，称为 **AI Context Package**。

## 包类型

| 类型 | 用途 | 示例 |
|------|------|------|
| Rules | 编码标准和约束 | react-rules, backend-security |
| Skills | 任务特定工作流 | react-review skill |
| Agents | 自主行为配置 | reviewer-agent |
| Domains | 业务领域知识 | payment-domain |
| Playbooks | 分步操作手册 | migration-playbook |
| Templates | 代码脚手架模板 | component-template |

## 层级

包按抽象层级组织：

| 层级 | 范围 | 示例 |
|------|------|------|
| core | 通用工程标准 | clean-code, git-conventions |
| stack | 技术栈规范 | react-rules, node-backend |
| domain | 业务领域知识 | payment-domain, auth-domain |
| project | 项目特有规范 | my-project-conventions |
| runtime | 动态生成上下文 | git-diff-summary |

高层级在冲突时覆盖低层级。
