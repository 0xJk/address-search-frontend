# 访问控制 + IP 限速 实施计划

## 威胁模型

内部工具，核心威胁：

| 威胁 | 应对方案 |
|---|---|
| 未授权访问 | 密码保护 + 签名 Cookie |
| API 滥用（打垮后端/产生费用） | IP 限速（Upstash Redis） |
| 暴力破解登录密码 | 登录接口独立限速（15分钟 10次） |
| 凭证泄露后现有 session 撤销 | 轮换 `COOKIE_SECRET` 可使所有已签发 Cookie 立即失效（见运维手册） |
| Server Component 绕过限速 | `app/property/page.tsx` 直连后端，不走 `/api/*`，当前设计接受此风险（内部工具用量小） |

---

## 技术方案

### 密码保护：Middleware + Cookie

- 访问任意页面时，`middleware.ts` 检查 Cookie 中是否有有效的 `access_token`
- 没有 → 跳转到 `/login?redirect=原路径`
- 有 → 放行
- 登录页面提交密码 → `/api/auth/login` 验证 → 正确则写入签名 Cookie

**Cookie 安全设置**
```
httpOnly: true       # JS 无法读取，防 XSS
secure: true         # 只在 HTTPS 传输（Vercel 默认 HTTPS）
sameSite: lax        # 允许外部链接跳转携带 Cookie（Slack/微信分享链接可用）
maxAge: 7 天         # 固定过期，不续期（强制周期性重新验证，这是有意为之的决定）
```

> **Cookie 不续期**：每次有效请求不刷新 maxAge。登录后固定 7 天过期，之后必须重新输密码。这是有意为之的安全决策——强制周期性重新验证，而非活跃用户永不过期。
>
> `lax` vs `strict`：strict 在从外部链接跳转时不发送 Cookie，会导致已登录用户被迫重新登录。lax 允许顶级 GET 导航携带 Cookie，同时仍阻止跨站 POST，对本工具足够安全。

**Cookie 签名方式**：`HMAC-SHA256`，使用 **Web Crypto API**（`crypto.subtle`）
- Middleware 跑在 Edge Runtime，**不能用 Node.js `crypto` 模块**（`createHmac` 在 Edge 中不可用）
- `crypto.subtle` 是 Web 标准 API，Edge Runtime 和 Node.js 20+ 均支持，`lib/auth.ts` 中可被 Middleware（Edge）和 Route Handler（Node.js）共同调用
- Token 格式：`base64url(payload) + "." + base64url(hmac)`
- Payload 包含 `exp`（过期 Unix 时间戳），Middleware 验证签名的同时检查 `Date.now() > exp`，服务端强制过期

```ts
// ❌ Edge Runtime 不支持
import { createHmac } from 'crypto'

// ✅ 正确：Web Crypto API（Edge + Node.js 20+ 均可用）
const key = await crypto.subtle.importKey(
  'raw', encoder.encode(secret),
  { name: 'HMAC', hash: 'SHA-256' },
  false, ['sign', 'verify']
)
```

**密码比较**：使用 HMAC 后比较摘要，避免 timing attack（Edge Runtime 无 `timingSafeEqual`）

```ts
// lib/auth.ts 中实现
async function safeCompare(a: string, b: string, key: CryptoKey): Promise<boolean> {
  const enc = new TextEncoder()
  const [hmacA, hmacB] = await Promise.all([
    crypto.subtle.sign('HMAC', key, enc.encode(a)),
    crypto.subtle.sign('HMAC', key, enc.encode(b)),
  ])
  const viewA = new Uint8Array(hmacA)
  const viewB = new Uint8Array(hmacB)
  return viewA.length === viewB.length && viewA.every((byte, i) => byte === viewB[i])
}
```

> 有登录限速保护（15分钟 10次），timing attack 实际风险极低。此处 HMAC 比较是最佳实践，不是强需求。

---

### IP 限速：Upstash Redis + @upstash/ratelimit

- **为什么用 Redis**：Vercel 无服务器架构，内存不共享，必须用外部存储计数
- **算法**：Sliding Window（滑动窗口），比固定窗口更平滑，防突发流量

**两个限速器实例**（定义在 `lib/ratelimit.ts`）：

| 实例 | 应用路径 | 规则 | 目的 |
|---|---|---|---|
| `apiRatelimit` | `/api/*`（已鉴权流量） | 每 IP，3小时 100次 | 防 API 滥用 |
| `loginRatelimit` | `/api/auth/login` | 每 IP，15分钟 10次 | 防暴力破解 |

