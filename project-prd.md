# 产品需求文档
# 澳大利亚房产搜索与可视化平台

**版本**：1.0
**日期**：2026-02-17
**状态**：讨论中

---

## 1. 项目概述

### 1.1 背景

`address-api-service` 是一个基于 PlanetScale MySQL 数据库的澳大利亚房产数据 API 服务，支持房产搜索、历史成交记录查询、周边学校查找和地址地理编码。目前该 API 仅能通过原始 HTTP 请求访问，没有任何用户界面。

### 1.2 问题陈述

业务用户和客户需要在不了解 HTTP API、JSON 响应或技术工具的情况下查询房产信息。目前没有可视化界面来浏览后端已有的数据。

### 1.3 目标

构建一个面向客户的 Web 应用，使业务用户能够搜索澳大利亚房产，并以清晰、可视化的方式完整展现 API 返回的所有字段内容，包括地图定位、历史成交、周边学校和可比房产。

**核心原则**：
- **完整展示**：API 返回的所有对业务用户有意义的字段都应展示；若已有更直观的视觉表达（如地图代替经纬度坐标），则以视觉优先，文字字段可省略
- **语义化标签**：技术字段名（如 `gnaf_pid`、`geocode_source`）须转换为用户可读的标签
- **结构化呈现**：不同类型的数据（基本信息/成交记录/学校列表）用各自最合适的 UI 组件展示（卡片/表格/列表）

**明确不展示的字段**（已有更好的视觉替代，或无业务意义）：
- `latitude` / `longitude` — 由地图直接呈现，不在文字区块显示
- `gnaf_pid` — 内部主键，对用户无意义，不展示
- `property_info.address` — 使用 `standardized_address` 代替，原始地址不展示
- `similar_properties_nearby[].suburb` — 已包含在 `address` 字段中，不单独展示

---

## 2. 技术栈

| 层级 | 技术选型 |
|------|---------|
| 框架 | Next.js 14+（App Router） |
| 样式 | Tailwind CSS + shadcn/ui |
| 地图 | Google Maps JavaScript API |
| 状态管理 | React 内置（useState / useContext） |
| API 代理 | Next.js Route Handlers（服务端） |
| API Key 安全 | 仅存储于服务端环境变量，不暴露给浏览器 |

---

## 2.1 UI 设计规范

| 规范 | 说明 |
|------|------|
| 整体风格 | 专业简洁，白底为主，灰色调辅助 |
| 主色（Accent） | 海军蓝（Navy Blue，如 `#1e3a5f` 或 `#1d4ed8`） |
| 文字 | 深色（`gray-900` / `gray-700`） |
| 图标 | 全部使用 SVG 图标，**不使用 emoji** |
| 品牌名 | 暂用占位名，正式名称后续确定 |
| 地图高度 | 固定 **450px** |
| 图表/数据展示 | 纯文字+图标，简洁不花哨 |

---

## 3. 后端 API 参考

基础 URL：通过环境变量 `ADDRESS_API_URL` 配置
认证方式：`X-API-Key` 请求头（服务端注入，浏览器不可见）

### 使用的端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/v1/property/search` | GET | 主房产搜索接口，含周边数据 |
| `/api/v1/geocode` | POST | 地址标准化与地理编码 |

### 主要查询参数（`/api/v1/property/search`）

| 参数 | 默认值 | 描述 |
|------|--------|------|
| `address` | 必填 | 完整的澳大利亚房产地址 |
| `include_nearby` | `true` | 是否包含学校和相似房产 |
| `radius_meters` | `2000` | 周边设施搜索半径（米） |

---

## 4. 页面与功能

### 4.1 首页（`/`）

**用途**：房产搜索入口。

**布局**：纯白背景，无多余装饰，搜索框居中为唯一视觉焦点。上方显示占位品牌名/标题。

**功能**：
- 全宽居中的地址搜索框（主视觉区域）
- 集成 **Google Places Autocomplete**：用户输入时实时显示地址候选项下拉列表，选中后自动填充完整地址
  - 限制范围：仅显示澳大利亚地址（`componentRestrictions: { country: 'au' }`）
