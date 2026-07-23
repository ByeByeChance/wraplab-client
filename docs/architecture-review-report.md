# 设计评审报告：WrapLab Client Phase 1 架构

**评审日期**：2026-07-22
**评审结论**：🔄 修改后重审

---
## 🔴 Blocker

### B1. API 路径缺少 `/api/v1` 前缀

**位置**：Section 2 项目结构的 `services/` 注释、Section 7 API 服务层

**问题**：架构文档中所有服务模块注释和 `request.ts` 中，API 路径未包含 `/api/v1` 前缀。例如：
- 架构注释: `POST /auth/login`, `GET /vehicles/brands`
- 需求文档 Section 10.1: `POST /api/v1/auth/login`, `GET /api/v1/vehicles/brands`

`request.ts` 中 `API_BASE_URL` 定义为 `https://api.wraplab.cn`，拼接 `config.url = '/auth/login'` 得到 `https://api.wraplab.cn/auth/login`，与需求要求的 `/api/v1` 前缀不匹配。

**建议**：在 `request.ts` 中增加 `API_PREFIX = '/api/v1'` 常量，或在 Section 2 和 Section 7 中明确所有服务路径携带完整 `/api/v1` 前缀。

---

### B2. `PAUSE_RENDER` / `RESUME_RENDER` 消息类型未在协议枚举中定义

**位置**：Section 5.6.2 异常场景处理矩阵、Section 8.4 改色工作台生命周期

**问题**：以下位置引用了 `PAUSE_RENDER` 和 `RESUME_RENDER` 消息，但 Section 5.2 `WebViewMessageType` 枚举中未定义这两个类型：

1. Section 5.6.2 异常矩阵: "小程序切后台 → 通过 postMessage 通知 H5 `PAUSE_RENDER`"
2. Section 5.6.2: "小程序回前台 → 通过 postMessage 通知 H5 `RESUME_RENDER`"
3. Section 8.4 生命周期: "`useDidHide` → postMessage 通知 H5 `PAUSE_RENDER`"

需求文档 Section 5.3 也要求"小程序进入后台 → 暂停 WebView 渲染，回到前台恢复"。

**建议**：在 `WebViewMessageType` 枚举中增加 `PAUSE_RENDER` 和 `RESUME_RENDER`，补充对应的 payload 定义和 H5 端处理逻辑（`cancelAnimationFrame` / 恢复 `requestAnimationFrame`）。

---

### B3. `PING` / `PONG` 探测消息未在协议中定义

**位置**：Section 5.6.3 重连机制

**问题**：重连机制中提到"发送 PING 探测消息 (协议额外定义 PING/PONG)"，但 `WebViewMessageType` 枚举和消息类型定义中均未包含这两个类型。

**建议**：在 `WebViewMessageType` 中增加 `PING` 和 `PONG`，并定义 H5 端的自动 PONG 响应逻辑。如果 Phase 1 暂不实现重连探测，请明确标注为 Phase 2 延后项并从 Section 5.6.3 代码示例中移除引用。

---

### B4. `design/index` 路由参数定义内部不一致

**位置**：Section 3.2 路由参数传递约定 vs Section 8.4 改色工作台数据流

**问题**：
- Section 3.2 路由表 (行 260-261): `?modelId=&configurationId=` 标注为 `(可选)`
- Section 8.4 数据流 (行 1764): `modelId: string` 注释 `(必填, 从车型选择传入)`

两者矛盾。此外，`design/index` 是 Tab 页 (Section 3.1 app.config.ts 中注册为第 2 个 Tab 页)，用户可以直接点击 Tab 进入。当用户直接切换 Tab 时，没有 `modelId` 参数，页面应如何表现？架构未定义此场景。

**建议**：
1. 明确 `modelId` 的必填/可选属性并统一标注。
2. 增加"无 modelId 直接进入 Tab"的场景处理：展示空状态引导用户"请先从首页选择车型"并提供跳转按钮。
3. 补充路由参数表中 `design/index` 作为 Tab 页无参数时的行。

---