> `/api/validate-address` 调用 Google 付费 API，当前与其他 `/api/*` 共享限速。内部工具用量小，暂时可接受，如未来有独立控制需求可拆分。

**Fail-open 策略**（`lib/ratelimit.ts` 中实现）：

```
Upstash 调用
  │ 成功 → 正常检查限速
  │ 环境变量未配置 → 跳过限速，放行（本地开发）
  │ 运行时异常（网络抖动/Upstash 故障）→ 跳过限速，放行，console.error 记录
```

限速是锦上添花，不应成为单点故障。Middleware 中所有 Redis 调用包裹在 `try/catch` 中。

**Upstash 免费额度**：10,000 命令/天 ≈ 5,000 次限速检查/天，内部工具足够。

---

### IP 提取方式

```ts
const ip =
  request.headers.get('x-real-ip') ??                              // Vercel 注入，单一值，优先
  request.headers.get('x-forwarded-for')?.split(',')[0].trim()     // 代理链取第一个
// 若两个 header 均缺失（本地开发/异常情况）→ 跳过限速，不使用共享 key
// 原因：'anonymous' 作为 key 会让所有无 IP 请求共享同一限速桶，一人超限等于所有人被封
```

---

### redirect 参数安全校验

防止开放重定向攻击（如 `/login?redirect=https://evil.com`）：

```ts
const isRelative = redirect.startsWith('/') && !redirect.startsWith('//')
const target = isRelative ? redirect : '/'
```

---

## 新增文件清单

```
middleware.ts                          # 核心：鉴权 + 限速（含 matcher 配置）
app/login/page.tsx                     # 登录页 UI
app/api/auth/login/route.ts            # 验证密码 + 写 Cookie（Node.js Runtime）
app/rate-limited/page.tsx              # 429 友好提示页
lib/auth.ts                            # Web Crypto 签名 / 验证 / safeCompare
lib/ratelimit.ts                       # 两个 Upstash 限速实例 + fail-open 逻辑
```

> **不实现 `/api/auth/logout`**：密码泄露时正确操作是轮换 `COOKIE_SECRET`，单个 logout 端点需手动调用，实际无人使用（YAGNI）。如有实际需求再添加。
>
> **不修改任何现有文件**：`middleware.ts` 是独立注入层，`/login` 位于 `app/` 下自动继承 root layout，无需改 `app/layout.tsx`。

---

## Middleware matcher 配置

```ts
// middleware.ts 末尾
export const config = {
  matcher: [
    // 匹配所有路径，排除静态资源和 Next.js 内部文件
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

不加 matcher 会导致每个静态资源（JS/CSS/图片）都触发 Middleware，浪费 CPU，并可能造成登录页样式加载失败。

---

## 新增环境变量

| 变量名 | 用途 | 存放位置 |
|---|---|---|
| `ACCESS_PASSWORD` | 共享访问密码 | Vercel Dashboard + `.env.local` |
| `COOKIE_SECRET` | HMAC 签名密钥（随机 32 字节十六进制字符串） | Vercel Dashboard + `.env.local` |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis 连接地址 | Vercel Dashboard + `.env.local` |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis 访问令牌 | Vercel Dashboard + `.env.local` |

本地开发：全部加入 `.env.local`（已在 `.gitignore`）。
`UPSTASH_*` 可留空，限速层自动 fail-open。

---

## Middleware 逻辑流程

```
请求进入
    │
    ▼
matcher 过滤（静态资源直接跳过，不进入 Middleware）
    │
    ▼
是公开路径？
(/login, /rate-limited, /favicon.ico)
    │ 是 → 直接放行
    │ 否
    ▼
是 /api/auth/login？
    │ 是 → try/catch 检查登录限速（15分钟 10次）
    │      超限 → 跳转 /rate-limited
    │      未超限 / Upstash 异常 → 放行
    │ 否
    ▼
检查 access_token Cookie
（验证 HMAC 签名 + 检查 exp 过期时间戳）
    │ 无效 / 已过期 / 缺失 → 跳转 /login?redirect=原路径（校验相对路径）
    │ 有效
    ▼
