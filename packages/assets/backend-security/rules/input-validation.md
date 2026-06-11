---
id: backend-input-validation
priority: high
layer: stack
appliesTo: [review, implement]
---

# 输入校验规则

## 核心原则
- 永远不信任外部输入，所有入口参数必须校验
- 白名单校验优于黑名单过滤
- 尽早校验、尽早拒绝（Fail Fast）

## 参数校验
- 所有 API 入参必须定义类型和约束（使用 Zod / Joi / class-validator 等）
- 字符串参数必须限制最大长度
- 数值参数必须限制范围（min / max）
- 枚举参数必须校验是否在允许值列表内
- 分页参数必须限制 page size 上限（默认 20，最大 100）

## 类型检查
- 入口层进行类型转换和校验，内部代码信任类型
- 避免使用 `any`，必须明确类型或使用 unknown + 类型守卫
- JSON 解析必须 try-catch，处理畸形数据

## SQL 注入防护
- 禁止拼接 SQL 字符串，必须使用参数化查询
- ORM 查询条件使用框架提供的安全 API
- 原始 SQL 仅在必要时使用，且必须经过安全审查

## XSS 防护
- 所有用户输入在输出到 HTML 时必须转义
- 响应头设置 Content-Security-Policy
- 避免使用 `v-html`、`dangerouslySetInnerHTML` 等直接渲染用户内容
- URL 参数必须校验协议（仅允许 https:// 和相对路径）

## 文件上传校验
- 校验文件类型（MIME + 扩展名双重验证）
- 限制文件大小
- 文件名消毒（移除路径分隔符和特殊字符）
- 上传文件存储到独立目录，不与代码目录混放
