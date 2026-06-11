# @coder-2100/payment-domain

支付领域知识，覆盖核心流程、状态机、异常处理和对账逻辑。

## 包含领域知识

- **payment-basics** — 支付基础（业务术语、核心流程、状态机）
- **payment-exceptions** — 支付异常处理（超时、退款、对账、幂等性）

## 层级

`domain` — 支付业务领域知识，依赖 core-engineering 和 backend-security。
