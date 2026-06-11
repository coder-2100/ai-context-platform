---
id: backend-auth-security
priority: high
layer: stack
appliesTo: [review, implement]
---

# 认证与授权规则

## 核心原则
- 认证（Authentication）和授权（Authorization）分离
- 默认拒绝，显式授权
- 最小权限原则

## JWT 安全
- JWT 签名必须使用 RS256 或 ES256，禁止使用 HS256（对称密钥）
- Access Token 有效期不超过 15 分钟
- Refresh Token 有效期不超过 7 天，支持撤销
- JWT Payload 不存储敏感信息（仅存 userId / role 等必要字段）
- 使用 `jti` 字段防止 Token 重放攻击
- Token 撤销通过黑名单或版本号机制实现

## 会话管理
- Session ID 必须使用加密安全随机数生成
- 登录后重新生成 Session ID（防止会话固定攻击）
- Session 超时时间：活跃 30 分钟，空闲 15 分钟
- 登出时服务端销毁 Session，不仅清除客户端 Cookie

## 权限校验
- 每个接口必须声明所需权限
- 权限校验在中间件层统一处理，不依赖业务代码手动检查
- 支持 RBAC 或 ABAC 模型，根据业务复杂度选择
- 越权操作必须记录审计日志
- 垂直越权：普通用户不能访问管理员接口
- 水平越权：用户不能操作其他用户的数据

## CSRF 防护
- 状态修改操作（POST/PUT/DELETE）必须校验 CSRF Token
- API 使用 SameSite Cookie + CSRF Token 双重防护
- 框架级别的 CSRF 中间件必须启用

## 密码安全
- 密码使用 bcrypt / argon2 加密存储，禁止 MD5 / SHA 系列
- bcrypt cost factor 不低于 10
- 密码复杂度要求：至少 8 位，包含大小写字母和数字
- 登录失败次数限制（5 次锁定 15 分钟）
- 密码重置链接有效期不超过 1 小时

## API 密钥管理
- API Key 通过环境变量注入，禁止硬编码
- 不同环境使用不同密钥
- 密钥轮换机制：至少每 90 天更换一次
- 废弃密钥必须立即撤销