- 支持按回车键或点击搜索按钮触发搜索（按钮使用海军蓝样式，SVG 搜索图标）
- 点击搜索后**直接跳转**至房产详情页（不在首页调用 API）
- 地址参数须经 `encodeURIComponent` 编码后拼入 URL
- 错误处理（地址不存在、API 超时）**在详情页**展示，不在首页展示

**搜索流程**：首页 → 直接跳转 `/property?address=xxx` → 详情页调用 API → 成功渲染 / 失败显示错误页

**注意**：
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` 需同时开启 **Maps JavaScript API** 和 **Places API**
- URL 参数处理：跳转时使用 `encodeURIComponent(address)`，详情页读取时使用 `decodeURIComponent(params.address)`

---

### 4.2 房产详情页（`/property?address=xxx`）

应用的核心页面，从上到下分为七个区块（当前挂牌功能因数据库暂无数据，本期不开发）。

**顶部导航栏**：固定在页面顶部，包含：
- 左侧：品牌名/Logo 占位（点击返回首页）
- 中部：地址搜索框（带 Google Places Autocomplete，限制澳大利亚），可直接搜索新地址跳转
- 搜索框宽度适中，不占满导航栏

> **SearchBar 组件复用说明**：`SearchBar.tsx` 支持两种模式：
> - `variant="hero"`：首页使用，全宽居中大搜索框
> - `variant="nav"`：导航栏使用，紧凑宽度，嵌入 Navbar

#### 区块一 — 交互式地图

**用途**：空间展示目标房产及周边环境。

**功能**：
- 全宽 Google 地图，以目标房产为中心，**固定高度 450px**
- 单一标记：**红色** — 目标房产位置
- 无图层切换控件

**说明**：
- 周边学校仅在下方列表区块（**区块五**）展示，不在地图上渲染
- 相似房产仅在下方卡片区块（**区块四**）展示，不在地图上渲染
- 当前版本地图仅作定位展示用途，不承载多点叠加功能

**数据来源**：`property_info.latitude/longitude`

---

#### 区块二 — 房产基本信息卡片

**用途**：一目了然地展示房产关键信息。

**展示字段**：

| 字段 | 数据来源 |
|------|---------|
| 标准化地址 | `property_info.standardized_address`（优先展示，忽略原始 `address` 字段） |
| 郊区 / 州 / 邮编 | `property_info.suburb/state/postcode` |
| 房产类型 | `property_info.property_type`（为 null 时显示"未知"） |
| 土地面积（㎡） | `property_info.land_area`（为 null 时显示"—"） |
| 建筑面积（㎡） | `property_info.building_area`（为 null 时显示"—"） |
| 建造年份 | `property_info.year_built`（为 null 或空字符串 `""` 时均显示"—"） |
| 区划信息 | `property_info.zoning`（为 null 时显示"—"） |
| 都市圈分类 | `property_info.metro_classification` |
| 坐标来源 | `property_info.geocode_source`：`GNAF` 或 `CACHED` 显示 "GNAF"；`GOOGLE_API` 显示 "Google" |

---

#### 区块三 — 历史成交记录

**用途**：展示该房产的历史交易记录。

**布局**：表格视图，按成交日期**降序排列**（最新在上）

**每条记录展示字段**：

| 字段 | 数据来源 |
|------|---------|
| 成交日期 | `sale_history[].sale_date` |
| 成交价格 | `sale_history[].sale_price`（为 null 时显示"询价 / Contact Agent"） |
| 成交方式 | `sale_history[].sale_method` |
| 卧室 / 浴室 / 车位 | `sale_history[].bedrooms/bathrooms/car_spaces` |
| 在市天数 | `sale_history[].days_on_market` |
| 经纪人姓名 | `sale_history[].agent_name` |
| 所属中介 | `sale_history[].agency_name` |
| 房产描述 | `sale_history[].property_description`（可折叠展开） |

**空状态提示**："该房产暂无历史成交记录。"

---

#### 区块四 — 周边相似房产

**用途**：展示 2 公里内具有可比性的历史成交房产。

**布局**：响应式卡片网格

**每张卡片展示字段**：

| 字段 | 数据来源 |
|------|---------|
| 地址 | `similar_properties_nearby[].address` |
| 距离 | `similar_properties_nearby[].distance_meters` |
| 成交日期 | `similar_properties_nearby[].sale_date` |
| 成交价格 | `similar_properties_nearby[].sale_price`（为 null 时显示"Contact Agent"） |
| 成交方式 | `similar_properties_nearby[].sale_method` |
| 卧室 / 浴室 / 车位 | `similar_properties_nearby[].bedrooms/bathrooms/car_spaces` |
| 土地面积 | `similar_properties_nearby[].land_area`（为 null 时显示"—"） |
| 建筑面积 | `similar_properties_nearby[].building_area`（为 null 时显示"—"） |
| 房产类型 | `similar_properties_nearby[].property_type` |

**交互**：点击卡片跳转至该房产的详情页。

**空状态提示**："附近未找到相似房产。"

---

#### 区块五 — 周边学校

**用途**：列出搜索半径内的学校信息。

**布局**：列表视图（评分功能待后端数据接入后再启用）

**每条学校信息展示字段**：

| 字段 | 数据来源 |
|------|---------|
| 学校名称 | `nearby_schools[].school_name` |
| 学校类型 | `nearby_schools[].school_type`（Primary / Secondary / Combined / Special） |
| 学校性质 | `nearby_schools[].school_sector`（Government / Catholic / Independent） |
| 距离 | `nearby_schools[].distance_meters` |
| 综合评分 | `nearby_schools[].rating_overall`（**当前全为 null，评分模块暂不展示**） |
| 学术评分 | `nearby_schools[].rating_academic`（**当前全为 null，评分模块暂不展示**） |
| 联系电话 | `nearby_schools[].phone`（为 null 时不显示该行） |
| 官网链接 | `nearby_schools[].website_url`（为 null 时不显示该行） |

> ⚠️ **已知数据限制**：学校评分数据（`rating_overall` / `rating_academic`）尚未接入，当前返回值全为 null。前端不展示评分区域，待后端数据接入后再启用。

**空状态提示**："搜索半径内未找到学校。"

---

#### 区块六 — 周边交通（占位）

**用途**：展示周边公共交通站点信息（功能尚未实现）。

**当前状态**：后端 `nearby_transport` 字段固定返回空数组。

**展示方式**：显示占位区块，附文字说明"即将推出 / Coming Soon"，不展示任何实际数据。

---

#### 区块七 — 原始 API 响应（Raw Response）

**用途**：展示本次搜索完整的 API 返回 JSON，供用户验证数据和辅助调试。

**布局**：可折叠区块，默认**收起**状态，点击标题展开

**展示内容**：
- 完整的 `data` 对象 JSON，格式化缩进展示（`JSON.stringify(data, null, 2)`）
- 代码块样式（深色背景、等宽字体）
- 右上角提供"复制"按钮（SVG 图标），点击复制完整 JSON 到剪贴板

**位置**：页面最底部，所有内容区块之后

---

### 4.3 地理编码工具页（`/geocode`）— 次要功能

**用途**：供业务人员验证地址标准化结果。

**功能**：
- 地址输入框
- 提交后调用 `POST /api/v1/geocode`
- 展示结果：标准化地址、坐标、GNAF PID、置信度评分、都市圈分类
- 地图上标注返回的坐标点

---

## 5. 数据流与 API 代理架构

```
用户（浏览器）
    │
    │  API Key 不暴露
    ▼