### B5. 缺少 `GET /api/v1/configurations/:id` 接口定义

**位置**：Section 7.2 `config.service.ts` vs 需求 Section 10.1

**问题**：架构 `config.service.ts` 定义了 `getConfigurationById(id: string)` 函数，用于"我的方案"中恢复方案。但需求文档 Section 10.1 API 接口清单中共 11 个接口，没有包含 `GET /api/v1/configurations/:id`。需求 AC-PRO-06 的恢复方案流程依赖此接口。

**建议**：
1. 协调需求文档，新增 `GET /api/v1/configurations/:id` 到 API 清单。
2. 或评估是否可从现有 `/api/v1/configurations?page=&limit=` 分页接口中筛选单条方案来实现恢复（增加 `?id=` 过滤参数）。

---

### B6. 401 重试缺少防无限循环保护

**位置**：Section 7.1 `request.ts`

**问题**：在 401 处理逻辑中，`handleTokenRefresh()` 成功后无条件递归调用 `request<T>(config)` 重试。如果刷新后的新 Token 仍然返回 401（极端场景：服务端主动吊销 Token、跨门店 Token 误用等），会形成无限循环。

**建议**：增加 `_retryCount` 标记或使用 `config` 扩展字段，确保一次请求最多重试一次（即刷新一次 Token 后不再重试）。示例：

```typescript
if (statusCode === 401 && !(config as any).__isRetry) {
  await handleTokenRefresh();
  return request<T>({ ...config, __isRetry: true } as any);
}
```

---

## 🟡 Should Fix

### S1. Three.js 初始化硬编码值应提取到配置

**位置**：Section 9.2 `main.ts`

硬编码值清单：
- 相机位置: `(3, 2, 5)`
- OrbitControls: `minDistance: 1.5`, `maxDistance: 10`, `maxPolarAngle: Math.PI / 2`
- 背景色: `0xF5F5F5`
- 像素比限制: `Math.min(window.devicePixelRatio, 2)`
- 灯光参数: AmbientLight `0.6`, DirectionalLight 位置和强度

**建议**：提取到 `webview/3d-renderer/config.ts`，便于不同车型调整初始视角和无代码修改调参。

---

### S2. DRACO 解码器 URL 硬编码

**位置**：Section 9.3 `model-loader.ts`

```typescript
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
```

**问题**：依赖 Google CDN 的可用性。在国内网络环境下可能加载失败或极慢。

**建议**：
1. 将 DRACO 解码器部署到自有 OSS。
2. 提供 DRACO 加载失败的降级策略（不启用 DRACO 解压，直接加载原始 GLB）。
3. URL 提取到配置常量。

---

### S3. Store 缓存无过期/失效策略

**位置**：Section 6.3 VehicleStore, Section 6.4 ColorStore

**问题**：`VehicleStore` 的 `seriesMap`、`modelsMap` 和 `ColorStore` 的 `swatchesMap` 都是内存缓存，无过期时间。在长会话中（如销售全天使用小程序），缓存可能偏离服务端最新数据（如新增车型、色卡更新）。

**建议**：增加可选的缓存 TTL 策略。例如下拉刷新时清除对应层级缓存，或通过版本号/ETag 判断是否需要重新拉取。

---

### S4. `bridge.ts` 通信错误无回传机制

**位置**：Section 9.5 `bridge.ts`

**问题**：`sendToTaro` 函数在非微信环境时回退到 `console.log`，且所有消息发送失败仅 `console.error`，Taro 端无感知。若 H5 页面在微信环境中 `wx.miniProgram` 为 `undefined`（JS SDK 未加载），所有 postMessage 静默失败，Taro 端等待超时才知晓。

**建议**：增加 H5 端的 `wx.miniProgram` 可用性检测，若不存在则在 `H5_READY` 消息中携带 `{ bridgeReady: false }`，让 Taro 端提前知道通信通道不可用并直接降级。

---

### S5. `ERROR_CODES.TOKEN_EXPIRED` 缺少用户提示映射

**位置**：Section 7.3 `constants.ts`