是 /api/* 路径？
    │ 否 → 直接放行（页面路由不计限速）
    │ 是
    ▼
提取 IP（x-real-ip 优先，fallback x-forwarded-for[0]）
    │ 无法获取 IP → 跳过限速，放行
    │ 获取到 IP
    ▼
try/catch 检查 API 限速（3小时 100次 Sliding Window）
    │ 未超限 → 放行，附加 X-RateLimit-Remaining / X-RateLimit-Reset headers
    │ 超限   → 跳转 /rate-limited（附带 Retry-After 时间）
    │ Upstash 异常 → fail-open，放行，console.error 记录
```

---

## 新增 npm 依赖

```
@upstash/redis
@upstash/ratelimit
```

Cookie 签名用 `crypto.subtle`（Edge Runtime 和 Node.js 20+ 内建，无需安装）

---

## 登录页设计

- 符合现有 Navy blue 设计风格（`#1e3a5f`）
- 只有密码输入框（无用户名，共享密码）
- 错误提示：密码错误 → 红色"密码错误"提示，不暴露具体原因
- 登录成功 → 跳转回 `?redirect=` 参数指定页面（校验相对路径，否则跳首页）
- 登录接口被限速时 → 显示"尝试次数过多，请稍后再试"

---

## 已确认参数

| 项目 | 决定 |
|---|---|
| Cookie 有效期 | **7 天**（Payload 含 `exp`，服务端强制校验，不续期） |
| Cookie sameSite | **lax**（允许外部链接跳转，防外分享链接重复登录） |
| 限速范围 | **只对 `/api/*`**（页面路由不计数） |
| 限速规则 | **3 小时内 100 次**（Sliding Window） |
| 登录暴力破解防护 | **15 分钟内 10 次**（独立限速器） |
| 超限反馈 | **独立友好页面** `/rate-limited` |
| 登出 UI | **不需要**，`/api/auth/logout` 端点**不实现**（YAGNI） |
| redirect 安全 | **只允许相对路径** |
| IP 提取 | **`x-real-ip` 优先**，fallback `x-forwarded-for[0]`，无法获取则跳过限速 |
| Cookie 签名 | **`crypto.subtle`**（Edge + Node.js 20+ 兼容） |
| 限速故障处理 | **Fail-open**（Upstash 不可用时放行，不报错） |
| 密码比较 | **HMAC safeCompare**（防 timing attack，最佳实践） |
| Middleware matcher | **排除静态资源**，避免性能浪费 |

---

## 实施顺序

1. 注册 Upstash，创建 Redis 数据库，获取 REST URL + Token
2. 安装依赖（`@upstash/redis`、`@upstash/ratelimit`）
3. 配置本地 `.env.local`
4. 实现 `lib/auth.ts`（Web Crypto 签名 / 验证 / safeCompare）
5. 实现 `lib/ratelimit.ts`（两个限速器 + fail-open 逻辑）
6. 实现 `app/api/auth/login/route.ts`
7. 实现 `app/login/page.tsx`
8. 实现 `app/rate-limited/page.tsx`
9. 实现 `middleware.ts`（先只做鉴权，确认正常后加限速）
10. 本地测试完整流程
11. 配置 Vercel Dashboard 环境变量
12. 部署验证

---

## 运维手册

### 生成 COOKIE_SECRET

```bash
openssl rand -hex 32
```

输出示例：`a3f1c2e4b5d6...`（64 字符十六进制字符串）

### 密码泄露 → 强制所有人重新登录

```
1. 执行 openssl rand -hex 32 生成新密钥
2. 登录 Vercel Dashboard，更新 COOKIE_SECRET
3. 重新部署（Redeploy）
→ 所有已签发的 Cookie 立即失效，所有用户需重新登录
4. 同步更新 ACCESS_PASSWORD（换新密码）
5. 将新密码分发给团队
```

> **注意**：只改 `ACCESS_PASSWORD` 不会使现有 Cookie 失效（已登录用户 7 天内无需重新输密码）。必须轮换 `COOKIE_SECRET` 才能强制所有人重新登录。

### Upstash Token 泄露

```
1. 登录 Upstash 控制台
2. 在数据库设置中重新生成 REST Token
3. 更新 Vercel Dashboard 中的 UPSTASH_REDIS_REST_TOKEN
4. 重新部署
```

### 强制某个用户立即登出

共享密码模型无法针对单个用户操作。唯一方案是轮换 `COOKIE_SECRET` 强制所有人重新登录（见上）。