Next.js Route Handler（服务端）
    │
    │  从环境变量注入 X-API-Key
    ▼
address-api-service（FastAPI 后端）
    │
    ▼
PlanetScale MySQL（AWS 悉尼）
    │
    ▼
JSON 响应 → Next.js Route Handler → 浏览器
```

**规则**：
- 所有对 `address-api-service` 的请求均通过 Next.js 服务端 Route Handler 代理
- `X-API-Key` 从 `process.env.ADDRESS_API_KEY` 读取，不传输至浏览器
- 请求超时设置：30 秒；超时后展示用户友好的错误提示

---

## 6. 错误与空状态处理

| 场景 | 用户提示 |
|------|---------|
| 地址未找到（404） | "未找到该地址，请确认后重试。" |
| 请求超时 | "请求超时，请稍后重试。" |
| 服务器错误（500） | "出现错误，请稍后重试。" |
| 无历史成交记录 | "该房产暂无历史成交记录。" |
| 无周边学校 | "搜索半径内未找到学校。" |
| 无相似房产 | "附近未找到相似房产。" |
| 无地图坐标 | 隐藏地图区块，显示文字说明 |

**字段级空值处理规则**（来自真实 API 响应）：

| 字段 | 空值形式 | 前端处理 |
|------|---------|---------|
| `sale_price` | `null` | 显示"Contact Agent" |
| `year_built` | `null` 或 `""` | 均显示"—"，用 `!year_built` 判断 |
| `land_area` / `building_area` | `null` | 显示"—" |
| `property_type` | `null` | 显示"Unknown" |
| `agency_name` | `""` | 不显示该行 |
| `phone` / `website_url`（学校） | `null` | 不显示该行 |
| `rating_overall` / `rating_academic` | `null`（当前全为 null） | 不展示评分模块 |
| `gnaf_pid` | `null` | 坐标来源字段显示"Google"（已通过 geocode_source 判断，无需单独显示） |
| `days_on_market` | `null` | 显示"—" |

---

## 7. 非功能需求

| 需求 | 说明 |
|------|------|
| 响应式设计 | 桌面端和平板端优化；移动端基本可用 |
| 性能 | 房产信息卡片优先渲染；地图和列表异步加载 |
| 认证 | 无需用户登录 — 单租户部署 |
| 界面语言 | 英文（面向澳大利亚市场） |
| API Key 安全 | 不暴露于客户端 JavaScript 或浏览器网络请求 |
| 部署平台 | Vercel（与 Next.js App Router 原生集成，环境变量通过 Vercel Dashboard 管理） |

---

## 8. 环境变量

| 变量名 | 说明 |
|--------|------|
| `ADDRESS_API_URL` | address-api-service 后端基础 URL |
| `ADDRESS_API_KEY` | X-API-Key 认证用的 API 密钥 |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API 密钥（客户端安全） |

---

## 9. 文件结构

```
address-search-frontend/
├── app/
│   ├── page.tsx                      # 首页 — 搜索入口
│   ├── property/
│   │   └── page.tsx                  # 房产详情页
│   ├── geocode/
│   │   └── page.tsx                  # 地理编码工具（次要）
│   └── api/
│       ├── property/
│       │   └── route.ts              # 代理 → /api/v1/property/search
│       └── geocode/
│           └── route.ts              # 代理 → /api/v1/geocode
├── components/
│   ├── SearchBar.tsx                 # 地址搜索输入框
│   ├── PropertyMap.tsx               # Google Maps 单点定位（目标房产红色标记）
│   ├── PropertyInfoCard.tsx          # 房产基本信息卡片
│   ├── SaleHistoryTable.tsx          # 历史成交表格（降序）
│   ├── SimilarPropertiesGrid.tsx     # 相似房产卡片网格
│   ├── NearbySchoolsList.tsx         # 周边学校列表
│   └── RawResponseViewer.tsx         # 可折叠原始 JSON 响应区块
├── .env.local                        # 本地环境变量
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## 10. 验收标准