**问题**：`ERROR_CODES` 定义了 `TOKEN_EXPIRED: 10001`，但 `ERROR_MESSAGES` 映射表中未包含 `10001` 的对应文案。当服务端返回 code=10001 时，用户会看到空白/默认错误。

**建议**：补充 `[ERROR_CODES.TOKEN_EXPIRED]: '登录已过期，请重新登录'`。

---

### S6. `ConfigStore.generateQuote` 签名与 `quote.service.ts` 不一致

**位置**：Section 6.5 ConfigStore vs Section 7.2 quote.service.ts

**问题**：
- ConfigStore: `generateQuote(configId: string, customer: CustomerInfo) => Promise<Quote>`
- quote.service.ts: `createQuote(data: CreateQuoteRequest) => Promise<Quote>`
- CreateQuoteRequest: `{ configurationId, customerName, customerPhone, remark }`

ConfigStore 将参数拆分为两个独立参数，而 service 层使用单一请求体对象。Store 层应直接透传 service 的类型或提供映射注释。

**建议**：ConfigStore 的实现应调用 `quoteService.createQuote({ configurationId: configId, ...customer })`，并在架构中标注映射关系。

---

### S7. `ThreeDViewer` 组件 `modelUrl` 变化时缺少重新加载逻辑

**位置**：Section 4.2 ThreeDViewer Props

**问题**：`ThreeDViewerProps.modelUrl` 是单个值，当用户在 `design/index` 页内切换不同型号的车型时（如"我的方案"中恢复另一个方案），`modelUrl` 变化，但架构未说明 WebView 如何处理 URL 变化（重新加载 vs 保持）。

**建议**：在 ThreeDViewer 设计中增加 `modelUrl` 变化的处理逻辑：检测 URL 变化 → 重新发送 `MODEL_URL` postMessage → H5 清除旧模型 + 加载新模型。

---

### S8. `app.config.ts` 引用不存在的 `assets/` 目录

**位置**：Section 3.1 `app.config.ts`

**问题**：Tab bar 配置中引用 `assets/tab/home.png` 等图标路径，但 Section 2 项目结构中未包含 `src/assets/` 目录。根目录下也未定义 `assets/` 存放位置。

**建议**：在项目结构中补充 `src/assets/tab/` 目录，或调整图标引用路径与项目结构一致。

---

### S9. 报价单页缺少"联系客服"功能设计

**位置**：Section 8.5 报价单页设计

**问题**：需求 FR-QT-07 (P0) 要求"底部'联系客服'按钮，一键拨打客服电话或跳转微信客服会话"，但架构 Section 8.5 的报价单页 `View` 层级结构中仅包含车型/颜色/价格/表单/提交按钮，未包含"联系客服"按钮。AC-QT-09 也有对应的验收标准。

**建议**：在报价单页组件树中补充"联系客服"按钮，标注触发逻辑（`wx.makePhoneCall` 或客服会话）。

---

## 💭 Nice to Have

### N1. Section 8.4 改色工作台组件树缺少"重置视角"按钮

需求 FR-3D-12 (P1) 和 AC-3D-11 要求提供"重置视角"按钮。架构 Section 5 消息协议已定义 `RESET_VIEW` 消息，且 Section 9.2 `main.ts` 的 `handleTaroMessage` 已实现重置逻辑，但 Section 8.4 组件树 (行 344-361) 中未包含"重置视角"按钮的 UI 位置。建议在 ThreeDViewer 上方或内部增加该按钮。

---

### N2. 补充网络断开恢复后的自动重连策略

Section 5.6.2 定义了 `Taro.onNetworkStatusChange` 检测网络断开并 Toast 提示，但未定义网络恢复后的行为：是否自动重新加载数据、是否重新建立 WebView 通信。建议增加"网络恢复 → 自动重试失败的 API 请求 + 检查 WebView 通信状态"的逻辑。

---

### N3. 补充性能预算的可衡量指标

Section 12 定义了性能预算（首屏 < 2s、颜色切换 < 500ms、骨架屏 200ms），但未说明如何衡量。建议标注测量方式（如 Taro `reportAnalytics`、`performance.now()` 打点），确保验收可执行。