1. 输入有效的澳大利亚地址后，可完整展示所有区块数据的房产详情页
2. Google 地图正确定位至目标房产，显示红色标记
3. 相似房产以卡片列表展示，点击卡片可跳转至该房产的详情页
4. 周边学校以列表展示，包含名称、类型、性质、距离
5. 输入无效地址时，显示清晰友好的错误提示
6. 检查浏览器网络请求，确认 API Key 未被传输至客户端
7. 页面在平板宽度（768px+）下正常可用

---

## 11. 开发任务列表

### Phase 1 — 项目初始化

- [ ] 初始化 Next.js 14 项目（App Router），连接 GitHub 仓库
- [ ] 安装依赖：Tailwind CSS、shadcn/ui、@vis.gl/react-google-maps（或 @googlemaps/js-api-loader）
- [ ] 配置 `tailwind.config.ts`，设置海军蓝 Accent 色（`#1d4ed8` 或自定义）
- [ ] 创建 `.env.local`，填入三个环境变量（`ADDRESS_API_URL`、`ADDRESS_API_KEY`、`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`）
- [ ] 搭建 `/app`、`/components` 目录结构，按文件结构章节建好空文件

---

### Phase 2 — API 代理层

- [ ] 实现 `app/api/property/route.ts`：接收 `address` 参数，注入 `X-API-Key`，转发至后端 `/api/v1/property/search`，统一错误格式返回
- [ ] 实现 `app/api/geocode/route.ts`：转发至后端 `POST /api/v1/geocode`
- [ ] 验证：浏览器 Network 面板中看不到 `X-API-Key` 请求头
- [ ] 验证：后端返回 404 时，代理层返回结构化错误 JSON，不暴露后端原始报错

---

### Phase 3 — 公共组件

- [ ] `SearchBar.tsx`：支持 `variant="hero"`（全宽居中）和 `variant="nav"`（紧凑）两种模式，集成 Google Places Autocomplete，限制 `country: 'au'`
- [ ] `Navbar.tsx`：固定顶部，左侧 Logo 占位（链接到 `/`），中部嵌入 `SearchBar variant="nav"`

---

### Phase 4 — 首页

- [ ] `app/page.tsx`：纯白背景，居中品牌占位标题 + `SearchBar variant="hero"`
- [ ] 搜索触发：`encodeURIComponent(address)` 后跳转 `/property?address=xxx`，不在首页调用 API

---

### Phase 5 — 详情页区块组件

- [ ] `PropertyMap.tsx`：接收 `lat/lng`，渲染 Google Map（高度 450px），放置红色 Marker；`lat/lng` 为 null 时隐藏整个组件
- [ ] `PropertyInfoCard.tsx`：展示区块二所有字段，处理各字段空值规则（`year_built` 用 `!year_built` 判断，`geocode_source` 转换显示）
- [ ] `SaleHistoryTable.tsx`：表格展示历史成交，按 `sale_date` 降序排列，`sale_price` null 显示"Contact Agent"，`property_description` 可折叠
- [ ] `SimilarPropertiesGrid.tsx`：响应式卡片网格，展示区块四所有字段，`sale_price` null 显示"Contact Agent"，点击卡片跳转 `/property?address=xxx`
- [ ] `NearbySchoolsList.tsx`：列表展示学校，`phone`/`website_url` null 时不显示该行，评分字段暂不渲染
- [ ] `RawResponseViewer.tsx`：可折叠代码块，默认收起，展示格式化 JSON，右上角复制按钮（SVG）

---

### Phase 6 — 详情页组装

- [ ] `app/property/page.tsx`：从 URL 读取 `decodeURIComponent(searchParams.address)`，调用代理 API，传递数据给各子组件
- [ ] 页面级加载状态：API 请求中显示 Skeleton 占位
- [ ] 页面级错误状态：404 显示"未找到该地址"，超时显示"请求超时"，500 显示通用错误
- [ ] 组装七个区块，顺序：地图 → 基本信息 → 历史成交 → 相似房产 → 学校 → 交通占位 → Raw Response
- [ ] 区块六（周边交通）：渲染"Coming Soon"占位样式

---

### Phase 7 — Geocode 工具页（次要）

- [ ] `app/geocode/page.tsx`：地址输入 → 调用 `/api/geocode` → 展示标准化地址、坐标、GNAF PID、置信度、都市圈分类
- [ ] 结果区域嵌入小地图，标注返回坐标点

---

### Phase 8 — 收尾与部署

- [ ] 全局响应式检查：桌面（1280px）、平板（768px）、移动（375px）
- [ ] 检查所有 SVG 图标已替换，无 emoji 残留
- [ ] 在 Vercel 创建项目，关联 GitHub 仓库
- [ ] 在 Vercel Dashboard 配置三个环境变量
- [ ] 部署并用真实地址（如 `386 Mona Vale Road, St Ives, NSW 2075`）端到端测试
- [ ] 验收标准逐条过检（第 10 章）