---

### N4. 建议增加 `constants.ts` 中的超时常量统一管理

当前超时配置分散在：
- `request.ts`: `REQUEST_TIMEOUT = 10000` (API 请求超时)
- `ThreeDViewer`: `MESSAGE_TIMEOUT` 对象（H5_READY: 5000, MODEL_LOAD: 15000, COLOR_APPLIED: 3000, CAPTURE: 5000）

建议将所有超时值统一定义在 `utils/constants.ts` 中，方便全局调参。

---

## 需求对齐检查

### 页面一致性

| 需求页面 | 架构页面 | 对齐 |
|---------|---------|------|
| `auth/login` | `pages/auth/login` | ✅ |
| `home/index` | `pages/home/index` | ✅ |
| `home/car-select` | `pages/home/car-select` | ✅ |
| `design/index` | `pages/design/index` | ✅ |
| `design/quote` | `pages/design/quote` | ✅ |
| `cases/index` | `pages/cases/index` | ✅ |
| `profile/index` | `pages/profile/index` | ✅ |

### 组件一致性

| 需求组件 (Section 3.2) | 架构组件 (Section 4.2) | 对齐 |
|-----------------------|----------------------|------|
| `3d-viewer` | `ThreeDViewer` | ✅ |
| `color-swatch` | `ColorSwatch` | ✅ |
| `material-selector` | `MaterialSelector` | ✅ |
| `brand-grid` | `BrandGrid` | ✅ |
| `hot-scheme-card` | `HotSchemeCard` | ✅ |
| `scheme-list-item` | `SchemeListItem` | ✅ |
| `loading-skeleton` | `LoadingSkeleton` | ✅ |
| — | `EmptyState` | ✅ 需求隐式要求 (Section 6 UI 状态矩阵) |
| — | `ErrorState` | ✅ 需求隐式要求 |
| — | `CustomColorPicker` | ✅ 需求 FR-SC-04 显式要求 |

### postMessage 消息一致性

| 需求定义 (Section 5.2) | 架构定义 (Section 5.2) | 对齐 |
|----------------------|----------------------|------|
| `MODEL_URL` | `MODEL_URL` | ✅ |
| `SET_COLOR` | `SET_COLOR` | ✅ |
| `SET_MATERIAL` | `SET_MATERIAL` | ✅ |
| `RESET_VIEW` | `RESET_VIEW` | ✅ |
| `CAPTURE` | `CAPTURE` | ✅ |
| `H5_READY` | `H5_READY` | ✅ |
| `MODEL_LOADING` | `MODEL_LOADING` | ✅ |
| `MODEL_READY` | `MODEL_READY` | ✅ |
| `MODEL_ERROR` | `MODEL_ERROR` | ✅ |
| `COLOR_APPLIED` | `COLOR_APPLIED` | ✅ |
| `CAPTURE_RESULT` | `CAPTURE_RESULT` | ✅ |
| 小程序切后台挂起 | `PAUSE_RENDER` | ❌ 架构引用但未定义 (B2) |
| 小程序回前台恢复 | `RESUME_RENDER` | ❌ 架构引用但未定义 (B2) |

### API 接口一致性

| # | 需求 (Section 10.1) | 架构 | 对齐 |
|---|-------------------|------|------|
| 1 | `GET /api/v1/vehicles/brands` | `vehicle.service.ts` getBrands() | ⚠️ 路径前缀缺失 (B1) |
| 2 | `GET /api/v1/vehicles/series?brandId=` | `vehicle.service.ts` getSeries() | ⚠️ 路径前缀缺失 (B1) |
| 3 | `GET /api/v1/vehicles/models?seriesId=` | `vehicle.service.ts` getModels() | ⚠️ 路径前缀缺失 (B1) |
| 4 | `GET /api/v1/colors/brands` | `color.service.ts` getColorBrands() | ⚠️ 路径前缀缺失 (B1) |
| 5 | `GET /api/v1/colors/swatches?brandId=&page=&limit=` | `color.service.ts` getSwatches() | ⚠️ 路径前缀缺失 (B1) |
| 6 | `GET /api/v1/colors/materials` | `color.service.ts` getMaterials() | ⚠️ 路径前缀缺失 (B1) |
| 7 | `POST /api/v1/configurations` | `config.service.ts` createConfiguration() | ⚠️ 路径前缀缺失 (B1) |
| 8 | `GET /api/v1/configurations?page=&limit=` | `config.service.ts` getConfigurations() | ⚠️ 路径前缀缺失 (B1) |
| 8a | `GET /api/v1/configurations?sort=trending&limit=6` | `config.service.ts` getConfigurations() | ⚠️ 路径前缀缺失 (B1) |
| 9 | `POST /api/v1/quotes` | `quote.service.ts` createQuote() | ⚠️ 路径前缀缺失 (B1) |
| 10 | `POST /api/v1/auth/login` | `auth.service.ts` login() | ⚠️ 路径前缀缺失 (B1) |
| 11 | `POST /api/v1/auth/refresh` | `auth.service.ts` refreshToken() | ⚠️ 路径前缀缺失 (B1) |
| — | — | `GET /api/v1/configurations/:id` | ❌ 需求未定义 (B5) |

### 4 UI 状态覆盖检查

| 页面 | Loading | Empty | Error | Success | 对齐 |
|------|---------|-------|-------|---------|------|
| 登录页 | ✅ | ✅ (N/A noted) | ✅ | ✅ | ✅ |
| 首页 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 车型选择 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 改色工作台 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 报价单 | ✅ | ✅ (N/A noted) | ✅ | ✅ | ✅ |
| 案例列表 | ✅ | ✅ | ✅ (N/A noted) | ✅ | ✅ |
| 我的 | ✅ | ✅ | ✅ | ✅ | ✅ |

### 3D 降级策略对齐

| 需求降级场景 (Section 5.3 / 7.2) | 架构对应 (Section 5.6.2 / 9.7) | 对齐 |
|--------------------------------|------------------------------|------|
| WebView 白屏 (5s 无响应) | 5s 未收到 H5_READY → ErrorState + 重载 | ✅ |
| 加载超时 (15s) | 15s MODEL_READY 超时 → L2 降级 | ✅ |
| H5 JS 报错 | MODEL_ERROR 消息 → ErrorState | ✅ |
| 模型文件 >50MB | 进度展示 + 说明已覆盖 | ✅ |
| postMessage 3s 无回调 | MESSAGE_TIMEOUT.COLOR_APPLIED 3000 | ✅ |
| 连续多次 MODEL_ERROR | 3 次且间隔 < 30s → L3 致命降级 | ✅ |
| 模型缺失 (URL 为空) | L1 降级：占位图 + 色卡可用 | ✅ |
| 低端机/内存不足 | pixelRatio 限制 + antialias 可关闭 | ✅ |

---

## 总结

架构文档整体质量较高，分层清晰，postMessage 协议设计完整，组件 Props 接口规范，UI 状态矩阵覆盖全面。主要问题集中在以下三个方面：

1. **API 路径规范**：全局缺少 `/api/v1` 前缀，所有 11 个服务接口均受影响 (B1)。修复方式建议在 `request.ts` 中增加统一前缀常量，一处修改全局生效。

2. **postMessage 协议完整性**：`PAUSE_RENDER`、`RESUME_RENDER`、`PING`、`PONG` 在异常处理章节中被引用但未在正式消息枚举中定义 (B2, B3)。补充枚举定义和对应的 H5 端处理逻辑即可。

3. **路由边界场景**：`design/index` 作为 Tab 页的无参数入口场景未定义 (B4)，缺少单个方案查询接口定义 (B5)，401 重试缺防无限循环 (B6)。

建议优先级：先修复 6 个 Blocker (B1-B6)，再处理 9 个 Should Fix (S1-S9)，Nice to Have (N1-N4) 可根据排期选择性采纳。

---

*评审角色：👁️ Code Reviewer*
*评审日期：2026-07-22*
