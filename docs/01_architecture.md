# 架构设计：wraplab-client Phase 1 MVP

**状态**：Review (v1.1, 已修复设计评审 6 Blocker + 9 Should Fix)
**日期**：2026-07-22
**编写角色**：🏛️ Software Architect

---

## 1. 总体架构

> **API 路径约定**：所有 API 请求统一携带 `/api/v1` 前缀，由 `request.ts` 中 `API_PREFIX` 常量统一注入。架构文档中各处 API 路径注释均以完整路径 `/api/v1/...` 形式标注。

```
┌──────────────────────────────────────────────────────────────────┐
│                    Taro 小程序 (wraplab-client)                    │
│                                                                    │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────────────────┐   │
│  │  页面层     │  │  组件层      │  │  WebView 3D 渲染层       │   │
│  │  pages/    │  │  components/ │  │  webview/3d-renderer/    │   │
│  │  7 个页面  │  │  9 个公共组件 │  │  Three.js H5             │   │
│  └──────┬─────┘  └──────┬──────┘  └───────────┬──────────────┘   │
│         │               │                     │                   │
│  ┌──────┴───────────────┴─────────────────────┴───────────────┐  │
│  │                   状态管理层 (Zustand)                       │  │
│  │  AuthStore  │  VehicleStore  │  ColorStore  │  ConfigStore  │  │
│  └────────────────────────────┬────────────────────────────────┘  │
│                               │                                    │
│  ┌────────────────────────────┴────────────────────────────────┐  │
│  │                    API 服务层 (services/)                     │  │
│  │  request.ts (Taro.request 封装 + JWT 拦截 + 自动刷新)        │  │
│  │  auth.service  │  vehicle.service  │  color.service          │  │
│  │  config.service │  quote.service                            │  │
│  └────────────────────────────┬────────────────────────────────┘  │
│                               │                                    │
│  ┌────────────────────────────┴────────────────────────────────┐  │
│  │                    工具函数层 (utils/)                        │  │
│  │  constants  │  storage  │  validator  │  debounce           │  │
│  └─────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬─────────────────────────────────┘
                                 │ HTTPS / REST (JSON)
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                    wraplab-server (NestJS API)                     │
│  鉴权 (JWT + store_id 注入)  │  RESTful  │  TypeORM  │  MySQL    │
└──────────────────────────────────────────────────────────────────┘
```

**分层职责**：

| 层 | 职责 | 约束 |
|----|------|------|
| 页面层 | 页面生命周期、路由参数接收、组合组件 | 不直接调用 Taro API（通过 services/utils 间接调用） |
| 组件层 | UI 渲染、用户交互、props 回调 | 不持有业务状态（状态通过 props 或 store 获取） |
| WebView 层 | Three.js 3D 渲染、模型交互、postMessage 通信 | 独立部署，不依赖 Taro 运行时 |
| 状态管理层 | 全局业务状态、跨页面共享数据 | 仅存储可序列化数据，不含函数引用 |
| API 服务层 | HTTP 请求封装、鉴权注入、错误处理 | 纯函数，不操作 DOM/View |
| 工具函数层 | 通用纯函数、常量定义 | 无副作用，可跨平台复用 |

---

## 2. Taro 项目结构

```
wraplab-client/
├── config/
│   ├── index.ts                    # Taro 编译配置 (designWidth=750, alias, 各端差异化)
│   ├── dev.ts                      # 开发环境变量 (API_BASE_URL=http://localhost:3000)
│   └── prod.ts                     # 生产环境变量 (API_BASE_URL=https://api.wraplab.cn)
│
├── src/
│   ├── app.tsx                     # 应用入口 (useLaunch → 登录状态检查 + 全局 Store Provider)
│   ├── app.config.ts               # 全局配置 (pages 注册 + tabBar + window)
│   ├── app.less                    # 全局样式变量、reset 样式、通用工具类
│   │
│   ├── pages/                      # 页面目录 (Taro 规范: 每个页面一个子目录, kebab-case)
│   │   ├── auth/
│   │   │   └── login/
│   │   │       ├── index.tsx       # 登录页
│   │   │       ├── index.config.ts # 页面配置 (navigationBarTitleText: "门店登录")
│   │   │       └── index.less      # 页面样式
│   │   ├── home/
│   │   │   ├── index/
│   │   │   │   ├── index.tsx       # 首页 Tab (品牌网格 + 热门方案 + 开始设计)
│   │   │   │   ├── index.config.ts # 页面配置 (enablePullDownRefresh: true)
│   │   │   │   └── index.less
│   │   │   └── car-select/
│   │   │       ├── index.tsx       # 车型三级联动选择
│   │   │       ├── index.config.ts
│   │   │       └── index.less
│   │   ├── design/
│   │   │   ├── index/
│   │   │   │   ├── index.tsx       # 改色工作台 (WebView 3D + 色卡面板 + 材质选择)
│   │   │   │   ├── index.config.ts # 页面配置 (disableScroll: true)
│   │   │   │   └── index.less
│   │   │   └── quote/
│   │   │       ├── index.tsx       # 报价单页 (价格明细 + 客户信息 + 提交)
│   │   │       ├── index.config.ts
│   │   │       └── index.less
│   │   ├── cases/
│   │   │   └── index/
│   │   │       ├── index.tsx       # 案例列表 Tab (Phase 1 静态 mock 数据)
│   │   │       ├── index.config.ts
│   │   │       └── index.less
│   │   └── profile/
│   │       └── index/
│   │           ├── index.tsx       # 我的 Tab (店员信息 + 历史方案 + 退出)
│   │           ├── index.config.ts
│   │           └── index.less
│   │
│   ├── components/                 # 公共组件 (PascalCase 目录名)
│   │   ├── ThreeDViewer/
│   │   │   ├── index.tsx           # WebView 3D 渲染容器 (核心组件)
│   │   │   └── index.less
│   │   ├── ColorSwatch/
│   │   │   ├── index.tsx           # 色卡选择器 (品牌 Tab + 颜色网格 + 自定义颜色)
│   │   │   └── index.less
│   │   ├── MaterialSelector/
│   │   │   ├── index.tsx           # 材质选择器 (亮面/哑光/磨砂)
│   │   │   └── index.less
│   │   ├── BrandGrid/
│   │   │   ├── index.tsx           # 品牌 Logo 网格入口
│   │   │   └── index.less
│   │   ├── HotSchemeCard/
│   │   │   ├── index.tsx           # 热门方案横向滚动卡片
│   │   │   └── index.less
│   │   ├── SchemeListItem/
│   │   │   ├── index.tsx           # 历史方案列表项
│   │   │   └── index.less
│   │   ├── LoadingSkeleton/
│   │   │   ├── index.tsx           # 骨架屏/加载态通用组件
│   │   │   └── index.less
│   │   ├── EmptyState/
│   │   │   ├── index.tsx           # 空状态占位 (插画 + 文案 + 可选引导按钮)
│   │   │   └── index.less
│   │   ├── ErrorState/
│   │   │   ├── index.tsx           # 错误状态 (错误图标 + 文案 + 重试按钮)
│   │   │   └── index.less
│   │   └── CustomColorPicker/
│   │       ├── index.tsx           # 自定义 HEX 颜色输入面板
│   │       └── index.less
│   │
│   ├── stores/                     # Zustand 状态管理
│   │   ├── auth-store.ts           # 登录状态、Token、店员信息
│   │   ├── vehicle-store.ts        # 车型数据缓存 (品牌/车系/型号)
│   │   ├── color-store.ts          # 色卡数据 (品牌/颜色/材质)
│   │   └── config-store.ts         # 当前改色方案状态
│   │
│   ├── services/                   # API 服务层
│   │   ├── request.ts              # Taro.request 封装 (JWT 注入 + 自动刷新 + 统一错误处理 + /api/v1 前缀)
│   │   ├── auth.service.ts         # POST /api/v1/auth/login, POST /api/v1/auth/refresh
│   │   ├── vehicle.service.ts      # GET /api/v1/vehicles/brands, /series, /models
│   │   ├── color.service.ts        # GET /api/v1/colors/brands, /swatches, /materials
│   │   ├── config.service.ts       # GET/POST /api/v1/configurations, GET /api/v1/configurations/:id
│   │   └── quote.service.ts        # POST /api/v1/quotes
│   │
│   ├── assets/                     # 静态资源
│   │   └── tab/                     # Tab bar 图标
│   │       ├── home.png
│   │       ├── home-active.png
│   │       ├── design.png
│   │       ├── design-active.png
│   │       ├── cases.png
│   │       ├── cases-active.png
│   │       ├── profile.png
│   │       └── profile-active.png
│   │
│   ├── utils/                      # 工具函数
│   │   ├── constants.ts            # API_BASE_URL, TIMEOUT, 错误码映射, 正则常量
│   │   ├── storage.ts              # Taro.setStorage/getStorage/removeStorage 封装
│   │   ├── validator.ts            # 手机号/HEX/姓名/密码 校验函数
│   │   └── debounce.ts             # 防抖函数 (300ms)
│   │
│   └── types/                      # TypeScript 类型定义
│       ├── api.d.ts                # API 通用响应: ApiResponse<T>, PaginatedResponse<T>
│       ├── vehicle.d.ts            # Brand, Series, Model 类型
│       ├── color.d.ts              # ColorBrand, ColorSwatch, Material 类型
│       ├── config.d.ts             # Configuration, SchemeInfo 类型
│       ├── quote.d.ts              # Quote, QuoteDetail 类型
│       ├── auth.d.ts               # AuthTokens, StaffInfo 类型
│       └── message.d.ts            # postMessage 通信协议类型 (WebViewMessage 枚举等)
│
├── webview/                        # Three.js 3D 渲染 H5 页面 (独立构建, 不参与 Taro 编译)
│   └── 3d-renderer/
│       ├── index.html              # H5 入口 HTML
│       ├── main.ts                 # Three.js 场景初始化 (Scene/Camera/Renderer/Lights)
│       ├── model-loader.ts         # glTF/GLB 模型加载 + 进度汇报 + 缓存管理
│       ├── color-manager.ts        # 材质颜色/粗糙度/金属度修改逻辑
│       ├── capture.ts              # Canvas 截图 → base64
│       ├── bridge.ts               # postMessage 双向通信封装
│       ├── types.ts                # 消息类型定义 (与 src/types/message.d.ts 共享)
│       ├── package.json            # H5 独立依赖 (three, @types/three)
│       └── tsconfig.json           # H5 独立 TypeScript 配置
│
├── package.json                    # Taro 项目依赖
├── tsconfig.json                   # Taro TypeScript 配置
├── babel.config.js                 # Babel 配置
├── project.config.json             # 微信小程序项目配置 (appid, setting 等)
├── project.private.config.json     # 微信开发者工具私有配置 (gitignore)
├── .eslintrc.js                    # ESLint 配置
└── .gitignore
```

---

## 3. 路由设计

### 3.1 app.config.ts 页面注册

```typescript
// src/app.config.ts
export default defineAppConfig({
  pages: [
    // 4 个 Tab 页 — 必须在 pages 数组前 4 位
    'pages/home/index',
    'pages/design/index',
    'pages/cases/index',
    'pages/profile/index',

    // 非 Tab 子页面
    'pages/auth/login',
    'pages/home/car-select',
    'pages/design/quote',
  ],

  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#FFFFFF',
    navigationBarTitleText: 'WrapLab',
    navigationBarTextStyle: 'black',
  },

  tabBar: {
    color: '#999999',
    selectedColor: '#1677FF',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '首页',
        iconPath: 'assets/tab/home.png',
        selectedIconPath: 'assets/tab/home-active.png',
      },
      {
        pagePath: 'pages/design/index',
        text: '改色设计',
        iconPath: 'assets/tab/design.png',
        selectedIconPath: 'assets/tab/design-active.png',
      },
      {
        pagePath: 'pages/cases/index',
        text: '案例',
        iconPath: 'assets/tab/cases.png',
        selectedIconPath: 'assets/tab/cases-active.png',
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'assets/tab/profile.png',
        selectedIconPath: 'assets/tab/profile-active.png',
      },
    ],
  },
});
```

### 3.2 路由参数传递约定

| 源页面 | 目标页面 | 跳转方式 | 传递参数 | 说明 |
|--------|----------|----------|----------|------|
| 任意页 (未登录) | `auth/login` | `redirectTo` | 无 | 清除页面栈，防止返回到需登录的页面 |
| `home/index` | `home/car-select` | `navigateTo` | `?brandId=` (可选) | 从品牌入口进入时传入，直接定位到车系级 |
| `home/index` | `design/index` | `navigateTo` | `?modelId=&configurationId=` (可选) | 从热门方案卡片恢复方案 |
| `home/car-select` | `design/index` | `redirectTo` | `?modelId=` | 选定型号后跳转，替换当前页 (防止返回到空选择) |
| Tab 直接进入 | `design/index` | `switchTab` | 无 | 作为 Tab 页无参数进入，展示引导 UI 引导用户先去选车 |
| `design/index` | `design/quote` | `navigateTo` | `?modelId=&swatchId=&materialId=&hex=` | 携带当前颜色配置 |
| `design/quote` (成功) | `profile/index` | `switchTab` | 无 | 跳转 Tab 页 |
| `profile/index` | `design/index` | `navigateTo` | `?modelId=&configurationId=` | 恢复历史方案 |
| `profile/index` | `auth/login` | `redirectTo` | 无 | 退出登录后跳转，清除页面栈 |

### 3.3 页面间跳转工具函数

```typescript
// src/utils/navigate.ts (建议)
import Taro from '@tarojs/taro';

/** 跳转登录页 (清除页面栈) */
export function navigateToLogin() {
  Taro.redirectTo({ url: '/pages/auth/login' });
}

/** 跳转改色工作台 */
export function navigateToDesign(params: { modelId: string; configurationId?: string }) {
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  Taro.navigateTo({ url: `/pages/design/index?${query}` });
}

/** 跳转车型选择 */
export function navigateToCarSelect(brandId?: string) {
  const url = brandId ? `/pages/home/car-select?brandId=${brandId}` : '/pages/home/car-select';
  Taro.navigateTo({ url });
}

/** 跳转报价单 */
export function navigateToQuote(params: {
  modelId: string;
  swatchId: string;
  materialId: string;
  hex: string;
}) {
  const query = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  Taro.navigateTo({ url: `/pages/design/quote?${query}` });
}
```

---

## 4. 组件树

### 4.1 页面组件层级结构

```
App (src/app.tsx)
│
├── pages/auth/login/index
│   └── View (表单容器)
│       ├── Image (品牌 Logo)
│       ├── Input (手机号)
│       ├── Input (密码, password)
│       ├── Button (登录, loading 态)
│       └── Text (品牌标识 "WrapLab 车衣实验室")
│
├── pages/home/index
│   ├── LoadingSkeleton (品牌区骨架屏)        ← loading 状态
│   ├── ErrorState                             ← error 状态
│   ├── EmptyState                             ← empty 状态
│   └── View (正常内容)                        ← success 状态
│       ├── BrandGrid
│       │   └── View (品牌项) × N → onTap → navigateToCarSelect(brandId)
│       ├── ScrollView (横向)
│       │   └── HotSchemeCard × N → onTap → navigateToDesign(modelId, configurationId)
│       └── Button ("开始设计") → navigateToCarSelect()
│
├── pages/home/car-select
│   ├── LoadingSkeleton (列表骨架屏)            ← loading 状态
│   ├── ErrorState                             ← error 状态
│   ├── EmptyState                             ← empty 状态
│   └── View (面包屑 + 列表)                  ← success 状态
│       ├── View (面包屑导航: 品牌 > 车系 > 型号)
│       └── ScrollView (当前级列表)
│           └── View (列表项) × N → onTap → 加载下一级 / navigateToDesign
│
├── pages/design/index (核心页面)
│   ├── EmptyState ("请先从首页选择车型")       ← 引导状态 (Tab 直接进入, 无 modelId)
│   │   └── Button ("去选车") → switchTab('pages/home/index')
│   ├── LoadingSkeleton (3D 区 loading 百分比)  ← loading 状态
│   ├── ErrorState (3D 加载失败)                ← error 状态
│   ├── EmptyState ("3D 模型暂未上线")          ← empty 状态 (modelUrl 为空)
│   └── View (工作台)                          ← success 状态
│       ├── View (顶部: 当前颜色信息栏)
│       │   ├── Text (色卡品牌名 + 颜色名)
│       │   └── View (色块预览)
│       ├── Button ("重置视角") → postMessage RESET_VIEW (右上角悬浮, 需求 FR-3D-12)
│       ├── ThreeDViewer (WebView 3D 容器)
│       │   └── webview/3d-renderer/index.html (Three.js H5)
│       ├── MaterialSelector
│       │   └── Button × N (材质选项) → onSelect → postMessage SET_MATERIAL
│       ├── ColorSwatch
│       │   ├── ScrollView (品牌 Tab 栏) → onTabChange → 加载颜色列表
│       │   ├── View (颜色网格) → onColorSelect → postMessage SET_COLOR
│       │   └── Text ("+ 自定义颜色") → onTap → 打开 CustomColorPicker
│       └── Button ("生成报价单") → navigateToQuote(...)
│
├── pages/design/quote
│   ├── LoadingSkeleton (价格计算 loading)      ← loading 状态
│   ├── ErrorState (价格计算失败)               ← error 状态
│   └── View (报价详情)                        ← success 状态
│       ├── View (车型 + 颜色 + 材质信息)
│       ├── View (价格明细: 材料费 + 工时费 + 总价)
│       ├── Input (客户姓名, 必填)
│       ├── Input (客户手机号, 必填, type="number")
│       ├── Input (备注, 选填, maxlength=200)
│       ├── Button ("提交生成报价", loading 态)
│       └── Button ("联系客服", type="secondary")
│           → wx.makePhoneCall({ phoneNumber: '${storeServicePhone}' })  或
│           → 打开微信客服会话 (button open-type="contact")
│
├── pages/cases/index
│   ├── LoadingSkeleton (案例卡片骨架屏)        ← loading 状态
│   ├── ErrorState                             ← error 状态
│   ├── EmptyState ("暂无完工案例")             ← empty 状态
│   └── ScrollView (案例网格)                  ← success 状态
│       └── View (案例卡片) × N
│           ├── Image (封面图, 失败时占位图)
│           ├── Text (车型名称)
│           └── Text (颜色方案)
│
└── pages/profile/index
    ├── LoadingSkeleton (方案列表骨架屏)        ← loading 状态
    ├── ErrorState                             ← error 状态
    └── View (正常内容)                        ← success 状态
        ├── View (顶部: 店员信息)
        │   ├── Image (头像)
        │   ├── Text (姓名)
        │   └── Text (所属门店)
        ├── View ("我的方案" 入口) → onTap → 展开方案列表
        │   └── SchemeListItem × N (分页加载)
        │       ├── Image (缩略图)
        │       ├── Text (车型名)
        │       ├── View (颜色色块)
        │       └── Text (创建时间)
        ├── EmptyState ("暂无改色方案")          ← 方案列表为空的嵌套空状态
        └── Button ("退出登录") → 二次确认弹窗 → logout()
```

### 4.2 公共组件规格

#### ThreeDViewer

```
ThreeDViewer/
├── index.tsx
└── index.less
```

**职责**：封装 WebView，管理 3D 渲染生命周期和 postMessage 通信。

**Props**：

```typescript
interface ThreeDViewerProps {
  /** 3D 模型 GLB 文件 URL (为空时展示降级占位) */
  modelUrl: string | null;
  /** 模型加载进度回调 (0-100) */
  onProgress?: (progress: number) => void;
  /** 模型就绪回调 */
  onReady?: () => void;
  /** 模型加载失败回调 */
  onError?: (error: string) => void;
  /** 颜色应用成功回调 */
  onColorApplied?: () => void;
  /** 截图完成回调 (base64) */
  onCapture?: (imageBase64: string) => void;
  /** WebView 通信断开回调 */
  onDisconnect?: () => void;
  /** 暴露给父组件的发送消息方法 (通过 ref 或 callback) */
  onRef?: (api: ThreeDViewerAPI) => void;
}

/** 父组件通过 ref 调用的方法 */
interface ThreeDViewerAPI {
  setColor: (hex: string) => void;
  setMaterial: (material: string) => void;
  resetView: () => void;
  capture: () => void;
}
```

**内部状态**：

| 状态 | 条件 | UI |
|------|------|-----|
| loading | WebView 加载中 | 进度条 + 百分比文字 |
| empty | modelUrl 为 null / 空字符串 | 静态车型占位图 + "3D 模型暂未上线" |
| error | WebView 加载超时 (15s) 或 MODEL_ERROR 消息 | 错误图标 + "模型加载失败" + "重新加载"按钮 |
| success | MODEL_READY 消息已收到 | 可交互的 3D 模型 |

**`modelUrl` 变化处理**：
当用户在 `design/index` 内切换不同车型（如从"我的方案"恢复另一个方案），`modelUrl` 变化时：
1. 组件通过 `useEffect` / `componentDidUpdate` 检测 `modelUrl` prop 变化
2. 变化时：不重新加载 WebView（复用现有 H5 页面），仅通过 postMessage 重新发送 `MODEL_URL { url: newModelUrl }`
3. H5 端收到新的 `MODEL_URL` 后：清除旧模型 `scene.remove(oldModel)` → 加载新模型 → 发送 `MODEL_LOADING` / `MODEL_READY`
4. 若 `modelUrl` 变为 `null`（切换到无 3D 模型的车型）：展示 empty 降级 UI，销毁 WebView

**消息通信**：详见 Section 5。

---

#### ColorSwatch

**职责**：色卡品牌切换 + 颜色网格选择 + 自定义颜色入口。

**Props**：

```typescript
interface ColorSwatchProps {
  /** 色卡品牌列表 */
  brands: ColorBrand[];
  /** 当前选中品牌下的颜色列表 */
  swatches: ColorSwatchItem[];
  /** 当前选中的颜色 (用于高亮态) */
  selectedHex?: string;
  /** 色卡品牌加载中 */
  brandsLoading?: boolean;
  /** 颜色列表加载中 */
  swatchesLoading?: boolean;
  /** 品牌列表加载失败 */
  brandsError?: boolean;
  /** 颜色列表加载失败 */
  swatchesError?: boolean;
  /** 品牌 Tab 切换回调 */
  onBrandChange: (brandId: string) => void;
  /** 颜色选择回调 */
  onColorSelect: (swatch: ColorSwatchItem) => void;
  /** 自定义颜色确认回调 */
  onCustomColor: (hex: string) => void;
  /** 品牌列表重试回调 */
  onBrandsRetry: () => void;
  /** 颜色列表重试回调 */
  onSwatchesRetry: () => void;
}
```

---

#### MaterialSelector

**职责**：材质类型选择（亮面/哑光/磨砂）。

**Props**：

```typescript
interface MaterialSelectorProps {
  /** 材质列表 */
  materials: Material[];
  /** 当前选中的材质 ID */
  selectedId?: string;
  /** 加载中 */
  loading?: boolean;
  /** 加载失败 */
  error?: boolean;
  /** 选择回调 */
  onSelect: (material: Material) => void;
  /** 重试回调 */
  onRetry: () => void;
}
```

---

#### BrandGrid

**职责**：品牌 Logo 网格入口（首页）。

**Props**：

```typescript
interface BrandGridProps {
  /** 品牌列表 */
  brands: Brand[];
  /** 加载中 */
  loading?: boolean;
  /** 加载失败 */
  error?: boolean;
  /** 品牌点击回调 */
  onBrandTap: (brand: Brand) => void;
  /** 重试回调 */
  onRetry: () => void;
}
```

---

#### HotSchemeCard

**职责**：热门方案横向滚动卡片。

**Props**：

```typescript
interface HotSchemeCardProps {
  /** 方案数据 */
  scheme: HotScheme;
  /** 点击回调 */
  onTap: (scheme: HotScheme) => void;
}
```

---

#### SchemeListItem

**职责**：历史方案列表项。

**Props**：

```typescript
interface SchemeListItemProps {
  /** 方案数据 */
  scheme: Configuration;
  /** 点击回调 */
  onTap: (scheme: Configuration) => void;
}
```

---

#### LoadingSkeleton

**职责**：骨架屏/加载态通用组件，支持多种预设形状。

**Props**：

```typescript
interface LoadingSkeletonProps {
  /** 骨架屏类型 */
  type: 'brand-grid' | 'scheme-list' | 'swatch-grid' | 'case-card' | 'profile';
  /** 骨架屏数量 (如列表项数) */
  count?: number;
}
```

---

#### EmptyState

**职责**：空状态占位。

**Props**：

```typescript
interface EmptyStateProps {
  /** 插画图标名 */
  icon?: string;
  /** 提示文案 */
  message: string;
  /** 引导按钮文案 (可选, 不传不展示按钮) */
  actionText?: string;
  /** 引导按钮点击回调 */
  onAction?: () => void;
}
```

---

#### ErrorState

**职责**：错误状态，含重试按钮。

**Props**：

```typescript
interface ErrorStateProps {
  /** 错误文案 */
  message?: string;
  /** 重试回调 (不传则隐藏按钮) */
  onRetry?: () => void;
}
```

---

#### CustomColorPicker

**职责**：自定义 HEX 颜色输入底部弹出面板。

**Props**：

```typescript
interface CustomColorPickerProps {
  /** 是否显示 */
  visible: boolean;
  /** 确认回调 (返回带 # 前缀的 HEX) */
  onConfirm: (hex: string) => void;
  /** 取消回调 */
  onCancel: () => void;
}
```

**内部校验规则**：
- 仅接受 0-9、A-F、a-f 字符（非法字符自动拦截不展示）
- 不满 6 位时确认按钮禁用
- 确认时自动补 `#` 前缀

---

## 5. WebView <-> Taro postMessage 通信协议

### 5.1 通信架构

```
┌──────────────────────────┐          postMessage          ┌──────────────────────────┐
│   Taro 小程序 (React)      │ ◄──────────────────────────► │   WebView H5 (Three.js)   │
│                            │                               │                            │
│   components/              │   Taro → H5:                  │   webview/3d-renderer/     │
│   ThreeDViewer/index.tsx   │   wx.miniProgram.postMessage  │   bridge.ts                │
│                            │                               │                            │
│   onMessage 回调            │   H5 → Taro:                  │   window.parent.postMessage│
│   (bindmessage 事件)       │   wx.miniProgram.postMessage  │   → 转发到小程序层         │
└──────────────────────────┘                               └──────────────────────────┘
```

**Phase 1 限定**：仅支持微信小程序。微信 WebView 的 `bindmessage` 事件在特定时机触发（页面后退、组件销毁、分享），H5 发送的消息会被小程序排队，在下次触发时批量投递。因此需要在小程序中通过 `Taro.pageScrollTo` 等操作主动触发 message 投递，确保实时性。

### 5.2 消息类型枚举

```typescript
// src/types/message.d.ts (与 webview/3d-renderer/types.ts 保持同步)

/** 消息传输基本结构 */
interface PostMessage<T = unknown> {
  type: WebViewMessageType;
  payload?: T;
  /** 消息发送时间戳 (毫秒), 用于超时检测 */
  timestamp: number;
}

/** 消息类型枚举 */
enum WebViewMessageType {
  // Taro → H5
  /** 传递 3D 模型 URL, payload: { url: string } */
  MODEL_URL = 'MODEL_URL',
  /** 设置全车颜色, payload: { hex: string } */
  SET_COLOR = 'SET_COLOR',
  /** 设置材质类型, payload: { material: string } */
  SET_MATERIAL = 'SET_MATERIAL',
  /** 重置相机视角, payload: {} */
  RESET_VIEW = 'RESET_VIEW',
  /** 请求截图, payload: {} */
  CAPTURE = 'CAPTURE',
  /** 暂停渲染循环 (小程序切后台), payload: {} */
  PAUSE_RENDER = 'PAUSE_RENDER',
  /** 恢复渲染循环 (小程序回前台), payload: {} */
  RESUME_RENDER = 'RESUME_RENDER',
  /** 心跳探测 (检测通信链路), payload: {} */
  PING = 'PING',

  // H5 → Taro
  /** H5 页面 + Three.js 初始化完成, payload: {} */
  H5_READY = 'H5_READY',
  /** 模型加载进度汇报, payload: { progress: number } (0-100) */
  MODEL_LOADING = 'MODEL_LOADING',
  /** 模型加载 + 首帧渲染完成, payload: {} */
  MODEL_READY = 'MODEL_READY',
  /** 模型加载/渲染失败, payload: { error: string; code?: string } */
  MODEL_ERROR = 'MODEL_ERROR',
  /** 颜色已成功应用到模型 (渐变过渡完成), payload: {} */
  COLOR_APPLIED = 'COLOR_APPLIED',
  /** 截图结果回传, payload: { image: string } (base64) */
  CAPTURE_RESULT = 'CAPTURE_RESULT',
  /** 心跳响应 (响应 Taro 的 PING 探测), payload: {} */
  PONG = 'PONG',
}
```

### 5.3 Taro -> H5 消息详细定义

| 序号 | type | payload | 触发时机 | 重试策略 |
|------|------|---------|----------|----------|
| 1 | `MODEL_URL` | `{ url: string }` | H5 发送 `H5_READY` 后, Taro 回传模型文件 URL | 若 H5 3s 内未回报 `MODEL_LOADING`，重新发送 (最多 3 次) |
| 2 | `SET_COLOR` | `{ hex: string }` | 用户点击色块 / 确认自定义颜色 | 300ms 防抖；若 3s 内未收到 `COLOR_APPLIED`，Toast "颜色应用失败，请重试" |
| 3 | `SET_MATERIAL` | `{ material: string }` | 用户切换材质 | 若 3s 内未收到 `COLOR_APPLIED`，显示错误提示 |
| 4 | `RESET_VIEW` | `{}` | 用户点击"重置视角"按钮 | 无回调，H5 自行处理 |
| 5 | `CAPTURE` | `{}` | 用户点击"生成报价单"时 | 若 5s 内无 `CAPTURE_RESULT`，重试一次，再失败则跳过截图 (不阻塞报价流程) |
| 6 | `PAUSE_RENDER` | `{}` | 小程序切后台 (`useDidHide`) | 无回调；H5 收到后取消 `requestAnimationFrame` 循环，节省资源 |
| 7 | `RESUME_RENDER` | `{}` | 小程序回前台 (`useDidShow`) | 无回调；H5 收到后重新启动 `requestAnimationFrame` 循环 |
| 8 | `PING` | `{}` | 通信检测定时器 (每 5s) 或重连探测时 | 若 3s 内未收到 `PONG`，判定通信断开，触发重连 |

```typescript
// Taro -> H5 消息的类型安全包装
interface ModelUrlMessage extends PostMessage<{ url: string }> {
  type: WebViewMessageType.MODEL_URL;
}

interface SetColorMessage extends PostMessage<{ hex: string }> {
  type: WebViewMessageType.SET_COLOR;
}

interface SetMaterialMessage extends PostMessage<{ material: string }> {
  type: WebViewMessageType.SET_MATERIAL;
}

interface ResetViewMessage extends PostMessage<Record<string, never>> {
  type: WebViewMessageType.RESET_VIEW;
}

interface CaptureMessage extends PostMessage<Record<string, never>> {
  type: WebViewMessageType.CAPTURE;
}

interface PauseRenderMessage extends PostMessage<Record<string, never>> {
  type: WebViewMessageType.PAUSE_RENDER;
}

interface ResumeRenderMessage extends PostMessage<Record<string, never>> {
  type: WebViewMessageType.RESUME_RENDER;
}

interface PingMessage extends PostMessage<Record<string, never>> {
  type: WebViewMessageType.PING;
}

type TaroToH5Message =
  | ModelUrlMessage
  | SetColorMessage
  | SetMaterialMessage
  | ResetViewMessage
  | CaptureMessage
  | PauseRenderMessage
  | ResumeRenderMessage
  | PingMessage;
```

### 5.4 H5 -> Taro 消息详细定义

| 序号 | type | payload | 触发时机 | Taro 端处理 |
|------|------|---------|----------|-------------|
| 1 | `H5_READY` | `{ bridgeReady: boolean }` | Three.js 场景/Camera/Renderer 初始化完成 | 检查 bridgeReady：若 false 则直接降级为静态占位图；若 true 则发送 `MODEL_URL` 携带模型文件地址 |
| 2 | `MODEL_LOADING` | `{ progress: number }` | glTF 加载过程, 进度 0→100 | 更新 loading 百分比文字 |
| 3 | `MODEL_READY` | `{}` | 模型首帧渲染完成 | 隐藏 loading，允许用户交互 |
| 4 | `MODEL_ERROR` | `{ error: string; code?: string }` | 加载失败 / JS 异常 | 展示 error 状态 + 重新加载按钮 |
| 5 | `COLOR_APPLIED` | `{}` | 材质颜色渐变过渡动画完成 | 更新顶部颜色信息栏 |
| 6 | `CAPTURE_RESULT` | `{ image: string }` | Canvas.toDataURL 完成 | 保存 base64 截图作为方案缩略图 |
| 7 | `PONG` | `{}` | 收到 Taro `PING` 消息时自动回复 | 更新心跳时间戳，确认通信链路正常 |

```typescript
// H5 -> Taro 消息的类型安全包装
interface H5ReadyMessage extends PostMessage<{ bridgeReady: boolean }> {
  type: WebViewMessageType.H5_READY;
}

interface ModelLoadingMessage extends PostMessage<{ progress: number }> {
  type: WebViewMessageType.MODEL_LOADING;
}

interface ModelReadyMessage extends PostMessage<Record<string, never>> {
  type: WebViewMessageType.MODEL_READY;
}

interface ModelErrorMessage extends PostMessage<{ error: string; code?: string }> {
  type: WebViewMessageType.MODEL_ERROR;
}

interface ColorAppliedMessage extends PostMessage<Record<string, never>> {
  type: WebViewMessageType.COLOR_APPLIED;
}

interface CaptureResultMessage extends PostMessage<{ image: string }> {
  type: WebViewMessageType.CAPTURE_RESULT;
}

interface PongMessage extends PostMessage<Record<string, never>> {
  type: WebViewMessageType.PONG;
}

type H5ToTaroMessage =
  | H5ReadyMessage
  | ModelLoadingMessage
  | ModelReadyMessage
  | ModelErrorMessage
  | ColorAppliedMessage
  | CaptureResultMessage
  | PongMessage;
```

### 5.5 时序图

#### 5.5.1 3D 模型加载流程

```
Taro (ThreeDViewer)                       WebView H5 (Three.js)
     │                                          │
     │  1. WebView src 加载 H5 页面              │
     │─────────────────────────────────────────►│
     │                                          │ 2. Three.js 初始化
     │                                          │    - 创建 Scene/Renderer/Camera
     │                                          │    - 添加灯光 (Ambient + Directional)
     │                                          │    - 添加 OrbitControls
     │                                          │    - 创建默认地面网格/环境
     │                                          │
     │         3. H5_READY                      │
     │◄─────────────────────────────────────────│
     │                                          │
     │ 4. 收到 H5_READY                          │
     │    发送 MODEL_URL { url: modelUrl }       │
     │─────────────────────────────────────────►│
     │                                          │ 5. 开始加载 glTF/GLB 模型
     │                                          │    - GLTFLoader.load(url, onProgress)
     │                                          │
     │    6. MODEL_LOADING { progress: 15 }      │
     │◄─────────────────────────────────────────│ (onProgress 回调)
     │    7. MODEL_LOADING { progress: 45 }      │
     │◄─────────────────────────────────────────│
     │    8. MODEL_LOADING { progress: 78 }      │
     │◄─────────────────────────────────────────│
     │    9. MODEL_LOADING { progress: 100 }     │
     │◄─────────────────────────────────────────│
     │                                          │ 10. 模型加载完成
     │    11. MODEL_READY                       │    - 加入场景
     │◄─────────────────────────────────────────│    - 调整相机位置
     │                                          │    - 首帧渲染
     │ 12. 隐藏 loading, 启用交互               │
     │                                          │
```

#### 5.5.2 改色流程 (含防抖)

```
Taro (ColorSwatch)     Taro (ThreeDViewer)         WebView H5 (Three.js)
     │                       │                            │
     │ 1. 用户点击色块         │                            │
     │    hex="#636363"       │                            │
     │                        │                            │
     │ 2. 色块高亮 + 300ms 防抖等待                        │
     │    (若防抖期内再次点击, │                            │
     │     取消前次, 重新计时) │                            │
     │                        │                            │
     │ 3. 防抖到期, 调用        │                            │
     │    api.setColor(hex)   │                            │
     │───────────────────────►│                            │
     │                        │ 4. postMessage             │
     │                        │    SET_COLOR { hex }       │
     │                        │───────────────────────────►│
     │                        │                            │ 5. 遍历车身所有 mesh
     │                        │                            │    mesh.material.color.set(hex)
     │                        │                            │    渐变过渡动画 (0.3s ease)
     │                        │                            │
     │                        │     6. COLOR_APPLIED       │
     │                        │◄───────────────────────────│
     │                        │                            │
     │ 7. 更新颜色信息栏:      │                            │
     │    "AX 哑光灰 ■"       │                            │
```

#### 5.5.3 截图流程

```
Taro (Quote/Design)     Taro (ThreeDViewer)         WebView H5 (Three.js)
     │                       │                            │
     │ 1. 点击"生成报价单"     │                            │
     │───────────────────────►│                            │
     │                        │ 2. postMessage CAPTURE     │
     │                        │───────────────────────────►│
     │                        │                            │ 3. renderer.render(scene, camera)
     │                        │                            │    const dataURL = canvas.toDataURL('image/png')
     │                        │                            │
     │                        │   4. CAPTURE_RESULT         │
     │                        │      { image: base64 }      │
     │                        │◄───────────────────────────│
     │                        │                            │
     │ 5. 收到 base64 截图     │                            │
     │    保存到 configStore  │                            │
     │    携带截图跳转报价页   │                            │
     │                        │                            │
     │ 注: 若 5s 内无 CAPTURE_RESULT:                       │
     │   a. 重试 1 次                                     │
     │   b. 仍然失败 → 跳过截图, 不阻塞报价流程              │
     │      (报价单缩略图使用默认车型占位图)                  │
```

### 5.6 错误处理与重连机制

#### 5.6.1 通信超时检测

```typescript
// ThreeDViewer 中维护的心跳/超时检测逻辑

/** 消息超时配置 */
const MESSAGE_TIMEOUT = {
  /** 等待 H5_READY 的超时 (WebView 白屏检测) */
  H5_READY: 5000,           // 5s
  /** 等待 MODEL_READY 的超时 (模型加载总超时) */
  MODEL_LOAD: 15000,        // 15s
  /** 等待 COLOR_APPLIED 的超时 */
  COLOR_APPLIED: 3000,      // 3s
  /** 等待 CAPTURE_RESULT 的超时 */
  CAPTURE: 5000,            // 5s
} as const;
```

#### 5.6.2 异常场景处理矩阵

| 场景 | 检测方式 | 处理策略 |
|------|----------|----------|
| WebView 白屏 (H5 JS 加载失败) | 5s 内未收到 `H5_READY` | 展示 error 状态 + "重新加载"按钮; 重载 WebView `src` |
| 3D 模型加载超时 | 15s 内未收到 `MODEL_READY` | 展示 error 状态 + "重新加载"按钮; 重发 `MODEL_URL` 或重载 WebView |
| H5 JS 运行时异常 | 收到 `MODEL_ERROR` | 展示 error 状态，展示具体错误信息；不自动重试，用户手动点击"重新加载" |
| postMessage 无回调 | 发送消息后 3s 内无对应响应 | Toast "3D 视图连接异常，请重试"; 禁用色卡选择器; 提供"重新连接"按钮 |
| 连续多次 MODEL_ERROR | 3 次 MODEL_ERROR 且间隔 < 30s | 判定为致命错误，降级为静态占位图，不再尝试加载 WebView; 提示"3D 渲染引擎异常，请联系技术支持" |
| 小程序切后台 | `onHide` 生命周期 | 暂停 H5 requestAnimationFrame (通过 postMessage 通知 H5 `PAUSE_RENDER`) |
| 小程序回前台 | `onShow` 生命周期 | 恢复 H5 渲染 (通过 postMessage 通知 H5 `RESUME_RENDER`) |
| 网络断开 | `Taro.onNetworkStatusChange` | H5 不重试加载，小程序层展示"无网络连接" Toast |

#### 5.6.3 重连机制

```typescript
// 通信心跳定时器 (每 5s 检查)
// Phase 1 采用简易心跳: 记录上次收到 H5 消息的时间戳
// 若 10s 内无任何 H5 消息，判定通信断开

let lastH5MessageTime = Date.now();

// 收到任何 H5 消息时更新时间戳
function onH5Message(msg: H5ToTaroMessage) {
  lastH5MessageTime = Date.now();
  // ... 原有消息处理逻辑
}

// 心跳检测定时器
setInterval(() => {
  if (Date.now() - lastH5MessageTime > 10000) {
    console.warn('[WebView] 通信超时，尝试重连...');
    reloadWebView(webViewCtx, currentModelUrl);
  }
}, 5000);

/** 重新加载 WebView (完整重载) */
function reloadWebView(webViewCtx: any, modelUrl: string) {
  // 1. 设置 WebView key +1 强制 React 重新挂载
  setWebViewKey(prev => prev + 1);
  // 2. WebView 重新加载后按正常流程: H5_READY → MODEL_URL → MODEL_READY
}

/** Phase 2 增强: 基于 PING/PONG 的主动探测重连 (已在协议中预留消息类型) */
function reconnect(webViewCtx: any) {
  // 发送 PING 探测消息
  // 若 H5 响应 PONG 则恢复通信, 否则走 reloadWebView
}
```

### 5.7 WebView src URL 策略

**Phase 1 采用本地 H5 页面 + OSS 模型文件**：

```
WebView src: /webview/3d-renderer/index.html  (本地打包)
模型文件:   https://oss.wraplab.cn/models/{modelId}/model.glb  (远程 OSS)
```

| 策略 | 说明 | 优势 | Trade-off |
|------|------|------|-----------|
| H5 页面 | 本地打包进小程序 | 无网络依赖，加载快；代码与小程序一起版本管理和审核 | H5 有 2MB 包大小限制 (可用分包优化) |
| 模型文件 | 远程 OSS 下载 | 模型文件较大 (5-50MB)，不适合打包；可独立更新不依赖小程序发版 | 依赖网络，需进度展示和超时处理 |

**URL 解析逻辑 (ThreeDViewer 内部)**：

```typescript
// src/config/index.ts 中配置
const WEBVIEW_BASE_PATH = '/webview/3d-renderer/index.html';

// ThreeDViewer 中构造 WebView src
function buildWebViewSrc(modelUrl: string | null): string {
  if (!modelUrl) return ''; // 不渲染 WebView, 显示降级 UI

  // 本地 H5 页面路径
  const src = `${WEBVIEW_BASE_PATH}`;
  
  // 模型 URL 通过 postMessage 传递 (不通过 URL query, 避免特殊字符编码问题)
  // 但初始化参数中的 modelUrl 在 WebView onLoad 后通过 postMessage 发送
  
  return src;
}
```

**为何模型 URL 通过 postMessage 而非 query string 传递**：
1. OSS URL 可能包含特殊字符 (签名参数等)，query string 编码复杂
2. postMessage 是 JSON 传输，无编码问题
3. 后续可能需要在运行时动态切换模型，postMessage 更灵活

---

## 6. 状态管理 (Zustand)

### 6.1 总览

| Store | 职责 | 持久化 | 跨页面共享 |
|-------|------|--------|-----------|
| AuthStore | Token、店员信息、登录/登出 | 是 (Token 存 Taro.Storage) | 全局 |
| VehicleStore | 品牌/车系/型号数据缓存 | 否 (内存缓存, 减少重复请求) | 首页 ↔ 车型选择 |
| ColorStore | 色卡品牌/颜色/材质数据 | 否 (内存缓存) | 改色工作台内部 |
| ConfigStore | 当前改色方案状态 | 否 | 车型选择 → 工作台 → 报价单 |

### 6.2 AuthStore

```typescript
// src/stores/auth-store.ts
import { create } from 'zustand';
import Taro from '@tarojs/taro';

interface StaffInfo {
  id: string;
  name: string;
  phone: string;
  storeId: string;
  storeName: string;
  avatar?: string;
}

interface AuthState {
  /** JWT access token */
  accessToken: string | null;
  /** JWT refresh token */
  refreshToken: string | null;
  /** 当前店员信息 (JWT 解析或 API 获取) */
  staff: StaffInfo | null;
  /** 是否已登录 (accessToken 存在且未过期) */
  isLoggedIn: boolean;
  /** 登录加载中 */
  loading: boolean;

  // Actions
  /** 手机号+密码登录 */
  login: (phone: string, password: string) => Promise<void>;
  /** 刷新 Token (401 拦截器调用) */
  refreshAccessToken: () => Promise<void>;
  /** 退出登录 (清除 Token + 跳转) */
  logout: () => void;
  /** 从本地存储恢复登录态 (app.ts useLaunch 调用) */
  restoreSession: () => Promise<void>;
  /** 检查 Token 是否过期 (客户端 JWT 解码) */
  isTokenExpired: () => boolean;
}
```

**实现要点**：
- `login()`: 调用 `POST /api/v1/auth/login` → 存储 accessToken + refreshToken 到 `Taro.setStorage` → 解码 JWT 获取 staff 信息
- `refreshAccessToken()`: 调用 `POST /api/v1/auth/refresh` (携带 refreshToken) → 更新 accessToken → 若 refreshToken 也过期则调用 logout()
- `logout()`: 清除内存状态 + `Taro.removeStorage` → `Taro.redirectTo({ url: '/pages/auth/login' })`
- `restoreSession()`: 从 `Taro.getStorage` 恢复 Token → 检查过期 → 若未过期设置 isLoggedIn=true, 已过期则尝试 refresh → 失败则 logout()
- `isTokenExpired()`: 解码 JWT payload 读取 exp 字段, 与当前时间对比 (预留 60s 缓冲)

### 6.3 VehicleStore

```typescript
// src/stores/vehicle-store.ts
import { create } from 'zustand';

interface VehicleState {
  /** 品牌列表 (全量, 首次加载后缓存) */
  brands: Brand[];
  brandsLoading: boolean;
  brandsError: string | null;

  /** 当前选中品牌 */
  selectedBrand: Brand | null;

  /** 车系列表 (按 brandId 缓存) */
  seriesMap: Record<string, Series[]>;
  seriesLoading: boolean;
  seriesError: string | null;

  /** 当前选中的车系 */
  selectedSeries: Series | null;

  /** 型号列表 (按 seriesId 缓存) */
  modelsMap: Record<string, Model[]>;
  modelsLoading: boolean;
  modelsError: string | null;

  /** 当前选中的型号 */
  selectedModel: Model | null;

  // Actions
  /** 获取品牌列表 */
  fetchBrands: () => Promise<void>;
  /** 选择品牌, 自动加载车系 */
  selectBrand: (brand: Brand) => Promise<void>;
  /** 获取车系列表 (指定 brandId) */
  fetchSeries: (brandId: string) => Promise<void>;
  /** 选择车系, 自动加载型号 */
  selectSeries: (series: Series) => Promise<void>;
  /** 获取型号列表 (指定 seriesId) */
  fetchModels: (seriesId: string) => Promise<void>;
  /** 选择型号 */
  selectModel: (model: Model) => void;
  /** 重置选择 (返回上一级) */
  resetToBrands: () => void;
  resetToSeries: (brandId: string) => void;
}
```

**缓存策略**：
- 品牌列表首次加载后缓存，除非用户下拉刷新
- 车系列表按 brandId 缓存于 `seriesMap`，已加载过的品牌不再重复请求
- 型号列表按 seriesId 缓存于 `modelsMap`
- 面包屑返回时直接读取缓存，不发起网络请求
- **缓存 TTL**：品牌/车系/型号缓存有效期 30 分钟。超时后下次访问自动重新拉取。下拉刷新时无条件清除当前层级缓存并重新拉取
- 实现方式：每个缓存条目记录 `cachedAt: number` 时间戳，读取前检查 `Date.now() - cachedAt < 30 * 60 * 1000`

### 6.4 ColorStore

```typescript
// src/stores/color-store.ts
import { create } from 'zustand';

interface ColorState {
  /** 色卡品牌列表 */
  colorBrands: ColorBrand[];
  colorBrandsLoading: boolean;
  colorBrandsError: string | null;

  /** 当前选中色卡品牌 ID */
  selectedColorBrandId: string | null;

  /** 颜色列表 (按 brandId 缓存) */
  swatchesMap: Record<string, ColorSwatchItem[]>;
  swatchesLoading: boolean;
  swatchesError: string | null;

  /** 当前选中的颜色 */
  selectedSwatch: ColorSwatchItem | null;

  /** 自定义 HEX 颜色 (用户自定义时设置) */
  customHex: string | null;

  /** 材质列表 */
  materials: Material[];
  materialsLoading: boolean;
  materialsError: string | null;

  /** 当前选中材质 */
  selectedMaterial: Material | null;

  // Actions
  /** 获取色卡品牌列表 */
  fetchColorBrands: () => Promise<void>;
  /** 选择色卡品牌, 自动加载颜色列表 */
  selectColorBrand: (brandId: string) => Promise<void>;
  /** 获取颜色列表 */
  fetchSwatches: (brandId: string) => Promise<void>;
  /** 选择颜色 (从色卡列表) */
  selectSwatch: (swatch: ColorSwatchItem) => void;
  /** 设置自定义颜色 */
  setCustomColor: (hex: string) => void;
  /** 获取材质列表 */
  fetchMaterials: () => Promise<void>;
  /** 选择材质 */
  selectMaterial: (material: Material) => void;
  /** 获取当前生效的 HEX 颜色 (优先自定义颜色, 其次色卡 HEX) */
  getActiveHex: () => string | null;
}
```

**缓存策略**（同 VehicleStore）：
- 色卡品牌列表和材质列表在单次设计会话内缓存（30 分钟 TTL）
- 颜色列表按 brandId 缓存于 `swatchesMap`，相同品牌不重复请求
- 下拉刷新时清除对应层级缓存

### 6.5 ConfigStore

```typescript
// src/stores/config-store.ts
import { create } from 'zustand';

interface ConfigState {
  /** 当前改色方案的车型 */
  currentModel: Model | null;

  /** 当前方案 ID (恢复历史方案时存在; 新建方案时为空) */
  configurationId: string | null;

  /** 当前方案缩略图 (来自 H5 截图 base64) */
  thumbnail: string | null;

  /** 报价单数据 */
  quoteData: Quote | null;
  quoteLoading: boolean;
  quoteError: string | null;

  // Actions
  /** 设置当前车型 (进入工作台时) */
  setModel: (model: Model) => void;
  /** 加载已有方案 (从"我的方案"恢复) */
  loadConfiguration: (configId: string) => Promise<void>;
  /** 保存当前方案 */
  saveConfiguration: (params: SaveConfigParams) => Promise<string>;
  /** 设置缩略图 (来自 H5 截图) */
  setThumbnail: (base64: string) => void;
  /** 生成报价 (内部映射到 quoteService.createQuote) */
  generateQuote: (configId: string, customer: CustomerInfo) => Promise<Quote>;
  /** 重置当前方案状态 (退出工作台时) */
  reset: () => void;
}

interface SaveConfigParams {
  modelId: string;
  swatchId?: string;
  materialId?: string;
  hex?: string;
  thumbnail?: string;
}

interface CustomerInfo {
  name: string;
  phone: string;
  remark?: string;
}
```

**实现映射关系**：
- `generateQuote(configId, customer)` 内部调用 `quoteService.createQuote({ configurationId: configId, customerName: customer.name, customerPhone: customer.phone, remark: customer.remark })`
- Store 层的 `CustomerInfo` 与 service 层的 `CreateQuoteRequest` 字段一一对应，Store 负责拆解重组

---

## 7. API 服务层

### 7.1 请求封装 (`request.ts`)

```typescript
// src/services/request.ts
import Taro from '@tarojs/taro';
import { useAuthStore } from '../stores/auth-store';

/** API 基础 URL (根据环境变量) */
const API_BASE_URL = process.env.TARO_APP_API_BASE_URL || 'https://api.wraplab.cn';

/** API 版本前缀 (所有请求统一携带) */
const API_PREFIX = '/api/v1';

/** 请求超时 (ms) */
const REQUEST_TIMEOUT = 10000;

/** Token 刷新锁 (防止并发刷新) */
let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

/** Token 刷新最大重试次数 (防止 401 无限循环) */
const MAX_TOKEN_REFRESH_RETRIES = 1;

/** 请求级别重试标记 (防止同一请求在刷新 Token 后无限递归) */
interface RequestConfig extends Omit<Taro.request.Option, 'url'> {
  url: string;
  __tokenRefreshRetryCount?: number;
}

/** 通用 API 响应结构 */
interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

/** 分页 API 响应结构 */
interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/**
 * 统一请求封装
 * - 自动注入 JWT Authorization Header
 * - 401 自动刷新 Token
 * - 统一错误处理
 * - 请求/响应类型安全
 */
export async function request<T>(
  config: RequestConfig
): Promise<T> {
  const authStore = useAuthStore.getState();

  // 注入 Authorization header
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(config.header as Record<string, string>),
  };

  if (authStore.accessToken) {
    headers['Authorization'] = `Bearer ${authStore.accessToken}`;
  }

  try {
    const response = await Taro.request({
      ...config,
      url: `${API_BASE_URL}${API_PREFIX}${config.url}`,
      header: headers,
      timeout: config.timeout || REQUEST_TIMEOUT,
    });

    const { statusCode, data } = response;

    // 成功 (2xx)
    if (statusCode >= 200 && statusCode < 300) {
      const body = data as ApiResponse<T>;
      if (body.code === 0) {
        return body.data;
      }
      // 业务错误 (code !== 0)
      throw new ApiError(body.code, body.message);
    }

    // 401 — Token 刷新
    if (statusCode === 401) {
      const retryCount = (config as RequestConfig).__tokenRefreshRetryCount || 0;
      if (retryCount >= MAX_TOKEN_REFRESH_RETRIES) {
        // 刷新后仍 401：强制登出
        authStore.logout();
        throw new ApiError(401, '登录已过期，请重新登录');
      }
      await handleTokenRefresh();
      // 刷新成功后重试原始请求 (标记重试次数，防止无限递归)
      return request<T>({ ...config, __tokenRefreshRetryCount: retryCount + 1 } as RequestConfig);
    }

    // 403 — 无权限
    if (statusCode === 403) {
      Taro.showToast({ title: '无权限访问', icon: 'none' });
      throw new ApiError(403, '无权限访问');
    }

    // 500 — 服务端错误
    if (statusCode >= 500) {
      Taro.showToast({ title: '服务器繁忙，请稍后重试', icon: 'none' });
      throw new ApiError(statusCode, '服务器繁忙，请稍后重试');
    }

    // 其他错误
    const body = data as ApiResponse<unknown>;
    throw new ApiError(body.code || statusCode, body.message || '请求失败');

  } catch (error) {
    // 网络超时/断网
    if (error instanceof Error && error.message.includes('timeout')) {
      Taro.showToast({ title: '网络连接超时，请重试', icon: 'none' });
      throw new ApiError(-1, '网络连接超时');
    }

    if (error instanceof Error && error.message.includes('network')) {
      Taro.showToast({ title: '当前无网络连接', icon: 'none' });
      throw new ApiError(-1, '当前无网络连接');
    }

    // ApiError 直接抛出
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(-1, '未知错误');
  }
}

/**
 * Token 自动刷新 (带并发锁)
 */
async function handleTokenRefresh(): Promise<void> {
  const authStore = useAuthStore.getState();

  // 已有刷新进行中，等待其结果
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      await authStore.refreshAccessToken();
    } catch {
      // 刷新失败 → 跳转登录
      authStore.logout();
      throw new ApiError(401, '登录已过期，请重新登录');
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/** 自定义 API 错误类 */
export class ApiError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
    this.name = 'ApiError';
  }
}

/** 分页请求参数 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/** 带分页的 GET 请求 */
export async function getPaginated<T>(
  url: string,
  params?: PaginationParams & Record<string, unknown>
): Promise<PaginatedData<T>> {
  const query = Object.entries(params || {})
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  const fullUrl = query ? `${url}?${query}` : url;
  return request<PaginatedData<T>>({ url: fullUrl, method: 'GET' });
}
```

### 7.2 服务模块 TypeScript 函数签名

#### auth.service.ts

```typescript
// src/services/auth.service.ts
import { request } from './request';

interface LoginRequest {
  phone: string;
  password: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  staff: {
    id: string;
    name: string;
    phone: string;
    storeId: string;
    storeName: string;
    avatar?: string;
  };
}

interface RefreshRequest {
  refreshToken: string;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

/** 手机号+密码登录 */
export function login(data: LoginRequest): Promise<LoginResponse>;
/** 刷新 Token */
export function refreshToken(data: RefreshRequest): Promise<RefreshResponse>;
```

#### vehicle.service.ts

```typescript
// src/services/vehicle.service.ts
import { request, getPaginated } from './request';

/** 品牌 */
interface Brand {
  id: string;
  name: string;
  logo: string;
  sortOrder: number;
}

/** 车系 */
interface Series {
  id: string;
  brandId: string;
  name: string;
  yearStart: number;
  yearEnd: number;
}

/** 型号 */
interface Model {
  id: string;
  seriesId: string;
  name: string;
  year: number;
  bodyType: string;       // SUV / 轿车 / 跑车 等
  model3dUrl: string | null; // 可为空
}

/** 获取品牌列表 */
export function getBrands(): Promise<Brand[]>;

/** 获取车系列表 */
export function getSeries(brandId: string): Promise<Series[]>;

/** 获取型号列表 */
export function getModels(seriesId: string): Promise<Model[]>;
```

#### color.service.ts

```typescript
// src/services/color.service.ts
import { request, getPaginated } from './request';

/** 色卡品牌 */
interface ColorBrand {
  id: string;
  name: string;
  description?: string;
}

/** 颜色 */
interface ColorSwatchItem {
  id: string;
  brandId: string;
  name: string;
  hex: string;
  rgbR: number;
  rgbG: number;
  rgbB: number;
  pricePerM2?: number;
}

/** 材质 */
interface Material {
  id: string;
  name: string;           // 亮面 / 哑光 / 磨砂
  description?: string;
  priceMultiplier?: number;
  type: 'glossy' | 'matte' | 'satin' | string;
}

/** 获取色卡品牌列表 */
export function getColorBrands(): Promise<ColorBrand[]>;

/** 获取指定品牌的颜色列表 (分页) */
export function getSwatches(
  brandId: string,
  params?: { page?: number; limit?: number }
): Promise<PaginatedData<ColorSwatchItem>>;

/** 获取材质列表 */
export function getMaterials(): Promise<Material[]>;
```

#### config.service.ts

```typescript
// src/services/config.service.ts
import { request, getPaginated, PaginatedData, PaginationParams } from './request';

/** 改色方案 */
interface Configuration {
  id: string;
  storeId: string;
  modelId: string;
  modelName: string;       // 冗余字段，便于列表展示
  brandName: string;
  seriesName: string;
  swatchName?: string;
  hex?: string;
  materialName?: string;
  thumbnail?: string;
  status: string;
  createdAt: string;
}

/** 创建方案请求 */
interface CreateConfigRequest {
  modelId: string;
  swatchId?: string;
  materialId?: string;
  hex?: string;
  thumbnail?: string;
}

/** 创建改色方案 */
export function createConfiguration(data: CreateConfigRequest): Promise<Configuration>;

/** 获取历史方案列表 (分页) */
export function getConfigurations(
  params?: PaginationParams & { sort?: string }
): Promise<PaginatedData<Configuration>>;

/** 获取单个方案详情 (用于恢复方案)
 * 对应后端 GET /api/v1/configurations/:id (server 01_architecture.md Section 8.3 已定义)
 * 需在需求文档 Section 10.1 API 清单中补充此接口 */
export function getConfigurationById(id: string): Promise<Configuration>;
```

#### quote.service.ts

```typescript
// src/services/quote.service.ts
import { request } from './request';

/** 报价单 */
interface Quote {
  id: string;
  configurationId: string;
  totalPrice: number;
  materialCost: number;
  laborCost: number;
  customerName: string;
  customerPhone: string;
  status: string;
  createdAt: string;
}

/** 生成报价请求 */
interface CreateQuoteRequest {
  configurationId: string;
  customerName: string;
  customerPhone: string;
  remark?: string;
}

/** 生成报价单 */
export function createQuote(data: CreateQuoteRequest): Promise<Quote>;
```

### 7.3 全局错误码映射

```typescript
// src/utils/constants.ts

/** 业务错误码 */
export const ERROR_CODES = {
  TOKEN_EXPIRED: 10001,
  INVALID_CREDENTIALS: 10002,
  STAFF_NOT_FOUND: 10003,
  MODEL_NOT_FOUND: 20001,
  SWATCH_NOT_FOUND: 30001,
  CONFIG_NOT_FOUND: 40001,
  QUOTE_CALC_FAILED: 50001,
  VALIDATION_ERROR: 90001,
} as const;

/** 错误码对应的用户提示文案 */
export const ERROR_MESSAGES: Record<number, string> = {
  [ERROR_CODES.TOKEN_EXPIRED]: '登录已过期，请重新登录',
  [ERROR_CODES.INVALID_CREDENTIALS]: '手机号或密码错误',
  [ERROR_CODES.STAFF_NOT_FOUND]: '店员账号不存在',
  [ERROR_CODES.MODEL_NOT_FOUND]: '车型数据不存在',
  [ERROR_CODES.SWATCH_NOT_FOUND]: '色卡数据不存在',
  [ERROR_CODES.CONFIG_NOT_FOUND]: '方案数据不存在',
  [ERROR_CODES.QUOTE_CALC_FAILED]: '价格计算失败',
  [ERROR_CODES.VALIDATION_ERROR]: '输入数据有误',
};
```

---

## 8. 页面设计

### 8.1 登录页 `pages/auth/login`

#### 数据流

```
Props: 无 (独立页面)
State:
  - phone: string              (受控输入)
  - password: string           (受控输入)
  - loading: boolean           (登录按钮 loading)
  - error: string | null       (登录错误文案)
  - rememberPassword: boolean  (记住密码)

API:
  - authService.login(phone, password)

Store:
  - AuthStore.login()         (登录成功后调用)
```

#### 生命周期

| 生命周期 | 行为 |
|----------|------|
| `useDidShow` | 检查 AuthStore.isLoggedIn, 若已登录则 `redirectTo` 首页 |
| `useReady` | 从本地存储读取"记住密码"的手机号和密码, 自动填入 |

#### 4 UI 状态

| 状态 | 条件 | UI |
|------|------|-----|
| loading | 点击登录按钮后，API 请求中 | 登录按钮 spinning + 禁用 + "登录中..." |
| empty | N/A (登录页无空状态) | — |
| error | API 返回 401 / 超时 / 网络异常 | 红色 Toast / 输入框下方红色错误文案; 按钮恢复可点击 |
| success | API 返回 200, Token 已存储 | Toast "登录成功" → redirectTo 首页 |

#### 输入校验

| 字段 | 规则 | 错误提示 |
|------|------|---------|
| 手机号 | 11 位数字; 非空 | "请输入正确的手机号" |
| 密码 | 不少于 6 位; 非空 | "密码不能少于 6 位" |

---

### 8.2 首页 `pages/home/index`

#### 数据流

```
Props: 无 (Tab 页)
State:
  - brands: Brand[]            (品牌列表, 来自 VehicleStore)
  - brandsLoading: boolean
  - brandsError: string | null
  - hotSchemes: HotScheme[]    (热门方案, 来自 API)
  - hotSchemesLoading: boolean
  - hotSchemesError: string | null

API:
  - vehicleService.getBrands()           → VehicleStore.fetchBrands()
  - configService.getConfigurations({ sort: 'trending', limit: 6 })

Store:
  - VehicleStore.fetchBrands()
  - VehicleStore.brands / .brandsLoading / .brandsError
```

#### 生命周期

| 生命周期 | 行为 |
|----------|------|
| `useDidShow` | 每次 Tab 切换进入时刷新品牌数据 + 热门方案 |
| `usePullDownRefresh` | 重新请求品牌 API + 热门方案 API |

#### 4 UI 状态

| 状态 | 条件 | 品牌区域 | 热门方案区域 |
|------|------|----------|-------------|
| loading | API 请求中 | BrandGrid `loading=true` → 骨架屏 | ScrollView 内 3 个 HotSchemeCard 骨架屏 |
| empty | API 返回空数组 | EmptyState("暂无品牌数据") | EmptyState("暂无热门推荐") |
| error | API 返回 500 / 超时 | ErrorState("数据加载失败", onRetry) | ErrorState("数据加载失败", onRetry) |
| success | API 正常返回 | BrandGrid 展示品牌 Logo 网格 | HotSchemeCard 横向滚动列表 |

---

### 8.3 车型选择 `pages/home/car-select`

#### 数据流

```
Props (路由参数):
  - brandId?: string          (从首页品牌入口进入时传入)

State:
  - currentLevel: 'brand' | 'series' | 'model'
  - brands: Brand[]            → VehicleStore.brands
  - series: Series[]           → VehicleStore.seriesMap[brandId]
  - models: Model[]            → VehicleStore.modelsMap[seriesId]
  - loading: boolean
  - error: string | null

API:
  - vehicleService.getBrands()
  - vehicleService.getSeries(brandId)
  - vehicleService.getModels(seriesId)

Store:
  - VehicleStore (全部操作委托给 Store, 利用缓存)
```

#### 生命周期

| 生命周期 | 行为 |
|----------|------|
| `useLoad` (onLoad) | 从路由参数读取 brandId; 若存在 → 自动定位到品牌并加载车系; 若不存在 → 从品牌列表开始 |
| `useDidShow` | 无特殊处理 (数据已在 Store 缓存) |

#### 4 UI 状态

| 状态 | 条件 | UI |
|------|------|-----|
| loading | 当前级 API 请求中 | LoadingSkeleton type="scheme-list" |
| empty | 当前级 API 返回空数组 | EmptyState (逐级文案: "暂无品牌数据" / "该品牌暂无车系数据" / "该车系暂无型号数据") |
| error | 当前级 API 返回 500 / 超时 | ErrorState + 重试按钮 (仅当前级受影响, 面包屑可返回上级) |
| success | 数据正常展示 | 面包屑导航 + 列表 |

---

### 8.4 改色工作台 `pages/design/index` (核心页面)

#### 数据流

```
Props (路由参数):
  - modelId?: string           (可选; 从车型选择或方案恢复时传入; 作为 Tab 页直接进入时为空)
  - configurationId?: string   (可选, 从"我的方案"恢复时传入)

State:
  modelUrl: string | null          (当前车型的 3D 模型 URL, 来自 API)
  model3dLoading: boolean          (3D 模型加载中)
  model3dError: string | null      (3D 模型加载失败信息)
  webViewConnected: boolean        (WebView 通信状态)

  colorBrands: ColorBrand[]        → ColorStore
  currentSwatches: ColorSwatchItem[] → ColorStore
  selectedSwatch: ColorSwatchItem | null → ColorStore
  customHex: string | null         → ColorStore
  selectedMaterial: Material | null → ColorStore

  debouncedHex: string | null      (防抖后的当前 HEX 颜色)

API:
  - vehicleService.getModels(seriesId)  → 获取 modelUrl
  - colorService.getColorBrands()
  - colorService.getSwatches(brandId)
  - colorService.getMaterials()

Store:
  - ConfigStore.setModel(model)
  - ColorStore (全部色卡/材质操作)
  - VehicleStore.selectedModel

WebView 通信:
  - ThreeDViewer ref api: setColor / setMaterial / resetView / capture
```

#### 生命周期

| 生命周期 | 行为 |
|----------|------|
| `useLoad` (onLoad) | 获取路由参数 modelId + configurationId; 若无 modelId (Tab 直接进入)，展示引导 UI; 若 configurationId 存在则从 ConfigStore 恢复方案 |
| `useDidShow` | 无特殊处理 |
| `useDidHide` | postMessage 通知 H5 `PAUSE_RENDER` (暂停渲染循环) |
| `useReady` | 加载色卡品牌 + 材质数据 (并行); 初始化 ThreeDViewer |
| `useUnload` | ConfigStore 不清空 (保留以便返回); 清理防抖计时器 |

#### 4 UI 状态

| 状态 | 条件 | 3D 区 | 色卡面板 |
|------|------|-------|---------|
| guide | modelId 未传入 (Tab 直接进入) | EmptyState("请先从首页选择车型") + "去选车"按钮 → switchTab('pages/home/index') | 不展示 |
| loading | 模型加载中 + 色卡加载中 | 进度条 + "模型加载中 45%..." | LoadingSkeleton type="swatch-grid" |
| empty | modelUrl 为空 | 静态车型占位图 + "3D 模型暂未上线，敬请期待" | 色卡正常可交互 |
| error | 3D 加载超时 (15s) / MODEL_ERROR | 错误图标 + "模型加载失败" + 重载按钮 | 色卡正常情况下仍可用 |
| success | MODEL_READY + 色卡数据就绪 | 可交互 3D 模型 | 色卡品牌 Tab + 颜色网格可点击 |

**3D 区和色卡面板的错误状态独立**：3D 加载失败不影响用户浏览色卡和切换品牌 (3D 区展示降级 UI，色卡面板保持可操作)。仅当 postMessage 通信断开时，色卡选择器才禁用并向用户提示。

#### 防抖策略 (颜色选择)

```typescript
// 在 design/index 中
const debouncedSetColor = useMemo(
  () => debounce((hex: string) => {
    viewerRef.current?.setColor(hex);
    ColorStore.getState().selectSwatch(swatch); // 或 setCustomColor
  }, 300),
  []
);
```

---

### 8.5 报价单页 `pages/design/quote`

#### 数据流

```
Props (路由参数):
  - modelId: string
  - swatchId: string
  - materialId: string
  - hex: string

State:
  modelName: string               (品牌+车系+型号, 从 VehicleStore 和 ColorStore 拼接)
  swatchName: string
  materialName: string
  priceLoading: boolean           (价格区域)
  priceError: string | null
  priceData: { materialCost, laborCost, totalPrice } | null

  customerName: string            (表单输入)
  customerPhone: string           (表单输入)
  remark: string                  (表单输入)
  submitting: boolean             (提交按钮 loading)
  submitError: string | null
  submitSuccess: boolean

API:
  - configService.createConfiguration(...)  (提交前保存方案)
  - quoteService.createQuote(...)           (生成报价)

Store:
  - ConfigStore (读取当前方案; 保存 configuration 后更新 configurationId)
```

#### 生命周期

| 生命周期 | 行为 |
|----------|------|
| `useLoad` | 读取路由参数; 从 VehicleStore/ColorStore 拼接展示信息; 请求价格计算 |
| `useUnload` | 若 submitSuccess=false, 检查是否有未提交输入 → 弹窗 "离开后数据将丢失" |

#### 4 UI 状态

| 状态 | 条件 | UI |
|------|------|-----|
| loading | 价格 API 请求中 | "正在计算价格..." loading 文案占位 |
| empty | N/A | 报价单页始终有车型+颜色数据进入 |
| error | 价格计算 / 方案保存 / 报价生成 任一失败 | 对应区域独立展示错误 + 重试按钮 |
| success | 报价生成成功 | "报价已生成" + 报价编号 + "查看我的方案"链接 + "继续设计"按钮 |

#### 输入校验

| 字段 | 规则 | 错误提示 |
|------|------|---------|
| 客户姓名 | 必填; 2-20 字符; 仅允许中文/英文/空格; 禁止纯数字 | "请输入正确的客户姓名" |
| 客户手机号 | 必填; 11 位数字; 号段 13/15/17/18/19 | "请输入正确的手机号" |
| 备注 | 选填; 最多 200 字 | 超过 200 字自动截断 + Toast 提示 |

---

### 8.6 案例列表 `pages/cases/index`

#### 数据流

```
Props: 无 (Tab 页)
State:
  cases: CaseItem[]              (Phase 1 本地 mock 数据)
  loading: boolean               (模拟加载)
  page: number                   (客户端分页)
  hasMore: boolean

API:
  无 (Phase 1 使用 static mock JSON 文件, Phase 2 接入后端 API)

Store:
  无 (暂不需要跨页面共享)
```

#### 生命周期

| 生命周期 | 行为 |
|----------|------|
| `useDidShow` | 首次加载 mock 数据 (模拟 500ms 延迟展示骨架屏效果) |
| `useReachBottom` | 加载下一页 (客户端模拟分页) |
| `usePullDownRefresh` | 重新加载 (重置到第 1 页) |

#### 4 UI 状态

| 状态 | 条件 | UI |
|------|------|-----|
| loading | 首次加载中 | LoadingSkeleton type="case-card" (3x2 网格骨架) |
| empty | mock 数据为空数组 | EmptyState("暂无完工案例") |
| error | N/A (Phase 1 无网络请求, 仅模拟) | — |
| success | 数据正常 | 网格布局案例卡片; 底部 "没有更多了" (hasMore=false 时) |

---

### 8.7 我的页面 `pages/profile/index`

#### 数据流

```
Props: 无 (Tab 页)
State:
  staff: StaffInfo | null        → AuthStore.staff
  schemes: Configuration[]       (历史方案列表)
  schemesLoading: boolean
  schemesError: string | null
  page: number
  hasMore: boolean

API:
  - configService.getConfigurations({ page, limit: 20 })

Store:
  - AuthStore.staff / .logout()
```

#### 生命周期

| 生命周期 | 行为 |
|----------|------|
| `useDidShow` | 刷新店员信息 + 加载方案列表 (第 1 页) |
| `useReachBottom` | 加载下一页方案 |
| `usePullDownRefresh` | 重新加载方案列表 |

#### 4 UI 状态

| 状态 | 条件 | UI |
|------|------|-----|
| loading | 方案列表 API 请求中 (首次) | LoadingSkeleton type="profile" (列表骨架) |
| empty | 方案列表 API 返回空数组 (total=0) | EmptyState("暂无改色方案", actionText="去创建一个", onAction → navigateToHome) |
| error | 方案 API 500 / 超时 | ErrorState("加载失败，请重试", onRetry) |
| success | 数据正常 | 店员信息卡片 + 方案列表 + 退出按钮 |

#### 退出登录流程

```
用户点击"退出登录"
  → 二次确认弹窗 ("确定要退出登录吗?")
  → 点击"确定":
     → AuthStore.logout()
        → 清除 Token (内存 + Taro.Storage)
        → 重置 isLoggedIn
        → Taro.redirectTo('/pages/auth/login')
  → 点击"取消": 关闭弹窗
```

---

## 9. 3D WebView H5 页面架构

### 9.1 文件结构与职责

```
webview/3d-renderer/
├── index.html              # H5 入口 (加载 main.ts 的 script 标签)
├── main.ts                 # 应用入口: 场景初始化 + 消息监听注册
├── config.ts               # Three.js 场景常量配置 (相机/灯光/Orbit 参数)
├── model-loader.ts         # glTF/GLB 加载 + 进度汇报 + 缓存
├── color-manager.ts        # 遍历模型材质 → 修改颜色/粗糙度/金属度
├── capture.ts              # Canvas.toDataURL 截图
├── bridge.ts               # postMessage 双向通信封装
├── types.ts                # 消息类型 (与 Taro 端共享定义)
├── package.json            # { dependencies: { three: "^0.170.0" } }
└── tsconfig.json           # target: ES2017, module: ESNext
```

### 9.2 Three.js 场景初始化 (`main.ts`)

> **配置提取**：所有硬编码的相机位置、灯光参数、背景色、像素比限制等常量提取到 `webview/3d-renderer/config.ts` 统一管理，便于不同车型调整初始视角和无代码修改调参。

**`webview/3d-renderer/config.ts` 常量清单**：

```typescript
// webview/3d-renderer/config.ts
export const SCENE_CONFIG = {
  BACKGROUND_COLOR: 0xF5F5F5,
  PIXEL_RATIO_MAX: 2,
} as const;

export const CAMERA_CONFIG = {
  FOV: 45,
  NEAR: 0.1,
  FAR: 100,
  POSITION: { x: 3, y: 2, z: 5 } as const,
  LOOK_AT: { x: 0, y: 0.5, z: 0 } as const,
} as const;

export const LIGHT_CONFIG = {
  AMBIENT: { color: 0xFFFFFF, intensity: 0.6 },
  KEY: { color: 0xFFFFFF, intensity: 1.2, position: { x: 5, y: 10, z: 5 }, shadowMapSize: 1024 },
  FILL: { color: 0xFFFFFF, intensity: 0.4, position: { x: -3, y: 3, z: -3 } },
  RIM: { color: 0xFFFFFF, intensity: 0.3, position: { x: 0, y: 2, z: -5 } },
} as const;

export const ORBIT_CONFIG = {
  MIN_DISTANCE: 1.5,
  MAX_DISTANCE: 10,
  MAX_POLAR_ANGLE: Math.PI / 2,
  DAMPING_FACTOR: 0.05,
} as const;
```

**注**：`main.ts` 中所有硬编码的数值均替换为从 `config.ts` 导入的常量引用。

```typescript
// webview/3d-renderer/main.ts (伪代码结构)
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { loadModel } from './model-loader';
import { initBridge, sendToTaro } from './bridge';
import { WebViewMessageType } from './types';

// --- 场景全局对象 ---
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let currentModel: THREE.Group | null = null;
let animationId: number | null = null;

// --- 初始化 ---
function init(): void {
  // 1. 创建场景
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xF5F5F5);

  // 2. 创建相机
  camera = new THREE.PerspectiveCamera(
    45,                                    // FOV
    window.innerWidth / window.innerHeight, // Aspect
    0.1,                                   // Near
    100                                    // Far
  );
  camera.position.set(3, 2, 5);
  camera.lookAt(0, 0.5, 0);

  // 3. 创建渲染器
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,  // 截图需要
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 限制像素比 (低端机降级)
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  document.getElementById('app')!.appendChild(renderer.domElement);

  // 4. 添加灯光
  // 环境光 (基础照明)
  const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.6);
  scene.add(ambientLight);

  // 主方向光 (模拟展厅灯光, 产生高光和阴影)
  const keyLight = new THREE.DirectionalLight(0xFFFFFF, 1.2);
  keyLight.position.set(5, 10, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  scene.add(keyLight);

  // 补光 (减少暗部过黑)
  const fillLight = new THREE.DirectionalLight(0xFFFFFF, 0.4);
  fillLight.position.set(-3, 3, -3);
  scene.add(fillLight);

  // 边缘光 (勾勒车身轮廓)
  const rimLight = new THREE.DirectionalLight(0xFFFFFF, 0.3);
  rimLight.position.set(0, 2, -5);
  scene.add(rimLight);

  // 5. 添加地面反射平面 (可选, 增强展示效果)
  // ...

  // 6. 添加 OrbitControls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 1.5;
  controls.maxDistance = 10;
  controls.maxPolarAngle = Math.PI / 2; // 限制垂直旋转 (防止翻到底部)
  controls.target.set(0, 0.5, 0);
  controls.update();

  // 7. 初始化通信桥
  initBridge(handleTaroMessage);

  // 8. 启动渲染循环
  animate();

  // 9. 通知 Taro: H5 就绪 (携带 bridgeReady 标记通信通道状态)
  sendToTaro({
    type: WebViewMessageType.H5_READY,
    payload: { bridgeReady: true }, // bridge.ts 中 initBridge 时检测并替换实际值
    timestamp: Date.now(),
  });
}

// --- 渲染循环 ---
function animate(): void {
  animationId = requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// --- 处理来自 Taro 的消息 ---
function handleTaroMessage(msg: TaroToH5Message): void {
  switch (msg.type) {
    case WebViewMessageType.MODEL_URL:
      loadModel(scene, msg.payload.url, (progress) => {
        sendToTaro({ type: WebViewMessageType.MODEL_LOADING, payload: { progress }, timestamp: Date.now() });
      }).then((model) => {
        currentModel = model;
        sendToTaro({ type: WebViewMessageType.MODEL_READY, timestamp: Date.now() });
      }).catch((err) => {
        sendToTaro({ type: WebViewMessageType.MODEL_ERROR, payload: { error: err.message }, timestamp: Date.now() });
      });
      break;

    case WebViewMessageType.SET_COLOR:
      if (currentModel) {
        applyColor(currentModel, msg.payload.hex);
        sendToTaro({ type: WebViewMessageType.COLOR_APPLIED, timestamp: Date.now() });
      }
      break;

    case WebViewMessageType.SET_MATERIAL:
      if (currentModel) {
        applyMaterial(currentModel, msg.payload.material);
        sendToTaro({ type: WebViewMessageType.COLOR_APPLIED, timestamp: Date.now() });
      }
      break;

    case WebViewMessageType.RESET_VIEW:
      camera.position.set(3, 2, 5);
      controls.target.set(0, 0.5, 0);
      controls.update();
      break;

    case WebViewMessageType.CAPTURE:
      captureScreenshot(renderer).then((image) => {
        sendToTaro({ type: WebViewMessageType.CAPTURE_RESULT, payload: { image }, timestamp: Date.now() });
      });
      break;

    case WebViewMessageType.PAUSE_RENDER:
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      break;

    case WebViewMessageType.RESUME_RENDER:
      if (animationId === null) {
        animate();
      }
      break;

    case WebViewMessageType.PING:
      sendToTaro({ type: WebViewMessageType.PONG, timestamp: Date.now() });
      break;
  }
}

// --- 窗口大小自适应 ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// 启动
init();
```

### 9.3 glTF/GLB 模型加载与缓存 (`model-loader.ts`)

> **DRACO 解码器 URL 策略**：解码器路径提取到 `config.ts`，并提供 OSS 部署 + Google CDN 双通道降级。国内环境优先使用 OSS 部署的解码器（部署到 `https://oss.wraplab.cn/draco/1.5.7/`），加载失败时降级到 Google CDN。若两者均失败，跳过 DRACO 解压直接加载原始 GLB。

```typescript
// webview/3d-renderer/model-loader.ts
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { DRACO_DECODER_URLS } from './config';

// --- DRACO 解压缩 (减少模型文件体积, 多通道降级) ---
const dracoLoader = new DRACOLoader();

// 优先使用 OSS 部署的解码器 (国内网络友好)，失败降级 Google CDN
let dracoInitialized = false;
async function initDraco(): Promise<boolean> {
  for (const url of DRACO_DECODER_URLS) {
    try {
      dracoLoader.setDecoderPath(url);
      dracoInitialized = true;
      return true;
    } catch {
      console.warn(`[DRACO] 解码器加载失败: ${url}, 尝试下一通道`);
    }
  }
  console.warn('[DRACO] 所有 DRACO 通道不可用, 降级为非压缩加载');
  return false;
}

// config.ts 中:
// export const DRACO_DECODER_URLS = [
//   'https://oss.wraplab.cn/draco/1.5.7/',       // 自有 OSS (优先)
//   'https://www.gstatic.com/draco/versioned/decoders/1.5.7/',  // Google CDN (降级)
// ];

const gltfLoader = new GLTFLoader();
// 仅在 DRACO 初始化成功后才设置 DRACO loader
if (dracoInitialized) {
  gltfLoader.setDRACOLoader(dracoLoader);
}

/** 模型缓存 (key=url, value=THREE.Group) */
const modelCache = new Map<string, THREE.Group>();

/**
 * 加载 3D 模型
 * @param scene - Three.js 场景
 * @param url - 模型文件 URL (OSS)
 * @param onProgress - 加载进度回调 (0-100)
 * @returns 加载完成的模型 Group
 */
export async function loadModel(
  scene: THREE.Scene,
  url: string,
  onProgress: (progress: number) => void
): Promise<THREE.Group> {
  // 1. 检查缓存
  const cached = modelCache.get(url);
  if (cached) {
    const clone = cached.clone(true);
    scene.add(clone);
    onProgress(100);
    return clone;
  }

  // 2. 加载模型
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      url,
      (gltf) => {
        const model = gltf.scene;

        // 居中模型
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        model.position.y += box.getSize(new THREE.Vector3()).y / 2; // 底部对齐地面

        // 遍历模型，确保所有 Mesh 可接收/投射阴影
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        scene.add(model);

        // 缓存原始模型 (后续请求从缓存克隆)
        modelCache.set(url, model.clone(true));

        onProgress(100);
        resolve(model);
      },
      (progressEvent) => {
        // 加载进度 (并非所有 CDN 都支持 Content-Length header, 可能为 0)
        if (progressEvent.total > 0) {
          const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          onProgress(progress);
        } else {
          // 无法计算精确百分比时，使用估算进度或显示 "加载中..."
          // 注: Phase 1 简化处理，进度汇报回退到每 500ms 递增 5% 的估算值 (上限 90%)
        }
      },
      (error) => {
        reject(new Error(`模型加载失败: ${(error as ErrorEvent).message || '未知错误'}`));
      }
    );
  });
}

/** 清除模型缓存 */
export function clearCache(): void {
  modelCache.clear();
}
```

### 9.4 材质颜色修改 (`color-manager.ts`)

```typescript
// webview/3d-renderer/color-manager.ts
import * as THREE from 'three';

/** 材质类型到物理属性映射 */
const MATERIAL_PRESETS: Record<string, { roughness: number; metalness: number }> = {
  glossy:  { roughness: 0.15, metalness: 0.05 },  // 亮面
  matte:   { roughness: 0.70, metalness: 0.02 },  // 哑光
  satin:   { roughness: 0.35, metalness: 0.03 },  // 磨砂
};

/**
 * 将 HEX 颜色应用到模型的所有材质
 * @param model - 3D 模型 Group
 * @param hex - HEX 颜色值 (含 # 前缀, 如 "#FF0000")
 * @param duration - 渐变过渡时间 (ms), 默认 300ms
 */
export function applyColor(model: THREE.Group, hex: string, duration = 300): void {
  const targetColor = new THREE.Color(hex);

  model.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];

      for (const mat of materials) {
        if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
          // Phase 1: 全车统一色 — 所有车身部件统一修改
          // Phase 2 扩展: 通过 mesh.name / userData.partCode 识别部件, 实现分区改色

          const startColor = mat.color.clone();
          const startTime = performance.now();

          // 使用 requestAnimationFrame 实现平滑渐变
          function animateColor(now: number) {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);
            // easeInOutQuad 缓动
            const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            mat.color.copy(startColor).lerp(targetColor, eased);

            if (t < 1) {
              requestAnimationFrame(animateColor);
            }
          }

          requestAnimationFrame(animateColor);
        }
      }
    }
  });
}

/**
 * 应用材质类型 (修改 roughness/metalness)
 */
export function applyMaterial(model: THREE.Group, materialType: string): void {
  const preset = MATERIAL_PRESETS[materialType] || MATERIAL_PRESETS.glossy;

  model.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];

      for (const mat of materials) {
        if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
          mat.roughness = preset.roughness;
          mat.metalness = preset.metalness;
          mat.needsUpdate = true;
        }
      }
    }
  });
}
```

### 9.5 postMessage 通信桥 (`bridge.ts`)

```typescript
// webview/3d-renderer/bridge.ts
import { WebViewMessageType, TaroToH5Message, H5ToTaroMessage } from './types';

type MessageHandler = (msg: TaroToH5Message) => void;

let handler: MessageHandler | null = null;

/**
 * 初始化通信桥
 * - 注册消息监听
 * - 发送 H5_READY
 */
export function initBridge(onMessage: MessageHandler): void {
  handler = onMessage;

  // 检测 wx.miniProgram 是否可用（JS-SDK 是否加载成功）
  const bridgeAvailable = typeof (window as any).wx !== 'undefined'
    && (window as any).wx.miniProgram
    && typeof (window as any).wx.miniProgram.postMessage === 'function';

  if (!bridgeAvailable) {
    console.error('[Bridge] wx.miniProgram 不可用，postMessage 通信通道未就绪');
    // 发送 H5_READY 时携带 bridgeReady: false，让 Taro 端提前降级
  }

  // 监听来自小程序的 postMessage
  // 微信: wx.miniProgram.postMessage 发送的消息通过 bindmessage 事件接收
  // H5 需要监听 message 事件 (微信 WebView 中特定方式)
  window.addEventListener('message', (event) => {
    try {
      // 仅处理来自小程序的消息 (通过 origin 过滤或数据结构判断)
      const msg = event.data as TaroToH5Message;
      if (msg && msg.type && Object.values(WebViewMessageType).includes(msg.type)) {
        handler?.(msg);
      }
    } catch {
      // 忽略无法解析的消息
    }
  });

  // 额外: 部分微信 WebView 环境中 postMessage 通过其他方式触发
  // 使用 document.addEventListener('WeixinJSBridgeReady') 的兼容方案
  if (typeof (window as any).WeixinJSBridge !== 'undefined') {
    (window as any).WeixinJSBridge.on('onMessage', (res: any) => {
      try {
        const msg = JSON.parse(res.data) as TaroToH5Message;
        if (msg && msg.type) {
          handler?.(msg);
        }
      } catch { /* ignore */ }
    });
  }
}

/**
 * 向小程序发送消息
 * 微信: 使用 wx.miniProgram.postMessage
 */
export function sendToTaro(msg: H5ToTaroMessage): void {
  try {
    // 微信小程序 WebView 环境
    if (typeof (window as any).wx !== 'undefined' && (window as any).wx.miniProgram) {
      (window as any).wx.miniProgram.postMessage({ data: msg });
    } else {
      // 开发环境 (浏览器直接打开) — 回退到 console
      console.log('[Bridge] H5 → Taro:', msg);
    }
  } catch (err) {
    console.error('[Bridge] 发送消息失败:', err);
  }
}
```

### 9.6 截图 (`capture.ts`)

```typescript
// webview/3d-renderer/capture.ts
import * as THREE from 'three';

/**
 * 截取当前渲染画面并返回 base64
 */
export function captureScreenshot(renderer: THREE.WebGLRenderer): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // 强制渲染一帧确保画面最新
      renderer.render(scene, camera);
      const dataURL = renderer.domElement.toDataURL('image/png');
      resolve(dataURL);
    } catch (err) {
      reject(new Error(`截图失败: ${(err as Error).message}`));
    }
  });
}
```

### 9.7 模型缺失降级 UI

当 `modelUrl` 为空或加载失败时，ThreeDViewer 不创建 WebView 组件，而是展示降级 UI：

```typescript
// ThreeDViewer/index.tsx 中
if (!modelUrl) {
  // 降级状态: 模型中未上线
  return (
    <View className="viewer-placeholder">
      <Image src={placeholderCarImage} mode="aspectFit" />
      <Text>3D 模型暂未上线，敬请期待</Text>
      {/* 色卡仍然可用, 用户可先浏览颜色搭配 */}
    </View>
  );
}
```

**降级层级**：

| 层级 | 条件 | UI |
|------|------|-----|
| L0 - 正常 | modelUrl 有效 + 加载成功 | WebView + 3D 模型交互 |
| L1 - 模型缺失 | modelUrl 为空/不存在 | 静态车型占位图 + 提示文案; 色卡可用 |
| L2 - 加载超时 | 15s 内 MODEL_READY 未到 | 错误图标 + "重新加载"按钮 |
| L3 - 致命错误 | 连续 3 次 MODEL_ERROR | 静态占位图 + "3D 渲染引擎异常"提示; 不再尝试加载; 色卡仍可用 |

---

## 10. 技术决策

| 决策 | 选择 | 备选方案 | 理由 |
|------|------|----------|------|
| 跨平台框架 | Taro 3.x (React mode) | uni-app / 原生 | 团队 React 技术栈积累; 多端发布能力; 生态成熟 |
| 3D 渲染 | WebView + Three.js | 小程序原生 Canvas WebGL | 小程序不支持 WebGL; WebView 是最可行方案; postMessage 通信稳定 |
| 状态管理 | Zustand | Redux Toolkit / Jotai | 轻量 (1KB); API 简洁; TypeScript 类型推导优秀; 无 Provider 嵌套 |
| 色卡选择器 UI | 底部滑动面板 | 全屏弹窗 | 不遮挡 3D 模型区; 单手可操作; 热区 > 44pt |
| 3D 模型格式 | glTF/GLB + DRACO 压缩 | OBJ/FBX | 标准格式; 二进制加载快; DRACO 可压缩 80%+ |
| Token 存储 (Phase 1) | Taro.setStorage 明文存储 | 加密存储方案 | Phase 1 快速交付; 加密方案延后到 Phase 2 |
| WebView 页面 | 本地打包 | 远程 H5 URL | 无网络依赖; 与小程序版本统一管理; 审核一致 |
| 模型文件 | 远程 OSS | 本地打包 | 模型文件过大不适合打包; 可独立更新不依赖发版 |
| 颜色切换 | 全车统一色 | 分区改色 | Phase 1 验证核心流程; 分区改色复杂度高, 延后到 Phase 2 |
| 案例数据 (Phase 1) | 本地静态 mock JSON | 后端 API | 快速上线; 后端案例系统延后到 Phase 2 |
| postMessage 通信 | 微信原生 postMessage | 自定义 JSBridge | Phase 1 仅微信平台; 跨平台适配延后到 Phase 2 |

---

## 11. 开发环境

```bash
# 安装依赖
npm install

# 开发 (微信小程序)
npm run dev:weapp

# 类型检查
npm run typecheck

# ESLint 检查
npm run lint

# 运行测试
npm run test

# 构建生产包
npm run build:weapp
```

**WebView H5 独立开发**：

```bash
# 进入 webview 目录
cd webview/3d-renderer

# 安装 H5 依赖
npm install

# 启动 H5 开发服务器 (浏览器中调试 Three.js)
npm run dev

# 构建 H5 产物 (输出到小程序 webview 目录)
npm run build
```

**环境变量**：

| 变量 | 开发 | 生产 |
|------|------|------|
| `TARO_APP_API_BASE_URL` | `http://localhost:3000` | `https://api.wraplab.cn` |
| `TARO_APP_OSS_BASE_URL` | `https://dev-oss.wraplab.cn` | `https://oss.wraplab.cn` |

---

## 12. 架构约束与原则

1. **跨边界输入必校验**：所有 API 请求参数通过 class-validator (DTO) 校验；所有路由参数通过 Zod 或手动校验；所有用户输入在组件层即时校验。
2. **禁止 `any` 类型**：服务层、Store、组件 Props 必须完整类型标注。
3. **禁止硬编码**：API URL、超时时间、错误码、正则表达式等配置项统一在 `utils/constants.ts` 管理。
4. **组件纯展示优先**：组件不直接调用 API (通过 props 回调); 页面负责数据获取和 Store 交互。
5. **错误边界**：每个页面包裹 ErrorBoundary, 防止单页崩溃影响全局。
6. **性能预算**：首屏渲染 < 2s; 颜色切换 < 500ms; 骨架屏 200ms 内展示。
7. **多租户基因**：虽 Phase 1 为单门店体验，但 JWT 已包含 store_id，API 层已就绪多租户隔离。

---

*架构版本：v1.1*
*编写角色：🏛️ Software Architect*
*更新日期：2026-07-22*
*变更摘要：修复设计评审 6 Blocker + 9 Should Fix (详见 architecture-review-report.md)*

---

## Phase 2 Architecture

**状态**：Draft (v2.0)
**日期**：2026-07-22
**编写角色**：Architect
**前置依赖**：Phase 1 MVP 完成并通过验收

---

### 1. Phase 2 Overview

Phase 2 deepens the WrapLab experience in three directions while maintaining the Phase 1 architecture layers (pages, components, stores, services, utils). The key architectural changes are:

| Area | Phase 1 | Phase 2 |
|------|---------|---------|
| Color mode | FULL (whole-car) only | FULL + PART (per-part) |
| WebView comms | URL hash bridge (postMessage) | WebSocket primary, postMessage fallback |
| Platform support | WeChat only | WeChat / Alipay / Douyin / HarmonyOS |
| Case data | Static mock JSON | REST API (`GET /api/v1/cases`) |
| Login | Phone + password only | + WeChat silent login |
| 3D messaging | 8 message types | +4 new types (SET_PART_COLOR, SET_MODE, HIGHLIGHT_PART, RESET_PARTS) |
| Navigation | 7 pages | 10 pages (+3 new) |
| Stores | 4 Zustand stores | 8 Zustand stores (+4 new) |
| API modules | 5 service modules | 8 service modules (+3 new, 1 modified) |
| Components | 9 shared components | 15 shared components (+6 new) |

---

### 2. Updated Project Structure

New and modified paths marked with `[NEW]` / `[MODIFIED]`.

```
wraplab-client/
├── src/
│   ├── pages/
│   │   ├── auth/login/                   # [MODIFIED] + 微信一键登录
│   │   ├── home/
│   │   │   ├── index/                    # [MODIFIED] 案例数据接入真实 API
│   │   │   └── car-select/               # [MODIFIED] + 搜索框 + 字母索引
│   │   ├── design/
│   │   │   ├── index/                    # [MODIFIED] + PART/FULL 切换 + WebSocket + AI 入口
│   │   │   └── quote/                    # [MODIFIED] + 分区颜色明细
│   │   ├── cases/
│   │   │   ├── index/                    # [MODIFIED] mock → 真实 API
│   │   │   └── detail/index/             # [NEW] 案例详情页
│   │   ├── profile/
│   │   │   ├── index/                    # [MODIFIED] + 收藏入口 + 微信状态
│   │   │   └── favorites/index/          # [NEW] 我的收藏
│   │   └── ai/
│   │       └── generate/index/           # [NEW] AI 生图
│   │
│   ├── components/
│   │   ├── PartSelector/                 # [NEW] 车身部件选择器
│   │   ├── CaseCard/                     # [NEW] 案例卡片
│   │   ├── ImageGallery/                 # [NEW] 可滑动图片轮播
│   │   ├── AiStylePicker/                # [NEW] AI 场景风格选择器
│   │   ├── LetterIndex/                  # [NEW] A-Z 字母索引导航
│   │   ├── SearchBar/                    # [NEW] 可复用搜索框组件
│   │   ├── FavoriteButton/               # [NEW] 收藏按钮 (乐观更新)
│   │   ├── GenerationStatus/             # [NEW] AI 生成任务状态组件
│   │   ├── ThreeDViewer/                 # [MODIFIED] WebSocket 通信 + 分区消息
│   │   ├── ColorSwatch/                  # [MODIFIED] 分区模式下传递 partCode
│   │   ├── SchemeListItem/               # [MODIFIED] 新增收藏按钮
│   │   └── ... (Phase 1 组件不变)
│   │
│   ├── platform/                         # [NEW] 跨平台适配层
│   │   ├── types.ts                      # PlatformBridge 接口定义
│   │   ├── wechat.ts                     # 微信适配器
│   │   ├── alipay.ts                     # 支付宝适配器
│   │   ├── douyin.ts                     # 抖音适配器
│   │   └── index.ts                      # 工厂: detectPlatform → adapter
│   │
│   ├── api/                              # [NEW] API 模块独立目录 (从 services 迁移)
│   │   ├── ws-client.ts                  # [NEW] WebSocket 客户端封装
│   │   ├── case.ts                       # [NEW] 案例 API
│   │   ├── favorite.ts                   # [NEW] 收藏 API
│   │   ├── ai.ts                         # [NEW] AI 生图 API
│   │   ├── parts.ts                      # [NEW] 车型部件 API
│   │   └── config.ts                     # [MODIFIED] 新增 updateParts
│   │
│   ├── services/                         # [RETAINED] Phase 1 服务层保持不变
│   │   ├── request.ts                    # [MODIFIED] Token 存储升级加密
│   │   ├── auth.service.ts               # [MODIFIED] 新增 wechatLogin, wechatBind
│   │   ├── vehicle.service.ts            # [RETAINED]
│   │   ├── color.service.ts              # [RETAINED]
│   │   ├── config.service.ts             # [RETAINED] (轻量不变, 复杂新增走 api/)
│   │   └── quote.service.ts              # [RETAINED]
│   │
│   ├── stores/
│   │   ├── auth-store.ts                 # [MODIFIED] 新增 wechatLogin action
│   │   ├── vehicle-store.ts              # [RETAINED]
│   │   ├── color-store.ts                # [RETAINED]
│   │   ├── config-store.ts               # [MODIFIED] 新增 mode, parts, fromCaseId
│   │   ├── case-store.ts                 # [NEW]
│   │   ├── favorite-store.ts             # [NEW]
│   │   ├── ai-store.ts                   # [NEW]
│   │   ├── part-store.ts                 # [NEW]
│   │   └── index.ts                      # [MODIFIED] 导出新 stores
│   │
│   ├── types/
│   │   ├── message.ts                    # [MODIFIED] 新增 Phase 2 消息类型
│   │   ├── config.ts                     # [MODIFIED] 新增 Mode, PartConfig 类型
│   │   └── ... (Phase 1 类型不变)
│   │
│   └── utils/
│       ├── constants.ts                  # [MODIFIED] 新增 WS_URL, 错误码
│       └── storage.ts                    # [MODIFIED] 加密存储方案
│
├── webview/3d-renderer/
│   ├── bridge.ts                         # [MODIFIED] 新增 WebSocket 客户端
│   ├── color-manager.ts                  # [MODIFIED] 新增 applyPartColor()
│   ├── types.ts                          # [MODIFIED] 新增 Phase 2 消息类型
│   └── ws-client.ts                      # [NEW] H5 侧 WebSocket 客户端
```

**目录设计决策**：新增 `src/api/` 和 `src/platform/` 两个顶级目录，将 Phase 2 新增的复杂模块与 Phase 1 的 `services/` 分层隔离。`api/` 承载 WebSocket 客户端和新增 REST 模块，`platform/` 承载跨平台适配器。Phase 1 的 `services/` 结构保持不变。

---

### 3. Updated Route Design

#### 3.1 app.config.ts Page Registration (Phase 2)

```typescript
// src/app.config.ts (Phase 2)
export default defineAppConfig({
  pages: [
    // 4 个 Tab 页 — 必须在 pages 数组前 4 位 (不变)
    'pages/home/index',
    'pages/design/index',
    'pages/cases/index',
    'pages/profile/index',

    // 非 Tab 子页面 — Phase 1
    'pages/auth/login',
    'pages/home/car-select',
    'pages/design/quote',

    // 非 Tab 子页面 — Phase 2 NEW
    'pages/cases/detail/index',
    'pages/profile/favorites/index',
    'pages/ai/generate/index',
  ],

  tabBar: {
    // ... 不变: 4 tabs (首页 / 改色设计 / 案例 / 我的)
  },
});
```

#### 3.2 Phase 2 Route Parameter Contracts

| 源页面 | 目标页面 | 跳转方式 | 参数 | 说明 |
|--------|----------|----------|------|------|
| `cases/index` | `cases/detail/index` | `navigateTo` | `?id=:caseId` | 案例列表点击 |
| `profile/favorites/index` | `cases/detail/index` | `navigateTo` | `?id=:caseId` | 收藏列表-案例项点击 |
| `cases/detail/index` | `design/index` | `navigateTo` | `?modelId=&configurationId=&fromCaseId=` | "使用此方案" |
| `design/index` | `ai/generate/index` | `navigateTo` | `?configurationId=` | AI 生图入口 |
| `profile/index` | `profile/favorites/index` | `navigateTo` | 无 | 我的-收藏入口 |
| `profile/favorites/index` | `design/index` | `navigateTo` | `?modelId=&configurationId=` | 收藏列表-方案项点击 |

#### 3.3 Updated Navigate Utilities

```typescript
// src/utils/navigate.ts (Phase 2 additions)

/** 跳转案例详情 */
export function navigateToCaseDetail(caseId: string) {
  Taro.navigateTo({ url: `/pages/cases/detail/index?id=${caseId}` });
}

/** 跳转我的收藏 */
export function navigateToFavorites() {
  Taro.navigateTo({ url: '/pages/profile/favorites/index' });
}

/** 跳转 AI 生图 */
export function navigateToAiGenerate(configurationId: string) {
  Taro.navigateTo({ url: `/pages/ai/generate/index?configurationId=${configurationId}` });
}

/** 从案例跳转改色工作台 */
export function navigateToDesignFromCase(modelId: string, configurationId: string, fromCaseId: string) {
  Taro.navigateTo({
    url: `/pages/design/index?modelId=${modelId}&configurationId=${configurationId}&fromCaseId=${fromCaseId}`,
  });
}
```

---

### 4. Component Trees (Phase 2 New & Modified Pages)

#### 4.1 Case Detail `pages/cases/detail/index` [NEW]

```
pages/cases/detail/index
│
├── LoadingSkeleton (type="case-detail")        ← loading 状态
│   ├── View (图片区 420rpx 高骨架)
│   ├── View (方案信息 5 行文字线骨架)
│   └── View (门店区骨架)
│
├── ErrorState ("案例加载失败", onRetry)         ← error 状态
│
├── EmptyState ("案例不存在或已下架")             ← empty 状态 (404)
│   └── Button ("返回案例列表") → navigateBack()
│
└── View (正常内容)                              ← success 状态
    ├── ImageGallery (图片轮播)
    │   └── Swiper
    │       └── Image × N → onTap → wx.previewImage
    │       └── View (圆点指示器)
    ├── View (方案信息区)
    │   ├── Text (品牌 + 车系 + 型号)
    │   ├── View (颜色色块 + 颜色方案名)
    │   └── Text (材质类型)
    ├── View (价格明细区)
    │   ├── Text ("材料费: ¥X")
    │   ├── Text ("工时费: ¥X")
    │   └── Text ("总价: ¥X")
    ├── View (施工门店信息)
    │   ├── Image (门店 Logo)
    │   ├── Text (门店名称)
    │   └── Text (门店地址)
    ├── View (点赞区)
    │   ├── FavoriteButton (isLiked, likes, onToggle)
    │   └── Text (点赞数)
    ├── Button ("分享" — 右上角, P1) → 微信分享面板
    └── Button ("使用此方案", type="primary", fixed bottom)
        → POST /api/v1/configurations (fromCaseId)
        → navigateToDesignFromCase
```

#### 4.2 Favorites `pages/profile/favorites/index` [NEW]

```
pages/profile/favorites/index
│
├── LoadingSkeleton (type="favorite-list")       ← loading 状态
│   └── View (列表项骨架) × 5
│
├── ErrorState ("加载失败", onRetry)              ← error 状态
│
├── EmptyState ("还没有收藏，去案例广场看看吧")    ← empty 状态
│   └── Button ("去看看") → switchTab('pages/cases/index')
│
└── ScrollView (收藏列表)                        ← success 状态
    └── View (收藏项) × N
        ├── Image (缩略图)
        ├── View (车型名 + 颜色信息)
        ├── Text (收藏时间)
        ├── FavoriteButton (乐观更新)
        └── 左滑 → SwipeAction → "取消收藏" (P2)
    └── EmptyState ("没有更多了") [hasMore=false]
```

#### 4.3 AI Generate `pages/ai/generate/index` [NEW]

```
pages/ai/generate/index
│
├── View (方案摘要)                              ← 始终展示
│   ├── Text (车型 + 颜色)
│   └── Image (3D 截图缩略图)
│
├── [pending 状态]
│   └── GenerationStatus (status="pending", "排队中...")
│
├── [processing 状态]
│   └── GenerationStatus (status="processing", progress=N%)
│       ├── View (loading 动画)
│       └── Text ("AI 正在为您生成预览图... N%")
│
├── [completed 状态]
│   ├── Image (结果大图, mode="widthFix", 支持双指缩放)
│   └── View (操作按钮组)
│       ├── Button ("保存到相册") → Taro.saveImageToPhotosAlbum
│       ├── Button ("分享") → 分享卡片
│       └── Button ("重新生成") → 重新 POST
│
├── [failed 状态]
│   ├── View (失败图标)
│   ├── Text (errorMessage)
│   ├── Button ("重新生成")
│   └── Button ("返回工作台") → navigateBack()
│
├── [style selection — 初始状态]
│   ├── AiStylePicker
│   │   ├── LoadingSkeleton (type="style-card", count=6)  ← loading
│   │   ├── ErrorState ("风格加载失败", onRetry)           ← error
│   │   └── View (风格卡片网格)                            ← success
│   │       └── View (风格卡片) × N → onSelect → 高亮选中
│   │           ├── Image (风格预览图)
│   │           └── Text (风格名称)
│   ├── Textarea (自定义 prompt, maxlength=500)
│   │   └── View (快捷标签) × N → 点击填入 prompt
│   └── Button ("开始生成", type="primary")
│       → POST /api/v1/configurations/:id/generate-image
│
└── View (历史生成记录, P2)
    └── ScrollView
        └── Image (历史结果缩略图) × N → onTap → 查看大图
```

#### 4.4 Modified: Design Workbench `pages/design/index` [MODIFIED]

```
pages/design/index (Phase 2 additions marked with ★)
│
├── EmptyState ("请先从首页选择车型")               ← 引导状态
│
├── LoadingSkeleton (3D 区 loading)                ← loading
├── ErrorState (3D 加载失败)                        ← error
├── EmptyState ("3D 模型暂未上线")                  ← empty
│
└── View (工作台)                                  ← success
    ├── View (顶部: 颜色信息栏)
    │   ├── Text (色卡品牌名 + 颜色名)
    │   ├── View (色块预览)
    │   └── ★ View (模式切换: [全车] | [分区])      ← NEW
    │       → onToggle → postMessage SET_MODE
    │
    ├── Button ("重置视角") → RESET_VIEW
    │
    ├── ThreeDViewer (WebView 3D 容器)
    │   └── webview/3d-renderer/index.html
    │       ├── ★ WebSocket 客户端 (主力通道)
    │       ├── ★ PART_COLOR_APPLIED 回调
    │       └── phase1 postMessage (降级通道)
    │
    ├── ★ PartSelector [visible when mode=PART]    ← NEW
    │   ├── LoadingSkeleton (部件加载中)
    │   ├── ErrorState ("部件加载失败")
    │   ├── EmptyState ("该车型暂无部件数据")
    │   └── ScrollView (横向)
    │       └── View (部件项) × N
    │           ├── Text (部件名称)
    │           ├── View (当前颜色色块)
    │           └── onTap → HIGHLIGHT_PART + 设为当前编辑部件
    │   └── Button ("重置所有部件颜色", P1)
    │       → 确认弹窗 → RESET_PARTS
    │
    ├── MaterialSelector (不变)
    │
    ├── ColorSwatch
    │   ├── ScrollView (品牌 Tab 栏)
    │   ├── View (颜色网格)
    │   │   → onColorSelect:
    │   │      if mode=FULL → SET_COLOR
    │   │      ★ if mode=PART → SET_PART_COLOR { partCode, hex }
    │   └── Text ("+ 自定义颜色")
    │
    ├── Button ("生成报价单") → navigateToQuote(...)
    │
    └── ★ Button ("AI 生成预览图", type="secondary")  ← NEW
        → navigateToAiGenerate(configurationId)
```

#### 4.5 Modified: Car Select `pages/home/car-select` [MODIFIED]

```
pages/home/car-select (Phase 2 additions marked with ★)
│
├── ★ SearchBar (placeholder="搜索品牌或车型...")    ← NEW
│   ├── Input (防抖 300ms)
│   └── Icon (清除按钮, 搜索有内容时显示)
│
├── View (面包屑导航: 品牌 > 车系 > 型号) [不变]
│
├── [搜索结果为空]
│   └── EmptyState ("未找到匹配的品牌")
│
├── View (主内容区)
│   ├── ScrollView (品牌/车系/型号列表)
│   │   └── View (列表项) × N
│   └── ★ LetterIndex [visible when no search]      ← NEW
│       └── View (A-Z 字母纵向侧边栏)
│           → onTouch → scrollToLetter()
│
├── LoadingSkeleton                                  ← loading
├── ErrorState                                       ← error
└── EmptyState                                       ← empty
```

#### 4.6 Modified: Quote `pages/design/quote` [MODIFIED]

```
pages/design/quote (Phase 2 additions marked with ★)
│
├── View (车型 + 颜色 + 材质信息) [不变]
│
├── ★ View (分区颜色明细) [visible when mode=PART]   ← NEW
│   └── View (部件颜色行) × N
│       ├── Text ("引擎盖")
│       ├── View (色块)
│       └── Text ("AX 哑光黑")
│
├── View (价格明细: 材料费 + 工时费 + 总价) [不变]
│
├── Input (客户姓名) [不变]
├── Input (客户手机号) [不变]
├── Input (备注) [不变]
├── Button ("提交生成报价") [不变]
└── Button ("联系客服") [不变]
```

#### 4.7 Modified: Login `pages/auth/login` [MODIFIED]

```
pages/auth/login (Phase 2 additions marked with ★)
│
├── Image (品牌 Logo) [不变]
├── Input (手机号) [不变]
├── Input (密码) [不变]
├── Button (登录) [不变]
│
├── ★ View (分割线 + "其他登录方式")                ← NEW
│
├── ★ Button ("微信一键登录", icon=wechat)           ← NEW
│   → Taro.login() → POST /api/v1/auth/wechat-login
│   → 已绑定: 登录成功 → redirectTo 首页
│   → 未绑定: Toast "请先使用手机号登录以绑定微信"
│
└── Text ("WrapLab 车衣实验室") [不变]
```

#### 4.8 Modified: Profile `pages/profile/index` [MODIFIED]

```
pages/profile/index (Phase 2 additions marked with ★)
│
├── View (店员信息卡片) [不变]
│   ├── Image (头像)
│   ├── Text (姓名)
│   │   └── ★ Text ("已绑定微信" — 绿色标签, P2)     ← NEW
│   └── Text (所属门店)
│
├── View (功能列表)
│   ├── View ("我的方案") → 展开方案列表 [不变]
│   ├── ★ View ("我的收藏") → navigateToFavorites()  ← NEW
│   │   └── Badge (收藏数)
│   └── ...
│
├── SchemeListItem × N (方案列表) [不变]
├── EmptyState ("暂无改色方案") [不变]
└── Button ("退出登录") [不变]
```

#### 4.9 Modified: Home `pages/home/index` [MODIFIED]

```
pages/home/index (Phase 2: 案例数据源替换)
│
├── BrandGrid [不变]
│
├── ScrollView (横向)
│   └── HotSchemeCard × N [不变]
│
├── ★ View (案例推荐区)                             ← MODIFIED
│   │   (Phase 1: static mock; Phase 2: GET /api/v1/cases)
│   ├── LoadingSkeleton (case-card)                 ← loading
│   ├── ErrorState                                  ← error
│   ├── EmptyState ("暂无案例推荐")                  ← empty
│   └── ScrollView (横向)
│       └── CaseCard × N                            ← NEW
│           ├── Image (封面图)
│           ├── Text (案例标题)
│           └── View (点赞数)
│
└── Button ("开始设计") [不变]
```

#### 4.10 Modified: Cases List `pages/cases/index` [MODIFIED]

```
pages/cases/index (Phase 2: mock → real API)
│
├── LoadingSkeleton (type="case-card", 3x2 网格)    ← loading
├── ErrorState ("案例加载失败", onRetry)             ← error (NEW in P2)
├── EmptyState ("暂无完工案例")                      ← empty
└── ScrollView (案例网格)                           ← success
    └── CaseCard × N                                ← NEW (replaces inline View)
        ├── Image (封面图)
        ├── View (点赞数 overlay)
        ├── Text (车型名称)
        └── Text (颜色方案)
    └── Text ("没有更多了") [hasMore=false]
```

---

### 5. WebSocket Communication Protocol (Phase 2)

#### 5.1 Architecture Upgrade

Phase 2 replaces the Phase 1 URL-hash-based postMessage bridge with WebSocket as the primary transport. postMessage is retained as fallback.

```
┌────────────────────────────────────────────────────────────────────┐
│                       Taro 小程序 (React + TS)                      │
│                                                                    │
│  ┌──────────────────────┐        ┌──────────────────────────────┐ │
│  │   WebSocket (主力)     │        │   postMessage (降级)          │ │
│  │   ws-client.ts        │        │   Phase 1 原有机制             │ │
│  │   - auto-reconnect    │        │   wx.miniProgram.postMessage  │ │
│  │   - heartbeat 30s     │        │   bindmessage 事件             │ │
│  │   - msg queue flush   │        │                                │ │
│  └──────────┬───────────┘        └──────────────┬─────────────────┘ │
│             │                                   │                   │
│  ┌──────────┴───────────────────────────────────┴─────────────────┐ │
│  │              Platform Adapter (src/platform/)                   │ │
│  │  PlatformBridge interface → wechat / alipay / douyin adapters   │ │
│  └─────────────────────────────┬───────────────────────────────────┘ │
│                                │                                     │
└────────────────────────────────┼─────────────────────────────────────┘
                                 │ WebSocket / postMessage
                                 ▼
┌────────────────────────────────────────────────────────────────────┐
│                    WebView H5 (Three.js)                            │
│                                                                    │
│  ┌──────────────────────┐        ┌──────────────────────────────┐ │
│  │   WebSocket Client    │        │   postMessage Bridge          │ │
│  │   ws-client.ts [NEW]  │        │   bridge.ts (保留)            │ │
│  │   - native WebSocket  │        │   wx.miniProgram.postMessage  │ │
│  └──────────────────────┘        └──────────────────────────────┘ │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │              color-manager.ts [MODIFIED]                      │ │
│  │  applyPartColor(model, partCode, hex)  ← NEW                  │ │
│  │  applyMode(model, mode)                 ← NEW                  │ │
│  │  highlightPart(model, partCode)         ← NEW                  │ │
│  │  resetAllParts(model)                   ← NEW                  │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

#### 5.2 WebSocket Client (`src/api/ws-client.ts`)

```typescript
// src/api/ws-client.ts [NEW]
import Taro from '@tarojs/taro';
import { useAuthStore } from '../stores/auth-store';
import type { TaroToH5Message, H5ToTaroMessage } from '../types/message';

/** WebSocket 连接状态 */
type WsStatus = 'idle' | 'connecting' | 'connected' | 'disconnected';

/** WebSocket 客户端配置 */
interface WsClientConfig {
  /** 重连基础延迟 (ms) */
  reconnectBaseDelay: number;
  /** 最大重连次数 (超过后降级) */
  maxReconnectAttempts: number;
  /** 心跳间隔 (ms) */
  heartbeatInterval: number;
  /** 心跳超时 (ms) — 超时视为断开 */
  heartbeatTimeout: number;
}

const DEFAULT_CONFIG: WsClientConfig = {
  reconnectBaseDelay: 1000,
  maxReconnectAttempts: 3,
  heartbeatInterval: 30000,
  heartbeatTimeout: 10000,
};

interface WsClient {
  /** 当前状态 */
  status: WsStatus;
  /** 建立连接 */
  connect: (configId: string, modelId: string) => Promise<void>;
  /** 断开连接 */
  disconnect: () => void;
  /** 发送消息 */
  send: (msg: TaroToH5Message) => void;
  /** 注册 H5 消息回调 */
  onMessage: (handler: (msg: H5ToTaroMessage) => void) => void;
  /** 移除消息回调 */
  offMessage: (handler: (msg: H5ToTaroMessage) => void) => void;
}

/** 创建 WebSocket 客户端 */
export function createWsClient(config?: Partial<WsClientConfig>): WsClient {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  let socket: Taro.SocketTask | null = null;
  let status: WsStatus = 'idle';
  let reconnectCount = 0;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let heartbeatTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  let messageHandlers: Array<(msg: H5ToTaroMessage) => void> = [];
  let sendQueue: TaroToH5Message[] = [];

  function resetHeartbeat() {
    if (heartbeatTimeoutTimer) {
      clearTimeout(heartbeatTimeoutTimer);
      heartbeatTimeoutTimer = null;
    }
  }
  function startHeartbeat() {
    stopHeartbeat();
    heartbeatTimer = setInterval(() => {
      if (socket && status === 'connected') {
        socket.send({ data: JSON.stringify({ type: 'PING', timestamp: Date.now() }) });
        // 等待 PONG 回复，超时判定断开重连
        heartbeatTimeoutTimer = setTimeout(() => {
          socket?.close({ code: 3001, reason: 'heartbeat timeout' });
        }, cfg.heartbeatTimeout);
      }
    }, cfg.heartbeatInterval);
  }
  function stopHeartbeat() {
    if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
    if (heartbeatTimeoutTimer) { clearTimeout(heartbeatTimeoutTimer); heartbeatTimeoutTimer = null; }
  }
  function flushQueue() {
    if (!socket || sendQueue.length === 0) return;
    const batch = sendQueue.splice(0, sendQueue.length);
    for (const msg of batch) {
      socket.send({ data: JSON.stringify(msg) });
    }
  }

  function attemptReconnect(configId: string, modelId: string) {
    if (reconnectCount >= cfg.maxReconnectAttempts) {
      // 降级: 切换到 postMessage
      status = 'disconnected';
      // 触发降级事件 (外部监听后切换通信方式)
      return;
    }
    const delay = cfg.reconnectBaseDelay * Math.pow(2, reconnectCount);
    reconnectCount++;
    setTimeout(() => doConnect(configId, modelId), delay);
  }

  async function doConnect(configId: string, modelId: string) {
    const token = useAuthStore.getState().accessToken;
    const wsUrl = `wss://api.wraplab.cn/ws/3d-viewer?token=${token}&configurationId=${configId}&modelId=${modelId}`;

    status = 'connecting';
    socket = Taro.connectSocket({ url: wsUrl });

    socket.onOpen(() => {
      status = 'connected';
      reconnectCount = 0;
      startHeartbeat();
      flushQueue();
    });

    socket.onMessage((res) => {
      resetHeartbeat();
      try {
        const msg = JSON.parse(res.data as string) as H5ToTaroMessage;
        messageHandlers.forEach((h) => h(msg));
      } catch { /* ignore parse errors */ }
    });

    socket.onClose(() => {
      stopHeartbeat();
      if (status === 'connected') {
        status = 'disconnected';
        attemptReconnect(configId, modelId);
      }
    });

    socket.onError(() => {
      stopHeartbeat();
      if (status === 'connecting') {
        attemptReconnect(configId, modelId);
      }
    });
  }

  return {
    status: 'idle' as WsStatus,
    connect: (configId, modelId) => doConnect(configId, modelId),
    disconnect: () => {
      stopHeartbeat();
      socket?.close({ code: 1000, reason: 'user disconnect' });
      status = 'disconnected';
    },
    send: (msg) => {
      if (status === 'connected' && socket) {
        socket.send({ data: JSON.stringify(msg) });
      } else {
        sendQueue.push(msg);
      }
    },
    onMessage: (handler) => { messageHandlers.push(handler); },
    offMessage: (handler) => { messageHandlers = messageHandlers.filter((h) => h !== handler); },
  };
}
```

**连接管理规则**：

| 场景 | 处理 |
|------|------|
| 工作台 onShow | 建立 WebSocket 连接 |
| 工作台 onHide | 断开 WebSocket |
| 小程序切后台 (`onHide`) | 断开连接 |
| 小程序回前台 (`onShow`) | 重新建立连接 |
| 连接失败 (第 1 次) | 1s 后重试 |
| 连接失败 (第 2 次) | 3s 后重试 |
| 连接失败 (第 3 次) | 降级为该平台的 postMessage，Toast "已切换至备用连接" |
| 心跳超时 (10s 无 pong) | 判定断开，触发重连 |
| 发送消息无 ACK (3s) | 判定断开，触发重连 |

#### 5.3 Phase 2 New Message Types

##### Taro -> H5 (New)

| type | payload | 说明 | 触发时机 |
|------|---------|------|----------|
| `SET_PART_COLOR` | `{ partCode: string, hex: string }` | 设置指定部件颜色 | 分区模式下用户点击色块 |
| `SET_MODE` | `{ mode: 'FULL' \| 'PART' }` | 切换全车/分区模式 | 用户切换模式按钮 |
| `HIGHLIGHT_PART` | `{ partCode: string \| null }` | 高亮/取消高亮部件 | 用户选中/取消部件 |
| `RESET_PARTS` | `{}` | 重置所有部件为白色 | 用户点击重置按钮 |

##### H5 -> Taro (New)

| type | payload | 说明 | 触发时机 |
|------|---------|------|----------|
| `PART_COLOR_APPLIED` | `{ partCode: string }` | 指定部件颜色应用完成 | 分区颜色渐变动画完成 |

##### Updated Message Type Enum

```typescript
// src/types/message.ts (Phase 2 additions)

export enum WebViewMessageType {
  // === Phase 1 (retained) ===
  MODEL_URL = 'MODEL_URL',
  SET_COLOR = 'SET_COLOR',
  SET_MATERIAL = 'SET_MATERIAL',
  RESET_VIEW = 'RESET_VIEW',
  CAPTURE = 'CAPTURE',
  PAUSE_RENDER = 'PAUSE_RENDER',
  RESUME_RENDER = 'RESUME_RENDER',
  PING = 'PING',
  H5_READY = 'H5_READY',
  MODEL_LOADING = 'MODEL_LOADING',
  MODEL_READY = 'MODEL_READY',
  MODEL_ERROR = 'MODEL_ERROR',
  COLOR_APPLIED = 'COLOR_APPLIED',
  CAPTURE_RESULT = 'CAPTURE_RESULT',
  PONG = 'PONG',

  // === Phase 2 (new) ===
  SET_PART_COLOR = 'SET_PART_COLOR',
  SET_MODE = 'SET_MODE',
  HIGHLIGHT_PART = 'HIGHLIGHT_PART',
  RESET_PARTS = 'RESET_PARTS',
  PART_COLOR_APPLIED = 'PART_COLOR_APPLIED',
}
```

##### New Message Data Interfaces

```typescript
// Phase 2 new message payloads
export interface SetPartColorMessage extends PostMessage<{ partCode: string; hex: string }> {
  type: WebViewMessageType.SET_PART_COLOR;
}

export interface SetModeMessage extends PostMessage<{ mode: 'FULL' | 'PART' }> {
  type: WebViewMessageType.SET_MODE;
}

export interface HighlightPartMessage extends PostMessage<{ partCode: string | null }> {
  type: WebViewMessageType.HIGHLIGHT_PART;
}

export interface ResetPartsMessage extends PostMessage<Record<string, never>> {
  type: WebViewMessageType.RESET_PARTS;
}

export interface PartColorAppliedMessage extends PostMessage<{ partCode: string }> {
  type: WebViewMessageType.PART_COLOR_APPLIED;
}

// Updated union types
export type TaroToH5Message =
  | /* Phase 1 types */ ModelUrlMessage | SetColorMessage | SetMaterialMessage
  | ResetViewMessage | CaptureMessage | PauseRenderMessage | ResumeRenderMessage | PingMessage
  | /* Phase 2 new types */ SetPartColorMessage | SetModeMessage | HighlightPartMessage | ResetPartsMessage;

export type H5ToTaroMessage =
  | /* Phase 1 types */ H5ReadyMessage | ModelLoadingMessage | ModelReadyMessage
  | ModelErrorMessage | ColorAppliedMessage | CaptureResultMessage | PongMessage
  | /* Phase 2 new types */ PartColorAppliedMessage;
```

#### 5.4 Modified `color-manager.ts` (H5 Side)

```typescript
// webview/3d-renderer/color-manager.ts (Phase 2 additions)

/** 分区颜色映射: partCode -> hex */
const partColorMap = new Map<string, string>();

/** 当前编辑模式 */
let currentMode: 'FULL' | 'PART' = 'FULL';

/** 当前高亮部件 */
let highlightedPart: string | null = null;

/**
 * 设置指定部件的颜色 (Phase 2 NEW)
 */
export function applyPartColor(model: THREE.Group, partCode: string, hex: string, duration = 300): void {
  partColorMap.set(partCode, hex);
  const targetColor = new THREE.Color(hex);

  model.traverse((child) => {
    if (child instanceof THREE.Mesh && child.userData.partCode === partCode) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of materials) {
        if (mat instanceof THREE.MeshStandardMaterial) {
          // 渐变动画 (同 applyColor 逻辑)
          const startColor = mat.color.clone();
          const startTime = performance.now();
          function animateColor(now: number) {
            const t = Math.min((now - startTime) / duration, 1);
            const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            mat.color.copy(startColor).lerp(targetColor, eased);
            if (t < 1) requestAnimationFrame(animateColor);
          }
          requestAnimationFrame(animateColor);
        }
      }
    }
  });
}

/**
 * 切换全车/分区模式 (Phase 2 NEW)
 */
export function applyMode(model: THREE.Group, mode: 'FULL' | 'PART'): void {
  currentMode = mode;
  // FULL 模式下恢复全车色 (使用第一个已改色部件的颜色或当前全局色)
  // PART 模式下不做额外操作，等待用户选择部件
}

/**
 * 高亮部件 (Phase 2 NEW)
 */
export function highlightPart(model: THREE.Group, partCode: string | null): void {
  if (highlightedPart) {
    // 取消之前的高亮
    setPartHighlight(model, highlightedPart, false);
  }
  highlightedPart = partCode;
  if (partCode) {
    setPartHighlight(model, partCode, true);
  }
}

/** 内部: 设置部件高亮 (emissive 材质) */
function setPartHighlight(model: THREE.Group, partCode: string, on: boolean): void {
  model.traverse((child) => {
    if (child instanceof THREE.Mesh && child.userData.partCode === partCode) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of materials) {
        if (mat instanceof THREE.MeshStandardMaterial) {
          mat.emissive = on ? new THREE.Color('#0F3460') : new THREE.Color('#000000');
          mat.emissiveIntensity = on ? 0.3 : 0;
        }
      }
    }
  });
}

/**
 * 重置所有部件颜色为白色 (Phase 2 NEW)
 */
export function resetAllParts(model: THREE.Group): void {
  partColorMap.clear();
  const white = new THREE.Color('#FFFFFF');
  model.traverse((child) => {
    if (child instanceof THREE.Mesh && child.userData.partCode) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of materials) {
        if (mat instanceof THREE.MeshStandardMaterial) {
          mat.color.copy(white);
          mat.emissive.set('#000000');
          mat.emissiveIntensity = 0;
        }
      }
    }
  });
}
```

#### 5.5 H5 Message Handler (Phase 2 Additions)

```typescript
// webview/3d-renderer/main.ts (Phase 2 new cases)
function handleTaroMessage(msg: TaroToH5Message): void {
  switch (msg.type) {
    // ... Phase 1 cases unchanged ...

    case WebViewMessageType.SET_PART_COLOR: {
      if (currentModel && msg.payload) {
        applyPartColor(currentModel, msg.payload.partCode, msg.payload.hex);
        sendToTaro({
          type: WebViewMessageType.PART_COLOR_APPLIED,
          payload: { partCode: msg.payload.partCode },
          timestamp: Date.now(),
        });
      }
      break;
    }

    case WebViewMessageType.SET_MODE: {
      if (currentModel && msg.payload) {
        applyMode(currentModel, msg.payload.mode);
      }
      break;
    }

    case WebViewMessageType.HIGHLIGHT_PART: {
      if (currentModel) {
        highlightPart(currentModel, msg.payload?.partCode ?? null);
      }
      break;
    }

    case WebViewMessageType.RESET_PARTS: {
      if (currentModel) {
        resetAllParts(currentModel);
      }
      break;
    }
  }
}
```

---

### 6. Platform Adapter Layer

#### 6.1 Interface Definition

```typescript
// src/platform/types.ts [NEW]

export interface PlatformBridge {
  /** 平台标识 */
  readonly platform: string;
  /** 建立 WebView 通信连接 (WebSocket 或 postMessage) */
  connect(configId: string, token: string): Promise<void>;
  /** 断开连接 */
  disconnect(): void;
  /** 发送消息到 H5 */
  sendMessage(msg: TaroToH5Message): void;
  /** 注册 H5 消息回调 */
  onMessage(handler: (msg: H5ToTaroMessage) => void): void;
  /** 移除回调 */
  offMessage(handler: (msg: H5ToTaroMessage) => void): void;
  /** 连接是否活跃 */
  isConnected(): boolean;
  /** 当前传输方式 */
  readonly transport: 'websocket' | 'postMessage';
}
```

#### 6.2 WeChat Adapter

```typescript
// src/platform/wechat.ts [NEW]

export function createWechatBridge(): PlatformBridge {
  let wsClient: WsClient | null = null;
  let transport: 'websocket' | 'postMessage' = 'websocket';
  let fallbackHandlers: Array<(msg: H5ToTaroMessage) => void> = [];

  return {
    platform: 'wechat',
    transport: 'websocket', // initial, may degrade

    async connect(configId: string, token: string) {
      try {
        wsClient = createWsClient();
        await wsClient.connect(configId, token);
        transport = 'websocket';

        // 监听降级事件
        wsClient.onMessage((msg) => { /* dispatch to handlers */ });
      } catch {
        // WebSocket 失败 → 降级为 postMessage
        transport = 'postMessage';
        Taro.showToast({ title: '已切换至备用连接', icon: 'none' });
        // 使用 Phase 1 的 postMessage 机制
      }
    },

    disconnect() {
      wsClient?.disconnect();
      // 清理 postMessage 监听
    },

    sendMessage(msg: TaroToH5Message) {
      if (transport === 'websocket' && wsClient?.status === 'connected') {
        wsClient.send(msg);
      } else {
        // postMessage fallback
        // wx.miniProgram.postMessage({ data: msg });
      }
    },

    onMessage(handler) { /* register */ },
    offMessage(handler) { /* unregister */ },
    isConnected: () => transport === 'websocket' ? wsClient?.status === 'connected' : true,
    get transport() { return transport; },
  };
}
```

#### 6.3 Alipay Adapter

```typescript
// src/platform/alipay.ts [NEW]

export function createAlipayBridge(): PlatformBridge {
  return {
    platform: 'alipay',
    transport: 'postMessage',

    async connect() {
      // Alipay: my.postMessage + onMessage
    },

    sendMessage(msg: TaroToH5Message) {
      // my.postMessage({ data: msg });
    },

    onMessage(handler) {
      // my.onMessage = (res) => handler(JSON.parse(res.data));
    },

    // ...
  };
}
```

#### 6.4 Factory

```typescript
// src/platform/index.ts [NEW]
import Taro from '@tarojs/taro';

export function createPlatformBridge(): PlatformBridge {
  const platform = Taro.getSystemInfoSync().platform;

  switch (platform) {
    case 'wechat':
      return createWechatBridge();
    case 'alipay':
      return createAlipayBridge();
    case 'douyin':
      return createDouyinBridge();
    case 'harmonyos':
      return createHarmonyBridge();
    default:
      // Fallback to WeChat postMessage
      return createWechatBridge();
  }
}
```

---

### 7. State Management (Phase 2 New Stores)

#### 7.1 Store Overview (Phase 2)

| Store | Phase | 职责 | 持久化 | 跨页面共享 |
|-------|-------|------|--------|-----------|
| AuthStore | P1 (modified) | Token, staff, +微信登录 | 是 | 全局 |
| VehicleStore | P1 | 品牌/车系/型号 | 否 | 首页/选车 |
| ColorStore | P1 | 色卡/颜色/材质 | 否 | 工作台 |
| ConfigStore | P1 (modified) | 方案 + mode/parts | 否 | 选车/工作台/报价 |
| **CaseStore** | **P2 NEW** | 案例列表/详情/点赞 | 否 | 首页/案例列表/详情 |
| **FavoriteStore** | **P2 NEW** | 收藏列表/乐观更新 | 否 | 详情/收藏/我的 |
| **AiStore** | **P2 NEW** | 生成任务/轮询/结果 | 否 | AI 页面 |
| **PartStore** | **P2 NEW** | 部件列表/选中/颜色 | 否 | 工作台 |

#### 7.2 CaseStore

```typescript
// src/stores/case-store.ts [NEW]

interface CaseDetail {
  id: string;
  title: string;
  description: string;
  images: Array<{ url: string; type: 'cover' | 'detail' }>;
  configuration: {
    mode: 'FULL' | 'PART';
    model: { brandName: string; seriesName: string; modelName: string; year: number };
    swatch: { name: string; hex: string; brandName: string };
    material: { name: string };
    parts: Array<{ partCode: string; hex: string; swatchName: string }>;
  };
  price: { materialPrice: number; laborPrice: number; totalPrice: number };
  store: { id: string; name: string; address: string; logo: string; rating: number };
  stats: { likes: number; views: number; isLiked: boolean };
  createdAt: string;
}

interface CaseListItem {
  id: string;
  title: string;
  coverImage: string;
  modelName: string;
  swatchName: string;
  hex: string;
  likes: number;
}

interface CaseState {
  /** 案例列表 */
  cases: CaseListItem[];
  casesLoading: boolean;
  casesError: string | null;
  casesPage: number;
  casesHasMore: boolean;

  /** 案例详情 */
  currentCase: CaseDetail | null;
  detailLoading: boolean;
  detailError: string | null;

  /** Actions */
  fetchCases: (params?: { page?: number; limit?: number; sort?: string; brandId?: string }) => Promise<void>;
  fetchMoreCases: () => Promise<void>;
  refreshCases: () => Promise<void>;
  fetchCaseDetail: (caseId: string) => Promise<void>;
  toggleLike: (caseId: string) => Promise<{ likes: number; isLiked: boolean }>;
  /** 从案例创建方案 */
  useConfiguration: (caseId: string) => Promise<{ configurationId: string; modelId: string }>;
}

export const useCaseStore = create<CaseState>((set, get) => ({
  cases: [],
  casesLoading: false,
  casesError: null,
  casesPage: 1,
  casesHasMore: true,

  currentCase: null,
  detailLoading: false,
  detailError: null,

  fetchCases: async (params) => {
    set({ casesLoading: true, casesError: null });
    try {
      const data = await caseService.getCaseList(params);
      set({
        cases: data.items,
        casesPage: data.page,
        casesHasMore: data.items.length < data.total,
        casesLoading: false,
      });
    } catch (error) {
      set({ casesLoading: false, casesError: (error as Error).message });
    }
  },

  fetchMoreCases: async () => {
    const { cases, casesPage, casesHasMore } = get();
    if (!casesHasMore) return;
    try {
      const data = await caseService.getCaseList({ page: casesPage + 1 });
      set({
        cases: [...cases, ...data.items],
        casesPage: data.page,
        casesHasMore: cases.length + data.items.length < data.total,
      });
    } catch { /* silent fail for load-more */ }
  },

  refreshCases: async () => {
    set({ casesPage: 1, casesHasMore: true });
    await get().fetchCases({ page: 1 });
  },

  fetchCaseDetail: async (caseId) => {
    set({ detailLoading: true, detailError: null });
    try {
      const detail = await caseService.getCaseDetail(caseId);
      set({ currentCase: detail, detailLoading: false });
    } catch (error) {
      set({ detailLoading: false, detailError: (error as Error).message });
    }
  },

  toggleLike: async (caseId) => {
    // 乐观更新在组件层处理, Store 仅负责 API 调用
    const result = await caseService.likeCase(caseId);
    return result;
  },

  useConfiguration: async (caseId) => {
    const config = await configService.createFromCase(caseId);
    return { configurationId: config.id, modelId: config.modelId };
  },
}));
```

#### 7.3 FavoriteStore

```typescript
// src/stores/favorite-store.ts [NEW]

interface FavoriteItem {
  id: string;
  targetType: 'case' | 'configuration';
  targetId: string;
  target: {
    thumbnail: string;
    title: string;
    swatch: { hex: string; name: string; brandName: string };
  };
  createdAt: string;
}

interface FavoriteState {
  favorites: FavoriteItem[];
  favoritesLoading: boolean;
  favoritesError: string | null;
  page: number;
  hasMore: boolean;

  /** 乐观更新缓存: targetId -> boolean */
  optimisticMap: Record<string, boolean>;

  fetchFavorites: (params?: { page?: number; limit?: number }) => Promise<void>;
  fetchMoreFavorites: () => Promise<void>;
  refreshFavorites: () => Promise<void>;

  /**
   * 添加收藏 (乐观更新)
   * @returns true on success
   */
  addFavorite: (configId: string) => Promise<boolean>;
  /**
   * 取消收藏 (乐观更新)
   * @returns true on success
   */
  removeFavorite: (configId: string) => Promise<boolean>;
  /** 检查是否已收藏 */
  isFavorited: (targetId: string) => boolean;
}

export const useFavoriteStore = create<FavoriteState>((set, get) => ({
  favorites: [],
  favoritesLoading: false,
  favoritesError: null,
  page: 1,
  hasMore: true,
  optimisticMap: {},

  fetchFavorites: async (params) => {
    set({ favoritesLoading: true, favoritesError: null });
    try {
      const data = await favoriteService.getFavorites(params);
      set({
        favorites: data.items,
        page: data.page,
        hasMore: data.items.length < data.total,
        favoritesLoading: false,
      });
    } catch (error) {
      set({ favoritesLoading: false, favoritesError: (error as Error).message });
    }
  },

  fetchMoreFavorites: async () => { /* 类似 CaseStore.loadMore */ },
  refreshFavorites: async () => { /* reset page, refetch */ },

  addFavorite: async (configId) => {
    // Optimistic: set flag immediately
    set({ optimisticMap: { ...get().optimisticMap, [configId]: true } });
    try {
      await favoriteService.addFavorite(configId);
      return true;
    } catch {
      // Rollback
      const map = { ...get().optimisticMap };
      delete map[configId];
      set({ optimisticMap: map });
      return false;
    }
  },

  removeFavorite: async (configId) => {
    // Optimistic: remove flag immediately
    const prev = get().optimisticMap[configId];
    const map = { ...get().optimisticMap };
    delete map[configId];
    set({ optimisticMap: map });
    try {
      await favoriteService.removeFavorite(configId);
      return true;
    } catch {
      // Rollback
      set({ optimisticMap: { ...get().optimisticMap, [configId]: prev } });
      return false;
    }
  },

  isFavorited: (targetId) => {
    return !!get().optimisticMap[targetId] ||
      get().favorites.some((f) => f.targetId === targetId);
  },
}));
```

#### 7.4 AiStore

```typescript
// src/stores/ai-store.ts [NEW]

type GenerationStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed';

interface AiStyle {
  id: string;
  name: string;
  category: 'studio' | 'outdoor' | 'street';
  thumbnail: string;
  description: string;
}

interface GenerationTask {
  id: string;
  status: GenerationStatus;
  progress: number;
  resultImageUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface AiState {
  styles: AiStyle[];
  stylesLoading: boolean;
  stylesError: string | null;

  currentTask: GenerationTask | null;
  /** 轮询定时器 ID */
  pollingTimer: ReturnType<typeof setInterval> | null;
  /** 超时定时器 ID (120s) */
  timeoutTimer: ReturnType<typeof setTimeout> | null;

  fetchStyles: () => Promise<void>;
  submitGeneration: (configId: string, params: {
    styleId: string;
    customPrompt?: string;
    configParts?: Array<{ partCode: string; hex: string }>;
  }) => Promise<string>;
  startPolling: (generationId: string) => void;
  stopPolling: () => void;
  resetTask: () => void;
}
```

#### 7.5 PartStore

```typescript
// src/stores/part-store.ts [NEW]

interface ModelPart {
  partCode: string;
  partName: string;
  category: string; // 'front' | 'top' | 'rear' | 'side'
}

interface PartState {
  parts: ModelPart[];
  partsLoading: boolean;
  partsError: string | null;

  /** 当前选中部件 */
  selectedPart: ModelPart | null;
  /** 部件颜色映射: partCode -> hex */
  partColorMap: Record<string, string>;

  fetchParts: (modelId: string) => Promise<void>;
  selectPart: (part: ModelPart) => void;
  setPartColor: (partCode: string, hex: string) => void;
  resetAllParts: () => void;
  /** 获取默认部件 (第一个) */
  getDefaultPart: () => ModelPart | null;
}

export const usePartStore = create<PartState>((set, get) => ({
  parts: [],
  partsLoading: false,
  partsError: null,
  selectedPart: null,
  partColorMap: {},

  fetchParts: async (modelId) => {
    set({ partsLoading: true, partsError: null });
    try {
      const data = await partsService.getModelParts(modelId);
      set({
        parts: data.parts,
        partsLoading: false,
        // 默认选中第一个部件
        selectedPart: data.parts.length > 0 ? data.parts[0] : null,
      });
    } catch (error) {
      set({ partsLoading: false, partsError: (error as Error).message });
    }
  },

  selectPart: (part) => set({ selectedPart: part }),

  setPartColor: (partCode, hex) => set({
    partColorMap: { ...get().partColorMap, [partCode]: hex },
  }),

  resetAllParts: () => set({ partColorMap: {} }),

  getDefaultPart: () => get().parts.length > 0 ? get().parts[0] : null,
}));
```

#### 7.6 Modified: ConfigStore (Phase 2 Extensions)

```typescript
// src/stores/config-store.ts (Phase 2 additions)

interface ConfigState {
  // ... Phase 1 fields unchanged ...

  /** Phase 2 NEW: 改色模式 */
  mode: 'FULL' | 'PART';
  /** Phase 2 NEW: 分区颜色配置 */
  parts: Array<{ partCode: string; swatchId: string; hex: string }>;
  /** Phase 2 NEW: 案例来源 ID */
  fromCaseId: string | null;

  // ... Phase 1 actions unchanged ...

  /** Phase 2 NEW: 切换模式 */
  setMode: (mode: 'FULL' | 'PART') => void;
  /** Phase 2 NEW: 更新部件颜色 */
  updatePartColor: (partCode: string, swatchId: string, hex: string) => void;
  /** Phase 2 NEW: 从案例创建方案 */
  loadFromCase: (caseId: string) => Promise<void>;
}

// SaveConfigParams 扩展
interface SaveConfigParams {
  modelId: string;
  mode?: 'FULL' | 'PART';           // Phase 2 NEW
  swatchId?: string;
  materialId?: string;
  hex?: string;
  thumbnail?: string;
  parts?: Array<{                    // Phase 2 NEW
    partCode: string;
    swatchId: string;
    hex: string;
  }>;
  fromCaseId?: string;               // Phase 2 NEW
}
```

#### 7.7 Modified: AuthStore (Phase 2 Extensions)

```typescript
// src/stores/auth-store.ts (Phase 2 additions)

interface AuthState {
  // ... Phase 1 fields unchanged ...

  /** Phase 2 NEW: 是否已绑定微信 */
  wechatBound: boolean;
  /** Phase 2 NEW: 微信昵称 (如有) */
  wechatNickname: string | null;

  /** Phase 2 NEW: 微信静默登录 */
  wechatLogin: () => Promise<void>;
  /** Phase 2 NEW: 绑定微信 (密码登录成功后调用) */
  bindWechat: () => Promise<void>;
}
```

---

### 8. API Service Layer (Phase 2)

#### 8.1 New API Modules

##### `src/api/case.ts` [NEW]

```typescript
// src/api/case.ts
import { request, getPaginated } from '../services/request';

export const caseService = {
  /** GET /api/v1/cases?page=&limit=&sort=&brandId=&seriesId= */
  getCaseList: (params?: {
    page?: number; limit?: number; sort?: 'latest' | 'popular';
    brandId?: string; seriesId?: string;
  }) => getPaginated<CaseListItem>('/cases', params),

  /** GET /api/v1/cases/:id */
  getCaseDetail: (id: string) => request<CaseDetail>({ url: `/cases/${id}`, method: 'GET' }),

  /** POST /api/v1/cases/:id/like */
  likeCase: (id: string) => request<{ likes: number; isLiked: boolean }>(
    { url: `/cases/${id}/like`, method: 'POST' }
  ),
};
```

##### `src/api/favorite.ts` [NEW]

```typescript
// src/api/favorite.ts
import { request, getPaginated } from '../services/request';

export const favoriteService = {
  /** POST /api/v1/favorites/:configId */
  addFavorite: (configId: string) => request<void>(
    { url: `/favorites/${configId}`, method: 'POST' }
  ),

  /** DELETE /api/v1/favorites/:configId */
  removeFavorite: (configId: string) => request<void>(
    { url: `/favorites/${configId}`, method: 'DELETE' }
  ),

  /** GET /api/v1/favorites?page=&limit= */
  getFavorites: (params?: { page?: number; limit?: number }) =>
    getPaginated<FavoriteItem>('/favorites', params),
};
```

##### `src/api/ai.ts` [NEW]

```typescript
// src/api/ai.ts
import { request } from '../services/request';

export const aiService = {
  /** GET /api/v1/generations/styles */
  getStyles: () => request<AiStyle[]>({ url: '/generations/styles', method: 'GET' }),

  /** POST /api/v1/configurations/:id/generate-image */
  generateImage: (configId: string, params: {
    styleId: string;
    customPrompt?: string;
    configParts?: Array<{ partCode: string; hex: string }>;
  }) => request<{ generationId: string }>(
    { url: `/configurations/${configId}/generate-image`, method: 'POST', data: params }
  ),

  /** GET /api/v1/generations/:id */
  getGenerationStatus: (generationId: string) => request<GenerationTask>(
    { url: `/generations/${generationId}`, method: 'GET' }
  ),
};
```

##### `src/api/parts.ts` [NEW]

```typescript
// src/api/parts.ts
import { request } from '../services/request';

export const partsService = {
  /** GET /api/v1/vehicles/models/:id/parts */
  getModelParts: (modelId: string) =>
    request<{ parts: ModelPart[] }>({ url: `/vehicles/models/${modelId}/parts`, method: 'GET' }),
};
```

##### Modified: `src/services/config.service.ts` [MODIFIED]

```typescript
// src/services/config.service.ts (Phase 2 additions)

export const configService = {
  // ... Phase 1 methods unchanged ...

  /** Phase 2 NEW: 从案例创建方案 */
  createFromCase: (caseId: string) => request<Configuration>(
    { url: '/configurations', method: 'POST', data: { fromCaseId: caseId } }
  ),

  /** Phase 2 NEW: 更新分区颜色 */
  updateParts: (configId: string, parts: Array<{ partCode: string; swatchId: string; hex: string }>) =>
    request<void>({ url: `/configurations/${configId}/parts`, method: 'PUT', data: { parts } }),
};
```

##### Modified: `src/services/auth.service.ts` [MODIFIED]

```typescript
// src/services/auth.service.ts (Phase 2 additions)

export const authService = {
  // ... Phase 1 methods unchanged ...

  /** Phase 2 NEW: 微信静默登录 */
  wechatLogin: (code: string) => request<LoginResponse>(
    { url: '/auth/wechat-login', method: 'POST', data: { code } }
  ),

  /** Phase 2 NEW: 绑定微信 (密码登录成功后调用) */
  wechatBind: (code: string) => request<void>(
    { url: '/auth/wechat-bind', method: 'POST', data: { code } }
  ),
};
```

#### 8.2 Updated Error Codes

```typescript
// src/utils/constants.ts (Phase 2 additions)

export const ERROR_CODES = {
  // Phase 1 codes unchanged
  TOKEN_EXPIRED: 10001,
  INVALID_CREDENTIALS: 10002,
  STAFF_NOT_FOUND: 10003,
  MODEL_NOT_FOUND: 20001,
  SWATCH_NOT_FOUND: 30001,
  CONFIG_NOT_FOUND: 40001,
  QUOTE_CALC_FAILED: 50001,
  VALIDATION_ERROR: 90001,

  // Phase 2 NEW
  WECHAT_CODE_INVALID: 10004,       // 微信 code 无效或已使用
  WECHAT_NOT_BOUND: 10005,          // openid 未绑定
  CASE_NOT_FOUND: 60001,            // 案例不存在
  FAVORITE_DUPLICATE: 60002,        // 重复收藏
  GENERATION_PENDING: 70001,        // 已有生成任务进行中
  GENERATION_FAILED: 70002,         // 生成失败
  GENERATION_TIMEOUT: 70003,        // 生成超时
  PARTS_NOT_FOUND: 80001,           // 部件数据不存在
};

export const ERROR_MESSAGES: Record<number, string> = {
  // ... Phase 1 messages unchanged ...
  [ERROR_CODES.WECHAT_CODE_INVALID]: '微信登录凭证已过期，请重试',
  [ERROR_CODES.WECHAT_NOT_BOUND]: '请先使用手机号登录以绑定微信',
  [ERROR_CODES.CASE_NOT_FOUND]: '案例不存在或已下架',
  [ERROR_CODES.FAVORITE_DUPLICATE]: '已收藏，无需重复操作',
  [ERROR_CODES.GENERATION_PENDING]: '已有生成任务进行中',
  [ERROR_CODES.GENERATION_FAILED]: 'AI 生成失败',
  [ERROR_CODES.GENERATION_TIMEOUT]: '生成超时，请重试',
  [ERROR_CODES.PARTS_NOT_FOUND]: '该车型暂无部件数据',
};
```

#### 8.3 Token Storage Upgrade (Phase 2)

```typescript
// src/utils/storage.ts (Phase 2 upgrade)

/**
 * Phase 2: Token 加密存储
 * 使用 AES 对称加密保护本地存储的 JWT Token
 */
const ENCRYPTION_KEY = 'wraplab-secure-key-v2'; // 实际应通过环境变量注入

async function encrypt(data: string): Promise<string> {
  // AES-CBC 加密实现
  // (使用 Taro 内置的 crypto 能力或纯 JS 实现)
}

async function decrypt(encrypted: string): Promise<string> {
  // AES-CBC 解密实现
}

export async function setSecureStorage(key: string, value: string): Promise<void> {
  const encrypted = await encrypt(value);
  return Taro.setStorage({ key, data: encrypted });
}

export async function getSecureStorage(key: string): Promise<string | null> {
  try {
    const { data } = await Taro.getStorage({ key });
    return await decrypt(data as string);
  } catch {
    return null;
  }
}
```

---

### 9. New Component Specifications

#### 9.1 PartSelector [NEW]

```
PartSelector/
├── index.tsx
└── index.less
```

**Props**:

```typescript
interface PartSelectorProps {
  /** 部件列表 */
  parts: ModelPart[];
  /** 部件颜色映射 */
  partColorMap: Record<string, string>;
  /** 当前选中部件 */
  selectedPartCode: string | null;
  /** 加载中 */
  loading?: boolean;
  /** 加载失败 */
  error?: boolean;
  /** 选中部件回调 */
  onPartSelect: (part: ModelPart) => void;
  /** 重置回调 (P1) */
  onReset?: () => void;
  /** 错误重试回调 */
  onRetry?: () => void;
}
```

**内部状态**：

| 状态 | 条件 | UI |
|------|------|-----|
| loading | API 请求中 | 5 个部件项骨架 |
| empty | parts=[] | 不展示组件 (隐藏分区切换按钮) |
| error | API 失败 | ErrorState + 重试 |
| success | 数据正常 | 横向滚动部件列表 |

**部件项渲染**：
- 默认: 白色色块 + 部件名
- 已改色: 实际颜色色块 + 部件名
- 选中态: 边框 `#0F3460`, 2px solid

#### 9.2 CaseCard [NEW]

**Props**:

```typescript
interface CaseCardProps {
  case: CaseListItem;
  onTap: (caseId: string) => void;
}
```

**渲染**：封面图 + 点赞 overlay (右下角) + 车型名 + 颜色方案名。卡片圆角 12rpx，阴影 `0 2rpx 12rpx rgba(0,0,0,0.08)`。

#### 9.3 ImageGallery [NEW]

**Props**:

```typescript
interface ImageGalleryProps {
  images: Array<{ url: string; type: string }>;
  /** 初始显示索引 */
  initialIndex?: number;
}
```

**功能**：Swiper 轮播 + 底部圆点指示器 + 点击全屏预览 (`wx.previewImage`)。单图时隐藏指示器。

#### 9.4 AiStylePicker [NEW]

**Props**:

```typescript
interface AiStylePickerProps {
  styles: AiStyle[];
  selectedStyleId: string | null;
  loading?: boolean;
  error?: boolean;
  onSelect: (style: AiStyle) => void;
  onRetry?: () => void;
}
```

**状态矩阵**：

| 状态 | UI |
|------|-----|
| loading | 6 个风格卡片骨架 |
| empty | EmptyState("暂无可选风格") |
| error | ErrorState + 重试 |
| success | 风格卡片网格 (3 列), 选中项蓝色边框高亮 |

#### 9.5 LetterIndex [NEW]

**Props**:

```typescript
interface LetterIndexProps {
  /** 存在的首字母列表 (动态生成) */
  letters: string[];
  /** 当前触摸/点击的字母 */
  activeLetter?: string;
  /** 字母选择回调 */
  onLetterSelect: (letter: string) => void;
}
```

**实现要点**：
- 纵向固定侧边栏, `position: fixed; right: 0`
- 触摸事件: `onTouchStart` + `onTouchMove` + `onTouchEnd`
- 通过 `Taro.createSelectorQuery().select('#letter-${letter}')` 获取目标元素位置
- 使用 `ScrollView.scrollTo` 或 `Taro.pageScrollTo` 跳转
- 仅展示存在的字母 (若品牌只有 A/B/C/T/W 则只显示这 5 个)

#### 9.6 SearchBar [NEW]

**Props**:

```typescript
interface SearchBarProps {
  placeholder?: string;
  value: string;
  debounceMs?: number;      // 默认 300
  onChange: (value: string) => void;
  onClear?: () => void;
}
```

**实现**：左侧搜索图标 + Input + 右侧清除按钮 (value 非空时显示)。防抖通过内部 `useEffect` + `setTimeout` 实现。

#### 9.7 FavoriteButton [NEW]

**Props**:

```typescript
interface FavoriteButtonProps {
  isFavorited: boolean;
  count?: number;
  onToggle: () => void;
}
```

**渲染**：红色实心心形 (已收藏) / 灰色空心心形 (未收藏)。点击后乐观更新：立即切换图标状态，异步调用 API，失败时回滚并 Toast。

#### 9.8 GenerationStatus [NEW]

**Props**:

```typescript
interface GenerationStatusProps {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;         // 0-100
  resultImageUrl?: string;
  errorMessage?: string;
  onRetry?: () => void;
  onSave?: () => void;
  onBack?: () => void;
}
```

---

### 10. State Coverage Matrix (Phase 2 New Pages)

| Page | Loading | Empty | Error | Success |
|------|---------|-------|-------|---------|
| **Case Detail** | 图片区骨架 (420rpx) + 信息区 5 行文字线 + 门店骨架 | "案例不存在或已下架" + 返回按钮 | API 失败 + 重试按钮 | 轮播 + 方案信息 + 价格 + 门店 + 点赞 + 操作按钮 |
| **Favorites** | 列表项骨架 x5 | "还没有收藏，去案例广场看看吧" + "去看看"按钮 | 列表加载失败 + 重试 | 收藏列表 + 左滑取消 (P2) |
| **AI Generate** | 风格列表骨架 (6 card) / 生成中 loading 动画 + 进度百分比 | 风格列表为空 (不应发生) | 生成失败 + errorMessage + "重新生成" + "返回工作台" | 风格网格 / 结果大图 + 操作按钮组 |

---

### 11. Data Flow Diagrams (Key Phase 2 Scenarios)

#### 11.1 Part Color Change (WebSocket Path)

```
Taro (design/index)                PlatformAdapter             WebView H5 (Three.js)
     │                                  │                            │
     │ 1. 用户切换到 PART 模式            │                            │
     │    setMode('PART')                │                            │
     │──────────────────────────────────►│ 2. SET_MODE { mode:'PART' }│
     │                                  │───────────────────────────►│
     │                                  │                            │ 3. applyMode(FULL→PART)
     │                                  │                            │
     │ 4. PartSelector visible          │                            │
     │    GET /models/:id/parts         │                            │
     │                                  │                            │
     │ 5. 用户点击"引擎盖"部件            │                            │
     │    selectPart('hood')            │                            │
     │──────────────────────────────────►│ 6. HIGHLIGHT_PART          │
     │                                  │   { partCode: 'hood' }     │
     │                                  │───────────────────────────►│
     │                                  │                            │ 7. highlightPart(model,'hood')
     │                                  │                            │    引擎盖 emissive 高亮
     │                                  │                            │
     │ 8. 用户点击色卡 #000000           │                            │
     │    (300ms 防抖后)                │                            │
     │──────────────────────────────────►│ 9. SET_PART_COLOR          │
     │                                  │   { partCode:'hood',       │
     │                                  │     hex:'#000000' }        │
     │                                  │───────────────────────────►│
     │                                  │                            │ 10. applyPartColor(model, 'hood', '#000000')
     │                                  │                            │     渐变过渡动画 300ms
     │                                  │  11. PART_COLOR_APPLIED    │
     │                                  │  { partCode: 'hood' }      │
     │                                  │◄───────────────────────────│
     │ 12. 更新 PartStore:              │                            │
     │     partColorMap[hood]=#000000   │                            │
     │     部件选择器引擎盖色块变黑       │                            │
```

#### 11.2 Case Detail -> Use Configuration

```
Taro (CaseDetail)              CaseStore                    NestJS API
     │                            │                            │
     │ 1. onLoad({id})            │                            │
     │───────────────────────────►│ 2. GET /cases/:id          │
     │                            │───────────────────────────►│
     │                            │◄────── CaseDetail ────────│
     │ 3. render: images + info  │                            │
     │                            │                            │
     │ 4. 用户点击 "使用此方案"     │                            │
     │───────────────────────────►│ 5. POST /configurations    │
     │                            │    { fromCaseId }           │
     │                            │───────────────────────────►│
     │                            │◄── { id, modelId } ───────│
     │ 6. navigateToDesignFromCase│                            │
     │    (/pages/design/index    │                            │
     │     ?modelId=&configId=    │                            │
     │     &fromCaseId=)          │                            │
```

#### 11.3 AI Generation Polling

```
Taro (AiGenerate)              AiStore                     NestJS API
     │                            │                            │
     │ 1. 选择风格 + prompt        │                            │
     │ 2. 点击 "开始生成"          │                            │
     │───────────────────────────►│ 3. POST /configurations    │
     │                            │    /:id/generate-image     │
     │                            │───────────────────────────►│
     │                            │◄── { generationId } ──────│
     │                            │                            │
     │                            │ 4. startPolling(id)        │
     │                            │    setInterval(3000ms)     │
     │                            │───────────────────────────►│ GET /generations/:id
     │                            │◄── status:'pending'  ─────│
     │ 5. render: "排队中..."     │                            │
     │                            │───────────────────────────►│ GET /generations/:id
     │                            │◄── status:'processing',    │
     │                            │     progress: 65 ─────────│
     │ 6. render: "生成中... 65%" │                            │
     │                            │───────────────────────────►│ GET /generations/:id
     │                            │◄── status:'completed',     │
     │                            │     resultImageUrl ───────│
     │                            │ 7. stopPolling()           │
     │ 8. render: result image   │                            │
     │    + action buttons       │                            │
     
     **组件卸载时清理**：AiGenerate 页面必须在 `useDidHide` / `useUnload` 中调用 `stopPolling()`，
     确保轮询定时器和超时定时器被清除，避免内存泄漏和后台无效请求。
```

#### 11.4 WeChat Login Flow

```
Taro (Login)                   AuthStore                   NestJS API            WeChat Server
     │                            │                            │                      │
     │ 1. 点击"微信一键登录"        │                            │                      │
     │───────────────────────────►│ 2. Taro.login()           │                      │
     │                            │───────────────────────────│─────────────────────►│
     │                            │◄──── code (临时凭证) ─────│──────────────────────│
     │                            │                            │                      │
     │                            │ 3. POST /auth/wechat-login │                      │
     │                            │    { code }                │                      │
     │                            │───────────────────────────►│ 4. code2Session(code)│
     │                            │                            │─────────────────────►│
     │                            │                            │◄── openid ─────────│
     │                            │                            │                      │
     │                            │       [已绑定 openid]      │                      │
     │                            │◄── { accessToken,          │                      │
     │                            │      refreshToken,         │                      │
     │                            │      staff } ─────────────│                      │
     │ 5. 保存 Token → 跳转首页   │                            │                      │
     │                            │                            │                      │
     │       [未绑定 openid]      │                            │                      │
     │                            │◄── { code: 10005,          │                      │
     │                            │      msg: "未绑定" } ─────│                      │
     │ 6. Toast 引导密码登录       │                            │                      │
     │ 7. 用户密码登录成功          │                            │                      │
     │───────────────────────────►│ 8. Taro.login() (新 code) │                      │
     │                            │───────────────────────────│─────────────────────►│
     │                            │◄──── new code ───────────│                      │
     │                            │                            │                      │
     │                            │ 9. POST /auth/wechat-bind  │                      │
     │                            │    { newCode }             │                      │
     │                            │───────────────────────────►│ 绑定 openid → 成功    │
```

#### 11.5 WebSocket Degradation Fallback

```
App.onShow
    │
    ▼
createPlatformBridge()
    │
    ▼
platform === 'wechat' ?
    │
    ├── YES → createWechatBridge()
    │         │
    │         ▼
    │    尝试 WebSocket 连接
    │         │
    │         ├── SUCCESS → transport='websocket'
    │         │              ├── heartbeat: 30s ping
    │         │              ├── timeout: 10s no pong → reconnect
    │         │              └── onError/onClose → reconnect (指数退避)
    │         │                   │
    │         │                   ├── attempt 1: 1s
    │         │                   ├── attempt 2: 3s
    │         │                   ├── attempt 3: FAIL
    │         │                   │
    │         │                   ▼
    │         │              Degrade to postMessage
    │         │              Toast: "已切换至备用连接"
    │         │              transport='postMessage'
    │         │
    │         └── IMMEDIATE FAIL → 直接 postMessage
    │
    └── NO → alipay/douyin/harmony → postMessage only
```

---

### 12. Phase 2 Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| WebSocket transport | Taro.connectSocket (native) | 低延迟 (< 100ms), 双向全双工, 适配分区改色高频消息 |
| WebSocket auth | JWT token in URL query | 简化握手流程; H5 侧无需额外登录 |
| WebSocket heartbeat | Ping/Pong 30s interval | 保持长连接活跃; 10s 超时即判定断开 |
| WebSocket degradation | 3 retries -> postMessage | 保证低版本微信兼容性 |
| Platform adapter | Strategy pattern (per-platform factory) | 统一接口; 各平台差异封装在适配器内 |
| Favorite optimistic update | UI immediate + API async + rollback | 提升交互即时感; rollback < 50ms 不可见 |
| AI polling interval | 3s | 平衡用户体验与服务器压力 |
| AI timeout | 120s | 覆盖大多数 AI 模型推理时长 |
| Search debounce | 300ms | 与颜色选择防抖统一; 本地筛选无需 API |
| Letter index scroll | createSelectorQuery + pageScrollTo | Taro 原生能力, 无额外依赖 |
| Token storage | AES encrypted Taro.Storage | Phase 2 安全升级 (Phase 1 明文存储) |

---

### 13. Architecture Constraints (Phase 2 Additions)

1. **WebSocket 优先原则**：进入改色工作台时优先建立 WebSocket 连接，仅在失败后降级。业务代码通过 PlatformAdapter 接口通信，不感知底层传输方式。
2. **分区改色粒度**：部件颜色以 `partCode` 为最小粒度，H5 模型 `mesh.userData.partCode` 需要与后端 API 返回的 `partCode` 一致。
3. **乐观更新原则**：收藏/点赞操作采用乐观更新模式 -- UI 立即响应，API 异步确认，失败回滚。
4. **AI 任务单例**：同一 configuration 最多同时有 1 个进行中的生成任务。generationId 存储在 AiStore，页面进入时检查。
5. **平台适配透明**：页面层和组件层不直接判断平台，通过 `PlatformBridge` 接口通信。新增平台只需新增适配器文件。
6. **状态覆盖铁律**：所有新页面必须覆盖 loading / empty / error / success 四种状态。Phase 1 现有页面升级时一并补充缺失状态。
7. **API 迁移策略**：`src/services/` 保留 Phase 1 接口, `src/api/` 承载 Phase 2 新增接口。后续 Phase 3 统一迁移合并。
8. **WebSocket 降级不可感知**：降级发生时用户仅看到 Toast 提示，页面功能和交互逻辑不受影响。

---

*架构版本：v2.0 (Phase 2)*
*编写角色：Architect*
*日期：2026-07-22*
*前置依赖：Phase 1 MVP 完成并通过验收*

---

# Phase 3 架构设计 -- 运营模块

**状态**：Draft
**日期**：2026-07-22
**编写角色**：Architect
**前置依赖**：Phase 2 体验完善完成并通过验收

---

## 14. Phase 3 总体变化概览

### 14.1 核心架构变化

Phase 3 在已有 Phase 1/2 能力基础上深化三个运营方向：**门店引流**、**决策辅助**、**客户关系管理**。架构层面的关键变化：

| 维度 | Phase 2 现状 | Phase 3 变化 |
|------|-------------|-------------|
| 底部 Tab | 4 个 (首页/设计/案例/我的) | 5 个 (新增"门店"Tab) |
| 页面总数 | 13 个页面 | 21 个页面 (新增 8 个) |
| Zustand Store | 6 个 (Auth/Vehicle/Color/Config/Case/Ai) | 10 个 (新增 Store/Appointment/MaterialCompare/History) |
| API Service | 5 个 service 文件 | 9 个 service 文件 (新增 4 个) |
| 公共组件 | 14 个 | 21 个 (新增 7 个) |
| 路由页 | 13 条 | 21 条 (新增 8 条) |
| 新增 API 端点 | — | 13 个新增 + 3 个修改 |

### 14.2 架构分层影响

```
┌──────────────────────────────────────────────────────────────────┐
│                    Taro 小程序 (wraplab-client)                    │
│                                                                    │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────────────────┐   │
│  │  页面层     │  │  组件层      │  │  WebView 3D 渲染层       │   │
│  │  pages/    │  │  components/ │  │  webview/3d-renderer/    │   │
│  │  21 个页面  │  │  21 个组件    │  │  Three.js H5             │   │
│  └──────┬─────┘  └──────┬──────┘  └───────────┬──────────────┘   │
│         │               │                     │                   │
│  ┌──────┴───────────────┴─────────────────────┴───────────────┐  │
│  │             状态管理层 (Zustand)  ← 新增 4 个 Store          │  │
│  │  Auth  │  Vehicle  │  Color  │  Config  │  Case  │  Ai     │  │
│  │  Store │  Appoint  │  MatComp │  History │                  │  │
│  └────────────────────────────┬────────────────────────────────┘  │
│                               │                                    │
│  ┌────────────────────────────┴────────────────────────────────┐  │
│  │              API 服务层 (services/)  ← 新增 4 个 Service     │  │
│  │  request.ts  │  auth  │  vehicle  │  color  │  config       │  │
│  │  quote  │  case  │  ai  │  store  │  appoint  │  history   │  │
│  └────────────────────────────┬────────────────────────────────┘  │
│                               │                                    │
│  ┌────────────────────────────┴────────────────────────────────┐  │
│  │              平台适配层 (platform/) ← Phase 2 已有，扩展 Map │  │
│  │  PlatformBridge  │  wx-adapter  │  alipay-adapter           │  │
│  └─────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬─────────────────────────────────┘
                                 │ HTTPS / REST (JSON)
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                    wraplab-server (NestJS API)                     │
│  门店 API  │  预约 API  │  材质 API  │  历史 API  │  JWT + 多租户 │
└──────────────────────────────────────────────────────────────────┘
```

**分层职责（不变）**：页面层不直接调用 Taro API，组件层不持有业务状态，Store 仅存可序列化数据，Service 层纯函数无副作用。

---

## 15. Phase 3 项目结构扩展

### 15.1 新增文件清单

```
wraplab-client/
├── src/
│   ├── app.config.ts                   # 修改: 添加 8 个新页面路由 + 5 号 Tab
│   │
│   ├── pages/                          # 新增 8 个页面
│   │   ├── store/
│   │   │   ├── index/
│   │   │   │   ├── index.tsx           # 【新增】门店地图页 (Tab)
│   │   │   │   ├── index.config.ts     # navigationBarTitleText: "门店地图"
│   │   │   │   └── index.less
│   │   │   └── detail/
│   │   │       ├── index.tsx           # 【新增】门店详情页
│   │   │       ├── index.config.ts     # navigationBarTitleText: "门店详情"
│   │   │       └── index.less
│   │   ├── appointment/
│   │   │   ├── create/
│   │   │   │   ├── index.tsx           # 【新增】创建预约页
│   │   │   │   ├── index.config.ts
│   │   │   │   └── index.less
│   │   │   ├── confirm/
│   │   │   │   ├── index.tsx           # 【新增】预约确认页
│   │   │   │   ├── index.config.ts
│   │   │   │   └── index.less
│   │   │   └── list/
│   │   │       ├── index.tsx           # 【新增】我的预约列表
│   │   │       ├── index.config.ts
│   │   │       └── index.less
│   │   ├── design/
│   │   │   └── material-compare/
│   │   │       ├── index.tsx           # 【新增】材质对比页
│   │   │       ├── index.config.ts
│   │   │       └── index.less
│   │   └── profile/
│   │       ├── index.tsx               # 修改: 新增 3 个功能入口
│   │       └── history/
│   │           ├── configs/
│   │           │   ├── index.tsx       # 【新增】改色历史页
│   │           │   ├── index.config.ts
│   │           │   └── index.less
│   │           └── quotes/
│   │               ├── index.tsx       # 【新增】报价历史页
│   │               ├── index.config.ts
│   │               └── index.less
│   │
│   ├── components/                     # 新增 7 个公共组件
│   │   ├── StoreMap/                   # 【新增】地图容器组件
│   │   │   ├── index.tsx
│   │   │   └── index.less
│   │   ├── StoreCard/                  # 【新增】门店信息卡片
│   │   │   ├── index.tsx
│   │   │   └── index.less
│   │   ├── AppointmentForm/            # 【新增】3 步预约表单向导
│   │   │   ├── index.tsx
│   │   │   └── index.less
│   │   ├── TimeSlotPicker/             # 【新增】时间段选择器
│   │   │   ├── index.tsx
│   │   │   └── index.less
│   │   ├── MaterialCompareTable/       # 【新增】材质对比表格
│   │   │   ├── index.tsx
│   │   │   └── index.less
│   │   ├── DateRangeFilter/            # 【新增】日期范围筛选器
│   │   │   ├── index.tsx
│   │   │   └── index.less
│   │   ├── HistoryList/                # 【新增】通用历史记录列表
│   │   │   ├── index.tsx
│   │   │   └── index.less
│   │   └── StatusBadge/                # 【新增】状态标签组件
│   │       ├── index.tsx
│   │       └── index.less
│   │
│   ├── stores/                         # 新增 4 个 Zustand Store
│   │   ├── store-store.ts              # 【新增】门店状态管理
│   │   ├── appointment-store.ts        # 【新增】预约状态管理
│   │   ├── material-compare-store.ts   # 【新增】材质对比状态管理
│   │   └── history-store.ts            # 【新增】历史记录状态管理
│   │
│   ├── services/                       # 新增 4 个 API Service
│   │   ├── store.service.ts            # 【新增】门店 API
│   │   ├── appointment.service.ts      # 【新增】预约 API
│   │   ├── material.service.ts         # 【新增】材质 API (Phase 3 扩展)
│   │   └── history.service.ts          # 【新增】历史记录 API
│   │
│   ├── types/                          # 新增类型定义
│   │   ├── store.d.ts                  # 【新增】Store, NearbyStore 类型
│   │   ├── appointment.d.ts            # 【新增】Appointment, TimeSlot, ServiceType
│   │   ├── material.d.ts               # 【修改】扩展 Material 类型 (Phase 3 新增字段)
│   │   └── history.d.ts                # 【新增】HistoryConfig, HistoryQuote 类型
│   │
│   ├── assets/
│   │   └── tab/                         # 新增门店 Tab 图标
│   │       ├── store.png
│   │       └── store-active.png
│   │
│   └── utils/
│       └── constants.ts                # 修改: 新增 Phase 3 错误码 + 枚举常量
```

### 15.2 与 Phase 1/2 文件的交叉影响

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/app.config.ts` | 修改 | 新增 8 个页面路由注册 + Tab Bar 从 4→5 |
| `src/pages/profile/index.tsx` | 修改 | 功能列表从 3 项扩展为 6 项 |
| `src/pages/design/index.tsx` | 修改 | 新增"材质对比"入口按钮 |
| `src/components/MaterialSelector/index.tsx` | 修改 | 每项材质旁新增"加入对比"图标按钮 |
| `src/types/material.d.ts` | 修改 | Material 接口扩展 Phase 3 新字段 |
| `src/utils/constants.ts` | 修改 | 新增 Phase 3 错误码枚举 |
| `src/services/color.service.ts` | 修改 | `getMaterials()` 返回类型扩展 (Phase 3 新增了 `glossLevel` 等字段) |

---

## 16. Phase 3 路由设计

### 16.1 app.config.ts 页面注册 (完整版)

```typescript
// src/app.config.ts (Phase 3 完整版本)
export default defineAppConfig({
  pages: [
    // 5 个 Tab 页 — 必须在 pages 数组前 5 位
    'pages/home/index',
    'pages/design/index',
    'pages/cases/index',
    'pages/store/index',          // 【新增】门店 Tab (位置 4)
    'pages/profile/index',

    // 非 Tab 子页面
    'pages/auth/login',
    'pages/home/car-select',
    'pages/design/quote',
    'pages/design/material-compare/index',    // 【新增】
    'pages/cases/detail/index',               // Phase 2 已有
    'pages/store/detail/index',               // 【新增】
    'pages/appointment/create/index',         // 【新增】
    'pages/appointment/confirm/index',        // 【新增】
    'pages/appointment/list/index',           // 【新增】
    'pages/profile/favorites/index',          // Phase 2 已有
    'pages/profile/history/configs/index',    // 【新增】
    'pages/profile/history/quotes/index',     // 【新增】
    'pages/ai/generate/index',                // Phase 2 已有
  ],

  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#FFFFFF',
    navigationBarTitleText: 'WrapLab',
    navigationBarTextStyle: 'black',
  },

  tabBar: {
    color: '#999999',
    selectedColor: '#1677FF',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '首页',
        iconPath: 'assets/tab/home.png',
        selectedIconPath: 'assets/tab/home-active.png',
      },
      {
        pagePath: 'pages/design/index',
        text: '改色设计',
        iconPath: 'assets/tab/design.png',
        selectedIconPath: 'assets/tab/design-active.png',
      },
      {
        pagePath: 'pages/cases/index',
        text: '案例',
        iconPath: 'assets/tab/cases.png',
        selectedIconPath: 'assets/tab/cases-active.png',
      },
      {
        pagePath: 'pages/store/index',            // 【新增】第 4 位 Tab
        text: '门店',
        iconPath: 'assets/tab/store.png',
        selectedIconPath: 'assets/tab/store-active.png',
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'assets/tab/profile.png',
        selectedIconPath: 'assets/tab/profile-active.png',
      },
    ],
  },

  // 【新增】小程序定位权限声明 (微信平台需在 app.json 配置)
  permission: {
    'scope.userLocation': {
      desc: '用于查找您附近的 WrapLab 合作门店',
    },
  },

  // 【新增】允许使用地图组件的必需配置
  requiredPrivateInfos: ['getLocation'],
});
```

### 16.2 路由参数传递约定 (Phase 3 新增)

| 源页面 | 目标页面 | 跳转方式 | 传递参数 | 说明 |
|--------|----------|----------|----------|------|
| 门店 Tab | `store/detail/index` | `navigateTo` | `?id=:storeId` | 点击标注卡片"查看详情" |
| `store/detail/index` | `appointment/create/index` | `navigateTo` | `?storeId=` | 底部"在线预约"按钮 |
| `store/detail/index` | 系统地图 App | `Taro.openLocation` | `{ latitude, longitude, name, address }` | 底部"一键导航"按钮 |
| 门店简短卡片 | `appointment/create/index` | `navigateTo` | `?storeId=` | 卡片"在线预约"按钮 |
| 门店简短卡片 | 系统地图 App | `Taro.openLocation` | `{ latitude, longitude, name, address }` | 卡片"一键导航"按钮 |
| `appointment/create/index` | `appointment/confirm/index` | `redirectTo` | `?id=:appointmentId` | 提交成功后跳转，替换当前页 |
| `appointment/confirm/index` | `appointment/list/index` | `navigateTo` | 无 | "查看我的预约"按钮 |
| `appointment/confirm/index` | `pages/home/index` | `switchTab` | 无 | "返回首页"按钮 |
| `appointment/list/index` | `pages/store/index` | `switchTab` | 无 | 空状态"去预约"按钮 |
| `profile/index` | `appointment/list/index` | `navigateTo` | 无 | 功能列表"我的预约"入口 |
| `profile/index` | `profile/history/configs/index` | `navigateTo` | 无 | 功能列表"改色历史"入口 |
| `profile/index` | `profile/history/quotes/index` | `navigateTo` | 无 | 功能列表"报价历史"入口 |
| `design/index` | `design/material-compare/index` | `navigateTo` | 无 | 材质选择器旁"材质对比"入口 |
| `profile/history/configs/index` | `design/index` | `navigateTo` | `?modelId=&configurationId=` | 点击方案项 / "复用方案"按钮 |
| `profile/history/quotes/index` | `design/index` | `navigateTo` | `?modelId=&configurationId=` | 报价详情弹窗"查看方案"按钮 |
<!-- 备用门店入口已移除：门店 Tab 已在底部导航栏中，profile 页无需重复入口 -->

### 16.3 Phase 3 导航工具函数扩展

```typescript
// src/utils/navigate.ts (扩展)

/** 跳转门店详情 */
export function navigateToStoreDetail(storeId: string) {
  Taro.navigateTo({ url: `/pages/store/detail/index?id=${storeId}` });
}

/** 跳转创建预约 */
export function navigateToAppointmentCreate(storeId?: string) {
  const url = storeId
    ? `/pages/appointment/create/index?storeId=${storeId}`
    : '/pages/appointment/create/index';
  Taro.navigateTo({ url });
}

/** 跳转预约确认页 */
export function navigateToAppointmentConfirm(appointmentId: string) {
  Taro.redirectTo({ url: `/pages/appointment/confirm/index?id=${appointmentId}` });
}

/** 跳转我的预约列表 */
export function navigateToAppointmentList() {
  Taro.navigateTo({ url: '/pages/appointment/list/index' });
}

/** 跳转材质对比页 */
export function navigateToMaterialCompare() {
  Taro.navigateTo({ url: '/pages/design/material-compare/index' });
}

/** 跳转改色历史 */
export function navigateToHistoryConfigs() {
  Taro.navigateTo({ url: '/pages/profile/history/configs/index' });
}

/** 跳转报价历史 */
export function navigateToHistoryQuotes() {
  Taro.navigateTo({ url: '/pages/profile/history/quotes/index' });
}

/** 跳转改色工作台 (复用方案) — 定义见 Section 3.3 */
export function navigateToDesign(params: { modelId: string; configurationId?: string }) {
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  Taro.navigateTo({ url: `/pages/design/index?${query}` });
}

/** 一键导航 (打开系统地图) */
export function openMapNavigation(params: {
  latitude: number;
  longitude: number;
  name: string;
  address: string;
}) {
  Taro.openLocation({
    latitude: params.latitude,
    longitude: params.longitude,
    name: params.name,
    address: params.address,
    scale: 16,
  });
}
```

---

## 17. Phase 3 组件树

### 17.1 页面组件层级结构

```
App (src/app.tsx)
│
├── pages/store/index (门店地图 Tab)                          ← 【新增】
│   ├── View (顶部: 定位权限提示条)                              ← 定位拒绝时
│   │   └── View ("无法获取您的位置" + "去开启"按钮)
│   ├── StoreMap (地图主体 + 标注)                             ← success 状态
│   │   ├── Map (Taro Map 组件)
│   │   │   └── Marker × N (门店标注, callout 距离标签)
│   │   └── View (底部简短卡片, 标注点击时弹出)
│   │       ├── Image (门店封面图)
│   │       ├── Text (门店名称)
│   │       ├── View (星级评分)
│   │       ├── Text (距离)
│   │       ├── Text (地址摘要, 30 字截断)
│   │       └── View (操作按钮组)
│   │           ├── Button ("查看详情") → navigateToStoreDetail
│   │           ├── Button ("一键导航") → openMapNavigation
│   │           └── Button ("在线预约") → navigateToAppointmentCreate
│   ├── View (底部抽屉式门店列表区, P1)                         ← 上拉展开
│   │   ├── StoreCard × N (列表项)
│   │   │   ├── Text (排名序号)
│   │   │   ├── Image (Logo)
│   │   │   ├── View (名称 + 评分 + 距离)
│   │   │   └── Text (地址)
│   │   └── LoadingSkeleton (底部列表骨架屏)
│   ├── EmptyState ("当前区域暂无合作门店" + "扩大搜索范围"按钮)
│   └── ErrorState (门店 API 失败 + 重试按钮)
│
├── pages/store/detail/index (门店详情)                        ← 【新增】
│   ├── LoadingSkeleton (图片区 420rpx 高度骨架 + 信息区 5 行文字线 + 服务标签)
│   ├── ErrorState ("门店信息加载失败" + 重试)
│   ├── EmptyState ("门店不存在或已下线" + "返回门店列表"按钮)
│   └── View (正常内容)                                        ← success 状态
│       ├── Swiper (店面实拍图片轮播 + 圆点指示器)
│       ├── View (门店基本信息区)
│       │   ├── Image (Logo)
│       │   ├── Text (门店名称)
│       │   ├── StatusBadge ("推荐", rating >= 4.5)
│       │   ├── View (星级评分)
│       │   ├── Text (距离)
│       │   └── Text (完整地址)
│       ├── View (营业时间区)
│       │   └── Text (每日营业时间: "周一至周日 09:00-19:00")
│       ├── View (服务项目区)
│       │   └── Tag × N (服务类型标签: "车衣改色" / "车窗贴膜" / "漆面保护")
│       ├── View (门店简介文本区)
│       ├── View (联系电话) → onTap → Taro.makePhoneCall
│       └── View (底部固定操作栏)
│           ├── Button ("一键导航") → openMapNavigation
│           ├── Button ("拨打电话") → Taro.makePhoneCall
│           └── Button ("在线预约", primary) → navigateToAppointmentCreate
│
├── pages/appointment/create/index (创建预约)                  ← 【新增】
│   ├── AppointmentForm (3 步表单向导)
│   │   ├── Steps (步骤条: ① 选择门店 → ② 服务类型 → ③ 时间&联系信息)
│   │   │
│   │   ├── Step 1 — 选择门店:
│   │   │   ├── StoreCard (已预选门店卡片, 可修改)               ← 若 storeId 由路由传入
│   │   │   ├── View (门店选择器 / 底部弹出列表)                  ← 若无 storeId
│   │   │   │   └── StoreCard × N (可选门店列表)
│   │   │   ├── LoadingSkeleton (门店列表骨架)
│   │   │   ├── EmptyState ("暂无可用门店")
│   │   │   └── ErrorState + 重试
│   │   │
│   │   ├── Step 2 — 选择服务类型:
│   │   │   ├── View (服务类型单选列表)
│   │   │   │   └── View × N (服务类型项: 图标 + 名称 + 描述)
│   │   │   ├── LoadingSkeleton (服务类型骨架)
│   │   │   ├── EmptyState ("暂无可用服务类型")
│   │   │   └── ErrorState + 重试
│   │   │
│   │   └── Step 3 — 日期 + 时段 + 联系信息:
│   │       ├── View (日历组件: 未来 30 天网格)
│   │       │   └── View × 30 (日期格子: 可选/不可选/已选高亮/已约满标记)
│   │       ├── TimeSlotPicker (时段选择: 上午/下午/晚间)
│   │       │   ├── View (时段卡片: 时间范围 + 剩余名额 + 选中态边框)
│   │       │   ├── LoadingSkeleton (时段骨架)
│   │       │   └── ErrorState + 重试
│   │       ├── View (联系信息表单)
│   │       │   ├── Input (姓名, 必填, maxlength=20)
│   │       │   ├── Input (手机号, 必填, type="number", maxlength=11)
│   │       │   ├── Input (车辆信息, 选填)
│   │       │   └── Textarea (备注, 选填, maxlength=200, 字数统计)
│   │       └── Button ("提交预约", loading + 禁用态) → POST /appointments
│   │
│   └── EmptyState ("门店不可用" + 返回重选, storeId 无效时)     ← 整体空状态
│
├── pages/appointment/confirm/index (预约确认)                  ← 【新增】
│   ├── LoadingSkeleton (详情卡片骨架)
│   ├── EmptyState ("预约信息不存在", id 无效时)
│   ├── ErrorState ("预约数据加载失败" + 重试)
│   └── View (正常内容)                                        ← success 状态
│       ├── View (成功图标: 绿色对勾动画, 1s 缩放入场)
│       ├── Text ("预约提交成功")
│       ├── View (预约详情卡片)
│       │   ├── Text (预约编号: APT202607250001)
│       │   ├── Text (门店名称)
│       │   ├── StatusBadge (状态: "待确认", 橙色)
│       │   ├── Text (服务类型)
│       │   ├── Text (预约日期)
│       │   ├── Text (预约时段)
│       │   ├── Text (客户姓名)
│       │   └── Text (客户电话)
│       └── View (底部按钮组)
│           ├── Button ("查看我的预约", primary) → navigateToAppointmentList
│           └── Button ("返回首页") → switchTab('pages/home/index')
│
├── pages/appointment/list/index (我的预约列表)                 ← 【新增】
│   ├── View (顶部状态 Tab 栏)
│   │   └── View × 5 (全部 / 待确认 / 已确认 / 已完成 / 已取消, 各带数量徽标)
│   ├── LoadingSkeleton (列表骨架屏)
│   ├── EmptyState ("暂无预约记录" + "去预约"按钮)
│   ├── ErrorState ("预约列表加载失败" + 重试)
│   └── ScrollView (预约列表)                                  ← success 状态
│       └── View × N (预约列表项)
│           ├── Text (预约编号, 截断)
│           ├── Text (门店名称)
│           ├── Text (服务类型)
│           ├── Text (预约日期 + 时段)
│           ├── StatusBadge (状态标签, 颜色区分)
│           └── Text (创建时间)
│       └── View (底部: "没有更多了", hasMore=false)
│   └── View (预约详情弹窗, 底部弹出, 点击列表项触发)
│       ├── Text (预约编号)
│       ├── Text (门店名称 + 地址)
│       ├── Text (服务类型)
│       ├── Text (预约日期 + 时段)
│       ├── Text (客户姓名 + 电话)
│       ├── Text (备注)
│       ├── StatusBadge (状态标签)
│       ├── Text (创建时间)
│       ├── Button ("取消预约") → 取消原因面板          ← 仅 pending/confirmed 显示
│       └── Button ("关闭")
│   └── View (取消原因选择面板, 底部弹出)
│       ├── RadioGroup (预设原因: 行程变更/选其他门店/暂时不需要/其他)
│       ├── Input (其他原因输入框, maxlength=100, 选"其他原因"时显示)
│       └── Button ("确认取消") → 二次确认弹窗 → PUT /appointments/mine/:id/cancel
│
├── pages/design/material-compare/index (材质对比)               ← 【新增】
│   ├── EmptyState ("选择 2-3 种材质开始对比" + "添加材质"按钮)   ← 初始空状态
│   ├── EmptyState ("可用材质不足, 无法进行对比" + 返回按钮)      ← 材质 ≤ 1 种
│   ├── LoadingSkeleton (对比表格骨架: 3 列占位)
│   ├── ErrorState ("材质数据加载失败" + 重试)
│   └── View (对比内容)                                        ← success 状态
│       ├── View (顶部操作栏)
│       │   ├── Button ("+ 添加材质") → 材质选择面板
│       │   ├── View (已选材质缩略标签 × 2~3, 含 × 移除按钮)
│       │   └── Button ("清空对比")                              ← P1
│       ├── MaterialCompareTable (并排对比表格)
│       │   ├── View (维度名列, 左侧固定)
│       │   │   ├── Text ("表面效果")
│       │   │   ├── Text ("光泽度")
│       │   │   ├── Text ("耐久性")
│       │   │   ├── Text ("价格倍率")
│       │   │   ├── Text ("推荐用途")
│       │   │   └── View ("材质样张")
│       │   └── ScrollView (材质列, 横向滑动)
│       │       └── View × 2~3 (材质列)
│       │           ├── Text (材质名称, 可点击 → 材质详情弹窗)
│       │           ├── Text (表面效果值)
│       │           ├── View (光泽度星级 / 进度条)
│       │           ├── Text (耐久性)
│       │           ├── Text (价格倍率)
│       │           ├── Text (推荐用途)
│       │           └── Image (材质样张缩略图, 可点击放大)
│       └── View (材质选择面板, 底部弹出)
│           ├── LoadingSkeleton (材质列表骨架)
│           ├── ErrorState + 重试
│           └── View × N (材质项)
│               ├── Image (缩略图)
│               ├── Text (材质名称)
│               ├── Text (表面效果标签)
│               └── Icon (已选标记 / 对勾, 若已加入对比)
│   └── View (材质详情弹窗, 底部弹出)                            ← P1
│       ├── Image (材质大图)
│       ├── View (完整属性列表)
│       ├── View (优缺点: pros / cons)
│       └── View (相关案例链接 → 跳转案例详情)
│
├── pages/profile/history/configs/index (改色历史)              ← 【新增】
│   ├── DateRangeFilter (日期筛选: 最近7天/30天/90天/全部/自定义)
│   ├── LoadingSkeleton (列表骨架屏)
│   ├── EmptyState ("暂无改色记录" + "去创建"按钮)
│   ├── ErrorState ("方案历史加载失败" + 重试)
│   └── HistoryList (历史方案列表)                              ← success 状态
│       └── View × N (方案列表项)
│           ├── Image (缩略图)
│           ├── StatusBadge ("分区", 分区方案时, 右下角角标)
│           ├── Text (车型名称: 品牌+车系+型号)
│           ├── View (颜色信息: 色块 + 品牌 + 颜色名)
│           ├── Text (材质类型)
│           ├── Text (改色模式: 全车/分区)
│           ├── Text (创建时间)
│           └── Button ("复用方案") → navigateToDesign(modelId, configurationId)
│       └── View (底部: "没有更多了", hasMore=false)
│
├── pages/profile/history/quotes/index (报价历史)               ← 【新增】
│   ├── DateRangeFilter (日期筛选: 与改色历史共用)
│   ├── LoadingSkeleton (列表骨架屏)
│   ├── EmptyState ("暂无报价记录" + "去创建"按钮)
│   ├── ErrorState ("报价历史加载失败" + 重试)
│   └── HistoryList (报价历史列表)                              ← success 状态
│       └── View × N (报价列表项)
│           ├── Text (报价编号, 截断)
│           ├── Text (车型名称)
│           ├── Text (总价金额, 绿色大字, 金额为 0/null 时显示"待报价")
│           ├── Text (客户姓名)
│           ├── Text (创建时间)
│           └── StatusBadge (状态: 已提交/已跟进/已成交/已失效)
│       └── View (底部: "没有更多了", hasMore=false)
│   └── View (报价详情弹窗, 底部弹出)
│       ├── Text (报价编号)
│       ├── Text (车型信息)
│       ├── View (颜色 + 材质配置)
│       ├── View (价格明细: 材料费 + 工时费 + 总价)
│       ├── Text (客户姓名 + 电话, 脱敏)
│       ├── Text (备注)
│       ├── StatusBadge (状态标签)
│       ├── Text (创建时间)
│       └── Button ("查看方案") → navigateToDesign(modelId, configurationId)
│
└── pages/profile/index (我的页面)                               ← 【修改】
    └── View (功能列表, 6 项)
        ├── View ("我的方案") → 展开方案列表                         (Phase 1 已有)
        ├── View ("我的收藏") → navigateToFavorites                 (Phase 2 已有)
        ├── View ("我的预约") → navigateToAppointmentList           ← 【新增】+ 红色徽标
        ├── View ("改色历史") → navigateToHistoryConfigs            ← 【新增】
        ├── View ("报价历史") → navigateToHistoryQuotes             ← 【新增】
        └── View ("AI 生图记录") → navigateToAiGenerate            (Phase 2 已有)
```

---

## 18. Phase 3 新增组件规格

### 18.1 StoreMap

**职责**：封装 Taro `<Map>` 组件的门店地图展示逻辑，包括标注渲染、标注点击弹出卡片、视野变化防抖重加载、定位权限处理。

```
StoreMap/
├── index.tsx
└── index.less
```

**Props**：

```typescript
interface StoreMapProps {
  /** 附近门店列表 (来自 API) */
  stores: NearbyStore[];
  /** 门店列表加载中 */
  loading?: boolean;
  /** 门店列表加载失败 */
  error?: boolean;
  /** 用户当前纬度 */
  latitude: number;
  /** 用户当前经度 */
  longitude: number;
  /** 定位权限状态 */
  locationAuthorized: boolean;
  /** 定位失败文案 */
  locationError?: string;
  /** 点击门店标注回调 */
  onMarkerTap?: (store: NearbyStore) => void;
  /** 点击"查看详情"回调 */
  onViewDetail?: (storeId: string) => void;
  /** 点击"一键导航"回调 */
  onNavigate?: (store: NearbyStore) => void;
  /** 点击"在线预约"回调 */
  onBookAppointment?: (storeId: string) => void;
  /** 地图视野变化回调 (防抖 500ms) */
  onRegionChange?: (params: { latitude: number; longitude: number }) => void;
  /** 重试加载回调 */
  onRetry?: () => void;
  /** 扩大搜索范围回调 (空状态时) */
  onExpandSearch?: () => void;
}
```

**内部状态**：

| 状态 | 条件 | UI |
|------|------|-----|
| loading | stores.length === 0 && loading | 地图正常渲染 (使用上次位置缓存), 标注为空 |
| empty | stores.length === 0 && !loading && !error | "当前区域暂无合作门店"空状态文案 + "扩大搜索范围"按钮 |
| error | error === true | 地图正常渲染, 标注为空, 底部错误提示 + 重试按钮 |
| unauthorized | locationAuthorized === false | 顶部提示条"无法获取您的位置" + "去开启"按钮 → `Taro.openSetting` |
| success | stores.length > 0 | 地图标注渲染 + 标注点击弹出简短卡片 |

**标注点击行为**：

```typescript
// StoreMap 内部维护当前弹出卡片的 storeId
// 点击标记 A → 弹出卡片 A → 存入 activeStoreId = A
// 点击标记 B → 关闭卡片 A → 弹出卡片 B → activeStoreId = B
// 点击地图空白处 → 关闭卡片 → activeStoreId = null
// 300ms 内不响应第二次点击 (防重复弹窗)
```

**关键技术决策**：

```
决策: 标注聚合
- 问题: 同屏门店标注超过 20 个时视图拥挤
- 选择: 使用微信 Map 组件的聚合功能 (setting.anchor 配置)
- Trade-off: 聚合标注仅展示数量不展示具体门店, 需用户缩放地图至一定层级后显示单门店标注
- 替代方案: 使用自定义 Canvas 聚合 (开发量大, 各平台不统一) → 不选择

决策: 视野变化重载策略
- 问题: 用户拖拽地图后何时重新请求门店数据
- 选择: 地图移动停止后 500ms 防抖 → 计算当前中心点偏移是否超过上次加载视口半径 50% → 若超过则重请求
- Trade-off: 快速连续拖拽时不会频繁请求, 但小幅移动时地图数据不会更新 (用户需通过"扩大搜索范围"按钮手动触发)
- 实现: 监听 Map 组件的 onRegionChange 回调, 记录 { latitude, longitude }, 通过 useDebounce 延迟检查
```

---

### 18.2 StoreCard

**职责**：可复用的门店信息卡片组件，支持多种展示模式：地图简短卡片、列表项卡片、详情卡片。

```
StoreCard/
├── index.tsx
└── index.less
```

**Props**：

```typescript
interface StoreCardProps {
  /** 门店数据 */
  store: NearbyStore;
  /** 展示模式 */
  mode: 'brief' | 'list-item' | 'detail-summary';
  /** 排名序号 (mode=list-item 时展示) */
  rank?: number;
  /** 是否显示详细地址 */
  showFullAddress?: boolean;
  /** 是否显示操作按钮组 */
  showActions?: boolean;
  /** 查看详情回调 */
  onViewDetail?: (storeId: string) => void;
  /** 一键导航回调 */
  onNavigate?: (store: NearbyStore) => void;
  /** 在线预约回调 */
  onBook?: (storeId: string) => void;
}
```

**三种模式渲染差异**：

| 属性 | brief | list-item | detail-summary |
|------|-------|-----------|----------------|
| 封面图 | 顶部小图 (200rpx 高) | Logo 小图 (80rpx 圆角) | 无 (详情页单独轮播) |
| 名称 | 单行, 粗体 | 单行, 中等字号 | 双行, Logo + 名称 |
| 评分 | 星数 + 数字 | 星数 + 数字 | 星数 + 数字 + "推荐"标签 |
| 距离 | 显示 | 显示 | 显示 |
| 地址 | 截断至 30 字 | 截断至 20 字 | 完整地址 |
| 按钮 | "查看详情"+"一键导航"+"在线预约" (3 个) | 无 (整行点击) | 无 |
| 排名序号 | 不显示 | 左侧圆形序号 | 不显示 |

---

### 18.3 AppointmentForm

**职责**：3 步预约表单向导，管理步骤切换、表单校验、数据收集，最终提交预约。

```
AppointmentForm/
├── index.tsx
└── index.less
```

**Props**：

```typescript
interface AppointmentFormProps {
  /** 预选门店 ID (从路由参数传入, 可选) */
  presetStoreId?: string;
  /** 预填客户信息 (创建页通过 AuthStore.staff 注入当前登录用户姓名/手机号) */
  presetCustomerInfo?: { name?: string; phone?: string };
  /** 提交预约回调 */
  onSubmit: (data: AppointmentFormData) => Promise<void>;
  /** 提交中标记 */
  submitting?: boolean;
}

interface AppointmentFormData {
  storeId: string;
  serviceType: string;
  appointmentDate: string;    // YYYY-MM-DD
  timeSlot: 'MORNING' | 'AFTERNOON' | 'EVENING';
  customerName: string;
  customerPhone: string;
  vehicleInfo?: string;
  remark?: string;
}
```

**内部状态**：

```typescript
interface AppointmentFormState {
  currentStep: 1 | 2 | 3;
  // Step 1 数据
  selectedStore: NearbyStore | null;
  storeList: NearbyStore[];
  storeLoading: boolean;
  storeError: string | null;

  // Step 2 数据
  selectedServiceType: string | null;
  serviceTypes: ServiceType[];
  serviceTypesLoading: boolean;
  serviceTypesError: string | null;

  // Step 3 数据
  selectedDate: string | null;
  timeSlots: TimeSlot[];
  timeSlotsLoading: boolean;
  timeSlotsError: string | null;
  customerName: string;
  customerPhone: string;
  vehicleInfo: string;
  remark: string;

  // 校验状态
  formErrors: Record<string, string>;
}
```

**步骤跳转校验规则**：

```
Step 1 → Step 2: selectedStore !== null
Step 2 → Step 3: selectedServiceType !== null
Step 3 → 提交: 所有必填字段通过校验
  - customerName: 2-20 字符, 非空
  - customerPhone: 11 位数字, 号段校验 (13/15/17/18/19 开头)
  - selectedDate: 非空
  - selectedTimeSlot: 非空 (且 selectedSlot.available === true)

步骤间支持前进和后退：
  - "下一步"按钮: 通过校验后 step += 1
  - "上一步"按钮: step -= 1, 保留已填数据
  - 步骤指示器支持点击跳转: 仅已完成的步骤可点击
```

**presetCustomerInfo 初始化**：

```typescript
// 创建预约页在渲染 AppointmentForm 时注入当前登录用户信息
// pages/appointment/create/index 中:
const staff = AuthStore.useStore(s => s.staff);
<AppointmentForm
  presetCustomerInfo={staff ? { name: staff.name, phone: staff.mobile } : undefined}
  ...
/>
// AppointmentForm 内部在 useEffect/useLoad 中将 presetCustomerInfo 写入 internal state:
//   customerName = presetCustomerInfo.name || customerName (保留用户手动修改)
//   customerPhone = presetCustomerInfo.phone || customerPhone
// 用户可覆盖预填值，预填仅在 Step 3 首次渲染时生效
```

**重复提交防护**：

```typescript
// AppointmentForm 内部维护提交锁
let isSubmitting = false;

async function handleSubmit() {
  if (isSubmitting) return;  // 重复点击拦截
  isSubmitting = true;
  try {
    await onSubmit(formData);
  } finally {
    isSubmitting = false;
  }
}
```

---

### 18.4 TimeSlotPicker

**职责**：展示指定日期的可用预约时段，支持选中和不可选状态的差异化 UI。

```
TimeSlotPicker/
├── index.tsx
└── index.less
```

**Props**：

```typescript
interface TimeSlotPickerProps {
  /** 时段列表 */
  slots: TimeSlot[];
  /** 当前选中的时段 */
  selectedSlot?: string;
  /** 加载中 */
  loading?: boolean;
  /** 加载失败 */
  error?: boolean;
  /** 选择时段回调 */
  onSelect: (timeSlot: string) => void;
  /** 重试回调 */
  onRetry: () => void;
}

interface TimeSlot {
  timeSlot: 'MORNING' | 'AFTERNOON' | 'EVENING';
  label: string;                // "上午 09:00-12:00"
  available: boolean;
  remaining: number;
}
```

**渲染规则**：

| 条件 | UI |
|------|-----|
| available && remaining > 0 | 正常展示: 时间范围 + "剩余 X 位" + 可点击选中 (蓝色边框高亮) |
| !available | 置灰: 时间范围 + "已约满" 红色文字, 不可点击 |
| selected | 蓝色实线边框 + 浅蓝背景 + 对勾图标 |
| loading | 3 个时段卡片骨架屏 (灰色占位) |
| error | 错误提示 + "重新加载"按钮 |

---

### 18.5 MaterialCompareTable

**职责**：2-3 列材质并排对比表格，维度名列左侧固定，材质列横向滑动。

```
MaterialCompareTable/
├── index.tsx
└── index.less
```

**Props**：

```typescript
interface MaterialCompareTableProps {
  /** 对比的材质列表 (2-3 项) */
  materials: MaterialDetail[];
  /** 加载中 */
  loading?: boolean;
  /** 加载失败 */
  error?: boolean;
  /** 点击材质名称/样张回调 (查看详情) */
  onMaterialDetail?: (material: MaterialDetail) => void;
  /** 移除材质回调 */
  onRemoveMaterial?: (materialId: string) => void;
  /** 重试回调 */
  onRetry: () => void;
}

/** Phase 3 扩展的材质类型 */
interface MaterialDetail {
  id: string;
  name: string;                  // "PK30 亮面"
  finishType: string;            // "亮面"
  glossLevel: number;            // 1-5
  durability: string;            // "5年"
  durabilityScore: number;       // 1-5
  priceMultiplier: number;       // 1.2
  recommendedUse: string[];     // ["日常通勤", "商务接待"]
  sampleImage: string;           // 样张 URL
  description?: string;
  pros?: string[];
  cons?: string[];
  relatedCaseIds?: string[];
}
```

**布局结构**：

```
┌──────────────┬──────────────────────┬──────────────────────┐
│              │  材质 A (PK30 亮面)   │  材质 B (PK30 哑光)   │
│   维度名列    │  [×移除: 仅 ≥ 3 项时] │  [×移除]             │
│  (固定左侧)   │                       │                      │
├──────────────┼──────────────────────┼──────────────────────┤
│  表面效果     │  亮面                 │  哑光                 │
│  光泽度       │  ★★★★★ (5)          │  ★☆☆☆☆ (1)          │
│  耐久性       │  5年 (★★★★★)        │  5年 (★★★★★)        │
│  价格倍率     │  1.2x 标准价         │  1.0x 基准价         │
│  推荐用途     │  日常通勤, 商务接待   │  运动风格, 个性化改装  │
│  材质样张     │  [样张缩略图]         │  [样张缩略图]         │
└──────────────┴──────────────────────┴──────────────────────┘
     ← 固定 →           ← 横向 ScrollView (当材质 > 2 列时滑动) →
```

**关键技术决策**：

```
决策: 维度名列固定 vs 全表滚动
- 选择: 维度名列 (第一列) position: sticky; left: 0; 材质列 ScrollView scrollX
- Trade-off: 需要精确计算列宽, 小屏 (< 375px 逻辑像素) 下每列宽度压缩至 150px, 可能需截断内容 + "..." 展开
- 替代方案: 使用纵向维度行 (每行一个维度) → 材质数量增加时对比感弱, 不直观 → 不选择
```

---

### 18.6 DateRangeFilter

**职责**：复用日期范围筛选组件，预设快捷选项 + 自定义日期范围选择。

```
DateRangeFilter/
├── index.tsx
└── index.less
```

**Props**：

```typescript
interface DateRangeFilterProps {
  /** 当前选中的预设选项 (或 'custom') */
  selectedPreset: '7d' | '30d' | '90d' | 'all' | 'custom';
  /** 自定义开始日期 (preset='custom' 时) */
  customStartDate?: string;   // YYYY-MM-DD
  /** 自定义结束日期 (preset='custom' 时) */
  customEndDate?: string;     // YYYY-MM-DD
  /** 筛选变更回调 (携带解析后的 startDate/endDate) */
  onChange: (range: { startDate?: string; endDate?: string; preset: string }) => void;
}
```

**预设快捷选项**：

```typescript
const PRESETS = [
  { key: '7d', label: '最近 7 天', getRange: () => ({ startDate: dayjs().subtract(7, 'day').format('YYYY-MM-DD'), endDate: dayjs().format('YYYY-MM-DD') }) },
  { key: '30d', label: '最近 30 天', getRange: () => ({ startDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'), endDate: dayjs().format('YYYY-MM-DD') }) },
  { key: '90d', label: '最近 90 天', getRange: () => ({ startDate: dayjs().subtract(90, 'day').format('YYYY-MM-DD'), endDate: dayjs().format('YYYY-MM-DD') }) },
  { key: 'all', label: '全部', getRange: () => ({ startDate: undefined, endDate: undefined }) },
  { key: 'custom', label: '自定义', getRange: () => ({ /* 由用户输入 */ }) },
];
```

**校验规则**：
- 自定义模式：startDate 不能晚于 endDate，否则 Toast "开始日期不能晚于结束日期" 并阻止 `onChange` 触发
- 自定义模式：startDate 不能早于 1 年前
- 日期范围不能选择未来日期（endDate 不能超过今天）

---

### 18.7 HistoryList

**职责**：通用的历史记录分页列表组件，支持配置不同的列表项渲染器、日期筛选、分页加载。

```
HistoryList/
├── index.tsx
└── index.less
```

**Props**：

```typescript
interface HistoryListProps<T> {
  /** 列表数据 */
  items: T[];
  /** 加载中 */
  loading?: boolean;
  /** 加载失败 */
  error?: boolean;
  /** 是否还有更多数据 */
  hasMore: boolean;
  /** 空状态文案 */
  emptyMessage: string;
  /** 空状态引导按钮文案 */
  emptyActionText?: string;
  /** 空状态引导回调 */
  onEmptyAction?: () => void;
  /** 列表项渲染函数 */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** 列表项点击回调 */
  onItemTap?: (item: T, index: number) => void;
  /** 触底加载更多 */
  onLoadMore: () => void;
  /** 下拉刷新 */
  onRefresh: () => void;
  /** 重试回调 */
  onRetry: () => void;
  /** 列表底部文案 */
  loadMoreText?: string;
}
```

**4 种通用状态**：

| 状态 | 条件 | UI |
|------|------|-----|
| loading | loading && items.length === 0 | LoadingSkeleton type="history-list" (5 行列表骨架) |
| empty | !loading && !error && items.length === 0 | EmptyState(emptyMessage, actionText=emptyActionText, onAction=onEmptyAction) |
| error | error && items.length === 0 | ErrorState(message="加载失败", onRetry=onRetry) |
| success | items.length > 0 | 列表 + "加载更多" (hasMore) / "没有更多了" (!hasMore) |
| loadMore | loading && items.length > 0 | 列表 + 底部 loading 指示器 |
| loadMoreError | error && items.length > 0 | 列表 + 底部 "加载失败, 点击重试" |

**共用性说明**：`HistoryList` 同时服务于改色历史页和报价历史页。通过 `renderItem` 和 `onItemTap` 的泛型参数适配不同数据类型 (`HistoryConfig / HistoryQuote`)。

---

### 18.8 StatusBadge

**职责**：通用状态标签组件，统一不同页面中状态标签的颜色方案。

```
StatusBadge/
├── index.tsx
└── index.less
```

**Props**：

```typescript
interface StatusBadgeProps {
  /** 状态值 */
  status: string;
  /** 可选的 label 覆盖 (默认从 STATUS_MAP 读取) */
  label?: string;
  /** 尺寸 */
  size?: 'small' | 'default';
}

/** 全局状态颜色映射 */
const STATUS_COLOR_MAP: Record<string, { color: string; bg: string; label: string }> = {
  // 预约状态
  pending:    { color: '#FA8C16', bg: '#FFF7E6', label: '待确认' },
  confirmed:  { color: '#1677FF', bg: '#E6F4FF', label: '已确认' },
  completed:  { color: '#52C41A', bg: '#F6FFED', label: '已完成' },
  cancelled:  { color: '#999999', bg: '#F5F5F5', label: '已取消' },

  // 报价状态
  submitted:  { color: '#1677FF', bg: '#E6F4FF', label: '已提交' },
  followed:   { color: '#722ED1', bg: '#F9F0FF', label: '已跟进' },
  deal_closed:{ color: '#52C41A', bg: '#F6FFED', label: '已成交' },
  expired:    { color: '#999999', bg: '#F5F5F5', label: '已失效' },

  // 默认兜底 (未知状态不会导致白屏)
  __default__:{ color: '#999999', bg: '#F5F5F5', label: '--' },
};

/** 获取状态映射的辅助函数, 找不到匹配时返回 __default__ */
function getStatusStyle(status: string) {
  return STATUS_COLOR_MAP[status] ?? STATUS_COLOR_MAP.__default__;
}
```

---

## 19. Phase 3 新增 Zustand Stores

### 19.1 StoreStore

```typescript
// src/stores/store-store.ts
import { create } from 'zustand';

interface NearbyStore {
  id: string;
  name: string;
  logo: string;
  coverImage: string;
  address: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  rating?: number;
  phone: string;
  businessHours: string;
  services: string[];
  photos: string[];
  tags: string[];
}

interface StoreDetail extends NearbyStore {
  description: string;
  stats: { totalCases: number; totalAppointments: number };
}

interface StoreState {
  /** 用户位置 */
  userLocation: { latitude: number; longitude: number } | null;
  /** 位置权限状态 */
  locationAuthorized: boolean | null;   // null = 尚未请求, true = 已授权, false = 被拒绝
  /** 定位错误信息 */
  locationError: string | null;

  /** 附近门店列表 */
  nearbyStores: NearbyStore[];
  nearbyStoresLoading: boolean;
  nearbyStoresError: string | null;
  /** 搜索半径 (米), 默认 5000 */
  searchRadius: number;

  /** 当前选中的门店 (用于标注弹出卡片) */
  selectedStore: NearbyStore | null;

  /** 门店详情缓存 (按 storeId) */
  storeDetailMap: Record<string, StoreDetail>;
  storeDetailLoading: boolean;
  storeDetailError: string | null;

  // Actions
  /** 请求用户定位权限 */
  requestLocation: () => Promise<void>;
  /** 获取附近门店列表 */
  fetchNearbyStores: (params: { lat: number; lng: number; radius?: number; page?: number; size?: number }) => Promise<void>;
  /** 选中门店 (标注点击) */
  selectStore: (store: NearbyStore | null) => void;
  /** 获取门店详情 (优先缓存) */
  fetchStoreDetail: (storeId: string) => Promise<StoreDetail>;
  /** 扩大搜索范围 (半径 x2, 最大 50000m) */
  expandSearchRadius: () => void;
  /** 重置搜索半径 */
  resetSearchRadius: () => void;
}
```

**缓存策略**：
- `storeDetailMap`: 门店详情缓存，TTL 30 分钟。相同 storeId 30 分钟内不重复请求
- `nearbyStores`: 地图视野内门店数据在当前会话缓存，用户下拉刷新时清除
- `userLocation`: 持久化到 `Taro.Storage`，设置 5 分钟 TTL（避免每次都重新定位；超时后下次进入自动重新请求定位）

**定位权限流程**：

```
requestLocation():
  1. 检查 Taro.Storage 中缓存的 userLocation:
     - 缓存未过期 (5 分钟内) → 直接使用缓存
     - 缓存已过期 → 继续步骤 2
  2. 调用 Taro.getLocation({ type: 'gcj02' })
     - 用户已授权 → 更新 userLocation + locationAuthorized=true + 更新 Storage 缓存
     - 用户拒绝 → locationAuthorized=false, 设置默认城市中心
     - 超时 (10s) → locationError="定位失败, 使用默认位置"
```

---

### 19.2 AppointmentStore

```typescript
// src/stores/appointment-store.ts
import { create } from 'zustand';

interface ServiceType {
  id: string;
  name: string;           // "车衣改色"
  code: string;           // "FULL_WRAP"
  description?: string;
  icon?: string;
}

interface TimeSlot {
  timeSlot: 'MORNING' | 'AFTERNOON' | 'EVENING';
  label: string;          // "上午 09:00-12:00"
  available: boolean;
  remaining: number;
}

interface Appointment {
  id: string;
  appointmentNo: string;
  storeId: string;
  storeName: string;
  serviceType: string;
  appointmentDate: string;
  timeSlot: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  customerName: string;
  customerPhone: string;
  vehicleInfo?: string;
  remark?: string;
  cancelReason?: string;
  createdAt: string;
}

interface AppointmentState {
  // 创建预约 -- 步骤数据
  selectedStoreId: string | null;
  selectedServiceType: string | null;
  selectedDate: string | null;
  selectedTimeSlot: string | null;

  // 服务类型列表
  serviceTypes: ServiceType[];
  serviceTypesLoading: boolean;
  serviceTypesError: string | null;

  // 可用时段
  timeSlots: TimeSlot[];
  timeSlotsLoading: boolean;
  timeSlotsError: string | null;

  // 提交预约
  submitting: boolean;
  submitError: string | null;

  // 我的预约列表
  appointments: Appointment[];
  appointmentsLoading: boolean;
  appointmentsError: string | null;
  appointmentStatusFilter: string;  // 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'
  appointmentsPage: number;
  appointmentsHasMore: boolean;

  // 当前查看的预约详情 (弹窗用)
  currentAppointmentDetail: Appointment | null;
  currentAppointmentLoading: boolean;
  currentAppointmentError: string | null;

  // 取消预约状态
  cancelling: boolean;
  cancelError: string | null;

  // 创建成功后暂存 (确认页读取, 避免冗余 API 调用)
  lastCreatedAppointment: Appointment | null;

  // 草稿时间戳 (用于 30 分钟过期检查)
  lastUpdatedAt: number | null;

  // Actions
  /** 设置创建预约的步骤数据 */
  setStepData: (data: Partial<{ selectedStoreId: string; selectedServiceType: string; selectedDate: string; selectedTimeSlot: string }>) => void;
  /** 获取服务类型列表 */
  fetchServiceTypes: () => Promise<void>;
  /** 获取可用时段 */
  fetchTimeSlots: (storeId: string, date: string) => Promise<void>;
  /** 提交预约 */
  submitAppointment: (data: {
    storeId: string;
    serviceType: string;
    appointmentDate: string;
    timeSlot: string;
    customerName: string;
    customerPhone: string;
    vehicleInfo?: string;
    remark?: string;
  }) => Promise<Appointment>;
  /** 获取我的预约列表 */
  fetchMyAppointments: (params?: { status?: string; page?: number; size?: number }) => Promise<void>;
  /** 获取单个预约详情 */
  fetchAppointmentDetail: (id: string) => Promise<void>;
  /** 取消预约 */
  cancelAppointment: (id: string, reason: string) => Promise<void>;
  /** 重置创建预约状态 */
  resetCreateState: () => void;
  /** 设置列表状态筛选 */
  setStatusFilter: (status: string) => void;
}
```

**防重复提交机制**：

```typescript
// submitAppointment 内部
if (get().submitting) {
  throw new Error('预约正在提交中, 请勿重复操作');
}
set({ submitting: true, submitError: null });
try {
  const appointment = await appointmentService.createAppointment(data);
  set({ submitting: false });
  return appointment;
} catch (error) {
  set({ submitting: false, submitError: (error as ApiError).message });
  throw error;
}
```

**时段冲突处理**：提交预约返回 409 时，AppointmentStore 自动调用 `fetchTimeSlots` 刷新当前时段的可用性，然后抛出包含刷新后时段数据的错误，供页面层展示"该时段已被预约"提示。

**创建成功后暂存 (避免确认页冗余 API 调用)**：

```typescript
// submitAppointment 成功后:
const appointment = await appointmentService.createAppointment(data);
set({ submitting: false, lastCreatedAppointment: appointment, lastUpdatedAt: Date.now() });
return appointment;

// 确认页直接读取 lastCreatedAppointment, 无需 fetchAppointmentDetail:
// pages/appointment/confirm/index 中:
const appointment = AppointmentStore.useStore(s => s.lastCreatedAppointment);
// 仅当直接 URL 访问或刷新页面 (lastCreatedAppointment === null) 时才走 API:
if (!appointment) {
  await AppointmentStore.getState().fetchAppointmentDetail(id);
}
```

**草稿过期机制 (30 分钟)**：

```typescript
const DRAFT_TTL = 30 * 60 * 1000; // 30 minutes

// AppointmentStore 提供检查函数
function isDraftExpired(): boolean {
  const { lastUpdatedAt } = get();
  if (!lastUpdatedAt) return false; // 无草稿, 无需检查
  return Date.now() - lastUpdatedAt > DRAFT_TTL;
}

// setStepData 每次修改步骤数据时更新 lastUpdatedAt
setStepData: (data) => {
  set({ ...data, lastUpdatedAt: Date.now() });
},

// 页面 useLoad 时检查草稿是否过期:
// if (AppointmentStore.getState().isDraftExpired()) {
//   AppointmentStore.getState().resetCreateState();
// }
```

---

### 19.3 MaterialCompareStore

```typescript
// src/stores/material-compare-store.ts
import { create } from 'zustand';
import Taro from '@tarojs/taro';

interface MaterialCompareState {
  /** 已选对比材质列表 (最多 3 个) */
  selectedMaterials: MaterialDetail[];
  /** 材质列表 (用于选择面板, 含完整 Phase 3 属性) */
  allMaterials: MaterialDetail[];
  allMaterialsLoading: boolean;
  allMaterialsError: string | null;

  /** 当前查看详情的材质 */
  detailMaterial: MaterialDetail | null;
  detailVisible: boolean;

  /** 材质选择面板可见性 */
  pickerVisible: boolean;

  // Actions
  /** 获取全部材质列表 */
  fetchAllMaterials: () => Promise<void>;
  /** 添加材质到对比 */
  addToCompare: (material: MaterialDetail) => void;
  /** 从对比移除材质 */
  removeFromCompare: (materialId: string) => void;
  /** 清空对比 */
  clearCompare: () => void;
  /** 打开/关闭详情弹窗 */
  toggleDetail: (material?: MaterialDetail) => void;
  /** 打开/关闭选择面板 */
  togglePicker: () => void;
  /** 持久化对比队列 */
  persist: () => void;
  /** 从持久化恢复对比队列 */
  restore: () => void;
}
```

**材质对比队列持久化**：

```typescript
const STORAGE_KEY = '__wraplab_compare_materials__';
const MAX_COMPARE = 3;

addToCompare: (material) => {
  const { selectedMaterials } = get();
  if (selectedMaterials.length >= MAX_COMPARE) {
    Taro.showToast({ title: '最多对比 3 种材质', icon: 'none' });
    return;
  }
  if (selectedMaterials.find(m => m.id === material.id)) {
    Taro.showToast({ title: '该材质已在对比列表中', icon: 'none' });
    return;
  }
  const updated = [...selectedMaterials, material];
  set({ selectedMaterials: updated });
  // 持久化到 Storage (跨页面保持)
  Taro.setStorage({ key: STORAGE_KEY, data: updated.map(m => m.id) });
},

restore: async () => {
  // 页面进入时从 Storage 恢复对比队列 ID, 再从 allMaterials 中还原完整对象
  const ids = Taro.getStorageSync(STORAGE_KEY) as string[] | undefined;
  if (ids && ids.length > 0) {
    const { allMaterials } = get();
    if (allMaterials.length === 0) {
      await get().fetchAllMaterials();
    }
    const restored = get().allMaterials.filter(m => ids.includes(m.id));
    set({ selectedMaterials: restored });
  }
},
```

**restore 删除材质通知**：

```typescript
// restore() 从 Storage 恢复对比队列时，部分材质可能已被后台删除 (allMaterials 中不存在)
restore: async () => {
  const ids = Taro.getStorageSync(STORAGE_KEY) as string[] | undefined;
  if (ids && ids.length > 0) {
    const { allMaterials } = get();
    if (allMaterials.length === 0) {
      await get().fetchAllMaterials();
    }
    const restored = get().allMaterials.filter(m => ids.includes(m.id));
    // 检测丢失项并通知用户
    const missingIds = ids.filter(id => !get().allMaterials.some(m => m.id === id));
    if (missingIds.length > 0) {
      Taro.showToast({
        title: `${missingIds.length} 种材质已下架，已从对比列表移除`,
        icon: 'none',
        duration: 2500,
      });
    }
    set({ selectedMaterials: restored });
  }
},
```

**与 MaterialSelector 组件的联动**：MaterialCompareStore 是全局单例，改色工作台的 MaterialSelector 组件监听该 Store 的 `selectedMaterials`，为已加入对比的材质显示"已加入"对勾图标。材质对比页的 MaterialCompareTable 同样读取该 Store 展示对比表格。

---

### 19.4 HistoryStore

```typescript
// src/stores/history-store.ts
import { create } from 'zustand';

interface HistoryConfig {
  id: string;
  configurationId: string;
  modelId: string;
  modelInfo: string;          // "宝马 330i"
  brandName: string;
  seriesName: string;
  modelName: string;
  swatchName?: string;
  hex?: string;
  materialName?: string;
  mode: 'FULL' | 'PART';      // 全车 / 分区
  thumbnail?: string;
  createdAt: string;
}

interface HistoryQuote {
  id: string;
  quoteNo: string;
  configurationId: string;
  modelInfo: string;
  colorInfo: { swatchName: string; hex: string; brandName: string };
  materialName: string;
  mode: 'FULL' | 'PART';
  totalPrice: number | null;
  customerName: string;
  customerPhone: string;       // 脱敏 (138****8000)
  status: 'submitted' | 'followed' | 'deal_closed' | 'expired';
  createdAt: string;
}

interface QuoteDetail extends HistoryQuote {
  modelId: string;
  materialCost: number;
  laborCost: number;
  remark?: string;
  partDetails?: Array<{ partCode: string; partName: string; hex: string; swatchName: string }>;
}

interface HistoryState {
  // 改色历史
  configs: HistoryConfig[];
  configsLoading: boolean;
  configsError: string | null;
  configsPage: number;
  configsHasMore: boolean;

  // 报价历史
  quotes: HistoryQuote[];
  quotesLoading: boolean;
  quotesError: string | null;
  quotesPage: number;
  quotesHasMore: boolean;

  // 当前查看的报价详情
  quoteDetail: QuoteDetail | null;
  quoteDetailLoading: boolean;
  quoteDetailError: string | null;

  // 日期筛选
  dateRange: { startDate?: string; endDate?: string; preset: string };

  // Actions
  /** 设置日期筛选范围 */
  setDateRange: (range: { startDate?: string; endDate?: string; preset: string }) => void;
  /** 获取改色历史 (分页) */
  fetchConfigHistory: (params?: { page?: number; size?: number; startDate?: string; endDate?: string }) => Promise<void>;
  /** 获取报价历史 (分页) */
  fetchQuoteHistory: (params?: { page?: number; size?: number; startDate?: string; endDate?: string }) => Promise<void>;
  /** 获取报价详情 */
  fetchQuoteDetail: (quoteId: string) => Promise<void>;
  /** 加载更多改色历史 */
  loadMoreConfigs: () => Promise<void>;
  /** 加载更多报价历史 */
  loadMoreQuotes: () => Promise<void>;
  /** 刷新改色历史 (重置到第 1 页) */
  refreshConfigs: () => Promise<void>;
  /** 刷新报价历史 (重置到第 1 页) */
  refreshQuotes: () => Promise<void>;
}
```

**日期筛选变更时的自动刷新**：

```typescript
setDateRange: (range) => {
  set({ dateRange: range, configsPage: 1, quotesPage: 1 });
  // 根据当前所在页面触发对应的刷新
  // 页面层通过 useEffect 监听 dateRange 变化后调用 fetchConfigHistory / fetchQuoteHistory
},
```

**刷新动作的 flush 模式 (不对用户可见的数据清空)**：

```typescript
// 刷新时不清空已有数据，避免新数据到达前 UI 闪现空白
// 使用独立的 refreshing 布尔值替代清空列表：
refreshConfigs: async () => {
  set({ configsRefreshing: true, configsError: null }); // 不重置 configs
  try {
    const res = await historyService.getConfigHistory({ page: 1, size: 20, ...get().dateRange });
    set({ configs: res.items, configsPage: 1, configsHasMore: res.items.length < res.total, configsRefreshing: false });
  } catch (e) {
    set({ configsError: (e as ApiError).message, configsRefreshing: false });
  }
},

// 同理适用于 refreshQuotes、MaterialCompareStore.fetchAllMaterials
// 首次加载 (loading) 和刷新 (refreshing) 是两种不同的视觉状态:
//   - loading: 列表为空 → 骨架屏
//   - refreshing: 列表有旧数据 → 顶部微小的刷新指示器 (或下拉刷新动画)
```

**setDateRange 同时重置两个分页的说明**：`setDateRange` 将 `configsPage` 和 `quotesPage` 同时重置为 1，即使当前仅查看一种历史类型。这种做法是可接受的，因为：日期筛选变更是用户主动触发的大范围操作，两种列表重跑第 1 页的成本远低于维护两个独立日期筛选状态的复杂度。

---

## 20. Phase 3 新增 API 服务层

### 20.1 store.service.ts

```typescript
// src/services/store.service.ts
import { request, getPaginated, PaginatedData } from './request';

interface NearbyStoreParams {
  lat: number;
  lng: number;
  radius?: number;    // 默认 5000
  page?: number;
  size?: number;      // 默认 20
}

/** 获取附近门店列表 */
export function getNearbyStores(params: NearbyStoreParams): Promise<PaginatedData<NearbyStore>>;

/** 获取门店详情 */
export function getStoreDetail(storeId: string): Promise<StoreDetail>;
```

---

### 20.2 appointment.service.ts

```typescript
// src/services/appointment.service.ts
import { request, getPaginated, PaginatedData } from './request';

interface CreateAppointmentParams {
  storeId: string;
  serviceType: string;
  appointmentDate: string;
  timeSlot: string;
  customerName: string;
  customerPhone: string;
  vehicleInfo?: string;
  remark?: string;
}

interface CancelAppointmentParams {
  reason: string;
}

interface SlotQueryParams {
  storeId: string;
  date: string;   // YYYY-MM-DD
}

/** 获取服务类型列表 */
export function getServiceTypes(): Promise<ServiceType[]>;

/** 获取可用时段 */
export function getAvailableSlots(params: SlotQueryParams): Promise<{
  storeId: string;
  date: string;
  slots: TimeSlot[];
}>;

// 注意: rest-day / business schedule 不单独提供 API。
// 休息日的处理策略由 slots 端点隐式承担:
//   - 门店休息日 → getAvailableSlots 返回空 slots[] (或全部 slot.available === false)
//   - 前端 TimeSlotPicker 检测到 slots 全不可用 → 展示 "当天已约满/门店休息" + "查看下一天"按钮
//   - 此策略避免了前后端对一个额外的 schedule API 的耦合，rest-day 调度由后端统一管理
// 若未来需要展示门店营业日历 (非当前 Phase 3 需求)，再引入 GET /stores/:id/schedule 端点

/** 提交预约 */
export function createAppointment(params: CreateAppointmentParams): Promise<Appointment>;

/** 获取我的预约列表 */
export function getMyAppointments(params?: {
  status?: string;
  page?: number;
  size?: number;
}): Promise<PaginatedData<Appointment>>;

/** 获取单个预约详情 */
export function getAppointmentDetail(id: string): Promise<Appointment>;

/** 取消预约 */
export function cancelAppointment(id: string, params: CancelAppointmentParams): Promise<void>;
```

---

### 20.3 material.service.ts

```typescript
// src/services/material.service.ts
import { request } from './request';

/** 获取材质列表 (Phase 3 扩展版: 带详细属性) */
export function getMaterials(): Promise<{ items: MaterialDetail[]; total: number }>;

// 注意: 迁移路径 — color.service.ts → material.service.ts
// Phase 1 的 color.service.getMaterials 返回基础材质列表 (id/name/previewUrl/price)
// Phase 3 的 material.service.getMaterials 扩展了 glossLevel / durability / priceMultiplier 等字段
// 迁移步骤:
//   1. 改色工作台 (design/index) 的 MaterialSelector → 改用 material.service.getMaterials
//   2. 材质对比页 (material-compare/index) → 使用 material.service.getMaterials
//   3. Phase 1 的 color.service.getMaterials 保留向后兼容 (quote 页可能仍用基础字段)
//   4. 当 quote 页确认可接受新字段后，删除 color.service.getMaterials，统一到 material.service
// 简记: color.service 管颜色/色板；material.service 管物理材质属性
```

---

### 20.4 history.service.ts

```typescript
// src/services/history.service.ts
import { request, getPaginated, PaginatedData } from './request';

interface HistoryQueryParams {
  page?: number;
  size?: number;
  startDate?: string;   // YYYY-MM-DD
  endDate?: string;     // YYYY-MM-DD
}

/** 获取改色方案历史 (分页) */
export function getConfigHistory(params?: HistoryQueryParams): Promise<PaginatedData<HistoryConfig>>;

/** 获取报价历史 (分页) */
export function getQuoteHistory(params?: HistoryQueryParams): Promise<PaginatedData<HistoryQuote>>;

/** 获取报价详情 */
export function getQuoteDetail(quoteId: string): Promise<QuoteDetail>;

/** 更新报价跟进状态 (P2) */
export function updateQuoteStatus(quoteId: string, status: string): Promise<void>;
```

### 20.5 全局错误码扩展

```typescript
// src/utils/constants.ts (Phase 3 新增)

/** Phase 3 新增业务错误码 */
export const PHASE3_ERROR_CODES = {
  // 门店 (60001-60099)
  STORE_NOT_FOUND: 60001,
  STORE_CLOSED: 60002,
  STORE_GEO_LOCATION_MISSING: 60003,

  // 预约 (61001-61099)
  APPOINTMENT_SLOT_FULL: 61001,
  APPOINTMENT_DUPLICATE: 61002,
  APPOINTMENT_NOT_FOUND: 61003,
  APPOINTMENT_SLOT_CONFLICT: 61004,    // 409 时段冲突
  APPOINTMENT_CANCEL_DENIED: 61005,

  // 材质 (62001-62099)
  MATERIAL_NOT_FOUND: 62001,
  MATERIAL_INSUFFICIENT: 62002,         // 可用材质 ≤ 1 种

  // 历史记录 (63001-63099)
  HISTORY_QUERY_INVALID: 63001,
} as const;

/** Phase 3 错误码 -> 用户提示文案 */
export const PHASE3_ERROR_MESSAGES: Record<number, string> = {
  [PHASE3_ERROR_CODES.STORE_NOT_FOUND]: '门店不存在或已下线',
  [PHASE3_ERROR_CODES.STORE_CLOSED]: '门店已关闭',
  [PHASE3_ERROR_CODES.STORE_GEO_LOCATION_MISSING]: '门店位置信息缺失',
  [PHASE3_ERROR_CODES.APPOINTMENT_SLOT_FULL]: '该时段已被约满',
  [PHASE3_ERROR_CODES.APPOINTMENT_DUPLICATE]: '您已有相同时间段的预约',
  [PHASE3_ERROR_CODES.APPOINTMENT_NOT_FOUND]: '预约信息不存在',
  [PHASE3_ERROR_CODES.APPOINTMENT_SLOT_CONFLICT]: '该时段已被预约，请重新选择',
  [PHASE3_ERROR_CODES.APPOINTMENT_CANCEL_DENIED]: '当前状态不允许取消预约',
  [PHASE3_ERROR_CODES.MATERIAL_NOT_FOUND]: '材质数据不存在',
  [PHASE3_ERROR_CODES.MATERIAL_INSUFFICIENT]: '可用材质不足，无法进行对比',
  [PHASE3_ERROR_CODES.HISTORY_QUERY_INVALID]: '查询参数无效',
};
```

**服务类型与材质列表缓存策略**：

| 数据 | 缓存位置 | TTL | 策略 | 刷新时机 |
|------|----------|-----|------|----------|
| ServiceType[] | AppointmentStore.serviceTypes | 1 小时 | 首次获取后缓存，后续打开预约页直接读 Store | 超过 TTL 后下次进入自动重取；后台管理员更新服务类型后需通过 admin panel 触发缓存失效通知 (P2) |
| MaterialDetail[] | MaterialCompareStore.allMaterials | 30 分钟 | 同 ServiceType 策略 | 超过 TTL 自动重取 |
| NearbyStore[] | StoreStore.nearbyStores | 用户位置 / 视野变化时刷新 | 无固定 TTL (由视野变化/下拉刷新驱动) | 地图视野偏移 > 50% + 500ms 防抖后重取 |
| StoreDetail | StoreStore.storeDetailMap | 30 分钟 | 以 storeId 为 key 缓存详情 | 下拉刷新绕过缓存 |

实现模式：
```typescript
// Store 内部维护 lastFetchAt 时间戳
const CACHE_TTL = 60 * 60 * 1000; // 1 hour for service types

fetchServiceTypes: async (forceRefresh = false) => {
  const { serviceTypes, serviceTypesLastFetchAt } = get();
  if (!forceRefresh && serviceTypes.length > 0 && serviceTypesLastFetchAt) {
    if (Date.now() - serviceTypesLastFetchAt < CACHE_TTL) return; // 缓存有效
  }
  set({ serviceTypesLoading: true });
  const types = await appointmentService.getServiceTypes();
  set({ serviceTypes: types, serviceTypesLoading: false, serviceTypesLastFetchAt: Date.now() });
},
```

---

## 21. Phase 3 页面设计 (数据流 + 4 UI 状态)

### 21.1 门店地图页 `pages/store/index`

#### 数据流

```
Props: 无 (Tab 页)
State:
  - userLocation: { lat, lng } | null     → StoreStore.userLocation
  - locationAuthorized: boolean | null     → StoreStore
  - nearbyStores: NearbyStore[]            → StoreStore
  - storesLoading: boolean                 → StoreStore
  - storesError: string | null             → StoreStore
  - selectedStore: NearbyStore | null      → StoreStore (标注点击弹窗)
  - searchRadius: number                   → StoreStore

API:
  - storeService.getNearbyStores({ lat, lng, radius, page, size })

Store:
  - StoreStore (全部状态通过 Store 管理)
  - AuthStore.staff.storeId (当前门店上下文, 可选高亮"我的门店")
```

#### 生命周期

| 生命周期 | 行为 |
|----------|------|
| `useLoad` (onLoad) | 请求定位权限 `StoreStore.requestLocation()` |
| `useDidShow` | 每次 Tab 切换进入时刷新用户位置 + 附近门店 |
| `useReady` | 初始化 Map context (`Taro.createMapContext`) |
| `useUnload` | 清除视野变更防抖计时器 |

#### 4 UI 状态

| 状态 | 条件 | 地图区域 | 门店列表 |
|------|------|----------|---------|
| loading | API 请求中 (首次) | 地图正常渲染 (使用缓存的定位位置) | 底部抽屉 4 个 StoreCard 骨架屏 |
| empty | nearbyStores 为空 + !loading + !error | 地图无标注点 + 空状态文案"当前区域暂无合作门店" + "扩大搜索范围"按钮 (半径 x2) | 底部抽屉不展示 |
| error | nearbyStoresError 非空 | 地图无标注点 + 底部错误提示 Toast + 重试按钮 | 底部抽屉不展示 |
| unauthorized | locationAuthorized === false | 地图定位到默认城市中心 (北京天安门) + 顶部提示条"无法获取您的位置" + "去开启"按钮 | 正常尝试加载门店 (使用默认位置) |
| success | nearbyStores.length > 0 | 地图标注渲染, 点击弹出门店简短卡片 | 底部抽屉式门店列表 (P1) |

**5 种 UI 状态 (含未授权)**：
- `unauthorized` 和 `loading` / `error` / `empty` 状态独立管理
- `unauthorized` 仅影响定位，不影响 API 调用 (使用默认城市中心)

---

### 21.2 门店详情页 `pages/store/detail/index`

#### 数据流

```
Props (路由参数):
  - id: string (storeId)

State:
  - storeDetail: StoreDetail | null      → StoreStore.storeDetailMap[id]
  - loading: boolean                      → StoreStore.storeDetailLoading
  - error: string | null                 → StoreStore.storeDetailError
  - phoneModalVisible: boolean           (拨打电话确认弹窗)

API:
  - storeService.getStoreDetail(id)

Store:
  - StoreStore.fetchStoreDetail(id)
```

#### 生命周期

| 生命周期 | 行为 |
|----------|------|
| `useLoad` (onLoad) | 读取路由参数 `id`; 调用 `StoreStore.fetchStoreDetail(id)` |
| `useDidShow` | 无特殊处理 |
| `usePullDownRefresh` | 重新请求门店详情 (绕过缓存) |
| `useShareAppMessage` | 分享门店卡片 (封面图 + 门店名称 + 地址摘要) |

#### 4 UI 状态

| 状态 | 条件 | UI |
|------|------|-----|
| loading | API 请求中 | 图片区骨架 (420rpx 高) + 信息区 5 行文字线骨架 + 服务标签骨架 |
| empty | 门店不存在 (404) | EmptyState("门店不存在或已下线") + actionText="返回门店列表" → `navigateBack` |
| error | API 500 / 超时 | ErrorState("门店信息加载失败") + 重试按钮 |
| success | 数据正常 | 图片轮播 (Swiper) + 基本信息 + 营业时间 + 服务标签 + 门店简介 + 底部操作栏 (3 按钮) |

#### 图片轮播降级策略

```typescript
// 照片为 0 张: 展示默认门店占位图 (不显示轮播指示器)
// 照片为 1 张: 展示该图 (不显示轮播指示器)
// 照片 ≥ 2 张: Swiper 轮播 + 底部圆点指示器
// 图片加载失败: 展示默认占位图替代
```

---

### 21.3 创建预约页 `pages/appointment/create/index`

#### 数据流

```
Props (路由参数):
  - storeId?: string (若从门店详情进入则已预选)

State:
  - currentStep: 1 | 2 | 3
  - Step 1: selectedStore, storeList, storeLoading, storeError
  - Step 2: selectedServiceType, serviceTypes, serviceTypesLoading, serviceTypesError
  - Step 3: selectedDate, timeSlots, timeSlotsLoading, timeSlotsError
  - Form: customerName, customerPhone, vehicleInfo, remark
  - formErrors: Record<string, string>
  - submitting: boolean                   → AppointmentStore.submitting
  - submitError: string | null            → AppointmentStore.submitError

API:
  - storeService.getNearbyStores(...)     (若无 storeId)
  - appointmentService.getServiceTypes()
  - appointmentService.getAvailableSlots(storeId, date)
  - appointmentService.createAppointment(...)

Store:
  - StoreStore.nearbyStores (门店选择, 复用已有数据)
  - AppointmentStore (全部操作委托给 Store)
```

#### 生命周期

| 生命周期 | 行为 |
|----------|------|
| `useLoad` | 读取路由参数 storeId; 若有则预约第 1 步门店; 若无则展示门店选择器 |
| `useReady` | 加载服务类型列表 (若已到第 2 步) |
| `useDidShow` | 无特殊处理 |
| `useUnload` | 若未提交且已填写数据, 检查是否需要保存草稿 (P2) |

#### 门店加载依赖定位锁链

创建预约页在 Step 1 展示门店列表（无预选 storeId 时）遵循以下锁链：

```
requestLocation()                   ← StoreStore.requestLocation()
  ├── 授权成功 → { lat, lng }       → getNearbyStores({ lat, lng })
  ├── 拒绝/超时 → 使用默认中心       → getNearbyStores({ lat: 39.9042, lng: 116.4074 })
  └── getNearbyStores() 完成后      → 渲染 StoreCard 列表
```

即：`requestLocation` 必须先完成（无论成败，都有坐标回退），`getNearbyStores` 才能发起。AppointmentForm 监听 `StoreStore.nearbyStores` 渲染列表，监听 `StoreStore.nearbyStoresLoading` 展示骨架屏。

#### 各步骤独立 4 状态

| 步骤 | loading | empty | error | success |
|------|---------|-------|-------|---------|
| Step 1 — 门店 | 门店列表骨架 (3 个卡片) | "暂无可用门店" + 返回按钮 | 门店 API 失败 + 重试 | 门店列表 / 预选门店卡片 |
| Step 2 — 服务 | 服务类型骨架 (3 行) | "暂无可用服务类型" | 服务 API 失败 + 重试 | 服务类型单选列表 |
| Step 3 — 时段 | 时段卡片骨架 (3 个) | "当天已约满" + 查看下一天 | 时段 API 失败 + 重试 | 3 个时段卡片 (选中/可用/已满) |
| 提交按钮 | 按钮 loading + 禁用 | N/A | Toast 错误提示 + 按钮恢复 | 跳转确认页 |

---

### 21.4 预约确认页 `pages/appointment/confirm/index`

#### 数据流

```
Props (路由参数):
  - id: string (appointmentId)

State:
  - appointment: Appointment | null     → 优先读 AppointmentStore.lastCreatedAppointment (无 API 开销)
  - loading: boolean                      → 仅当 lastCreatedAppointment 为 null 时
  - error: string | null

API:
  - appointmentService.getAppointmentDetail(id)   (仅降级路径: 直接 URL 访问或页面刷新时)

Store:
  - AppointmentStore.lastCreatedAppointment (主路径: create 成功后持久, 确认页直接消费)
  - AppointmentStore.fetchAppointmentDetail(id) (降级路径: lastCreatedAppointment === null 时)
```

**数据获取优先级**：

```
1. AppointmentStore.lastCreatedAppointment !== null  → 直接使用 (零 API 调用)
2. lastCreatedAppointment === null                    → fetchAppointmentDetail(id)
   (场景: 用户从"我的预约"列表进入、直接扫码访问、页面刷新)
```

#### 4 UI 状态

| 状态 | 条件 | UI |
|------|------|-----|
| loading | API 请求中 | 详情卡片骨架屏 (5 行信息占位) |
| empty | 预约不存在 / id 无效 | EmptyState("预约信息不存在") + "返回首页"按钮 |
| error | API 失败 | ErrorState("预约数据加载失败") + 重试按钮 |
| success | 数据正常 | 绿色对勾动画 (1s) + "预约提交成功" + 详情卡片 + 操作按钮组 |

---

### 21.5 我的预约列表 `pages/appointment/list/index`

#### 数据流

```
Props: 无 (从我的页面进入)

State:
  - appointments: Appointment[]            → AppointmentStore
  - loading: boolean                       → AppointmentStore
  - error: string | null                   → AppointmentStore
  - statusFilter: string                   → AppointmentStore
  - page: number                           → AppointmentStore
  - hasMore: boolean                       → AppointmentStore
  - detailVisible: boolean                 (详情弹窗, 本地状态)
  - currentDetail: Appointment | null      → AppointmentStore
  - cancelPanelVisible: boolean            (取消面板, 本地状态)
  - cancelReason: string                   (取消原因, 本地状态)

API:
  - appointmentService.getMyAppointments({ status, page, size })
  - appointmentService.getAppointmentDetail(id)
  - appointmentService.cancelAppointment(id, { reason })

Store:
  - AppointmentStore (全部操作委托给 Store)
```

#### 4 UI 状态

| 状态 | 条件 | UI |
|------|------|-----|
| loading | 首次列表加载中 | HistoryList 骨架屏 (5 行列表项) |
| empty | appointments 为空 && !loading && !error | EmptyState("暂无预约记录") + actionText="去预约" → switchTab('pages/store/index') |
| error | 列表 API 失败 | ErrorState("预约列表加载失败") + 重试按钮 |
| success | appointments.length > 0 | 状态 Tab 栏 (5 个 + 数量徽标) + 列表 + 点击弹出详情弹窗 |

**取消预约数据流**：

```
详情弹窗 [取消预约] 点击
  → 弹出取消原因面板 (预设 4 个原因 + 其他输入框)
  → [确认取消] 点击
    → 二次确认弹窗 "确定要取消此预约吗？"
    → 用户确认
      → AppointmentStore.cancelAppointment(id, reason)
        → PUT /api/v1/appointments/mine/:id/cancel
        → 成功后: 关闭面板 + Toast "预约已取消" + 列表刷新
        → 失败: Toast "取消失败，请重试" + 面板不关闭
```

---

### 21.6 材质对比页 `pages/design/material-compare/index`

#### 数据流

```
Props: 无 (从改色工作台或我的页面进入)

State:
  - selectedMaterials: MaterialDetail[]     → MaterialCompareStore
  - allMaterials: MaterialDetail[]          → MaterialCompareStore
  - allMaterialsLoading: boolean            → MaterialCompareStore
  - allMaterialsError: string | null        → MaterialCompareStore
  - pickerVisible: boolean                  → MaterialCompareStore
  - detailMaterial: MaterialDetail | null   → MaterialCompareStore
  - detailVisible: boolean                  → MaterialCompareStore

API:
  - materialService.getMaterials()

Store:
  - MaterialCompareStore (全部操作委托给 Store)
```

#### 生命周期

| 生命周期 | 行为 |
|----------|------|
| `useLoad` (onLoad) | 调用 `MaterialCompareStore.restore()` 恢复跨页面对比队列; 调用 `fetchAllMaterials()` |
| `useDidShow` | 重新检查对比队列 (可能从其他页面添加了材质) |
| `useUnload` | 对比队列持久化到 Storage |

#### 4 UI 状态

| 状态 | 条件 | UI |
|------|------|-----|
| loading | allMaterialsLoading | 对比表格骨架 (3 列占位) + 选择面板骨架 |
| empty (无选中) | selectedMaterials.length === 0 && !loading | EmptyState("选择 2-3 种材质开始对比") + actionText="添加材质" → 打开选择面板 |
| empty (材质不足) | allMaterials.length <= 1 && !loading | EmptyState("可用材质不足，无法进行对比") + "返回"按钮 → navigateBack |
| error | allMaterialsError 非空 | ErrorState("材质数据加载失败") + 重试按钮 |
| success | selectedMaterials.length >= 2 | 对比表格 (2-3 列 + 维度名固定列 + 横向滑动) + 操作栏 |

**材质选择面板状态**：面板内的材质列表独立展示 loading / error / success 状态。

---

### 21.7 改色历史 `pages/profile/history/configs/index`

#### 数据流

```
Props: 无

State:
  - configs: HistoryConfig[]              → HistoryStore
  - configsLoading: boolean                → HistoryStore
  - configsError: string | null           → HistoryStore
  - configsPage: number                    → HistoryStore
  - configsHasMore: boolean               → HistoryStore
  - dateRange: { startDate?, endDate?, preset } → HistoryStore

API:
  - historyService.getConfigHistory({ page, size, startDate, endDate })

Store:
  - HistoryStore (全部操作委托给 Store)
```

#### 生命周期

| 生命周期 | 行为 |
|----------|------|
| `useLoad` | 设置默认日期范围 ("全部"); 加载第 1 页数据 |
| `useDidShow` | 无特殊处理 (数据已缓存) |
| `useReachBottom` | `HistoryStore.loadMoreConfigs()` |
| `usePullDownRefresh` | `HistoryStore.refreshConfigs()` |

#### 4 UI 状态

| 状态 | 条件 | UI |
|------|------|-----|
| loading | configsLoading && configs.length === 0 | HistoryList 骨架屏 (5 行列表项) |
| empty | configs.length === 0 && !loading && !error | EmptyState("暂无改色记录") + actionText="去创建" → switchTab('pages/home/index') |
| error | configsError && configs.length === 0 | ErrorState("方案历史加载失败") + 重试按钮 |
| success | configs.length > 0 | DateRangeFilter + 方案列表 + 每项含"复用方案"按钮 → navigateToDesign |

#### 与现有方案的衔接

- 点击方案项 / "复用方案"按钮 → `Taro.navigateTo({ url: '/pages/design/index?modelId=${modelId}&configurationId=${configurationId}' })` → 改色工作台通过 `useLoad` 读取 `configurationId` 并调用 `ConfigStore.loadConfiguration()` 恢复方案
- 此为 Phase 1/2 已有的路径，Phase 3 无需新增跳转逻辑，只需确保参数传递正确

---

### 21.8 报价历史 `pages/profile/history/quotes/index`

#### 数据流

```
Props: 无

State:
  - quotes: HistoryQuote[]                → HistoryStore
  - quotesLoading: boolean                 → HistoryStore
  - quotesError: string | null            → HistoryStore
  - quotesPage: number                     → HistoryStore
  - quotesHasMore: boolean                → HistoryStore
  - quoteDetail: QuoteDetail | null       → HistoryStore (详情弹窗)
  - quoteDetailLoading: boolean            → HistoryStore
  - quoteDetailError: string | null       → HistoryStore
  - detailVisible: boolean                 (本地状态)
  - dateRange: { startDate?, endDate?, preset } → HistoryStore

API:
  - historyService.getQuoteHistory({ page, size, startDate, endDate })
  - historyService.getQuoteDetail(quoteId)
  - historyService.updateQuoteStatus(quoteId, status)   (P2)

Store:
  - HistoryStore (全部操作委托给 Store)
```

#### 4 UI 状态

| 状态 | 条件 | UI |
|------|------|-----|
| loading | quotesLoading && quotes.length === 0 | HistoryList 骨架屏 (5 行列表项) |
| empty | quotes.length === 0 && !loading && !error | EmptyState("暂无报价记录") + actionText="去创建" → switchTab('pages/home/index') |
| error | quotesError && quotes.length === 0 | ErrorState("报价历史加载失败") + 重试按钮 |
| success | quotes.length > 0 | DateRangeFilter + 报价列表 + 详情弹窗 |

#### 手机号脱敏策略

- 服务端 API 返回的 `customerPhone` 在列表接口中已脱敏处理 (中间 4 位替换为 `*`)
- 若服务端未脱敏 (空字符串), 前端在 `renderItem` 中做防御性脱敏: `phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')`
- 详情接口返回完整手机号用于必要业务用途，仅在详情弹窗中展示

---

### 21.9 我的页面更新 `pages/profile/index`

#### 变更说明

Phase 3 在 Phase 2 "我的"页面功能列表基础上新增 3 个入口，功能列表从 3 项扩展为 6 项：

```
Phase 2 功能列表 (3 项):              Phase 3 功能列表 (6 项):
  - 我的方案                            - 我的方案
  - 我的收藏                            - 我的收藏
  - AI 生图记录                         - 我的预约      ← 新增 (带待确认徽标)
                                        - 改色历史      ← 新增
                                        - 报价历史      ← 新增
                                        - AI 生图记录
```

#### "我的预约"徽标逻辑

```typescript
// profile/index 中
const pendingCount = useMemo(() => {
  // 从 AppointmentStore 获取待确认预约数量
  // 显示为红色圆点 + 数字 (无待确认则不展示)
  const appointments = AppointmentStore.getState().appointments;
  return appointments.filter(a => a.status === 'pending').length;
}, []);
```

#### Tab Bar 新增门店 Tab (详见 Section 23)

---

## 22. Phase 3 核心数据流时序图

### 22.1 门店发现与预约全链路

```
用户            StoreMap          StoreStore        API Server        AppointmentForm       地图App
 │                 │                  │                  │                  │                  │
 │ 点击"门店"Tab    │                  │                  │                  │                  │
 │────────────────►│                  │                  │                  │                  │
 │                 │                  │                  │                  │                  │
 │                 │ requestLocation()│                  │                  │                  │
 │                 │────────────────►│                  │                  │                  │
 │                 │                  │ Taro.getLocation │                  │                  │
 │                 │                  │───────┐          │                  │                  │
 │                 │                  │       │ (用户授权)│                  │                  │
 │                 │                  │◄──────┘          │                  │                  │
 │                 │                  │ lat, lng         │                  │                  │
 │                 │                  │                  │                  │                  │
 │                 │ fetchNearbyStores({lat, lng, radius, page:1, size:20})│                │                  │
 │                 │────────────────►│                  │                  │                  │
 │                 │                  │ GET /stores/nearby?page=1&size=20   │                  │
 │                 │                  │────────────────►│                  │                  │
 │                 │                  │                  │                  │                  │
 │                 │                  │ stores[] + total │                  │                  │
 │                 │                  │◄─────────────────│                  │                  │
 │                 │                  │                  │                  │                  │
 │                 │ stores[] (渲染标注)                  │                  │                  │
 │                 │◄─────────────────│                  │                  │                  │
 │                 │                  │                  │                  │                  │
 │ 地图标注点击     │                  │                  │                  │                  │
 │────────────────►│                  │                  │                  │                  │
 │                 │ selectStore(store)│                  │                  │                  │
 │                 │────────────────►│                  │                  │                  │
 │  弹出简短卡片     │                  │                  │                  │                  │
 │◄────────────────│                  │                  │                  │                  │
 │                 │                  │                  │                  │                  │
 │ 点击 [在线预约]   │                  │                  │                  │                  │
 │────────────────►│                  │                  │                  │                  │
 │  navigateToAppointmentCreate(storeId)                  │                  │                  │
 │───────────────────────────────────────────────────────►│                  │                  │
 │                 │                  │                  │                  │                  │
 │  (预约 3 步流程)  │                  │                  │                  │                  │
 │  Step1: 门店预选  │                  │                  │                  │                  │
 │  Step2: 选择服务  │                  │                  │   GET /appointments/service-types   │
 │                  │                  │                  │────────────────►│                  │
 │                  │                  │                  │  serviceTypes[]  │                  │
 │                  │                  │                  │◄─────────────────│                  │
 │  Step3a: 选日期   │                  │                  │                  │                  │
 │  Step3b: 选时段   │                  │                  │                  │                  │
 │                  │                  │                  │   GET /appointments/slots?store_id=&date=
 │                  │                  │                  │────────────────►│                  │
 │                  │                  │                  │  slots[]         │                  │
 │                  │                  │                  │◄─────────────────│                  │
 │  Step3c: 填联系信息│                  │                  │                  │                  │
 │  [提交预约]       │                  │                  │                  │                  │
 │─────────────────►│                  │                  │                  │                  │
 │                  │ submitAppointment(data)             │                  │                  │
 │                  │──────────────────────────────────────────────────────►│                  │
 │                  │                  │                  │ POST /appointments                  │
 │                  │                  │                  │────────────────►│                  │
 │                  │                  │                  │                  │                  │
 │                  │                  │                  │  appointment     │                  │
 │                  │                  │                  │◄─────────────────│                  │
 │                  │  appointment      │                  │                  │                  │
 │                  │◄──────────────────────────────────────────────────────│                  │
 │                  │                  │                  │                  │                  │
 │  redirectTo 确认页(appointmentId)    │                  │                  │                  │
 │◄─────────────────────────────────────────────────────────────────────────│                  │
 │                 │                  │                  │                  │                  │
 │  (确认页)        │                  │                  │                  │                  │
 │  绿色对勾动画     │                  │                  │                  │                  │
 │  预约详情卡片     │                  │                  │                  │                  │
 │  [一键导航]       │                  │                  │                  │                  │
 │─────────────────────────────────────────────────────────────────────────────────────────────►│
 │                 │                  │                  │                  │        (系统地图App)
```

### 22.2 材质对比数据流

```
改色工作台 (MaterialSelector)     MaterialCompareStore        MaterialCompareTable         API Server
 │                                       │                          │                         │
 │ 用户点击材质项旁的 [+对比] 图标         │                          │                         │
 │──────────────────────────────────────►│                          │                         │
 │                                       │ addToCompare(material)    │                         │
 │                                       │  check: length < 3?       │                         │
 │                                       │  check: not duplicate?    │                         │
 │                                       │  persist to Taro.Storage  │                         │
 │  [已加入] 对勾图标显示                 │                          │                         │
 │◄──────────────────────────────────────│                          │                         │
 │                                       │                          │                         │
 │ 用户点击"材质对比"入口                 │                          │                         │
 │──► navigateToMaterialCompare()        │                          │                         │
 │                                       │                          │                         │
 │                                    (材质对比页)                    │                         │
 │                                       │ restore() (从Storage恢复)  │                         │
 │                                       │◄──────────────────────────│                         │
 │                                       │                          │                         │
 │                                       │                          │ fetchAllMaterials()     │
 │                                       │                          │────────────────────────►│
 │                                       │                          │                          │
 │                                       │                          │ GET /colors/materials    │
 │                                       │                          │─────────────────────────►│
 │                                       │                          │                          │
 │                                       │                          │ materials[]              │
 │                                       │                          │◄─────────────────────────│
 │                                       │                          │                          │
 │                                       │ selectedMaterials (2-3个) │                          │
 │                                       │─────────────────────────►│                          │
 │                                       │                          │                          │
 │                                       │                          │ 并排对比表格渲染          │
 │                                       │                          │                          │
 │ 用户点击材质样张                       │                          │                          │
 │──────────────────────────────────────────────────────────────────│                          │
 │                                       │                          │ toggleDetail(material)    │
 │                                       │◄──────────────────────────│                          │
 │                                       │                          │                          │
 │ 材质详情弹窗 (优点/缺点/相关案例)       │                          │                          │
 │◄──────────────────────────────────────│                          │                          │
```

### 22.3 历史记录浏览与复用

```
用户 (profile/index)     HistoryStore        API Server        改色工作台 (design/index)
 │                           │                    │                      │
 │ 点击"改色历史"入口         │                    │                      │
 │──────────────────────────►│                    │                      │
 │                           │                    │                      │
 │ (改色历史页)               │                    │                      │
 │  setDateRange({preset:'all'})                 │                      │
 │  fetchConfigHistory({page:1, size:20})        │                      │
 │──────────────────────────►│                    │                      │
 │                           │ GET /configurations?page=1&size=20        │
 │                           │───────────────────►│                      │
 │                           │                    │                      │
 │                           │ configs[] + total   │                      │
 │                           │◄────────────────────│                      │
 │                           │                    │                      │
 │ 渲染列表 (DateRangeFilter + HistoryList)        │                      │
 │◄──────────────────────────│                    │                      │
 │                           │                    │                      │
 │ 切换日期筛选 "最近30天"    │                    │                      │
 │──────────────────────────►│                    │                      │
 │  setDateRange → fetchConfigHistory({startDate, endDate, page:1})     │
 │                           │───────────────────►│                      │
 │                           │ configs[] (筛选后)  │                      │
 │                           │◄────────────────────│                      │
 │ 列表重置 + 滚动到顶部      │                    │                      │
 │◄──────────────────────────│                    │                      │
 │                           │                    │                      │
 │ 点击方案项 / [复用方案]     │                    │                      │
 │──► navigateToDesign({modelId, configurationId})                      │
 │──────────────────────────────────────────────────────────────────────►│
 │                           │                    │                      │
 │                           │                    │   useLoad()          │
 │                           │                    │   读取 configurationId│
 │                           │                    │   ConfigStore        │
 │                           │                    │   .loadConfiguration()│
 │                           │                    │   → GET /configurations/:id
 │                           │                    │   恢复 3D 模型 + 颜色  │
```

---

## 23. Taro Map 兼容性设计

### 23.1 多平台地图适配策略

Phase 3 门店地图以**微信小程序为主平台**，支付宝/抖音为基础降级支持。

```
┌──────────────────────────────────────────────────────────────┐
│                    StoreMap 组件                              │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              PlatformMapAdapter (适配层)              │    │
│  │                                                       │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │    │
│  │  │ WxMapAdapter  │  │ AliMapAdapter │  │ DyMapAdapter│ │    │
│  │  │ (完整 Map)    │  │ (基础 Map)    │  │ (列表降级)  │ │    │
│  │  └──────────────┘  └──────────────┘  └────────────┘ │    │
│  └───────────────────────┬─────────────────────────────┘    │
│                          │                                    │
│              Taro.getSystemInfoSync()                         │
│              自动检测平台 → 选择适配器                          │
└──────────────────────────────────────────────────────────────┘
```

**各平台 Map 能力矩阵**：

| 能力 | 微信小程序 | 支付宝小程序 | 抖音小程序 |
|------|----------|------------|----------|
| `<Map>` 组件 | 完整支持 | 支持 (属性名一致) | 支持 (属性名差异需适配) |
| `Taro.createMapContext` | 支持 | 支持 | 有限支持 |
| Marker 标注 | 支持 (含 callout) | 支持 (callout 样式有限) | 基本支持 |
| 聚合标注 | 支持 (setting.anchor) | 不支持 | 不支持 |
| `Taro.openLocation` | 支持 | 支持 (跳转高德) | 支持 |
| `Taro.getLocation` | 支持 | 支持 | 支持 |
| 定位权限引导 | `Taro.openSetting` | `Taro.openSetting` | 平台差异 |
| 地图手势交互 | 完整 (拖动/缩放/旋转) | 基础 (拖动/缩放) | 基础 |

**降级策略**：

```typescript
// src/platform/map-adapter.ts (概念代码)

interface MapAdapter {
  isMapSupported: boolean;
  renderMap: (props: MapRenderProps) => JSX.Element;
  getLocation: () => Promise<LocationResult>;
  openNavigation: (params: NavigationParams) => void;
}

// 微信: 完整 Map + Marker + 聚合标注
class WxMapAdapter implements MapAdapter {
  isMapSupported = true;
  renderMap(props) { return <Map {...props} />; }
  // ... 完整能力
}

// 支付宝: Map + Marker (无聚合)
class AliMapAdapter implements MapAdapter {
  isMapSupported = true;
  renderMap(props) {
    // 支付宝 Map 属性名与微信一致 (lat/lng 等)
    return <Map {...props} />;
  }
  // 聚合标注降级为最多展示 50 个 marker (超过则警告)
}

// 抖音: 列表模式降级 (不使用 Map 组件)
class DyMapAdapter implements MapAdapter {
  isMapSupported = false;
  renderMap(props) {
    // 降级为 ScrollView 列表, 顶部固定展示静态地图截图 (通过 API 获取)
    // 列表每项展示门店信息 + "一键导航"按钮
    return <StoreListFallback stores={props.stores} />;
  }
}
```

### 23.2 定位权限处理流程

```
┌──────────────────────────────────────────────────────────────┐
│                   定位权限处理流程                              │
│                                                               │
│  ┌──────────┐     ┌──────────────┐     ┌──────────────┐     │
│  │ 进入门店Tab│────►│ 检查权限缓存   │────►│ 缓存有效?     │     │
│  └──────────┘     └──────┬───────┘     └──┬───┬───────┘     │
│                          │                │是  │否             │
│                          │                │    │               │
│                          │         ┌──────┘    └──────┐       │
│                          │         ▼                    ▼       │
│                          │  使用缓存位置        请求新权限      │
│                          │  加载门店             │              │
│                          │                      ▼              │
│                          │              Taro.getLocation()     │
│                          │                 │        │          │
│                          │            授权成功   拒绝/超时      │
│                          │                 │        │          │
│                          │                 ▼        ▼          │
│                          │          更新缓存    使用默认城市    │
│                          │          加载门店    提示引导开启权限 │
│                          │                                  │
│                          └──────────┬───────────────────────│
│                                     ▼                       │
│                              加载附近门店 API                │
│                              (GET /stores/nearby)            │
│                                     │                       │
│                              ┌──────┴──────┐               │
│                              │ 返回门店 > 0 │ 返回门店 = 0   │
│                              ▼              ▼               │
│                          渲染标注        展示空状态           │
└──────────────────────────────────────────────────────────────┘
```

**定位权限状态机**：

```typescript
enum LocationPermissionState {
  UNKNOWN = 'unknown',         // 尚未请求
  AUTHORIZED = 'authorized',   // 已授权
  DENIED = 'denied',           // 被拒绝 (可引导到设置页)
  TIMEOUT = 'timeout',         // 定位超时 (10s)
  UNAVAILABLE = 'unavailable', // 系统定位服务关闭
}

// StoreStore 中的状态管理
interface LocationState {
  permissionState: LocationPermissionState;
  coordinates: { latitude: number; longitude: number } | null;
  cachedAt: number | null;     // 缓存时间戳
  error: string | null;
}

// 默认城市中心 (权限拒绝时使用)
const DEFAULT_CENTER = {
  latitude: 39.9042,   // 北京天安门
  longitude: 116.4074,
};
```

### 23.3 地图性能优化

| 优化点 | 策略 | 收益 |
|--------|------|------|
| 标注点批量更新 | 一次 setData 更新全部 marker (避免逐个 push) | 减少渲染次数 |
| 视野变化防抖 | 地图移动停止 500ms 后 + 中心偏移超 50% 才重请求 | 减少 80% 不必要 API 调用 |
| 标注数量限制 | 单次加载最多 50 个 marker (分页控制) | 避免地图性能下降 |
| 门店详情缓存 | storeDetailMap TTL 30 分钟 | 减少详情页 API 请求 |
| 图片懒加载 | 门店封面图使用 lazy-load 属性 | 加快首屏渲染 |
| 低端机降级 | `Taro.getSystemInfoSync().benchmarkLevel < 20` 时减少 marker 数量至 20 | 保障基本可用 |

---

## 24. Tab Bar 更新

### 24.1 更新配置

Phase 3 Tab Bar 从 4 个扩展为 5 个，在原有"首页/改色设计/案例/我的"之间插入"门店"Tab (位置 4)：

```typescript
// src/app.config.ts tabBar.list (Phase 3 版本)
tabBar: {
  color: '#999999',
  selectedColor: '#1677FF',
  backgroundColor: '#FFFFFF',
  borderStyle: 'white',
  list: [
    { pagePath: 'pages/home/index',   text: '首页',     iconPath: 'assets/tab/home.png',    selectedIconPath: 'assets/tab/home-active.png' },
    { pagePath: 'pages/design/index',  text: '改色设计', iconPath: 'assets/tab/design.png',  selectedIconPath: 'assets/tab/design-active.png' },
    { pagePath: 'pages/cases/index',   text: '案例',     iconPath: 'assets/tab/cases.png',   selectedIconPath: 'assets/tab/cases-active.png' },
    { pagePath: 'pages/store/index',   text: '门店',     iconPath: 'assets/tab/store.png',   selectedIconPath: 'assets/tab/store-active.png' },
    { pagePath: 'pages/profile/index', text: '我的',     iconPath: 'assets/tab/profile.png', selectedIconPath: 'assets/tab/profile-active.png' },
  ],
},
```

### 24.2 Tab 图标资源

需要新增 2 个门店 Tab 图标：
- `src/assets/tab/store.png` -- 门店 Tab 未选中态图标 (灰色)
- `src/assets/tab/store-active.png` -- 门店 Tab 选中态图标 (蓝色 #1677FF)

**图标规范**：与现有 Tab 图标一致 -- 81px * 81px, PNG 格式，纯色填充便于 tintColor 适配。

### 24.3 微信小程序 Tab Bar 5 个上限

微信小程序底部 Tab 最多支持 5 个。Phase 3 后达到 5 个上限，后续 Phase 不允许再新增 Tab。若未来需要更多导航入口，可采用：
- 将"案例"合并到"首页"的子模块
- 在"我的"页面中增加聚合入口
- 使用自定义 TabBar (`tabBar.custom: true`)

---

## 25. Phase 3 Architecture Constraints

1. **地图定位优先降级原则**：门店地图以微信小程序完整 Map 为主，支付宝提供基础 Map 支持（无聚合标注），抖音降级为列表模式。各平台差异在 PlatformMapAdapter 层封装，页面组件不感知平台差异。

2. **预约防重提交铁律**：预约提交按钮在 API 调用期间必须进入 loading 态 + 禁用，AppointmentStore 内部维护 `submitting` 锁防止并发提交。提交成功前用户无法二次点击。

3. **时段冲突自动刷新**：提交预约返回 409 (时段冲突) 时，AppointmentStore 自动重新拉取当前时段的可用性数据，前端用刷新后的数据让用户重新选择，避免手动刷新。

4. **材质对比队列跨页面持久化**：MaterialCompareStore 的 `selectedMaterials` (最多 3 个) 通过 `Taro.setStorage` 持久化。页面切换时不丢失对比数据。页面进入时通过 Storage 恢复对比队列 ID 列表，再从已加载的材质列表中还原完整对象。

5. **历史记录日期筛选联动**：DateRangeFilter 的 `onChange` 触发 `HistoryStore.setDateRange()` → 自动重置分页到第 1 页 → 页面层通过 `useEffect` 监听 `dateRange` 变化后调用对应的 `fetchXxxHistory`。确保筛选变更后用户从列表顶部开始查看。

6. **手机号脱敏双重保障**：服务端在列表接口返回脱敏手机号 (中间 4 位 `*`)。若服务端因版本差异未脱敏，前端 `renderItem` 做防御性脱敏处理。详情接口返回完整手机号仅用于必要业务用途。

7. **状态覆盖铁律 (延续 Phase 2)**：所有 Phase 3 新增页面必须覆盖 loading / empty / error / success 四种状态。其中门店地图页额外覆盖 unauthorized (定位权限拒绝) 状态。每个步骤的表单组件也需覆盖自身的 4 状态。

8. **第三方 Map App 唤起降级**：`Taro.openLocation` 在开发者工具中无法真实唤起地图 App，仅展示模拟弹窗。真机上各平台行为：微信 → 微信内置地图 / 腾讯地图；支付宝 → 高德地图；抖音 → 系统默认地图。降级情况（如无地图 App）时引导用户手动搜索地址。

9. **预约表单中断保护**：用户从创建预约页返回或关闭时，若表单已有填写内容但未提交，需弹窗提示"离开后填写内容将丢失"。AppointmentStore 的 `resetCreateState()` 仅在用户确认离开或提交成功后调用。

10. **门店 API 降级缓存储**：门店地图 API 请求失败时，保留上次成功加载的门店列表为降级展示。用户仍可看到上次的地图标注，但顶部会有"数据可能不是最新"的提示条。

11. **材质对比表格横向滑动体验**：当材质 ≥ 3 列时，MaterialCompareTable 的维度名列 (第 1 列) 通过 `position: sticky; left: 0; z-index: 1` 固定在左侧，其余列包裹在 `<ScrollView scrollX>` 中横向滑动。需保证维度名列的背景色与页面一致防止内容穿透。

12. **7 天/30 天/90 天日期计算基准**：DateRangeFilter 的快捷选项基于当天日期 (`dayjs().format('YYYY-MM-DD')`) 动态计算。`endDate` 始终为当天日期，`startDate` 为当天减 N 天。避免硬编码日期常量。

---

*架构版本：v3.0 (Phase 3)*
*编写角色：Architect*
*日期：2026-07-22*
*前置依赖：Phase 2 体验完善完成并通过验收*

---

# Phase 4 架构设计 -- 社区化 + 智能化 + 精细化体验

**状态**：Draft (v4.0)
**日期**：2026-07-22
**编写角色**：Architect
**前置依赖**：Phase 3 运营模块完成并通过验收

---

## 26. Phase 4 总体变化概览

### 26.1 核心架构变化

Phase 4 在 Phase 3 基础上向三个方向深化：**社区互动**（案例评论/排行榜/分享卡片）、**智能体验**（AI 队列/部件面积/AR 预览）、**精细化运营**（验证码登录/客户关怀/预约验证码）。架构层面的关键变化：

| 维度 | Phase 3 现状 | Phase 4 变化 |
|------|-------------|-------------|
| 底部 Tab | 5 个 (首页/设计/案例/门店/我的) | 5 个 (不变, Phase 4 不新增 Tab) |
| 页面总数 | 21 个页面 | 24 个页面 (新增 3 个: 案例排行榜/分享卡片/AR 预览; 修改 8 个) |
| Zustand Store | 10 个 | 14 个 (新增 CommentStore/RankingStore/AiQueueStore/CustomerCareStore) |
| API Service | 9 个 service 文件 | 15 个 service 文件 (新增 6 个: comment/ranking/sms/customer-care/share-card/ar) |
| 公共组件 | 21 个 | 31 个 (新增 10 个) |
| 路由页 | 21 条 | 24 条 (新增 3 条) |
| 新增 API 端点 | — | 14 个新增 + 5 个修改 |
| WebView 层 | 3D 渲染 H5 | 3D 渲染 H5 + AR 预览 H5 (新增) |
| postMessage 协议 | 12 种消息类型 | 20 种 (新增 8 种 AR 消息) |

### 26.2 架构分层影响

```
┌──────────────────────────────────────────────────────────────────┐
│                    Taro 小程序 (wraplab-client)                    │
│                                                                    │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────────────────┐   │
│  │  页面层     │  │  组件层      │  │  WebView 渲染层           │   │
│  │  pages/    │  │  components/ │  │  webview/3d-renderer/    │   │
│  │  24 个页面  │  │  31 个组件    │  │  webview/ar-renderer/    │   │
│  │ (新增 3)   │  │  (新增 10)   │  │  (新增 AR H5)            │   │
│  └──────┬─────┘  └──────┬──────┘  └───────────┬──────────────┘   │
│         │               │                     │                   │
│  ┌──────┴───────────────┴─────────────────────┴───────────────┐  │
│  │             状态管理层 (Zustand)  ← 新增 4 个 Store          │  │
│  │  Auth  │  Vehicle  │  Color  │  Config  │  Case  │  Ai     │  │
│  │  Store │  Appoint  │  MatComp │  History │  Favorite       │  │
│  │  Comment │  Ranking │  AiQueue │ CustomerCare             │  │
│  └────────────────────────────┬────────────────────────────────┘  │
│                               │                                    │
│  ┌────────────────────────────┴────────────────────────────────┐  │
│  │              API 服务层 (services/)  ← 新增 6 个 Service     │  │
│  │  request.ts  │  auth  │  vehicle  │  color  │  config       │  │
│  │  quote  │  case  │  ai  │  store  │  appoint  │  history   │  │
│  │  favorite │  comment  │  ranking  │  sms  │  customer      │  │
│  │  share-card │  ar                                │  │
│  └────────────────────────────┬────────────────────────────────┘  │
│                               │                                    │
│  ┌────────────────────────────┴────────────────────────────────┐  │
│  │              平台适配层 (platform/) + Canvas 适配层           │  │
│  │  PlatformBridge  │  wx-adapter  │  alipay-adapter           │  │
│  │  ShareAdapter  │  CanvasShareCard                           │  │
│  └─────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬─────────────────────────────────┘
                                 │ HTTPS / REST (JSON)
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                    wraplab-server (NestJS API)                     │
│  评论 API  │  排行 API  │  分享 API  │  SMS API  │  队列 API     │
│  AR 配置 API  │  客户关怀 API  │  部件面积 API                   │
└──────────────────────────────────────────────────────────────────┘
```

**分层职责（不变）**：页面层不直接调用 Taro API，组件层不持有业务状态，Store 仅存可序列化数据，Service 层纯函数无副作用。

---

## 27. Phase 4 项目结构扩展

### 27.1 新增/修改文件清单

```
wraplab-client/
├── src/
│   ├── app.config.ts                        # [MODIFIED] 新增 3 个页面路由
│   │
│   ├── pages/                               # 新增 3 个页面 + 修改 8 个页面
│   │   ├── auth/
│   │   │   └── login/
│   │   │       ├── index.tsx                # [MODIFIED] 新增"验证码登录"切换 Tab
│   │   │       ├── index.config.ts          # [MODIFIED] navigationBarTitleText: "门店登录"
│   │   │       └── index.less               # [MODIFIED] Tab 切换样式 + 验证码输入区
│   │   ├── design/
│   │   │   ├── index/                       # [MODIFIED] 新增 AR 预览入口 + 部件面积展示
│   │   │   │   └── index.tsx                # [MODIFIED]
│   │   │   ├── quote/                       # [MODIFIED] 部件面积明细展示
│   │   │   │   └── index.tsx                # [MODIFIED]
│   │   │   └── ar-preview/
│   │   │       └── index/
│   │   │           ├── index.tsx            # [NEW] AR 预览页 (WebView)
│   │   │           ├── index.config.ts      # navigationBarTitleText: "AR 预览"
│   │   │           └── index.less
│   │   ├── cases/
│   │   │   ├── index/                       # [MODIFIED] 新增"排行榜"Tab 入口
│   │   │   │   └── index.tsx                # [MODIFIED]
│   │   │   ├── detail/
│   │   │   │   └── index/
│   │   │   │       ├── index.tsx            # [MODIFIED] 新增评论摘要区 + 分享按钮增强
│   │   │   │       └── index.less           # [MODIFIED]
│   │   │   ├── ranking/
│   │   │   │   └── index/
│   │   │   │       ├── index.tsx            # [NEW] 案例排行榜页
│   │   │   │       ├── index.config.ts      # navigationBarTitleText: "案例排行榜"
│   │   │   │       └── index.less
│   │   │   └── share-card/
│   │   │       └── index/
│   │   │           ├── index.tsx            # [NEW] 分享卡片生成页
│   │   │           ├── index.config.ts      # navigationBarTitleText: "分享案例"
│   │   │           └── index.less
│   │   ├── ai/
│   │   │   └── generate/
│   │   │       └── index/
│   │   │           ├── index.tsx            # [MODIFIED] 新增 AI 队列进度状态
│   │   │           └── index.less           # [MODIFIED]
│   │   ├── appointment/
│   │   │   └── create/
│   │   │       └── index/
│   │   │           ├── index.tsx            # [MODIFIED] Step 3 新增 SMS 验证码区域
│   │   │           └── index.less           # [MODIFIED]
│   │   └── profile/
│   │       └── index/
│   │           ├── index.tsx                # [MODIFIED] 新增"我的客户"入口 + 客户关怀 banner
│   │           └── index.less               # [MODIFIED]
│   │
│   ├── components/                          # 新增 10 个公共组件
│   │   ├── CommentList/
│   │   │   ├── index.tsx                    # [NEW] 评论列表组件 (含嵌套回复)
│   │   │   └── index.less
│   │   ├── CommentInput/
│   │   │   ├── index.tsx                    # [NEW] 评论输入框组件 (含限频逻辑)
│   │   │   └── index.less
│   │   ├── RankingTab/
│   │   │   ├── index.tsx                    # [NEW] 排行榜周期/维度 Tab 切换
│   │   │   └── index.less
│   │   ├── RankBadge/
│   │   │   ├── index.tsx                    # [NEW] 排名徽章 (金银铜 + 数字)
│   │   │   └── index.less
│   │   ├── ShareCardCanvas/
│   │   │   ├── index.tsx                    # [NEW] Canvas 分享卡片绘制组件
│   │   │   └── index.less
│   │   ├── PartAreaTag/
│   │   │   ├── index.tsx                    # [NEW] 部件面积标签组件
│   │   │   └── index.less
│   │   ├── SmsCodeInput/
│   │   │   ├── index.tsx                    # [NEW] 短信验证码输入 + 倒计时公共组件
│   │   │   └── index.less
│   │   ├── CustomerCareBanner/
│   │   │   ├── index.tsx                    # [NEW] 客户关怀提醒横幅
│   │   │   └── index.less
│   │   ├── QueueProgress/
│   │   │   ├── index.tsx                    # [NEW] AI 队列进度条组件
│   │   │   └── index.less
│   │   └── ArFallback/
│   │       ├── index.tsx                    # [NEW] AR 不可用降级页组件
│   │       └── index.less
│   │
│   ├── stores/                              # 新增 4 个 Zustand Store
│   │   ├── comment-store.ts                 # [NEW] 评论状态管理
│   │   ├── ranking-store.ts                 # [NEW] 排行榜状态管理
│   │   ├── ai-queue-store.ts                # [NEW] AI 队列状态管理
│   │   └── customer-care-store.ts           # [NEW] 客户关怀状态管理
│   │
│   ├── services/                            # 新增 6 个 API Service
│   │   ├── comment.service.ts               # [NEW] 评论 API
│   │   ├── ranking.service.ts               # [NEW] 排行榜 API
│   │   ├── sms.service.ts                   # [NEW] 短信验证码 API
│   │   ├── customer-care.service.ts         # [NEW] 客户关怀 API
│   │   ├── share-card.service.ts            # [NEW] 分享卡片 API
│   │   └── ar.service.ts                    # [NEW] AR 纹理配置 API
│   │
│   ├── types/                               # 新增类型定义
│   │   ├── comment.d.ts                     # [NEW] Comment, Reply 类型
│   │   ├── ranking.d.ts                     # [NEW] RankingCase, RankDimension, RankPeriod
│   │   ├── sms.d.ts                         # [NEW] SmsCodeType, SmsCodeStatus
│   │   └── customer-care.d.ts               # [NEW] Customer, CareReminder 类型
│   │
│   ├── utils/
│   │   ├── constants.ts                     # [MODIFIED] 新增 Phase 4 错误码 + 验证码限频常量
│   │   └── sms-cooldown.ts                  # [NEW] 验证码倒计时管理工具
│   │
│   └── webview/
│       └── ar-renderer/                     # [NEW] AR 预览 H5 页面 (独立构建)
│           ├── index.html                   # H5 入口 HTML
│           ├── main.ts                      # WebXR 场景初始化
│           ├── model-loader.ts              # AR 模型加载 (glTF)
│           ├── color-overlay.ts             # 车色叠加 Shader
│           ├── bridge.ts                    # postMessage 通信封装
│           ├── types.ts                     # AR 消息类型
│           ├── package.json                 # H5 独立依赖
│           └── tsconfig.json                # H5 独立 TS 配置
```

### 27.2 与 Phase 1/2/3 文件的交叉影响

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/app.config.ts` | 修改 | 新增 3 个页面路由注册 |
| `src/pages/auth/login/index.tsx` | 修改 | 新增"验证码登录"Tab + SmsCodeInput 组件集成 |
| `src/pages/design/index.tsx` | 修改 | 新增 AR 预览入口 (条件渲染) + 部件面积标签展示 |
| `src/pages/design/quote/index.tsx` | 修改 | 价格明细新增部件面积列 |
| `src/pages/cases/index.tsx` | 修改 | 新增"排行榜"Tab 入口 + CaseCard 接入真实排行数据 |
| `src/pages/cases/detail/index/index.tsx` | 修改 | 新增底部评论摘要区 + 分享按钮跳转至分享卡片页 |
| `src/pages/ai/generate/index/index.tsx` | 修改 | 新增队列进度状态展示 (替换即时等待逻辑) |
| `src/pages/appointment/create/index/index.tsx` | 修改 | Step 3 新增 SMS 验证码校验区域 |
| `src/pages/profile/index/index.tsx` | 修改 | 新增"我的客户"入口 + 客户关怀 banner 展示 |
| `src/stores/auth-store.ts` | 修改 | 新增 `smsLogin` action |
| `src/stores/ai-store.ts` (或现有 ai store) | 修改 | 新增 `queueStatus` 字段 + `pollQueueStatus` action |
| `src/services/auth.service.ts` | 修改 | 新增 `smsLogin()` + `sendSmsCode()` + `verifySmsCode()` 方法 |
| `src/services/ai.service.ts` | 修改 | 新增 `getQueueStatus()` + `subscribeGeneration()` (队列模式) |
| `src/services/config.service.ts` | 修改 | `getParts()` 返回类型扩展 `area_m2` 字段 |
| `src/services/appointment.service.ts` | 修改 | 新增 `sendVerifySms()` + `verifySmsCode()` 方法 |
| `src/types/config.d.ts` | 修改 | ConfigurationPart 扩展 `area_m2` 字段 |
| `src/utils/constants.ts` | 修改 | 新增 Phase 4 错误码 (1012/1014/1015/1020 等) |

---

## 28. Phase 4 路由设计

### 28.1 app.config.ts 页面注册 (Phase 4 完整版)

Note: Phase 4 does not add new Tab pages (5 Tab limit reached in Phase 3).

```typescript
// src/app.config.ts (Phase 4 完整版本)
export default defineAppConfig({
  pages: [
    // 5 个 Tab 页 — 必须在 pages 数组前 5 位
    'pages/home/index',
    'pages/design/index',
    'pages/cases/index',
    'pages/store/index',
    'pages/profile/index',

    // 非 Tab 子页面
    'pages/auth/login',                        // [MODIFIED] + 验证码登录 Tab
    'pages/home/car-select',
    'pages/design/quote',                      // [MODIFIED] + 部件面积明细
    'pages/design/material-compare/index',
    'pages/design/ar-preview/index',           // [NEW] AR 预览
    'pages/cases/detail/index',                // [MODIFIED] + 评论摘要 + 分享增强
    'pages/cases/ranking/index',               // [NEW] 案例排行榜
    'pages/cases/share-card/index',            // [NEW] 分享卡片生成
    'pages/store/detail/index',
    'pages/appointment/create/index',          // [MODIFIED] + SMS 验证码校验
    'pages/appointment/confirm/index',
    'pages/appointment/list/index',
    'pages/profile/favorites/index',
    'pages/profile/history/configs/index',
    'pages/profile/history/quotes/index',
    'pages/profile/service-record/index',
    'pages/ai/generate/index',                 // [MODIFIED] + 队列进度状态
    'pages/campaign/list/index',
    'pages/campaign/detail/index',
  ],

  // tabBar 配置不变 (5 Tab, Phase 3 已达上限)
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#FFFFFF',
    navigationBarTitleText: 'WrapLab',
    navigationBarTextStyle: 'black',
  },
});
```

### 28.2 Phase 4 新增/修改路由参数传递约定

| 源页面 | 目标页面 | 跳转方式 | 传递参数 | 说明 |
|--------|----------|----------|----------|------|
| `cases/detail` | `cases/share-card/index` | `navigateTo` | `?caseId=` | 分享卡片生成 |
| `cases/detail` | `cases/detail` (评论弹窗) | 组件内浮层 | — | 评论系统不独立页面, 通过半屏弹窗实现 |
| `cases/index` | `cases/ranking/index` | `navigateTo` | `?period=daily&type=like_count` (可选) | 排行榜页 |
| `design/index` | `design/ar-preview/index` | `navigateTo` | `?configurationId=` | AR 预览, 携带当前方案 ID |
| `design/ar-preview` → 返回 | `design/index` | `navigateBack` | — | AR 预览返回工作台 |
| `profile/index` | `cases/ranking/index` | `navigateTo` | 无 | 从我的页面进入排行榜 |
| `auth/login` (成功) | `home/index` | `switchTab` | 无 | 验证码登录成功后跳转首页 |

### 28.3 Phase 4 新增跳转工具函数

```typescript
// src/utils/navigate.ts (Phase 4 扩展)

/** 跳转案例排行榜 */
export function navigateToRanking(params?: { period?: string; type?: string }) {
  const query = params
    ? Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${k}=${v}`)
        .join('&')
    : '';
  Taro.navigateTo({ url: `/pages/cases/ranking/index${query ? '?' + query : ''}` });
}

/** 跳转分享卡片生成页 */
export function navigateToShareCard(caseId: string) {
  Taro.navigateTo({ url: `/pages/cases/share-card/index?caseId=${caseId}` });
}

/** 跳转 AR 预览页 */
export function navigateToArPreview(configurationId: string) {
  Taro.navigateTo({ url: `/pages/design/ar-preview/index?configurationId=${configurationId}` });
}
```

---

## 29. Phase 4 组件树

### 29.1 新增/修改页面组件层级结构

```
App (src/app.tsx)
│
├── pages/auth/login/index  [MODIFIED]
│   ├── LoadingSkeleton (表单骨架屏)                    ← loading 状态
│   ├── ErrorState ("登录服务异常")                      ← error 状态
│   └── View (登录表单)                                ← success/idle 状态
│       ├── Image (品牌 Logo)
│       ├── View (登录方式切换 Tab)
│       │   ├── Tab ("密码登录") → 展示密码表单
│       │   └── Tab ("验证码登录") → 展示验证码表单    # [NEW]
│       ├── View (密码表单, activeTab === 'password')
│       │   ├── Input (手机号)
│       │   └── Input (密码, password)
│       ├── View (验证码表单, activeTab === 'sms')      # [NEW]
│       │   ├── Input (手机号)
│       │   ├── SmsCodeInput (验证码输入 + 发送按钮)    # [NEW]
│       │   │   ├── Input (6 位验证码)
│       │   │   └── Button ("获取验证码" / "Ns 后重新获取")
│       │   └── Text ("首次验证码登录建议设置密码") 提示
│       ├── Button (登录, loading 态)
│       └── Text (品牌标识 "WrapLab 车衣实验室")
│
├── pages/cases/detail/index  [MODIFIED]
│   ├── LoadingSkeleton (案例详情骨架屏)               ← loading 状态
│   ├── ErrorState                                    ← error 状态
│   └── View (案例详情)                               ← success 状态
│       ├── ImageGallery (案例图集轮播)
│       ├── View (案例信息: 车型/颜色/材质/门店)
│       ├── View (操作栏: 点赞 / 收藏 / 分享)
│       │   └── Button (分享图标) → navigateToShareCard(caseId)  # [MODIFIED] 跳转分享卡片页
│       ├── View (评论摘要区)                          # [NEW]
│       │   ├── Text ("评论 (N)")
│       │   ├── CommentList (最新 3 条预览 + 嵌套回复)  # [NEW]
│       │   └── Button ("查看全部 N 条评论") → 打开评论浮层
│       └── View (相关案例推荐)
│
│   # [NEW] 评论浮层 (通过半屏弹窗或页面内区域展示)
│   ├── CommentList (完整评论列表, 分页)
│   │   ├── LoadingSkeleton (5 条评论占位)             ← loading 状态
│   │   ├── EmptyState ("暂无评论，来抢沙发")           ← empty 状态
│   │   ├── ErrorState + 重试按钮                      ← error 状态
│   │   └── ScrollView                               ← success 状态
│   │       └── View (评论项) × N
│   │           ├── Image (评论人头像)
│   │           ├── Text (评论人姓名)
│   │           ├── Text (评论内容)
│   │           ├── Text (时间 "3 分钟前")
│   │           ├── Button (回复) → 打开回复输入框
│   │           ├── View (回复列表, 最多 2 层嵌套)
│   │           │   └── View (回复项) × N
│   │           │       ├── Text (回复人 → 被回复人)
│   │           │       └── Text (回复内容)
│   │           └── View (...更多回复)
│   └── CommentInput (底部固定输入区)                   # [NEW]
│       ├── Textarea (评论内容, maxlength=500)
│       ├── Text (限频提示: "30s 后可再次评论")         ← rate-limited 状态
│       └── Button (发送, disabled 当限频/内容为空)
│
├── pages/cases/ranking/index  [NEW]
│   ├── LoadingSkeleton (10 条排行项占位)               ← loading 状态
│   ├── ErrorState + "重试"按钮                        ← error 状态
│   ├── EmptyState ("暂无排行数据" + 插画)              ← empty 状态
│   └── View (排行列表)                                ← success 状态
│       ├── RankingTab (周期切换: 日榜/周榜/月榜)        # [NEW]
│       │   └── Tab × 3 → onPeriodChange
│       ├── View (排序维度切换)
│       │   ├── Tab ("按点赞") → type=like_count
│       │   ├── Tab ("按浏览") → type=view_count
│       │   └── Tab ("按评论") → type=comment_count
│       └── ScrollView (排行列表, pull-to-refresh)
│           └── View (排行项) × N
│               ├── RankBadge (排名: 🥇🥈🥉 / 数字)     # [NEW]
│               ├── CaseCard (案例卡片)
│               │   ├── Image (封面图)
│               │   ├── Text (标题)
│               │   ├── Text (车型颜色摘要)
│               │   └── View (热度数值: ❤️ N / 👁 N / 💬 N)
│               └── View (排名变化指示: ↑↓ 箭头)
│
├── pages/cases/share-card/index  [NEW]
│   ├── View (Canvas 绘制 loading)                    ← loading 状态
│   │   ├── LoadingSkeleton (卡片区域骨架占位)
│   │   └── Text ("正在生成分享卡片...")
│   ├── ErrorState ("生成失败")                        ← error 状态
│   │   ├── Button ("重新生成")
│   │   └── Button ("返回详情")
│   └── View (分享卡片结果)                            ← success 状态
│       ├── ShareCardCanvas (Canvas 渲染)              # [NEW]
│       │   └── Canvas (id="share-card-canvas", 750x1334rpx)
│       ├── Button ("保存图片") → Canvas.toTempFilePath + saveToAlbum
│       ├── Button ("转发给好友") → Taro.shareFileMessage
│       └── PlatformShareAdapter (支付宝/抖音降级策略)  # 各平台不同分享入口
│
├── pages/design/index  [MODIFIED]
│   ├── ... (Phase 2/3 已有结构不变)
│   └── View (工作台)                                ← success 状态
│       ├── View (顶部: 当前颜色信息栏)
│       │   ├── Text (色卡品牌名 + 颜色名)
│       │   ├── View (色块预览)
│       │   └── Button ("AR 预览", ar图标)             # [NEW] 条件渲染: ar_model_url !== null
│       │       → navigateToArPreview(configurationId)
│       ├── PartSelector  [MODIFIED]
│       │   └── View (部件选择项) × N
│       │       ├── Text (部件名称)
│       │       ├── View (当前颜色色块)
│       │       ├── PartAreaTag (面积: "1.5 m²")       # [NEW]
│       │       └── Image (选中态标记)
│       ├── View (底部汇总: "合计约 15.8 m²")           # [NEW]
│       │   └── Text (所有选中部件面积之和)
│       ├── ThreeDViewer, MaterialSelector, ColorSwatch...
│       └── Button ("生成报价单")
│
├── pages/design/ar-preview/index  [NEW]
│   ├── View (AR 初始化中)                             ← loading 状态
│   │   ├── Text ("正在初始化 AR...")
│   │   └── Image (设备引导示意图)
│   ├── ArFallback ("您的设备不支持 AR")                ← unsupported 状态
│   │   ├── Image (降级插图)
│   │   ├── Text ("请使用最新版微信打开")
│   │   ├── Button ("查看 3D 模型") → navigateBack
│   │   └── Button ("查看案例实拍") → switchTab('cases')
│   ├── ErrorState ("AR 加载失败")                     ← error 状态
│   │   ├── Text (错误原因)
│   │   ├── Button ("重试") → 重新加载 AR WebView
│   │   └── Button ("返回工作台") → navigateBack
│   └── View (AR 渲染中)                               ← success 状态
│       ├── WebView (AR H5, 全屏)
│       ├── View (底部控制栏)
│       │   ├── Button (方案切换)
│       │   ├── Button (截图)
│       │   └── Button (退出 AR)
│       └── Text (引导提示: "移动设备查看不同角度效果")
│
├── pages/ai/generate/index  [MODIFIED]
│   ├── ... (Phase 2/3 风格选择 + 结果展示已有结构)
│   └── View (生成状态区)  [MODIFIED]
│       ├── QueueProgress (排队中)                      # [NEW]
│       │   ├── Text ("排队中，前方还有 N 个任务")
│       │   ├── ProgressBar (25%, 橙色)
│       │   └── Text ("预计等待 M 分钟")
│       ├── QueueProgress (处理中)                      # [NEW]
│       │   ├── Text ("AI 正在为您生成...")
│       │   └── ProgressBar (50-90%, 蓝色 pulsating)
│       ├── ErrorState (生成失败)                      ← error 状态
│       │   ├── Text (失败原因: "AI 服务繁忙" / "队列已满")
│       │   ├── Button ("重新提交")  [队列满时启用]
│       │   └── Button ("返回")
│       └── View (生成完成)                            ← success 状态
│           ├── Image (结果大图, 双指缩放)
│           ├── View (操作按钮组: 保存/分享/重新生成)
│           └── QueueProgress (100%, 绿色, 仅展示瞬态后消失)
│
├── pages/appointment/create/index  [MODIFIED]
│   └── View (Step 3: 客户联系信息)  [MODIFIED]
│       ├── ... (已有字段: 姓名, 手机号, 车型, 备注)
│       ├── View (SMS 验证码区域, 可选)                  # [NEW]
│       │   ├── Text ("验证手机号 (可选)")
│       │   ├── SmsCodeInput
│       │   │   ├── Button ("发送验证码")
│       │   │   ├── Input (6 位验证码)
│       │   │   └── Text (绿色 ✓ "验证通过")           ← verified 状态
│       │   └── Text (验证码错误提示: 错误码 1012/1014/1015)
│       └── Button (提交预约)
│
└── pages/profile/index  [MODIFIED]
    └── View (正常内容)                                ← success 状态
        ├── CustomerCareBanner ("您有 N 位客户本月生日")  # [NEW]
        │   └── View (生日蛋糕图标 + 数量 + 查看详情入口)
        ├── View (功能入口列表)  [MODIFIED]
        │   ├── ... (已有入口: 收藏/历史/预约/服务记录)
        │   └── View ("我的客户" 入口)                   # [NEW]
        │       └── Text (客户数 N)
        │           → 跳转客户列表 (后台管理独立页面, Phase 4 暂以 WebView 或跳转 Admin 实现)
        └── ... (店员信息 + 退出登录)
```

### 29.2 新增公共组件规格

#### CommentList

```
CommentList/
├── index.tsx
└── index.less
```

**职责**：可复用的评论列表组件，支持分页加载、嵌套回复（最多 2 层）、管理员审核操作。用于案例详情页的评论浮层内。

**Props**：

```typescript
interface CommentListProps {
  /** 关联资源 ID (案例 ID) */
  resourceId: string;
  /** 资源类型 (用于复用) */
  resourceType: 'case' | 'campaign';
  /** 每页条数 */
  pageSize?: number;
  /** 是否显示管理操作 (仅管理员可见 approve/reject) */
  showAdminActions?: boolean;
  /** 加载中 */
  loading?: boolean;
  /** 加载失败 */
  error?: string | null;
  /** 空状态文案 */
  emptyText?: string;
  /** 评论数据 (由 store 管理, 组件通过 props 接收) */
  comments: CommentItem[];
  /** 分页状态 */
  hasMore: boolean;
  /** 当前页码 */
  currentPage: number;
  /** 加载更多回调 */
  onLoadMore: () => void;
  /** 发表评论回调 */
  onSubmitComment: (content: string, parentId?: string) => void;
  /** 删除评论回调 (管理员) */
  onDeleteComment?: (commentId: string) => void;
  /** 审核通过回调 (管理员) */
  onApproveComment?: (commentId: string) => void;
  /** 审核拒绝回调 (管理员) */
  onRejectComment?: (commentId: string) => void;
  /** 限频状态 (秒数倒计时) */
  rateLimitCooldown?: number;
}
```

**评论数据结构**：

```typescript
interface CommentItem {
  id: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  /** @deprecated Phase 5 — 暂不启用，评论点赞将在 Phase 5 评论区加强中实现 */
  likeCount: number;
  /** @deprecated Phase 5 — 暂不启用 */
  isLiked: boolean;
  /** 审核状态: approved | pending | rejected */
  status: 'approved' | 'pending' | 'rejected';
  /** 嵌套回复 (2 层, 回复的回复不再嵌套) */
  replies?: CommentItem[];
  /** 回复总数 (大于 replies.length 时显示"查看更多") */
  replyCount: number;
  /** 回复目标用户名 (回复时 @ 的人) */
  replyToUserName?: string;
}
```

**内部状态**：

| 状态 | 条件 | UI |
|------|------|-----|
| loading | comments.length === 0 && loading | 骨架屏: 5 条圆形头像 + 2 行文字线 + 时间线占位 |
| empty | comments.length === 0 && !loading && !error | 插画 + "暂无评论，来抢沙发" |
| error | error !== null | 错误图标 + 错误文案 + "重试"按钮 |
| rate-limited | rateLimitCooldown > 0 | 底部输入区禁用 + "Ns 后可再次评论" |
| success | comments.length > 0 | 评论列表 + 分页加载 |

**乐观插入机制**：
- 用户提交评论 → CommentStore 立即在列表顶部插入 pending 态评论
- 同时发起 API 请求，成功后更新 comment 的 `id` + `status: approved`
- API 失败后 Toast 提示 "评论发送失败, 请重试"，并移除 pending 评论
- pending 态评论刷新页面时不展示（后端尚未入库），属客户端临时展示

---

#### CommentInput

```
CommentInput/
├── index.tsx
└── index.less
```

**职责**：固定在底部的评论输入区域，包含 Textarea + 发送按钮 + 限频倒计时。可复用于评论浮层、案例详情底部。

**Props**：

```typescript
interface CommentInputProps {
  /** 提交回调 (content: 评论内容, parentId: 回复的父评论 ID) */
  onSubmit: (content: string, parentId?: string) => void;
  /** 回复的父评论 ID (回复模式时传, 顶部显示"回复 @用户名") */
  replyTo?: { id: string; userName: string; content: string } | null;
  /** 取消回复模式 */
  onCancelReply?: () => void;
  /** 限频剩余秒数 (0 表示无限制) */
  cooldownSeconds: number;
  /** 提交中 */
  submitting?: boolean;
  /** 内容最大长度 */
  maxLength?: number;
  /** 占位文案 */
  placeholder?: string;
}
```

**内部状态**：

| 状态 | 条件 | UI |
|------|------|-----|
| idle | cooldownSeconds === 0 | Textarea 正常输入 + 发送按钮可用 |
| cooldown | cooldownSeconds > 0 | Textarea 正常输入 + 发送按钮置灰 + "Ns后重试" |
| submitting | submitting === true | Textarea 禁用 + 发送按钮 loading 态 |
| replying | replyTo !== null | 顶部展示 "回复 @张三: 原文摘要..." + 取消按钮 |

**限频逻辑**：
- `cooldownSeconds` 由 `CommentStore` 管理，提交评论成功后自动启动 30s 倒计时
- 跨页面记忆：使用 `Taro.Storage` 存储上次评论时间戳，页面恢复时检查剩余冷却时间
- 实现方式：`src/utils/sms-cooldown.ts` 提供的通用倒计时 hook

```typescript
// src/utils/sms-cooldown.ts (Phase 4 新增)
import { useState, useEffect, useRef } from 'react';
import { useDidHide, useDidShow } from '@tarojs/taro';

/**
 * 通用冷却倒计时 Hook
 * @param cooldownMs 冷却时长 (毫秒), 默认 30000 (30s)
 * @param storageKey Storage 持久化 key (用于跨页面恢复)
 */
export function useCooldown(cooldownMs = 30000, storageKey?: string) {
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimeRef = useRef<number>(0);

  const startCooldown = () => {
    const endTime = Date.now() + cooldownMs;
    endTimeRef.current = endTime;
    if (storageKey) Taro.setStorageSync(storageKey, endTime);
    runTimer(endTime);
  };

  const runTimer = (endTime: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setCooldownLeft(left);
      if (left === 0 && timerRef.current) clearInterval(timerRef.current);
    }, 200);
  };

  // 组件挂载时从 storage 恢复
  useEffect(() => {
    if (storageKey) {
      const saved = Taro.getStorageSync(storageKey);
      if (saved && saved > Date.now()) runTimer(saved);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [storageKey]);

  return { cooldownLeft, startCooldown, isCooldown: cooldownLeft > 0 };
}
```

---

#### RankingTab

```
RankingTab/
├── index.tsx
└── index.less
```

**职责**：排行榜周期切换 + 排序维度切换的组合 Tab 组件。双行布局：上行周期 Tab (日榜/周榜/月榜)，下行维度 Tab (点赞/浏览/评论)。

**Props**：

```typescript
interface RankingTabProps {
  /** 当前选中周期 */
  activePeriod: 'daily' | 'weekly' | 'monthly';
  /** 当前选中排序维度 */
  activeType: 'like_count' | 'view_count' | 'comment_count';
  /** 周期变更回调 */
  onPeriodChange: (period: 'daily' | 'weekly' | 'monthly') => void;
  /** 维度变更回调 */
  onTypeChange: (type: 'like_count' | 'view_count' | 'comment_count') => void;
}
```

---

#### RankBadge

```
RankBadge/
├── index.tsx
└── index.less
```

**职责**：排行榜名次徽章，前 3 名使用金银铜特殊样式，其余使用序号数字。

**Props**：

```typescript
interface RankBadgeProps {
  /** 排名 (1-based) */
  rank: number;
}
```

**渲染差异**：

| rank | 图标/样式 | 颜色 |
|------|----------|------|
| 1 | 金牌 (medal icon) | #FFD700 (金色渐变背景) |
| 2 | 银牌 (medal icon) | #C0C0C0 (银色渐变背景) |
| 3 | 铜牌 (medal icon) | #CD7F32 (铜色渐变背景) |
| >=4 | 数字序号 | #999 灰色背景, 白色数字 |

---

#### ShareCardCanvas

```
ShareCardCanvas/
├── index.tsx
└── index.less
```

**职责**：使用 `Taro.createCanvasContext` 在 Canvas 上绘制分享卡片。组件内部管理 Canvas 绘制流程：下载封面图 → 绘制背景 → 绘制文字 → 绘制小程序码 → 导出。

**Props**：

```typescript
interface ShareCardCanvasProps {
  /** 案例分享卡片数据 (来自 API) */
  cardData: ShareCardData | null;
  /** 是否显示 (控制 Canvas 可见性) */
  visible: boolean;
  /** 绘制完成回调 (返回 tempFilePath) */
  onRenderComplete: (tempFilePath: string) => void;
  /** 绘制失败回调 */
  onRenderError: (error: string) => void;
}

interface ShareCardData {
  /** 案例封面图 URL */
  coverUrl: string;
  /** 案例标题 (最多 2 行) */
  title: string;
  /** 车型颜色摘要 */
  subtitle: string;
  /** 门店 Logo URL */
  storeLogoUrl?: string;
  /** 门店名称 */
  storeName: string;
  /** 小程序码图片 URL */
  qrCodeUrl: string;
}
```

**Canvas 布局规范** (宽度 750rpx, 高度 1334rpx)：

```
┌──────────────────────────────┐  y: 0
│                              │
│        封面图 (750×400rpx)     │  y: 0-400
│   半透明黑色渐变蒙层 (上→下)     │
│   白色标题 (36rpx, 最多2行)     │  y: 280
│   车型颜色摘要 (24rpx, 白色)    │  y: 340
│                              │
├──────────────────────────────┤  y: 400
│                              │
│       (留白区域)              │
│                              │
├──────────────────────────────┤  y: 1080
│  门店 Logo  门店名称  │ 小码  │  y: 1080-1200
│  (80rpx)              │200rpx │
│                 扫码查看详情   │  y: 1220
├──────────────────────────────┤  y: 1334
└──────────────────────────────┘
```

**绘制流程**：
1. 创建 Canvas 上下文 `Taro.createCanvasContext('share-card-canvas')`
2. 下载封面图 `Taro.downloadFile({ url: coverUrl })` → 获取临时路径
3. 绘制封面图 `ctx.drawImage(coverPath, 0, 0, 750, 400)`
4. 绘制渐变蒙层：`ctx.createLinearGradient(0, 200, 0, 400)` → 半透明黑
5. 绘制标题文字 (白色, 36rpx, 最多 2 行省略)
6. 绘制副标题 (白色, 24rpx)
7. 下载小程序码 → 绘制到右下角 (200rpx 正方形)
8. 绘制门店 Logo + 名称 (左下角)
9. 调用 `ctx.draw(false, () => { Taro.canvasToTempFilePath(...) })`
10. 返回 tempFilePath 给父组件

**错误处理**：
- 封面图下载失败 → 使用默认占位图 (WrapLab Logo)
- 小程序码下载失败 → 继续绘制没有小程序码的卡片 + Toast 提示
- Canvas 2D API 不可用 → 尝试旧版 Canvas API (`Taro.createCanvasContext`)，若也不可用则展示"不支持分享卡片"降级文案

**内部状态**：

| 状态 | 条件 | UI |
|------|------|-----|
| loading | cardData 已获取, Canvas 绘制中 | "正在生成分享卡片..." + 卡片区域灰色骨架 |
| error | 绘制过程中异常 (封面下载失败、Canvas 不支持) | "生成失败" + "重新生成"按钮 + "返回详情" |
| success | Canvas 绘制完成, tempFilePath 可用 | 完整分享卡片 + "保存图片"/"转发给好友"按钮可用 |

---

#### PartAreaTag

```
PartAreaTag/
├── index.tsx
└── index.less
```

**职责**：在部件选择器列表中，每个部件名称右侧展示面积标签。轻量级纯展示组件。

**Props**：

```typescript
interface PartAreaTagProps {
  /** 部件面积 (平方米) */
  areaM2: number;
  /** 是否高亮 (当前选中部件) */
  active?: boolean;
}
```

**渲染**：`<View className="part-area-tag">{areaM2} m²</View>`，圆角标签底色 #F5F5F5，active 态底色 #1677FF10 + 文字色 #1677FF。

---

#### SmsCodeInput

```
SmsCodeInput/
├── index.tsx
└── index.less
```

**职责**：可复用的短信验证码输入组件，支持发送验证码按钮 + 倒计时 + 6 位验证码输入 + 验证错误提示。复用于登录页（验证码登录）、预约页（SMS 校验）。

**Props**：

```typescript
interface SmsCodeInputProps {
  /** 手机号 (用于发送验证码) */
  phone: string;
  /** 验证码类型 */
  codeType: 'login' | 'appointment_verify';
  /** 倒计时剩余秒数 */
  countdown: number;
  /** 发送中 */
  sending: boolean;
  /** 验证中 */
  verifying?: boolean;
  /** 验证码值 (受控) */
  code: string;
  /** 验证码变更回调 */
  onCodeChange: (code: string) => void;
  /** 发送验证码回调 */
  onSendCode: () => void;
  /** 验证错误信息 (null 表示无错误) */
  errorMessage?: string | null;
  /** 验证通过 (展示绿色 checkmark) */
  verified?: boolean;
}
```

**内部状态**：

| 状态 | 条件 | UI |
|------|------|-----|
| idle | countdown === 0 && !sending | "获取验证码"按钮 (蓝色, 可点击) |
| sending | sending === true | 按钮文字变为 loading spinner |
| counting | countdown > 0 | 按钮置灰 + "Ns 后重新获取" |
| inputting | code.length < 6 | 登录按钮 disabled |
| verifying | verifying === true | 登录按钮 loading 态 |
| error | errorMessage !== null | 验证码输入框下方红色提示 |
| verified | verified === true | 绿色 ✓ "验证通过" + 输入框禁用 |

**verified 与 error 的互斥关系**：当 `verified === true` 时 `errorMessage` 必须为 `null`（验证通过后清除之前的错误提示）；当 `errorMessage !== null` 时 `verified` 必须为 `false`（新错误会重置验证通过状态）。两种状态不会同时展示，`verified` 优先级高于 `error`。

**错误码映射**：

```typescript
// src/utils/constants.ts (Phase 4 扩展)
export const SMS_ERROR_MAP: Record<number, string> = {
  1012: '验证码错误，请重新输入',
  1014: '验证码已过期，请重新获取',
  1015: '验证码已使用，请重新获取',
  1020: '发送过于频繁，请稍后再试',
  1021: '今日发送次数已达上限',
};
```

---

#### CustomerCareBanner

```
CustomerCareBanner/
├── index.tsx
└── index.less
```

**职责**：在个人中心页面顶部展示客户关怀提醒横幅，可折叠。仅当有待关怀事项时显示。

**Props**：

```typescript
interface CustomerCareBannerProps {
  /** 当月生日客户数 */
  birthdayCount: number;
  /** 未来 N 天纪念日客户数 */
  anniversaryCount: number;
  /** 是否展开详情 */
  expanded?: boolean;
  /** 点击查看详情回调 */
  onViewDetail?: () => void;
  /** 折叠/展开回调 */
  onToggleExpand?: () => void;
}
```

**渲染规则**：
- `birthdayCount === 0 && anniversaryCount === 0` → 组件不渲染
- 仅展示概要: "您有 N 位客户本月生日" (蛋糕图标)
- 展开后展示: "生日: 张三(7月25日), 李四(7月28日) | 纪念日: 王五(到店一周年 7月20日)"

---

#### QueueProgress

```
QueueProgress/
├── index.tsx
└── index.less
```

**职责**：AI 生图队列进度的可视化组件。根据队列状态展示不同的进度条样式和文案。复用于 AI 生图页、列表轮询展示。

**Props**：

```typescript
interface QueueProgressProps {
  /** 队列状态 */
  status: 'idle' | 'queued' | 'processing' | 'completed' | 'failed';
  /** 队列位置 (仅 queued 态有意义) */
  queuePosition?: number;
  /** 处理进度 (processing 态: 0-100, completed 态: 100) */
  progress?: number;
  /** 预估等待时间 (秒, 仅 queued 态) */
  estimatedWaitSeconds?: number;
  /** 失败原因 (仅 failed 态) */
  errorMessage?: string;
  /** 队列是否已满 */
  isQueueFull?: boolean;
  /** 重新提交回调 */
  onRetry?: () => void;
  /** 返回回调 */
  onBack?: () => void;
}
```

**各状态渲染**：

| 状态 | UI |
|------|-----|
| idle | 无渲染 (初始状态) |
| queued | 橙色进度条 (25%) + "排队中，前方还有 N 个任务" + "预计等待 M 分钟" |
| processing | 蓝色 pulsating 进度条 (50-90%) + "AI 正在为您生成..." |
| completed | 绿色进度条 (100%) + 结果图 (瞬态后消失, 页面切换到成功视图) |
| failed | 红色 + 失败原因 + "重新提交"按钮 (队列满时启用) + "返回" |
| queue-full | Toast "当前排队人数过多，请稍后再试" + 重新启用提交按钮 |

**条件渲染约定**：`QueueProgress` 组件自身不判断是否渲染 — 由父组件（如 `pages/ai/generate/index`）根据 `AiQueueStore.queueStatus` 决定是否挂载 `QueueProgress`。当 `status === 'idle'` 或 `status === 'completed'`（瞬态后已切换到结果视图）时，**父组件负责卸载**该组件，而非在组件内部返回 `null`。这样做是为了确保轮询的生命周期管理（`startPolling` / 停止）完全由父组件控制。

**轮询策略**：
- queued 态：每 5s 轮询 `GET /api/v1/generations/:id/queue-status`
- processing 态：每 3s 轮询
- completed / failed 态：停止轮询
- 页面切后台 (`useDidHide`)：暂停轮询，切回前台 (`useDidShow`)：立即查询一次 + 恢复轮询

---

#### ArFallback

```
ArFallback/
├── index.tsx
└── index.less
```

**职责**：设备不支持 AR 时的降级页面。提供替代入口：查看 3D 模型 / 查看案例实拍。

**Props**：

```typescript
interface ArFallbackProps {
  /** 不支持原因 */
  reason: 'unsupported_device' | 'webxr_not_available' | 'browser_version' | 'load_failed';
  /** 查看 3D 模型回调 */
  onView3D?: () => void;
  /** 查看案例回调 */
  onViewCases?: () => void;
  /** 重试回调 */
  onRetry?: () => void;
}
```

**不支持原因映射**：

```typescript
const AR_UNSUPPORTED_MESSAGES: Record<string, { title: string; description: string; showRetry: boolean }> = {
  unsupported_device: {
    title: '您的设备不支持 AR 预览',
    description: '请使用支持 ARKit/ARCore 的设备或最新版微信打开',
    showRetry: false,
  },
  webxr_not_available: {
    title: '当前环境不支持 WebXR',
    description: 'WebXR API 在当前浏览器中不可用，请更新浏览器或微信版本',
    showRetry: false,
  },
  browser_version: {
    title: '微信版本过低',
    description: 'AR 预览需要微信 8.0+ 版本，请更新后重试',
    showRetry: false,
  },
  load_failed: {
    title: 'AR 加载失败',
    description: 'AR 场景初始化失败，请检查网络连接后重试',
    showRetry: true,
  },
};
```

---

## 30. Phase 4 新增 Zustand Stores

### 30.1 CommentStore

```typescript
// src/stores/comment-store.ts
import { create } from 'zustand';

interface CommentState {
  /** 评论列表 */
  comments: CommentItem[];
  /** 分页状态 */
  page: number;
  hasMore: boolean;
  /** 加载状态 */
  loading: boolean;
  error: string | null;
  /** 提交状态 */
  submitting: boolean;
  submitError: string | null;
  /** 限频冷却剩余秒数 (0 = 无限制) */
  cooldownSeconds: number;
  /** 最后评论时间戳 (用于跨页面冷却检查) */
  lastCommentAt: number | null;
  /** 管理员审核状态 */
  adminReviewTarget: string | null;

  // Actions
  /** 获取评论列表 (分页) */
  fetchComments: (caseId: string, page?: number) => Promise<void>;
  /** 加载更多评论 */
  loadMoreComments: (caseId: string) => Promise<void>;
  /** 发表评论 (乐观插入) */
  postComment: (caseId: string, content: string, parentId?: string) => Promise<void>;
  /** 删除评论 */
  deleteComment: (caseId: string, commentId: string) => Promise<void>;
  /** 审核通过评论 (管理员) */
  approveComment: (commentId: string) => Promise<void>;
  /** 审核拒绝评论 (管理员) */
  rejectComment: (commentId: string) => Promise<void>;
  /** 重置评论状态 */
  reset: () => void;
  /** 检查并恢复冷却倒计时 */
  restoreCooldown: () => void;
}
```

**乐观插入流程**：
1. `postComment()`: 首先生成临时 ID (`temp_${Date.now()}`) → 插入 comments 列表头部 (status: 'pending')
2. 调用 `POST /api/v1/cases/:id/comments` → 成功后用后端返回的真实数据替换临时项
3. 失败后移除临时项 + 显示 Toast "评论发送失败" + 开始 30s 冷却
4. 成功后自动开始 30s 冷却，存储 `lastCommentAt` 到 `Taro.Storage`

**冷却恢复**：
- `restoreCooldown()`: 从 `Taro.Storage` 读取 `lastCommentAt` → 计算剩余冷却 → 设置 `cooldownSeconds`
- 在页面 `useDidShow` 时调用，确保切换页面后冷却时间正确

---

### 30.2 RankingStore

```typescript
// src/stores/ranking-store.ts
import { create } from 'zustand';

interface RankingState {
  /** 当前周期 */
  period: 'daily' | 'weekly' | 'monthly';
  /** 当前排序维度 */
  sortType: 'like_count' | 'view_count' | 'comment_count';
  /** 排行数据 */
  rankingList: RankingCaseItem[];
  /** 分页 */
  page: number;
  hasMore: boolean;
  /** 加载状态 */
  loading: boolean;
  error: string | null;
  /** 下拉刷新状态 */
  refreshing: boolean;

  // Actions
  /** 切换周期 (自动重置分页 + 重新加载) */
  setPeriod: (period: 'daily' | 'weekly' | 'monthly') => void;
  /** 切换排序维度 (自动重置分页 + 重新加载) */
  setSortType: (type: 'like_count' | 'view_count' | 'comment_count') => void;
  /** 获取排行数据 (首页) */
  fetchRanking: (params?: { page?: number; limit?: number }) => Promise<void>;
  /** 加载更多 */
  loadMore: () => Promise<void>;
  /** 下拉刷新 */
  refresh: () => Promise<void>;
  /** 重置 */
  reset: () => void;
}

interface RankingCaseItem {
  rank: number;
  rankChange?: number;          // 排名变化 (正数=上升, 负数=下降, 0=不变, undefined=新上榜)
  caseId: string;
  title: string;
  coverUrl: string;
  carModelName: string;
  colorSummary: string;
  likeCount: number;
  viewCount: number;
  commentCount: number;
  storeName: string;
}
```

**联动逻辑**：
- `setPeriod()` / `setSortType()` 自动重置 `page=1`, `rankingList=[]`, 并立即调用 `fetchRanking()`
- 页面层通过 `useEffect` 监听 `period` 和 `sortType` 的变化来更新 UI 选中态
- `refresh()` 使用 `refreshing` 标志控制下拉刷新 UI，重置 `page=1` 后重新请求

---

### 30.3 AiQueueStore

```typescript
// src/stores/ai-queue-store.ts
import { create } from 'zustand';

interface AiQueueState {
  /** 当前生成任务 ID */
  generationId: string | null;
  /** 队列状态 */
  queueStatus: 'idle' | 'queued' | 'processing' | 'completed' | 'failed';
  /** 队列位置 (前方任务数) */
  queuePosition: number;
  /** 处理进度 (0-100) */
  progress: number;
  /** 预估等待秒数 */
  estimatedWaitSeconds: number;
  /** 失败原因 */
  errorMessage: string | null;
  /** 队列是否已满 */
  isQueueFull: boolean;
  /** 生成结果图 URL (completed 时) */
  resultImageUrl: string | null;

  // Actions
  /** 提交 AI 生成任务 */
  submitGeneration: (params: SubmitAiParams) => Promise<string>;
  /** 开始轮询队列状态 (返回 stop 函数) */
  startPolling: (generationId: string) => () => void;
  /** 单次查询队列状态 */
  fetchQueueStatus: (generationId: string) => Promise<void>;
  /** 停止轮询 + 重置 */
  reset: () => void;
}
```

**轮询实现**：

```typescript
// AiQueueStore 内部实现
startPolling(generationId: string): () => void {
  this.setState({ generationId, queueStatus: 'queued' });

  let timerId: ReturnType<typeof setInterval> | null = null;

  const poll = async () => {
    const state = get();
    if (state.queueStatus === 'completed' || state.queueStatus === 'failed') {
      if (timerId) { clearInterval(timerId); timerId = null; }
      return;
    }
    try {
      await state.fetchQueueStatus(generationId);
      // 根据新状态调整轮询间隔
      const newState = get();
      if (newState.queueStatus === 'processing' && timerId) {
        clearInterval(timerId);
        timerId = setInterval(poll, 3000);  // processing 态加速到 3s
      }
    } catch {
      // 轮询失败不中断，继续下一次
    }
  };

  timerId = setInterval(poll, 5000);  // 初始 5s

  // 返回停止函数
  return () => {
    if (timerId) { clearInterval(timerId); timerId = null; }
  };
}
```

**生命周期绑定**：
- 页面 `useDidShow` → 恢复轮询 (检查 `generationId` 是否存在且未完成)
- 页面 `useDidHide` → 暂停轮询
- 页面 `useUnload` → 停止轮询 + reset

---

### 30.4 CustomerCareStore

```typescript
// src/stores/customer-care-store.ts
import { create } from 'zustand';

interface CustomerCareState {
  /** 生日提醒列表 */
  birthdays: CareCustomer[];
  /** 纪念日提醒列表 */
  anniversaries: CareCustomer[];
  /** 加载状态 */
  loading: boolean;
  error: string | null;
  /** 未来 N 天范围 */
  lookaheadDays: number;

  // Actions
  /** 获取客户关怀提醒 */
  fetchCareReminders: (days?: number) => Promise<void>;
  /** 重置 */
  reset: () => void;
}

interface CareCustomer {
  customerId: string;
  name: string;
  phone: string;
  /** 事件日期 (YYYY-MM-DD) */
  eventDate: string;
  /** 距离今天的天数 */
  daysUntil: number;
  /** 事件类型 */
  eventType: 'birthday' | 'anniversary';
  /** 纪念日标签 (仅 anniversary) */
  anniversaryLabel?: string;
}
```

**个人中心 banner 计算**：
- 页面层通过 `useEffect` 在 `profile/index` 挂载时调用 `fetchCareReminders(30)` (当月)
- `birthdays.filter(c => c.daysUntil <= 30).length` → birthdayCount
- 当 `birthdayCount > 0` 时展示 CustomerCareBanner

---

## 31. Phase 4 新增 API 服务层

### 31.1 comment.service.ts

```typescript
// src/services/comment.service.ts
import { request, getPaginated, PaginatedData } from './request';

export const commentService = {
  /** 获取案例评论列表 (分页) */
  getComments: (caseId: string, params?: { page?: number; size?: number }) =>
    getPaginated<CommentItem>(`/cases/${caseId}/comments`, { ...params, size: params?.size || 20 }),

  /** 发表评论/回复 */
  postComment: (caseId: string, data: { content: string; parent_id?: string }) =>
    request<CommentItem>({ url: `/cases/${caseId}/comments`, method: 'POST', data }),

  /** 删除评论 (管理员或作者) */
  deleteComment: (caseId: string, commentId: string) =>
    request<void>({ url: `/cases/${caseId}/comments/${commentId}`, method: 'DELETE' }),

  /** 审核通过 (管理员, 无需 caseId — 由后端根据 commentId 查出) */
  approveComment: (commentId: string, action: 'approve') =>
    request<void>({ url: `/admin/comments/${commentId}/approve`, method: 'POST', data: { action } }),

  /** 审核拒绝 (管理员) */
  rejectComment: (commentId: string, action: 'reject') =>
    request<void>({ url: `/admin/comments/${commentId}/approve`, method: 'POST', data: { action } }),

  /** 获取待审核评论列表 (管理员) */
  getPendingComments: (params?: { page?: number; size?: number }) =>
    getPaginated<CommentItem>('/admin/comments/pending', { ...params, size: params?.size || 20 }),
};
```

### 31.2 ranking.service.ts

```typescript
// src/services/ranking.service.ts
import { request, getPaginated } from './request';

export const rankingService = {
  /** 获取案例排行榜 */
  getRanking: (params: {
    type: 'like_count' | 'view_count' | 'comment_count';
    period: 'daily' | 'weekly' | 'monthly';
    limit?: number;
    page?: number;
    size?: number;
  }) => getPaginated<RankingCaseItem>('/cases/ranking', { ...params, size: params.size || 20 }),
};
```

### 31.3 sms.service.ts

```typescript
// src/services/sms.service.ts
import { request } from './request';

export const smsService = {
  /** 发送短信验证码 */
  sendCode: (params: { phone: string; type: 'login' | 'appointment_verify' }) =>
    request<void>({ url: '/auth/sms/send', method: 'POST', data: params }),

  /** 验证码登录 */
  smsLogin: (params: { phone: string; sms_code: string }) =>
    request<{ access_token: string; refresh_token: string; staff: StaffInfo; need_set_password?: boolean }>({
      url: '/auth/sms-login',
      method: 'POST',
      data: params,
    }),

  /** 校验验证码 (预约场景) */
  verifyCode: (params: { phone: string; sms_code: string; type: string }) =>
    request<{ verified: boolean }>({
      url: '/auth/sms/verify',
      method: 'POST',
      data: params,
    }),
};
```

### 31.4 customer-care.service.ts

```typescript
// src/services/customer-care.service.ts (仅管理员/销售人员可调用 — 普通店员 403 时静默隐藏)
import { request } from './request';

export const customerCareService = {
  /** 获取客户关怀提醒 (需 sales/manager 角色) */
  getCareReminders: (params?: { days?: number }) =>
    request<{ birthdays: CareCustomer[]; anniversaries: CareCustomer[] }>({
      url: `/admin/dashboard/customer-care?days=${params?.days || 30}`,
      method: 'GET',
    }),
};
```

### 31.4.1 share-card.service.ts

```typescript
// src/services/share-card.service.ts
import { request } from './request';

export interface ShareCardData {
  /** 案例封面图 URL */
  coverUrl: string;
  /** 案例标题 (最多 2 行) */
  title: string;
  /** 车型颜色摘要 */
  subtitle: string;
  /** 门店 Logo URL */
  storeLogoUrl?: string;
  /** 门店名称 */
  storeName: string;
  /** 小程序码图片 URL */
  qrCodeUrl: string;
}

export const shareCardService = {
  /** 获取分享卡片数据 */
  getShareCardData: (caseId: string) =>
    request<ShareCardData>({
      url: `/cases/${caseId}/share-card`,
      method: 'GET',
    }),
};
```

### 31.4.2 ar.service.ts

```typescript
// src/services/ar.service.ts
import { request } from './request';

export interface ArTextureConfig {
  /** 默认颜色 HEX */
  defaultHex: string;
  /** AR 模型 URL (glTF/USDZ) */
  arModelUrl: string;
  /** 材质映射: 部件代码 → 可替换颜色列表 */
  materialMap?: Record<string, { hexList: string[]; materialId: string }>;
}

export const arService = {
  /** 获取 AR 纹理/模型配置 */
  getArTexture: (configId: string) =>
    request<ArTextureConfig>({
      url: `/configurations/${configId}/ar-texture`,
      method: 'GET',
    }),
};
```

### 31.5 已有 Service 扩展

#### auth.service.ts [MODIFIED]

```typescript
// 新增方法
export const authService = {
  // ... (Phase 1 login/refresh 方法不变)
  /** 短信验证码登录 */
  smsLogin: (phone: string, smsCode: string) => smsService.smsLogin({ phone, sms_code: smsCode }),
};
```

#### ai.service.ts [MODIFIED]

```typescript
// 新增方法
export const aiService = {
  // ... (Phase 2 方法不变)
  /** 提交生成任务 (队列模式) */
  submitGeneration: (params: SubmitAiParams) =>
    request<{ generation_id: string }>({ url: '/generations', method: 'POST', data: params }),

  /** 查询队列状态 */
  getQueueStatus: (generationId: string) =>
    request<{
      status: 'queued' | 'processing' | 'completed' | 'failed';
      queue_position: number;
      progress: number;
      estimated_wait_seconds: number;
      error_message?: string;
      result_image_url?: string;
    }>({ url: `/generations/${generationId}/queue-status`, method: 'GET' }),
};
```

#### config.service.ts [MODIFIED]

```typescript
// getParts 返回类型扩展 area_m2 字段
export const configService = {
  /** 获取车型部件列表 (Phase 4: 返回 area_m2 字段) */
  getParts: (modelId: string) =>
    request<Array<{ part_code: string; part_name: string; area_m2: number; default_color_swatch_id?: string }>>({
      url: `/vehicles/models/${modelId}/parts`,
      method: 'GET',
    }),
};
```

#### appointment.service.ts [MODIFIED]

```typescript
// 新增方法
export const appointmentService = {
  // ... (Phase 3 方法不变)
  /** 发送预约验证码 */
  sendVerifySms: (phone: string) =>
    smsService.sendCode({ phone, type: 'appointment_verify' }),

  /** 校验预约验证码 */
  verifySmsCode: (phone: string, code: string) =>
    smsService.verifyCode({ phone, sms_code: code, type: 'appointment_verify' }),
};
```

---

## 32. Phase 4 WebView AR H5 页面架构

### 32.1 AR 渲染 H5 结构

```
webview/ar-renderer/
├── index.html                   # H5 入口 (全屏 Canvas + AR Session)
├── main.ts                      # WebXR 场景初始化
│   ├── 请求 WebXR Session (immersive-ar / inline)
│   ├── 创建 XRSpace + XRReferenceSpace
│   ├── 初始化 Three.js WebGLRenderer (绑定 XRWebGLLayer)
│   └── 设置灯光 (环境光 + 方向光模拟真实光照)
├── model-loader.ts              # AR 模型加载
│   ├── 下载 AR 模型 (glTF/USDZ)
│   ├── 解析材质名称 (用于颜色替换)
│   └── 将模型添加到 XR Space
├── color-overlay.ts             # 车色叠加
│   ├── 根据配置的 HEX 设置 mesh.material.color
│   ├── 材质参数设置 (roughness / metalness)
│   └── 半透明叠加模式 (opacity 0.85 保持车身线条可见)
├── bridge.ts                    # postMessage 通信封装 (复用 3D 通信模式)
│   ├── 接收: AR_UPDATE_CONFIG (颜色 + 方案)
│   ├── 接收: AR_CAPTURE (截图)
│   ├── 发送: AR_READY
│   ├── 发送: AR_MODEL_LOADING (进度)
│   ├── 发送: AR_MODEL_READY
│   ├── 发送: AR_ERROR
│   ├── 发送: AR_CAPTURE_RESULT (base64)
│   └── 发送: AR_UNSUPPORTED (设备不支持时)
├── types.ts                     # AR 消息类型定义 (与 src/types/message.d.ts 保持同步)
├── package.json                 # H5 独立依赖 (three, @types/three, @types/webxr)
└── tsconfig.json                # H5 独立 TS 配置
```

### 32.2 AR postMessage 通信协议扩展

```typescript
// src/types/message.d.ts (Phase 4 扩展)
enum WebViewMessageType {
  // ... (Phase 1/2 已有消息类型不变)

  // Taro → AR H5
  AR_UPDATE_CONFIG = 'AR_UPDATE_CONFIG',    // payload: { hex: string, materialId?: string }
  AR_CAPTURE = 'AR_CAPTURE',               // payload: {}

  // AR H5 → Taro
  AR_READY = 'AR_READY',                   // payload: { supported: boolean }
  AR_MODEL_LOADING = 'AR_MODEL_LOADING',   // payload: { progress: number }
  AR_MODEL_READY = 'AR_MODEL_READY',       // payload: {}
  AR_ERROR = 'AR_ERROR',                   // payload: { error: string; code: string }
  AR_CAPTURE_RESULT = 'AR_CAPTURE_RESULT', // payload: { image: string }
  AR_UNSUPPORTED = 'AR_UNSUPPORTED',       // payload: { reason: string }
}
```

### 32.3 AR 初始化时序

```
Taro (ArPreview)                           WebView AR H5
     │                                          │
     │  1. 加载 AR H5 页面                       │
     │─────────────────────────────────────────►│
     │                                          │ 2. 检测 WebXR 支持
     │                                          │    navigator.xr?.isSessionSupported('immersive-ar')
     │                                          │
     │                                          │ 3a. 不支持 →
     │     AR_UNSUPPORTED { reason }             │
     │◄─────────────────────────────────────────│
     │ 4a. 展示 ArFallback                      │
     │                                          │
     │                                          │ 3b. 支持 →
     │     AR_READY { supported: true }          │
     │◄─────────────────────────────────────────│
     │ 4b. 获取 AR 纹理配置                       │
     │     (GET /api/v1/configurations/:id      │
     │      /ar-texture)                         │
     │                                          │
     │ 5. AR_UPDATE_CONFIG { hex, materialId }   │
     │─────────────────────────────────────────►│
     │                                          │ 6. 启动 XR Session
     │                                          │    navigator.xr.requestSession('immersive-ar')
     │                                          │    加载 AR 模型
     │                                          │    应用颜色配置
     │     AR_MODEL_READY                        │
     │◄─────────────────────────────────────────│
     │ 7. 隐藏 Loading，展示底部控制栏            │
```

### 32.4 AR 平台兼容性

| 平台 | AR 支持情况 | 降级策略 |
|------|------------|----------|
| **微信 (iOS)** | 支持 ARKit (WebView 内 `immersive-ar` session) | 微信 8.0+ 直接使用；< 8.0 展示 `browser_version` 降级 |
| **微信 (Android)** | 支持 ARCore (WebView 内 `immersive-ar` session) | 部分低端设备无 ARCore → 展示 `unsupported_device` 降级 |
| **支付宝 (iOS/Android)** | 极有限 (不支持 WebXR，无 `immersive-ar`) | 统一展示 `webxr_not_available` 降级页 或直接隐藏 AR 入口 |
| **抖音 (iOS/Android)** | 不支持 AR (WebView 无 XR API) | 不展示"AR 预览"入口，仅展示 3D 渲染 + 案例实拍 |
| **H5 浏览器** | 部分支持 (`navigator.xr` 需 HTTPS + 用户手势) | AR H5 入口仅在小程序 WebView 中使用，普通浏览器不暴露 |

**实现约定**：
- 改色工作台的"AR 预览"按钮在抖音平台**不渲染**（平台检查通过 `Taro.getSystemInfoSync().host.appId` 或 `Taro.getEnv()` 判断）
- AR WebView H5 内预检 `navigator.xr?.isSessionSupported('immersive-ar')` → 不支持时立即发送 `AR_UNSUPPORTED` 消息
- `ArFallback` 组件的 `reason` 字段区分不同降级原因，提供差异化的替代入口

---

## 33. Phase 4 核心数据流时序图

### 33.1 验证码登录流程

```
用户 (Login Page)    AuthStore     smsService      后端 API      Taro.Storage
     │                   │              │               │              │
     │ 1. 切换"验证码登录" │              │               │              │
     │    Tab             │              │               │              │
     │───────────────────►│              │               │              │
     │                   │              │               │              │
     │ 2. 输入手机号       │              │               │              │
     │    点击"获取验证码"  │              │               │              │
     │───────────────────►│              │               │              │
     │                   │ 3. sendCode()│               │              │
     │                   │─────────────►│               │              │
     │                   │              │ POST /auth/   │              │
     │                   │              │  sms/send     │              │
     │                   │              │──────────────►│              │
     │                   │              │ 200 OK        │              │
     │                   │              │◄──────────────│              │
     │ 4. 按钮进入 60s 倒计时          │               │              │
     │◄───────────────────│              │               │              │
     │                   │              │               │              │
     │ 5. 输入 6 位验证码  │              │               │              │
     │    点击"登录"       │              │               │              │
     │───────────────────►│              │               │              │
     │                   │ 6. smsLogin()│               │              │
     │                   │─────────────►│               │              │
     │                   │              │ POST /auth/   │              │
     │                   │              │  sms-login    │              │
     │                   │              │──────────────►│              │
     │                   │              │               │ 7. 校验验证码  │
     │                   │              │ 200 { tokens, │               │
     │                   │              │   staff,      │               │
     │                   │              │   need_set_pw }│              │
     │                   │              │◄──────────────│              │
     │                   │ 8. 存储 Token│               │              │
     │                   │───────────────────────────────────────────►│
     │ 9. 跳转首页        │              │               │              │
     │◄───────────────────│              │               │              │
```

### 33.2 案例评论乐观插入流程

```
用户 (Detail Page)  CommentStore    commentService      后端 API
     │                   │              │                    │
     │ 1. 输入评论点击发送  │              │                    │
     │───────────────────►│              │                    │
     │                   │ 2. 乐观插入    │                    │
     │                   │    生成 temp_id│                    │
     │                   │    插入 comments│                   │
     │                   │    列表头部     │                    │
     │                   │              │                    │
     │ 3. UI 立即更新      │              │                    │
     │    (pending 态)    │              │                    │
     │◄───────────────────│              │                    │
     │                   │ 4. postComment()                  │
     │                   │─────────────►│                    │
     │                   │              │ POST /cases/:id/   │
     │                   │              │   comments         │
     │                   │              │───────────────────►│
     │                   │              │                    │
     │                   │              │ 5a. 成功: 200      │
     │                   │              │  { comment }       │
     │                   │              │◄───────────────────│
     │                   │ 6a. 用真实    │                    │
     │                   │     数据替换  │                    │
     │                   │     temp 项   │                    │
     │                   │ 启动 30s 冷却  │                    │
     │                   │              │                    │
     │                   │              │ 5b. 失败: 4xx/5xx  │
     │                   │              │◄───────────────────│
     │                   │ 6b. 移除 temp │                    │
     │                   │     项        │                    │
     │                   │ 启动 30s 冷却  │                    │
     │                   │              │                    │
     │ 7. Toast 反馈      │              │                    │
     │◄───────────────────│              │                    │
```

### 33.3 AI 队列轮询流程

```
用户 (AI 页)    AiQueueStore   aiService     后端 API        Timer
     │              │              │              │            │
     │ 1. 提交生成    │              │              │            │
     │──────────────►│              │              │            │
     │              │ 2. submitGen()│              │            │
     │              │─────────────►│              │            │
     │              │              │ POST         │            │
     │              │              │ /generations │            │
     │              │              │─────────────►│            │
     │              │              │ { gen_id }   │            │
     │              │◄─────────────│              │            │
     │              │              │              │            │
     │              │ 3. startPolling(gen_id)    │            │
     │              │──────────────────────────────────────►│
     │              │              │              │            │
     │              │ 4. fetchQueueStatus() (每 5s)         │
     │              │─────────────►│              │            │
     │              │              │ GET /gen/:id │            │
     │              │              │ /queue-status│            │
     │              │              │─────────────►│            │
     │              │              │ { status:    │            │
     │              │              │   'queued',  │            │
     │              │              │   position:3 }│           │
     │◄──────────────│              │              │            │
     │ "前方还有3个"  │              │              │            │
     │              │              │              │            │
     │              │ ... (持续轮询) │              │            │
     │              │              │              │            │
     │              │              │ status:      │            │
     │              │              │ 'processing' │            │
     │              │◄─────────────│ (轮询→3s)    │            │
     │◄──────────────│              │              │            │
     │ "AI正在生成"   │              │              │            │
     │              │              │              │            │
     │              │              │ status:      │            │
     │              │              │ 'completed'  │            │
     │              │◄─────────────│ (停止轮询)    │            │
     │◄──────────────│              │              │            │
     │ 展示结果图     │              │              │            │
```

---

## 34. Phase 4 状态矩阵汇总

### 34.1 所有新增/修改页面状态覆盖

| 页面/模块 | Loading | Empty | Error | Success | 特殊状态 |
|-----------|---------|-------|-------|---------|----------|
| 验证码登录 | 按钮 loading (发送中/验证中) | N/A | 验证码错误/过期 Toast | 跳转首页 | 60s 倒计时、首次登录提示 |
| 案例详情 (评论区) | 骨架屏 (5 条占位) | "暂无评论，来抢沙发" | 评论加载失败 + 重试 | 评论列表 + 输入框 | rate-limited (30s 冷却) |
| 案例排行榜 | 骨架屏 (10 条占位) | "暂无排行数据"插画 | 排行 API 失败 + 重试 | 排行列表 (前 3 徽章) | pull-to-refresh |
| 分享卡片 | Canvas 绘制 Loading | N/A | Canvas 生成失败 + 重试 | 完整卡片 + 保存/转发 | 平台降级 (支付宝/抖音) |
| 改色工作台 (面积) | N/A (嵌入已有页面) | N/A | 部件 API 失败: 面积不显示 | 面积标签 + 合计汇总 | 无部件数据时不展示面积 |
| 预约 SMS 校验 | 按钮 loading (发送/验证中) | N/A | 验证码错误/过期 Toast | 绿色 ✓ 验证通过 | 可选区域, 未填写时正常提交 |
| AI 队列进度 | QueueProgress (排队/处理动画) | N/A | 失败原因 + 重试/返回 | 100% 绿色 + 结果图 | queue-full (Toast + 重新启用提交) |
| 客户关怀 banner | N/A | N/A (无提醒时 banner 不渲染) | API 失败: banner 不渲染 | 生日/纪念日数量 + 查看详情 | 折叠/展开态 |
| AR 预览 | "正在初始化 AR..." + 引导图 | N/A | "AR 加载失败" + 重试 + 返回 | 摄像头画面 + 颜色叠加 + 控制栏 | unsupported (设备不支持降级页) |

### 34.2 组件级状态矩阵

| 组件 | Loading | Empty | Error | Success | 特殊状态 |
|------|---------|-------|-------|---------|----------|
| CommentList | 骨架屏 | "暂无评论" | 错误 + 重试 | 评论列表 | rate-limited |
| CommentInput | N/A | N/A | 提交失败 Toast | 发送成功 | 冷却倒计时 / 回复模式 |
| SmsCodeInput | sending loading | N/A | 错误码提示 | 发送成功 | 倒计时、verified ✓ |
| QueueProgress | 排队中 (25%) / 处理中 (50-90%) | N/A | 失败原因 | 完成 (100%) | queue-full |
| ShareCardCanvas | "正在生成..." + 骨架 | N/A | "生成失败" + 重试 | Canvas 卡片展示 | 平台降级 |
| ArFallback | N/A | N/A | 加载失败（showRetry） | N/A (降级组件) | unsupported (各原因) |

---

## 35. Phase 4 架构约束

1. **Tab Bar 上限已到**：Phase 3 后微信小程序 Tab Bar 已达 5 个上限。Phase 4 不新增 Tab，所有新增页面通过子路由 (`navigateTo`) 进入。若未来需要更多顶级导航入口，可采用自定义 TabBar (`tabBar.custom: true`)。

2. **评论乐观插入的临时 ID 清理**：CommentStore 在 `postComment` 中生成的临时 ID 必须满足：(a) 格式统一为 `temp_${timestamp}`，方便识别；(b) 成功/失败后必须清理临时项；(c) 页面 `useUnload` 时清理所有未完成的临时评论；临时评论不持久化到 Storage。

3. **验证码倒计时的跨页面一致性**：`useCooldown` hook 将冷却结束时间戳持久化到 `Taro.Storage`，不同页面间共享同一倒计时状态。在登录页启动的冷却，切换到其他页面再回到登录页时冷却继续计时，不会重置。

4. **AI 队列轮询的生命周期绑定**：AiQueueStore 的 `startPolling` 返回停止函数，调用方必须在页面 `useUnload` 中调用该停止函数。页面 `useDidHide` 时暂停轮询，`useDidShow` 时恢复。若组件卸载时未停止轮询，可能导致内存泄漏和无效请求。

5. **Canvas 分享卡片的微信兼容性**：优先使用 Canvas 2D API (`Taro.createCanvasContext` with `type: '2d'`)，对基础库版本 < 2.9.0 的设备降级为旧版 Canvas API。需在绘制前通过 `Taro.getSystemInfoSync().SDKVersion` 检查基础库版本并选择 API 路径。

6. **AR 预览的条件渲染**：改色工作台的"AR 预览"按钮仅在车型配置了 `ar_model_url` (非 null / 非空) 时渲染。AR 预览页初始化时必须先检查 `ar_model_url`，若为空则直接展示 ArFallback ("AR 预览暂不支持此车型")。

7. **分享卡片的小程序码安全**：小程序码 URL 由后端生成 (scene 参数已加密)，客户端不自行拼接小程序码参数。`GET /api/v1/cases/:id/share-card` 返回的 `qrCodeUrl` 直接用于 Canvas 绘制，不做二次处理。

8. **部件面积数据降级**：`GET /api/v1/vehicles/models/:id/parts` 返回的 `area_m2` 字段可能为 0。前端仅在 `area_m2 > 0` 时渲染面积标签，否则不展示。底部合计汇总仅在至少有一个部件的 `area_m2 > 0` 时渲染。

9. **预约 SMS 校验为可选操作**：预约创建 Step 3 的 SMS 验证码区域标记为"可选"，不强制校验。若用户选择不校验直接提交，预约正常创建。若用户选择校验，则必须先通过校验 (`verified === true`) 后提交按钮才可用。

10. **多平台分享卡片的降级策略**：微信使用 `Taro.shareFileMessage` (分享图片文件)，支付宝使用 `Taro.showSharePanel`，抖音使用 `Taro.shareVideoMessage` (转视频分享)。平台差异在 `platform/ShareAdapter` 层封装，分享卡片页通过适配器获取当前平台的分享能力列表。

11. **客户关怀权限控制**：客户关怀 banner 仅对具有客户管理权限的店员 (角色为 `sales` 或 `manager`) 展示。普通店员 (假设有 `viewer` 角色) 不展示此 banner。`GET /api/v1/admin/dashboard/customer-care` 接口后端做角色鉴权，前端通过 403 响应判断权限不足时静默隐藏 banner (不做错误提示)。

12. **部件面积合计的实时计算**：设计工作台底部的"合计约 X m²"为客户端实时计算 (sum of all parts' `area_m2`)，不依赖单独的 API 调用。避免每次切换部件/颜色时额外网络请求。面积数据与部件列表一起获取并缓存于 VehicleStore 或 ConfigStore。

13. **评论嵌套层级硬限制**：评论嵌套最多 2 层 (评论 → 回复 → 回复的回复)。第三层及以上不再支持嵌套，统一展示为"回复 @用户名: ..."但不展示子回复树。`CommentList` 组件通过 `depth` 参数控制，`depth >= 2` 时不展示回复入口。

---

*架构版本：v4.0 (Phase 4)*
*编写角色：Architect*
*日期：2026-07-22*
*前置依赖：Phase 3 运营模块完成并通过验收*

---

## 36. Phase 5 总体变化概览

### 36.1 核心架构变化

Phase 5 在 Phase 4 基础上向三个方向深化：**多门店运营**（门店切换/全局导航）、**数据智能**（案例推荐/标签筛选/离线模式）、**互动增强**（预约候补/评论赞/AR Quick Look/分享动画）。架构层面的关键变化：

| 维度 | Phase 4 现状 | Phase 5 变化 |
|------|-------------|-------------|
| 底部 Tab | 5 个 (首页/设计/案例/门店/我的) | 5 个 (不变, Phase 5 不新增 Tab) |
| 页面总数 | 24 个页面 | 25 个页面 (新增 1 个: store-switch; 修改 6 个) |
| Zustand Store | 14 个 | 17 个 (新增 3: Waitlist, Offline, Auth 存储切换扩展) |
| API Service | 15 个 service 文件 | 19 个 service 文件 (新增 4 个: waitlist/recommendation/tag/offline; 扩展 3 个: store/comment/case) |
| 公共组件 | 31 个 | 37 个 (新增 6 个: StoreSwitcher/RecommendationStrip/TagFilterBar/OfflineIndicator/VoteButton/ShareVideoPreview) |
| 路由页 | 24 条 | 25 条 (新增 1 条: store-switch) |
| 新增 API 端点 | — | 10 个新增 + 4 个修改 |
| WebView 层 | 3D 渲染 + AR 预览 | 3D 渲染 + AR 预览 + USDZ 原生 AR Quick Look (新增) |

### 36.2 架构分层影响

```
┌──────────────────────────────────────────────────────────────────┐
│                    Taro 小程序 (wraplab-client)                    │
│                                                                    │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────────────────┐   │
│  │  页面层     │  │  组件层      │  │  WebView 渲染层           │   │
│  │  pages/    │  │  components/ │  │  webview/3d-renderer/    │   │
│  │  25 个页面  │  │  37 个组件    │  │  webview/ar-renderer/    │   │
│  │ (新增 1)   │  │  (新增 6)    │  │  (新增 USDZ 下载)        │   │
│  └──────┬─────┘  └──────┬──────┘  └───────────┬──────────────┘   │
│         │               │                     │                   │
│  ┌──────┴───────────────┴─────────────────────┴───────────────┐  │
│  │             状态管理层 (Zustand)  ← 新增 3 个 Store          │  │
│  │  Auth(含 storeSwitch) │  Vehicle  │  Color  │  Config      │  │
│  │  Case  │  Ai  │  Store  │  Appoint  │  MatComp  │  History │  │
│  │  Favorite  │  Comment(含 vote)  │  Ranking  │  AiQueue    │  │
│  │  CustomerCare  │  Waitlist  │  Offline  (共 17 个 Store)  │  │
│  └────────────────────────────┬────────────────────────────────┘  │
│                               │                                    │
│  ┌────────────────────────────┴────────────────────────────────┐  │
│  │              API 服务层 (services/)  ← 新增 4 个 Service     │  │
│  │  request.ts  │  auth  │  vehicle  │  color  │  config       │  │
│  │  quote  │  case  │  ai  │  store  │  appoint  │  history   │  │
│  │  favorite  │  comment  │  ranking  │  sms  │  customer     │  │
│  │  share-card  │  ar  │  waitlist  │  recommendation  │  tag │  │
│  │  offline                                                   │  │
│  └────────────────────────────┬────────────────────────────────┘  │
│                               │                                    │
│  ┌────────────────────────────┴────────────────────────────────┐  │
│  │    平台适配层 (platform/) + Canvas 层 + 离线缓存层 (新增)     │  │
│  │  PlatformBridge  │  ShareAdapter  │  LRUCacheManager       │  │
│  │  CanvasShareCard  │  ShareVideoPreview                      │  │
│  └─────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬─────────────────────────────────┘
                                 │ HTTPS / REST (JSON)
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                    wraplab-server (NestJS API)                     │
│  门店切换 API  │  候补 API  │  推荐 API  │  标签 API  │  USDZ   │
│  离线清单 API  │  评论赞 API  │  分享 API (无变更)                │
└──────────────────────────────────────────────────────────────────┘
```

**分层职责（不变）**：页面层不直接调用 Taro API，组件层不持有业务状态，Store 仅存可序列化数据，Service 层纯函数无副作用。

**Phase 5 新增横切层**：
- **离线缓存层** (`utils/cache/`)：LRU 淘汰策略 + 缓存版本管理 + 脱敏工具，独立于业务 Store
- **网络状态层** (`utils/network.ts`)：`Taro.onNetworkStatusChange` 全局监听 + 事件总线分发，App 级别注册

---

## 37. Phase 5 项目结构扩展

### 37.1 新增/修改文件清单

```
wraplab-client/
├── src/
│   ├── app.tsx                                # [MODIFIED] 注册网络状态监听 + 离线清单初始化
│   ├── app.config.ts                          # [MODIFIED] 新增 store-switch 页面路由
│   │
│   ├── pages/                                 # 新增 1 个页面 + 修改 6 个页面
│   │   ├── profile/
│   │   │   ├── index/
│   │   │   │   ├── index.tsx                  # [MODIFIED] 新增当前门店展示行 + 切换入口 + "我的候补"入口
│   │   │   │   └── index.less                # [MODIFIED]
│   │   │   └── store-switch/
│   │   │       └── index/
│   │   │           ├── index.tsx              # [NEW] 门店切换选择页
│   │   │           ├── index.config.ts        # navigationBarTitleText: "切换门店"
│   │   │           └── index.less
│   │   ├── appointment/
│   │   │   └── create/
│   │   │       └── index/
│   │   │           ├── index.tsx              # [MODIFIED] 时段满员时展示候补入口 UI
│   │   │           └── index.less             # [MODIFIED]
│   │   ├── cases/
│   │   │   ├── index/
│   │   │   │   ├── index.tsx                  # [MODIFIED] 新增标签筛选栏 TagFilterBar
│   │   │   │   └── index.less                # [MODIFIED]
│   │   │   ├── detail/
│   │   │   │   └── index/
│   │   │   │       ├── index.tsx              # [MODIFIED] 新增推荐区域 RecommendationStrip + 评论区赞按钮
│   │   │   │       └── index.less            # [MODIFIED]
│   │   │   └── share-card/
│   │   │       └── index/
│   │   │           ├── index.tsx              # [MODIFIED] 新增视频预览模式切换 + Canvas 帧动画
│   │   │           └── index.less            # [MODIFIED]
│   │   └── design/
│   │       └── index/
│   │           └── index.tsx                  # [MODIFIED] AR 预览按钮增强: USDZ 检测 + 平台判断
│   │
│   ├── components/                            # 新增 6 个公共组件
│   │   ├── StoreSwitcher/
│   │   │   ├── index.tsx                      # [NEW] 门店切换底部弹出选择器
│   │   │   └── index.less
│   │   ├── RecommendationStrip/
│   │   │   ├── index.tsx                      # [NEW] "你可能也喜欢"横向滚动推荐条
│   │   │   └── index.less
│   │   ├── TagFilterBar/
│   │   │   ├── index.tsx                      # [NEW] 标签筛选栏 (横向滚动胶囊)
│   │   │   └── index.less
│   │   ├── OfflineIndicator/
│   │   │   ├── index.tsx                      # [NEW] 离线指示条 (全局置顶)
│   │   │   └── index.less
│   │   ├── VoteButton/
│   │   │   ├── index.tsx                      # [NEW] 评论赞按钮 (toggle + 弹跳动效)
│   │   │   └── index.less
│   │   └── ShareVideoPreview/
│   │       ├── index.tsx                      # [NEW] Canvas 帧动画视频式预览
│   │       └── index.less
│   │
│   ├── stores/                                # 新增 2 个 Zustand Store
│   │   ├── waitlist-store.ts                  # [NEW] 预约候补状态管理
│   │   └── offline-store.ts                   # [NEW] 离线模式状态管理
│   │
│   ├── services/                              # 新增 4 个 API Service + 扩展 3 个
│   │   ├── waitlist.service.ts                # [NEW] 候补 API
│   │   ├── recommendation.service.ts          # [NEW] 案例推荐 API
│   │   ├── tag.service.ts                     # [NEW] 标签 API
│   │   ├── offline.service.ts                 # [NEW] 离线清单 API
│   │   ├── store.service.ts                   # [MODIFIED] 新增 getMyStores() + switchStore()
│   │   ├── comment.service.ts                 # [MODIFIED] 新增 voteComment()
│   │   └── case.service.ts                    # [MODIFIED] getCases() 扩展 tags 参数
│   │
│   ├── types/                                 # 新增/修改类型定义
│   │   ├── store.d.ts                         # [MODIFIED] 新增 StoreInfo, StoreSwitchParams
│   │   ├── waitlist.d.ts                      # [NEW] WaitlistEntry, WaitlistStatus
│   │   ├── recommendation.d.ts                # [NEW] RecommendCase, RecommendCardData
│   │   ├── tag.d.ts                           # [NEW] Tag, TagGroup
│   │   ├── offline.d.ts                       # [NEW] OfflineManifest, CacheEntry, LRUNode
│   │   └── comment.d.ts                       # [MODIFIED] CommentItem 扩展 vote_count, is_voted 字段
│   │
│   ├── utils/
│   │   ├── constants.ts                       # [MODIFIED] 新增 Phase 5 错误码 + 离线配置常量
│   │   ├── network.ts                         # [NEW] 网络状态监听 + 事件总线
│   │   └── cache/
│   │       ├── lru-cache.ts                   # [NEW] LRU 淘汰算法实现
│   │       ├── cache-manager.ts               # [NEW] 离线缓存管理器 (manifest 同步 + 读写)
│   │       └── data-mask.ts                   # [NEW] 敏感数据脱敏工具
│   │
│   └── webview/
│       └── ar-renderer/
│           └── usdz-handler.ts                # [NEW] USDZ 文件下载 + AR Quick Look 调起封装
```

### 37.2 与 Phase 1/2/3/4 文件的交叉影响

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/app.tsx` | 修改 | 注册 `Taro.onNetworkStatusChange` 全局监听 + 启动时加载离线 manifest |
| `src/app.config.ts` | 修改 | 新增 `pages/profile/store-switch/index` 路由 |
| `src/pages/profile/index/index.tsx` | 修改 | 新增门店展示行 + "切换门店"入口 + "我的候补"入口 |
| `src/pages/appointment/create/index/index.tsx` | 修改 | 时段满员时展示候补入口 UI (条件渲染) |
| `src/pages/cases/index/index.tsx` | 修改 | 新增 TagFilterBar 标签筛选栏 |
| `src/pages/cases/detail/index/index.tsx` | 修改 | 新增 RecommendationStrip 推荐区 + 评论区 VoteButton |
| `src/pages/cases/share-card/index/index.tsx` | 修改 | 新增"视频预览"模式 Tab + ShareVideoPreview 集成 |
| `src/pages/design/index/index.tsx` | 修改 | AR 预览按钮 USDZ 检测逻辑 + 平台判断 |
| `src/components/custom-tab-bar/index.tsx` | 修改 | 新增门店名称指示器 (多门店店员可见) |
| `src/stores/auth-store.ts` | 修改 | 新增 `activeStoreId`, `storeList`, `switchStore` 字段/action |
| `src/stores/comment-store.ts` | 修改 | 新增 `toggleVote` action |
| `src/services/store.service.ts` | 修改 | 新增 `getMyStores()`, `switchStore()` |
| `src/services/comment.service.ts` | 修改 | 新增 `voteComment()` |
| `src/services/case.service.ts` | 修改 | `getCases()` 扩展 `tags` 参数 |
| `src/services/offline.service.ts` | 新增 | 离线清单 API (getManifest) |
| `src/utils/constants.ts` | 修改 | 新增 Phase 5 错误码 (4032/4033/4035 等) + 离线配置常量 |

---

## 38. Phase 5 路由设计

### 38.1 app.config.ts 页面注册 (Phase 5 完整版)

Note: Phase 5 does not add new Tab pages (5 Tab limit reached in Phase 3).

```typescript
// src/app.config.ts (Phase 5 完整版本)
export default defineAppConfig({
  pages: [
    // 5 个 Tab 页 — 必须在 pages 数组前 5 位
    'pages/home/index',
    'pages/design/index',
    'pages/cases/index',
    'pages/store/index',
    'pages/profile/index',

    // 非 Tab 子页面
    'pages/auth/login',
    'pages/home/car-select',
    'pages/design/quote',
    'pages/design/material-compare/index',
    'pages/design/ar-preview/index',
    'pages/cases/detail/index',
    'pages/cases/ranking/index',
    'pages/cases/share-card/index',
    'pages/store/detail/index',
    'pages/appointment/create/index',
    'pages/appointment/confirm/index',
    'pages/appointment/list/index',
    'pages/profile/favorites/index',
    'pages/profile/history/configs/index',
    'pages/profile/history/quotes/index',
    'pages/profile/service-record/index',
    'pages/profile/store-switch/index',         // [NEW] 门店切换
    'pages/ai/generate/index',
    'pages/campaign/list/index',
    'pages/campaign/detail/index',
  ],

  // tabBar 配置不变 (5 Tab, Phase 3 已达上限)
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#FFFFFF',
    navigationBarTitleText: 'WrapLab',
    navigationBarTextStyle: 'black',
  },
});
```

### 38.2 Phase 5 新增/修改路由参数传递约定

| 源页面 | 目标页面 | 跳转方式 | 传递参数 | 说明 |
|--------|----------|----------|----------|------|
| `profile/index` | `profile/store-switch/index` | `navigateTo` | 无 | 门店切换页, 数据来自 Store |
| `profile/index` | `cases/detail/index` | `navigateTo` | `?caseId=` | 候补提升通知点击后 navigateTo 预约详情页，预约详情页内含关联案例入口（已有功能） |
| `profiles/store-switch/index` → 返回 | `profile/index` | `navigateBack` | — | 切换完成后返回我的页刷新 |

### 38.3 Phase 5 新增跳转工具函数

```typescript
// src/utils/navigate.ts (Phase 5 扩展)

/** 跳转门店切换页 */
export function navigateToStoreSwitch() {
  Taro.navigateTo({ url: '/pages/profile/store-switch/index' });
}
```

---

## 39. Store Switcher -- 门店切换 (Section 36)

### 39.1 文件结构

```
[NEW]     src/pages/profile/store-switch/index/
          ├── index.tsx          # 门店切换选择页
          ├── index.config.ts    # navigationBarTitleText: "切换门店"
          └── index.less

[NEW]     src/components/StoreSwitcher/
          ├── index.tsx          # 底部弹出门店选择器 (可复用于导航栏)
          └── index.less

[MODIFIED] src/stores/auth-store.ts         # 扩展 activeStoreId, storeList, switchStore
[MODIFIED] src/services/store.service.ts    # 扩展 getMyStores(), switchStore()
[MODIFIED] src/pages/profile/index/index.tsx # 新增门店展示行 + 切换入口
[MODIFIED] src/components/custom-tab-bar/   # 新增门店名称指示器 (多门店可见)
[MODIFIED] src/types/store.d.ts             # 新增 StoreInfo, SwitchStoreResponse
```

### 39.2 组件树

```
App (src/app.tsx)
│
├── custom-tab-bar  [MODIFIED]
│   └── View (门店名称指示器)                              # [NEW] 仅多门店店员可见
│       ├── Text (门店名称, 最多 8 字省略)
│       └── Image (下拉箭头图标)
│
└── pages/profile/index  [MODIFIED]
    └── View (个人信息区)  [MODIFIED]
        ├── View (店员头像 + 姓名 + 角色)
        ├── View (当前门店展示行)                           # [NEW]
        │   ├── Image (门店图标)
        │   ├── Text (门店名称)
        │   └── Text (右箭头 ">")
        │       → navigateToStoreSwitch()
        └── ... (功能入口列表, 新增"我的候补")

    pages/profile/store-switch/index  [NEW]
    ├── LoadingSkeleton (3 条门店骨架占位: 图标 + 名称行 + 地址行)   ← loading 状态
    ├── EmptyState ("暂无关联门店，请联系管理员" + 插画 + 返回按钮)   ← empty 状态
    ├── ErrorState (API 失败 + 错误提示 + 重试)                     ← error 状态
    └── View (门店列表)                                            ← success 状态
        └── ScrollView
            └── View (门店项) × N
                ├── Image (门店图标/缩略图)
                ├── View (门店信息)
                │   ├── Text (门店名称, bold)
                │   ├── Text (门店地址, 灰色截断)
                │   └── Text (角色标签: "店员"/"店长")
                ├── View (当前活跃标记, 条件渲染)
                │   └── Image (绿色勾 ✓) + Text ("当前")
                └── View (确认切换对话框, 点击非当前门店时弹出)
                    ├── Text ("确认切换到【门店名称】？")
                    ├── Text ("切换后将使用该门店的数据进行操作")
                    ├── Button ("取消")
                    └── Button ("确认切换", loading 态)
```

### 39.3 Store 设计

```typescript
// src/stores/auth-store.ts [MODIFIED] — 新增门店切换相关字段
interface AuthState {
  // ... (Phase 1/2/3/4 已有字段: token, refreshToken, staffInfo 等)

  /** 当前活跃门店 ID */
  activeStoreId: string | null;
  /** 店员关联的所有门店列表 */
  storeList: StoreInfo[];
  /** 门店列表加载状态 */
  storeListLoading: boolean;
  /** 切换门店操作中 */
  storeSwitching: boolean;

  // 新增 Actions
  /** 获取我的门店列表 */
  fetchMyStores: () => Promise<void>;
  /** 切换活跃门店 (内部处理 JWT 刷新 + 状态更新) */
  switchStore: (storeId: string) => Promise<void>;
  /** 通过新 JWT Token 更新当前状态 (switchStore 内部调用) */
  refreshTokenForStore: (storeId: string) => Promise<void>;
}

interface StoreInfo {
  storeId: string;
  name: string;
  address: string;
  role: 'sales' | 'manager' | 'viewer';
  /** 是否为当前活跃门店 */
  isActive: boolean;
  /** 门店 Logo URL */
  logoUrl?: string;
}

interface SwitchStoreResponse {
  accessToken: string;
  refreshToken: string;
  storeId: string;
  storeName: string;
}
```

**switchStore 内部流程**：
1. 调用 `POST /api/v1/stores/switch { store_id }` → 返回新 JWT
2. 保存新 JWT (access_token + refresh_token) 到 `Taro.Storage`
3. 更新 `activeStoreId` 为新的 storeId
4. 更新 `storeList` 中各项的 `isActive` 标记
5. 触发全局状态变更通知 (通过 Taro.eventCenter)
6. 首页等 Tab 页通过 `useDidShow` 监听 `activeStoreId` 变化并刷新数据

### 39.4 Service 设计

```typescript
// src/services/store.service.ts [MODIFIED]
import { request } from './request';

export const storeService = {
  // ... (Phase 3 已有方法: getStoreList, getStoreDetail)

  /** 获取店员关联的所有门店 (含角色信息) */
  getMyStores: () =>
    request<StoreInfo[]>({
      url: '/staff/me/stores',
      method: 'GET',
    }),

  /** 切换活跃门店 → 返回新 JWT + 门店信息 */
  switchStore: (storeId: string) =>
    request<SwitchStoreResponse>({
      url: '/stores/switch',
      method: 'POST',
      data: { store_id: storeId },
    }),
};
```

### 39.5 数据流时序图

```
用户 (我的页)    ProfilePage    AuthStore    storeService    后端 API    custom-tab-bar
     │               │              │              │             │              │
     │ 1. 点击"切换门店"│              │              │             │              │
     │──────────────►│              │              │             │              │
     │               │ 2. navigateTo│              │             │              │
     │               │   store-switch              │             │              │
     │               │──────────────│              │             │              │
     │               │              │ 3. fetchMyStores()        │             │
     │               │              │─────────────►│             │              │
     │               │              │              │ GET /staff/ │             │
     │               │              │              │  me/stores  │              │
     │               │              │              │────────────►│              │
     │               │              │              │ 200 [{...}] │              │
     │               │              │◄─────────────│◄────────────│              │
     │ 4. 门店列表展示  │              │              │             │              │
     │◄──────────────│              │              │             │              │
     │               │              │              │             │              │
     │ 5. 点击门店B    │              │              │             │              │
     │   (非当前门店)  │              │              │             │              │
     │──────────────►│              │              │             │              │
     │ 6. 确认对话框    │              │              │             │              │
     │◄──────────────│              │              │             │              │
     │ 7. 点击确认     │              │              │             │              │
     │──────────────►│              │              │             │              │
     │               │ 8. switchStore(storeB)      │             │              │
     │               │─────────────►│              │             │              │
     │               │              │ 9. switchStore(storeB)     │              │
     │               │              │─────────────►│             │              │
     │               │              │              │ POST        │              │
     │               │              │              │ /stores/    │              │
     │               │              │              │  switch     │              │
     │               │              │              │────────────►│              │
     │               │              │              │ 200 {       │              │
     │               │              │              │   tokens,   │              │
     │               │              │              │   storeId } │              │
     │               │              │◄─────────────│◄────────────│              │
     │               │              │ 10. 存储新 JWT + 更新 activeStoreId      │
     │               │◄─────────────│              │             │              │
     │ 11. Toast "已切换到门店B"     │              │             │              │
     │◄──────────────│              │              │             │              │
     │ 12. navigateBack             │              │             │              │
     │──────────────►│              │              │             │              │
     │               │              │              │             │ 13. 门店名称  │
     │               │              │              │             │     更新     │
     │               │              │─────────────────────────────────────────►│
     │               │              │              │             │              │
     │               │              │  ALT: POST /stores/switch 返回 403       │
     │               │              │◄─────────────│◄────────────│              │
     │               │ 14. Toast "无权限切换到此门店"  │             │              │
     │               │◄──────────────│              │             │              │
     │               │              │  storeSwitching 重置为 false              │
     │               │              │◄─────────────│              │              │
     │               │              │              │             │              │
     │               │              │  ALT: 网络异常 (network error)            │
     │               │              │◄─────────────│ (请求超时/断网)              │
     │               │ 15. Toast "切换失败，请重试"    │             │              │
     │               │◄──────────────│              │             │              │
     │               │              │  activeStoreId 不变, storeSwitching 重置  │
     │               │              │◄─────────────│              │              │
```

### 39.6 类型定义

```typescript
// src/types/store.d.ts [MODIFIED]
interface StoreInfo {
  storeId: string;
  name: string;
  address: string;
  role: 'sales' | 'manager' | 'viewer';
  isActive: boolean;
  logoUrl?: string;
}

interface SwitchStoreRequest {
  store_id: string;
}

interface SwitchStoreResponse {
  accessToken: string;
  refreshToken: string;
  storeId: string;
  storeName: string;
  staffInfo: StaffInfo;
}
```

### 39.7 路由变更

- `app.config.ts` 新增: `'pages/profile/store-switch/index'`

---

## 40. Appointment Waitlist -- 预约候补 (Section 37)

### 40.1 文件结构

```
[MODIFIED] src/pages/appointment/create/index/index.tsx  # 时段满员时展示候补入口 UI
[NEW]     src/stores/waitlist-store.ts                    # 候补状态管理
[NEW]     src/services/waitlist.service.ts                # 候补 API
[NEW]     src/types/waitlist.d.ts                         # WaitlistEntry, WaitlistStatus
[MODIFIED] src/pages/profile/index/index.tsx              # 新增"我的候补"入口
```

### 40.2 组件树

```
pages/appointment/create/index  [MODIFIED]
└── View (Step 2: 选择时段)  [MODIFIED]
    └── View (时段选择区)
        └── View (时段卡片) × N
            ├── Text (时段名称: "09:00-12:00")
            ├── Text (剩余名额 / "已满")
            └── View (候补入口, 条件渲染: 时段已满时展示)      # [NEW]
                ├── Image (时钟图标)
                ├── Text ("该时段已满，加入候补队列")
                ├── Text ("已有 N 人在排队")  (若候补人数 > 0)
                │
                ├── View (候补信息填写区, 点击展开)            # [NEW]
                │   ├── Input (姓名, 复用预约表单 phone)
                │   ├── Input (手机号, 复用预约表单 phone)
                │   └── Input (车辆信息, 复用预约表单 vehicle)
                │
                ├── View (候补提交 loading)                   ← submitting 状态
                │   └── Button (loading spinner + "提交中...")
                │
                ├── View (候补成功卡片, 绿色)                   ← success 状态
                │   ├── Image (绿色勾 ✓)
                │   ├── Text ("候补成功！当前排队第 N 位")
                │   ├── Text ("前方还有 X 人，预计 1-2 天内可排到")
                │   ├── Button ("查看我的候补") → profile/index
                │   └── Button ("返回首页") → switchTab
                │
                └── View (候补失败提示)                        ← error 状态
                    ├── Text (错误信息: 重复候补 / 队列已满 / 网络异常)
                    └── Button ("重试")
```

### 40.3 Store 设计

```typescript
// src/stores/waitlist-store.ts
import { create } from 'zustand';

interface WaitlistState {
  /** 候补列表 (用于"我的候补"页面) */
  waitlist: WaitlistEntry[];
  /** 候补提交状态 */
  submitting: boolean;
  submitError: string | null;
  /** 当前时段候补状态 (创建预约页使用) */
  currentSlotStatus: WaitlistSlotStatus | null;
  /** 加载状态 */
  loading: boolean;
  error: string | null;
  /** 下拉刷新状态 */
  refreshing: boolean;

  // Actions
  /** 加入候补队列 */
  joinWaitlist: (params: JoinWaitlistParams) => Promise<WaitlistJoinResult>;
  /** 获取我的候补列表 */
  fetchMyWaitlist: () => Promise<void>;
  /** 取消候补 */
  leaveWaitlist: (waitlistId: string) => Promise<void>;
  /** 查询某时段候补状态 (人数、用户是否已在队列) */
  fetchSlotStatus: (date: string, timeSlotId: string) => Promise<void>;
  /** 下拉刷新 */
  refresh: () => Promise<void>;
  /** 重置 */
  reset: () => void;
}

interface WaitlistEntry {
  waitlistId: string;
  date: string;
  timeSlot: string;
  storeName: string;
  position: number;
  status: 'waiting' | 'promoted' | 'cancelled';
  customerName: string;
  customerPhone: string;
  vehicleInfo: string;
  createdAt: string;
  promotedAt?: string;
  appointmentId?: string;       // 已提升为正式预约时的 appointment ID
}

interface WaitlistSlotStatus {
  isFull: boolean;
  queueLength: number;
  userInQueue: boolean;
  userPosition?: number;
}

interface JoinWaitlistParams {
  date: string;
  timeSlotId: string;
  storeId: string;
  customerName: string;
  customerPhone: string;
  vehicleInfo: string;
}

interface WaitlistJoinResult {
  waitlistId: string;
  position: number;
  queueLength: number;
  estimatedDays: number;
}
```

### 40.4 Service 设计

```typescript
// src/services/waitlist.service.ts
import { request } from './request';

export const waitlistService = {
  /** 加入候补队列 */
  joinWaitlist: (data: JoinWaitlistParams) =>
    request<WaitlistJoinResult>({
      url: '/appointments/waitlist',
      method: 'POST',
      data,
    }),

  /** 查询候补状态 (按手机号, API 使用 snake_case per server convention) */
  getWaitlistStatus: (params: { customer_phone: string }) =>
    request<WaitlistEntry[]>({
      url: '/appointments/waitlist/status',
      method: 'GET',
      data: params,
    }),

  /** 取消候补 */
  cancelWaitlist: (waitlistId: string) =>
    request<void>({
      url: `/appointments/waitlist/${waitlistId}`,
      method: 'DELETE',
    }),
};
```

### 40.5 数据流时序图

```
用户 (创建预约)   CreateApptPage  WaitlistStore  waitlistService  后端 API
     │                 │              │               │              │
     │ 1. 选择已满时段   │              │               │              │
     │────────────────►│              │               │              │
     │                 │ 2. 展示候补入口│               │              │
     │◄────────────────│              │               │              │
     │                 │              │               │              │
     │ 3. 点击"加入候补"│              │               │              │
     │────────────────►│              │               │              │
     │                 │ 4. joinWaitlist(params)      │              │
     │                 │─────────────►│               │              │
     │                 │              │ 5. POST                    │              │
     │                 │              │ /api/v1/appointments/       │              │
     │                 │              │   waitlist                  │              │
     │                 │              │──────────────►│              │
     │                 │              │               │              │
     │                 │              │  6a. 200 OK    │              │
     │                 │              │  { id,        │              │
     │                 │              │   position:4, │              │
     │                 │              │   estimated:2 }│             │
     │                 │              │◄──────────────│              │
     │ 7. 展示候补成功卡片              │               │              │
     │◄────────────────│              │               │              │
     │                 │              │               │              │
     │                 │              │  6b. 409       │              │
     │                 │              │  code=4032     │              │
     │                 │              │  (重复候补)     │              │
     │                 │              │◄──────────────│              │
     │ 8. Toast "已在该时段候补队列中"   │               │              │
     │◄────────────────│              │               │              │
     │                 │              │               │              │
     │                 │              │  6c. 409       │              │
     │                 │              │  code=4033     │              │
     │                 │              │  (队列已满)     │              │
     │                 │              │◄──────────────│              │
     │ 9. Toast "候补队列已满"         │               │              │
     │◄────────────────│              │               │              │
```

### 40.5B Waitlist List View (候补列表)

FR-WAIT-04 requires a "my waitlist" entry on the profile page with per-item display. FR-WAIT-08 requires 4 UI states. This view is integrated into `pages/profile/index` below the "我的预约" entry as "我的候补".

**Component: `WaitlistCard`**

```typescript
// src/components/WaitlistCard/index.tsx  (props interface)
interface WaitlistCardProps {
  entry: WaitlistEntry;
  onPress: (waitlistId: string) => void;
  /** 是否可操作 (非 promoted/expired 时可取消候补) */
  actionable: boolean;
  onCancel?: (waitlistId: string) => void;
}
```

**4 UI States**

| 状态 | 视觉表现 |
|------|----------|
| Loading | 骨架屏: 3 条候补占位项 (每项含圆形排队序号占位 + 2 行文字线 + 时段标签占位) |
| Empty | 空插画 + "暂无候补" 文案 + "去预约" 按钮 (`navigateTo /pages/appointment/create/index`) |
| Error | 错误图标 + 错误信息 + "重试" 按钮 (触发 `fetchMyWaitlist()`) |
| Success | 候补卡片列表,每项展示: 排队序号徽章 (PositionBadge)、门店名称、日期、时段、状态标记 |

**Status Markers (per item)**

| status | 视觉标记 |
|--------|----------|
| `waiting` | 橙色圆点 + "候补中" + 排队序号 (PositionBadge) |
| `promoted` | 绿色圆点 + "已排到" + 可点击跳转预约详情 (`navigateTo /pages/appointment/list/index?id=`) |
| `expired` | 灰色圆点 + "已过期" + 不可操作 |

**Layout (ASCII diagram)**

```
┌────────────────────────────────────────────────────┐
│  Profile Page (pages/profile/index)                 │
│  ┌──────────────────────────────────────────────┐   │
│  │  我的预约                          查看全部 >│   │
│  └──────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────┐   │
│  │  我的候补                          查看全部 >│   │  ← [NEW]
│  └──────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────┐   │
│  │  ┌──┐                                        │   │
│  │  │ 3│  朝阳旗舰店  2026-07-25  09:00-12:00   │   │  ← WaitlistCard × N
│  │  └──┘  ● waiting  排队第 3 位               │   │
│  │        [取消候补]                             │   │
│  ├──────────────────────────────────────────────┤   │
│  │  ┌──┐                                        │   │
│  │  │ 1│  海淀展厅  2026-07-24  14:00-16:00    │   │
│  │  └──┘  ● promoted  已排到 → 查看预约         │   │
│  └──────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────┘
```

**Integration Note**: 候补提升通知点击后 navigateTo 预约详情页，预约详情页内含关联案例入口（已有功能）。

### 40.6 类型定义

```typescript
// src/types/waitlist.d.ts
interface WaitlistEntry {
  waitlistId: string;
  date: string;
  timeSlot: string;
  storeName: string;
  position: number;
  status: 'waiting' | 'promoted' | 'cancelled';
  customerName: string;
  customerPhone: string;
  vehicleInfo: string;
  createdAt: string;
  promotedAt?: string;
  appointmentId?: string;
}

interface JoinWaitlistParams {
  date: string;
  timeSlotId: string;
  storeId: string;
  customerName: string;
  customerPhone: string;
  vehicleInfo: string;
}

interface WaitlistJoinResult {
  waitlistId: string;
  position: number;
  queueLength: number;
  estimatedDays: number;
}
```

### 40.7 路由变更

无新增路由。候补功能通过组件化嵌入现有页面 (`appointment/create/index`)，候补列表在 "我的" 页面复用现有列表组件。

---

## 41. Case Recommendation -- 案例智能推荐 (Section 38)

### 41.1 文件结构

```
[NEW]     src/components/RecommendationStrip/
          ├── index.tsx          # "你可能也喜欢"横向滚动推荐组件
          └── index.less

[NEW]     src/services/recommendation.service.ts  # 案例推荐 API
[NEW]     src/types/recommendation.d.ts           # RecommendCase, RecommendCardData
[MODIFIED] src/pages/cases/detail/index/index.tsx # 新增推荐区域 (评论区上方)
```

### 41.2 组件树

```
pages/cases/detail/index  [MODIFIED]
└── View (案例详情, success 状态)  [MODIFIED]
    ├── ... (Phase 3/4 已有结构: 图集/信息/操作栏/评论摘要区)
    ├── RecommendationStrip (推荐区域, 评论区上方)      # [NEW]
    │   ├── View (标题行)
    │   │   └── Text ("你可能也喜欢")
    │   │
    │   ├── LoadingSkeleton (3 个方块占位 + 文字线)       ← loading 状态
    │   │
    │   ├── scroll-view (scroll-x, 横向滚动)              ← success 状态 (>=3 条)
    │   │   └── View (推荐卡片) × N
    │   │       ├── Image (封面图, 160rpx 正方形, 圆角 8rpx)
    │   │       ├── Text (标题, 最多 1 行省略)
    │   │       ├── Text (车型颜色摘要, 灰色小字, 最多 1 行)
    │   │       └── View (赞数: 爱心图标 + 数字)
    │   │           → 点击卡片 navigateTo case detail
    │   │
    │   └── View (< 3 条居中展示, 不强制横滑)              ← success 状态 (< 3 条)
    │
    │   # note: empty 状态 (0 条) → 整个区域不渲染, 无痕
    │   # note: error 状态 → 静默隐藏, 不影响页面其他功能
    │
    └── CommentList / CommentInput (Phase 4 已有评论系统)
```

### 41.3 Store 设计

推荐数据由页面级 `useState` 管理（轻量级，不创建独立 Store）。

```typescript
// pages/cases/detail/index/index.tsx — 页面级状态
const [recommendations, setRecommendations] = useState<RecommendCase[]>([]);
const [recLoading, setRecLoading] = useState<boolean>(true);
const [recError, setRecError] = useState<boolean>(false);
```

> 决策：推荐区域不使用独立 Zustand Store，原因：(a) 推荐数据仅在本页面消费，不跨页面共享；(b) 加载失败静默隐藏，无需全局错误状态；(c) 推荐区域异步加载不阻塞详情主渲染，与详情 Store 生命周期解耦。

### 41.4 Service 设计

```typescript
// src/services/recommendation.service.ts
import { request } from './request';

export const recommendationService = {
  /** 获取案例推荐列表 */
  getRecommendations: (caseId: string, params?: { limit?: number }) =>
    request<RecommendCase[]>({
      url: `/cases/${caseId}/recommendations`,
      method: 'GET',
      data: { limit: params?.limit || 6 },
    }),
};
```

### 41.5 数据流时序图

```
用户 (详情页)   DetailPage   recommendationService   后端 API
     │              │               │                   │
     │ 1. 详情页 onLoad            │                   │
     │──────────────►│              │                   │
     │              │ 2. fetchCaseDetail (主内容)       │
     │              │──────────────►│──► GET /cases/:id │
     │              │◄──────────────│─── 200 OK         │
     │ 3. 主内容渲染  │              │                   │
     │◄──────────────│              │                   │
     │              │ 4. getRecommendations(caseId)    │  (异步, 不阻塞)
     │              │──────────────►│                   │
     │              │              │ GET /cases/:id/    │
     │              │              │  recommendations   │
     │              │              │──────────────────►│
     │              │              │                    │
     │              │              │  5a. 200 OK [data] │
     │              │              │◄───────────────────│
     │ 6. 推荐区渲染  │              │                   │
     │◄──────────────│              │                   │
     │              │              │                    │
     │              │              │  5b. 200 OK []     │
     │ 7. 推荐区不渲染│              │                   │  (空数组: 区域不渲染)
     │◄──────────────│              │                   │
     │              │              │                    │
     │              │              │  5c. 4xx/5xx       │
     │ 8. 静默隐藏无提示              │                   │  (错误: 静默隐藏)
```

### 41.6 类型定义

```typescript
// src/types/recommendation.d.ts
interface RecommendCase {
  caseId: string;
  coverUrl: string;
  title: string;
  carModelName: string;
  colorSummary: string;
  likeCount: number;
}

interface RecommendationStripProps {
  /** 案例 ID (用于获取推荐) */
  caseId: string;
  /** 推荐卡片点击回调 (跳转详情) */
  onCardClick: (caseId: string) => void;
}
```

### 41.7 路由变更

无新增路由。推荐区域为页面内组件。

---

## 42. Case Tag Filter -- 案例标签筛选 (Section 39)

### 42.1 文件结构

```
[NEW]     src/components/TagFilterBar/
          ├── index.tsx          # 标签筛选栏 (横向滚动胶囊)
          └── index.less

[NEW]     src/services/tag.service.ts     # 标签 API
[NEW]     src/types/tag.d.ts              # Tag, TagGroup
[MODIFIED] src/pages/cases/index/index.tsx # 新增 TagFilterBar + tags 参数传递
[MODIFIED] src/services/case.service.ts   # getCases() 扩展 tags 参数
```

### 42.2 组件树

```
pages/cases/index  [MODIFIED]
└── View (案例列表, success 状态)  [MODIFIED]
    ├── SearchBar (Phase 2 已有搜索栏)
    │
    ├── TagFilterBar (标签筛选栏)                          # [NEW]
    │   ├── LoadingSkeleton (6-8 个胶囊占位)                ← loading 状态
    │   ├── (标签数为 0 → 整个区域不渲染, 无痕)             ← empty 状态
    │   ├── ErrorState + "重试" 按钮                       ← error 状态
    │   └── View (标签栏, success 状态)
    │       ├── scroll-view (scroll-x, 横向滚动)
    │       │   ├── Button ("全部" 重置按钮)  — 条件渲染: 选中标签数 > 0
    │       │   └── View (tag-chip 标签胶囊) × N
    │       │       ├── View (标签色圆点, 8rpx)
    │       │       ├── Text (标签名)
    │       │       └── Image (关闭图标 ×, 仅选中态)
    │       │           → 默认态: 浅灰背景 + 标签色圆点 + 标签名
    │       │           → 选中态: 标签色背景 + 白色文字 + 关闭图标
    │       │           → 点击切换选中 → 列表即时刷新
    │       └── View (右侧渐变遮罩, 提示可滑动)
    │
    └── CaseList (案例列表, Phase 2 已有)
        └── ... (受标签筛选参数影响: tags=1,2 作为 AND 条件)
```

### 42.3 Store 设计

标签数据由页面级 `useState` 管理：

```typescript
// pages/cases/index/index.tsx — 页面级状态
const [tags, setTags] = useState<Tag[]>([]);
const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
const [tagsLoading, setTagsLoading] = useState<boolean>(true);
const [tagsError, setTagsError] = useState<boolean>(false);

// selectedTagIds 变化 → 触发案例列表刷新 (AND 逻辑)
// 离开页面时 selectedTagIds 保留在页面级 state 中
// 返回时恢复 (通过 Taro.useDidShow 或页面缓存)
```

> 决策：标签不创建独立 Zustand Store。理由：(a) 标签数据在案例列表页内消费；(b) 标签选中状态通过页面级 state 保持即可满足 FR-TAG-06（返回时恢复选中状态）；(c) 标签与搜索/排序参数组合通过 URL 参数传递，避免 Store 间耦合。

### 42.4 Service 设计

```typescript
// src/services/tag.service.ts
import { request } from './request';

export const tagService = {
  /** 获取标签列表 */
  getTags: (storeId: string) =>
    request<Tag[]>({
      url: '/tags',
      method: 'GET',
      data: { store_id: storeId },
    }),
};

// src/services/case.service.ts [MODIFIED]
export const caseService = {
  // ... (Phase 2/4 已有方法不变)
  /** 获取案例列表 (Phase 5: 扩展 tags 参数) */
  getCases: (params: {
    keyword?: string;
    tags?: string;          // [NEW] 逗号分隔的 tag_ids, 如 "1,2,3"
    sortBy?: string;
    page: number;
    size: number;
  }) => getPaginated<CaseItem>('/cases', params),
};
```

### 42.5 数据流时序图

```
用户 (案例列表)  CaseListPage  tagService   caseService   后端 API
     │               │            │            │             │
     │ 1. 页面加载     │            │            │             │
     │──────────────►│            │            │             │
     │               │ 2. getTags(storeId)     │             │
     │               │───────────►│            │             │
     │               │            │ GET /tags  │             │
     │               │            │───────────────────────►│
     │               │            │ 200 [{id,name,color}]  │
     │               │◄───────────│◄───────────────────────│
     │               │            │            │             │
     │               │ 3. getCases({page:1})  │             │  (无标签筛选)
     │               │───────────────────────►│             │
     │               │            │ GET /cases│             │
     │               │            │──────────►│             │
     │ 4. 列表 + 标签栏渲染        │            │             │
     │◄──────────────│            │            │             │
     │               │            │            │             │
     │ 5. 点击标签 "哑光" (id=1)   │            │             │
     │──────────────►│            │            │             │
     │               │ 6. selectedTagIds = [1]│             │
     │               │ 7. getCases({tags:"1", page:1})     │
     │               │───────────────────────►│             │
     │               │            │ GET /cases│             │
     │               │            │ ?tags=1   │             │
     │               │            │──────────►│             │
     │ 8. 列表刷新 (仅含标签1)     │            │             │
     │◄──────────────│            │            │             │
     │               │            │            │             │
     │ 9. 再点击 "宝马" (id=4)    │            │             │
     │──────────────►│            │            │             │
     │               │ 10. selectedTagIds = [1,4]          │
     │               │ 11. getCases({tags:"1,4", page:1})  │
     │               │───────────────────────►│             │
     │               │            │ GET /cases│             │
     │               │            │ ?tags=1,4 │             │
     │               │            │──────────►│             │
     │ 12. 列表刷新 (AND: 同时含 1+4)         │             │
     │◄──────────────│            │            │             │
     │               │            │            │             │
     │ 13. 点击"全部"  │            │            │             │
     │──────────────►│            │            │             │
     │               │ 14. selectedTagIds = [] │             │
     │               │ 15. getCases({page:1}) │             │  (恢复默认)
     │ 16. 列表恢复默认 │            │            │             │
     │◄──────────────│            │            │             │
```

### 42.6 类型定义

```typescript
// src/types/tag.d.ts
interface Tag {
  id: string;
  name: string;
  color: string;       // HEX, 标签色
  /** 标签分组 (平台通用 / 门店自定义) */
  group: 'platform' | 'store';
  /** 排序权重 */
  sortOrder: number;
}

interface TagFilterBarProps {
  /** 所有可用标签 */
  tags: Tag[];
  /** 当前选中的标签 ID 列表 */
  selectedTagIds: string[];
  /** 标签选中变更回调 */
  onTagToggle: (tagId: string) => void;
  /** 重置所有标签回调 */
  onReset: () => void;
  /** 加载中 */
  loading?: boolean;
  /** 加载失败 */
  error?: boolean;
  /** 重试回调 */
  onRetry?: () => void;
}
```

### 42.7 路由变更

无新增路由。标签筛选栏为案例列表页内嵌组件。

---

## 43. Offline Mode -- 离线模式 (Section 40)

### 43.1 文件结构

```
[NEW]     src/components/OfflineIndicator/
          ├── index.tsx          # 离线指示条 (全局置顶固定)
          └── index.less

[NEW]     src/stores/offline-store.ts        # 离线模式全局状态管理
[NEW]     src/services/offline.service.ts    # 离线清单 API
[NEW]     src/utils/network.ts               # 网络状态监听 + 事件总线
[NEW]     src/utils/cache/lru-cache.ts       # LRU 淘汰算法
[NEW]     src/utils/cache/cache-manager.ts   # 离线缓存管理器
[NEW]     src/utils/cache/data-mask.ts       # 敏感数据脱敏
[NEW]     src/types/offline.d.ts             # OfflineManifest, CacheEntry, LRUNode
[MODIFIED] src/app.tsx                       # 注册 Taro.onNetworkStatusChange + 初始化离线清单
```

### 43.2 组件树

```
App (src/app.tsx)  [MODIFIED]
│
├── OfflineIndicator (全局置顶, z-index: 9999)          # [NEW]
│   ├── View (离线态: 灰色背景 + WiFi断开图标 + 文字)      ← isOffline === true
│   │   ├── Image (WiFi 断开图标)
│   │   ├── Text ("当前处于离线状态，展示缓存数据")
│   │   └── View (首次使用引导气泡: "已自动切换到离线模式...", 3s 后消失) ← 仅首次
│   │
│   ├── View (恢复态: 绿色背景 + 连接图标 + 文字)          ← recovering 瞬态
│   │   ├── Image (连接图标)
│   │   └── Text ("已恢复连接")  → 2s 后自动消失
│   │
│   └── (在线态: 不渲染)
│
├── custom-tab-bar  [MODIFIED]  (门店名称 + 离线时操作按钮禁用态)
│
└── pages/*  [所有页面受影响]
    └── 离线状态下:
        ├── 只读操作 (浏览案例/车型/颜色): 读取 Taro.Storage 缓存 → 正常渲染 + OfflineIndicator 展示
        ├── 写操作 (报价计算/AI生图/创建预约/门店切换): 按钮置灰 + Toast "当前处于离线状态"
        └── 图片: 使用本地缓存路径 (Taro.env.USER_DATA_PATH), 未缓存则默认占位图
```

### 43.3 Store 设计

```typescript
// src/stores/offline-store.ts
import { create } from 'zustand';

interface OfflineState {
  /** 当前是否离线 */
  isOffline: boolean;
  /** 网络恢复中 (绿色过渡态, 2s 自动清除) */
  isRecovering: boolean;
  /** 首次离线标识 (控制引导气泡) */
  isFirstOffline: boolean;
  /** 可缓存资源清单版本号 */
  manifestVersion: string;
  /** 缓存资源列表 (key → CacheEntry) */
  cachedResources: Record<string, CacheEntry>;
  /** 同步队列 (离线期间产生的待同步操作) */
  syncQueue: SyncOperation[];
  /** 缓存使用量 (字节) */
  cacheSizeBytes: number;
  /** 缓存总上限 (默认 10MB) */
  cacheMaxBytes: number;
  /** 图片缓存路径映射 (remoteUrl → localPath) */
  imageCacheMap: Record<string, string>;

  // Actions
  /** 设置离线状态 */
  setOffline: (offline: boolean) => void;
  /** 设置恢复中状态 (2s 后自动清除) */
  setRecovering: () => void;
  /** 清除首次离线标记 (用户已见过引导) */
  dismissFirstOfflineGuide: () => void;
  /** 加载离线缓存清单 */
  loadManifest: () => Promise<void>;
  /** 缓存资源到 Storage */
  cacheResource: (key: string, data: unknown, ttlSeconds: number) => Promise<void>;
  /** 从缓存读取资源 (过期返回 null) */
  getCachedData: <T>(key: string) => T | null;
  /** 缓存图片到本地 */
  cacheImage: (remoteUrl: string) => Promise<string | null>;
  /** 加入同步队列 */
  enqueueSync: (operation: SyncOperation) => void;
  /** 网络恢复后执行同步队列 */
  flushSyncQueue: () => Promise<void>;
  /** 执行 LRU 淘汰 */
  evictLRU: () => Promise<void>;
  /** 检查并清理过期缓存 */
  cleanExpired: () => Promise<void>;
  /** 获取缓存空间使用率 */
  getCacheUsage: () => number;  // 0-1
}

interface CacheEntry {
  key: string;
  data: unknown;
  cachedAt: number;         // Unix ms
  ttlSeconds: number;
  version: string;
  lastAccessedAt: number;   // LRU 排序依据
}

interface SyncOperation {
  id: string;
  type: 'like' | 'favorite' | 'view';
  payload: Record<string, unknown>;
  createdAt: number;
}
```

### 43.4 Service 设计

```typescript
// src/services/offline.service.ts
import { request } from './request';

export const offlineService = {
  /** 获取离线缓存清单 (全量 / 增量 since=version) */
  getManifest: (since?: string) =>
    request<OfflineManifest>({
      url: '/offline/manifest',
      method: 'GET',
      data: since ? { since } : undefined,
    }),
};

interface OfflineManifest {
  version: string;
  resources: ManifestResource[];
  updatedAt: string;
}

interface ManifestResource {
  key: string;
  url: string;
  version: string;
  ttlSeconds: number;
  /** 资源类型: 'json' | 'image' | 'config' */
  type: 'json' | 'image' | 'config';
}
```

### 43.5 离线缓存管理器

```typescript
// src/utils/cache/cache-manager.ts
import Taro from '@tarojs/taro';

class CacheManager {
  private maxBytes: number;
  private lruCache: LRUCache<string, CacheEntry>;

  constructor(maxBytes: number = 10 * 1024 * 1024) {
    this.maxBytes = maxBytes;
    this.lruCache = new LRUCache(maxBytes);
  }

  /** 初始化：加载 manifest + 清理过期缓存 */
  async initialize(): Promise<void> { /* ... */ }

  /** 缓存资源 (自动触发 LRU 淘汰) */
  async set(key: string, data: unknown, ttlSeconds: number): Promise<void> { /* ... */ }

  /** 读取缓存 (检查过期) */
  get<T>(key: string): T | null { /* ... */ }

  /** 获取当前缓存大小 */
  getCurrentSize(): number { /* ... */ }

  /** 图片下载并缓存 */
  async cacheImage(remoteUrl: string): Promise<string> { /* ... */ }
}

// src/utils/cache/lru-cache.ts
class LRUCache<K, V extends { lastAccessedAt: number }> {
  private capacity: number;
  private currentSize: number;
  private map: Map<K, V>;

  constructor(capacity: number) { /* ... */ }

  get(key: K): V | undefined { /* 更新 lastAccessedAt */ }

  put(key: K, value: V, size: number): void {
    /* 超容量时淘汰最久未访问项 */
  }

  evict(): void {
    /* 按 lastAccessedAt 排序, 淘汰最旧的 */
  }
}

// src/utils/data-mask.ts
export function maskPhone(phone: string): string {
  if (phone.length < 7) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}
```

**OfflineStore 与 CacheManager 集成**

```typescript
// OfflineStore 初始化时创建 CacheManager 实例
const cacheManager = new CacheManager(new LRUCache(50 * 1024 * 1024)); // 50MB

// Store actions 中调用 CacheManager 方法:
cacheResource: (key, data, ttlSeconds) => cacheManager.set(key, data, ttlSeconds),
getCachedData: (key) => cacheManager.get(key),
```

### 43.6 网络状态监听

```typescript
// src/utils/network.ts
import Taro from '@tarojs/taro';
import { useOfflineStore } from '../stores/offline-store';

export function registerNetworkListener(): () => void {
  const handler = (res: Taro.onNetworkStatusChange.CallbackResult) => {
    const store = useOfflineStore.getState();

    if (!res.isConnected) {
      // 断网
      store.setOffline(true);
      Taro.eventCenter.trigger('network:offline');
    } else {
      // 恢复网络
      store.setOffline(false);
      store.setRecovering();
      store.flushSyncQueue();        // 执行同步队列
      store.loadManifest();          // 增量更新清单
      Taro.eventCenter.trigger('network:online');
    }
  };

  Taro.onNetworkStatusChange(handler);

  // 立即检查当前网络状态
  Taro.getNetworkType().then((res) => {
    if (res.networkType === 'none') {
      useOfflineStore.getState().setOffline(true);
    }
  });

  return () => {
    Taro.offNetworkStatusChange(handler);
  };
}

// src/app.tsx [MODIFIED]
// componentDidMount / useEffect 中调用:
// const unregister = registerNetworkListener();
// return () => unregister();
```

### 43.7 数据流时序图

```
     用户/系统        App (app.tsx)  OfflineStore  OfflineService   Taro.Storage   后端 API
        │                 │              │              │               │             │
        │ 1. App 启动      │              │              │               │             │
        │────────────────►│              │              │               │             │
        │                 │ 2. registerNetworkListener                 │             │
        │                 │──────────────│──────────────│               │             │
        │                 │ 3. loadManifest()            │               │             │
        │                 │──────────────│──────────────►│               │             │
        │                 │              │              │ GET /offline/ │             │
        │                 │              │              │  manifest     │────────────►│
        │                 │              │              │◄──────────────│─────────────│
        │                 │ 4. 清理过期缓存 + 同步清单     │               │             │
        │                 │◄─────────────│              │               │             │
        │                 │              │              │               │             │
        │ 5. 正常浏览      │              │              │               │             │
        │    (自动缓存数据) │              │              │               │             │
        │────────────────►│              │              │               │             │
        │                 │ 6. cacheResource(caseId, data, 3600)       │             │
        │                 │──────────────────────────────────────────►│             │
        │                 │              │              │               │             │
        │ 7. 网络断开      │              │              │               │             │
        │══════════════════│              │              │               │             │
        │                 │ 8. onNetworkStatusChange({isConnected:false})            │
        │                 │──────────────►│              │               │             │
        │                 │              │ 9. setOffline(true)                       │
        │                 │◄─────────────│              │               │             │
        │                 │ 10. 渲染 OfflineIndicator                                 │
        │                 │              │              │               │             │
        │ 11. 查看案例详情 │              │              │               │             │
        │────────────────►│              │              │               │             │
        │                 │ 12. getCachedData(caseId)                  │             │
        │                 │──────────────────────────────────────────►│             │
        │                 │◄───────────── 返回缓存数据 ────────────────│             │
        │ 13. 展示缓存内容 │              │              │               │             │
        │◄────────────────│              │              │               │             │
        │                 │              │              │               │             │
        │ 14. 尝试创建预约 │              │              │               │             │
        │────────────────►│              │              │               │             │
        │ 15. 按钮置灰 + Toast "当前处于离线状态"        │               │             │
        │◄────────────────│              │              │               │             │
        │                 │              │              │               │             │
        │ 16. 网络恢复     │              │              │               │             │
        │══════════════════│              │              │               │             │
        │                 │ 17. onNetworkStatusChange({isConnected:true})             │
        │                 │──────────────►│              │               │             │
        │                 │              │ 18. setRecovering()                        │
        │                 │              │ 19. flushSyncQueue()                       │
        │                 │              │ 20. loadManifest(since)                    │
        │                 │ 21. 绿色指示条 2s 后消失                                    │
        │◄────────────────│              │              │               │             │
        │ 22. 当前页面自动刷新                                                         │
        │◄────────────────│              │              │               │             │
```

### 43.8 类型定义

```typescript
// src/types/offline.d.ts
interface OfflineManifest {
  version: string;
  resources: ManifestResource[];
  updatedAt: string;
}

interface ManifestResource {
  key: string;
  url: string;
  version: string;
  ttlSeconds: number;
  type: 'json' | 'image' | 'config';
}

interface CacheEntry {
  key: string;
  data: unknown;
  cachedAt: number;
  ttlSeconds: number;
  version: string;
  lastAccessedAt: number;
}

interface SyncOperation {
  id: string;
  type: 'like' | 'favorite' | 'view';
  payload: Record<string, unknown>;
  createdAt: number;
}

interface LRUNode {
  key: string;
  size: number;
  lastAccessedAt: number;
}

interface OfflineIndicatorProps {
  /** 是否离线 */
  isOffline: boolean;
  /** 是否恢复中 */
  isRecovering: boolean;
  /** 是否首次离线 (控制引导气泡) */
  isFirstOffline: boolean;
  /** 关闭引导气泡回调 */
  onDismissGuide: () => void;
}
```

### 43.9 路由变更

无新增路由。离线模式为全局能力，在 App 层注册。

---

## 44. Comment Vote -- 评论赞 (Section 41)

### 44.1 文件结构

```
[NEW]     src/components/VoteButton/
          ├── index.tsx          # 评论赞按钮 (toggle + 弹跳动效)
          └── index.less

[MODIFIED] src/stores/comment-store.ts      # 新增 toggleVote action
[MODIFIED] src/services/comment.service.ts  # 新增 voteComment()
[MODIFIED] src/types/comment.d.ts           # CommentItem 扩展 vote_count, is_voted
[MODIFIED] src/pages/cases/detail/index/index.tsx  # 评论区 VoteButton 集成
```

### 44.2 组件树

```
CommentList (Phase 4 已有)  [MODIFIED]
└── View (评论项) × N  [MODIFIED]
    ├── ... (Phase 4 已有: 头像/姓名/内容/时间/回复)
    ├── VoteButton (赞按钮)                                # [NEW]
    │   ├── 未赞态:
    │   │   └── View
    │   │       ├── Image (空心爱心图标, 灰色)
    │   │       └── Text (赞数, 灰色)
    │   │           0 赞 → 不显示数字
    │   │           1-999 → 实际数字
    │   │           1000+ → "1.0k"
    │   │           10000+ → "1.0w"
    │   │
    │   └── 已赞态:
    │       └── View
    │           ├── Image (实心红色爱心图标)
    │           └── Text (赞数, 红色)
    │
    │   → 点击 → toggle 本地状态 + API 调用
    │   → 弹跳动效: scale(1.0) → scale(1.3) → scale(1.0), 200ms
    │
    └── View (回复列表, 嵌套评论同样展示 VoteButton)
```

### 44.3 Store 设计

```typescript
// src/stores/comment-store.ts [MODIFIED] — 新增 toggleVote

// 已有 CommentState 接口扩展:
interface CommentState {
  // ... (Phase 4 已有字段)

  // 新增 Actions
  /** 切换评论赞 (乐观更新) */
  toggleVote: (commentId: string) => Promise<void>;
}

// toggleVote 实现:
toggleVote: async (commentId: string) => {
  // 1. 找到目标评论, 乐观更新本地状态
  const prevState = get();
  const comment = findComment(prevState.comments, commentId);
  if (!comment) return;

  const newIsVoted = !comment.isVoted;
  const newVoteCount = comment.voteCount + (newIsVoted ? 1 : -1);

  // 乐观更新
  set((state) => ({
    comments: updateCommentInTree(state.comments, commentId, {
      isVoted: newIsVoted,
      voteCount: newVoteCount,
    }),
  }));

  try {
    // 2. 调用 API
    await commentService.voteComment(commentId);
    // 成功: 无需额外操作 (乐观更新已生效)
  } catch (err) {
    // 3. 失败: 回滚
    set((state) => ({
      comments: updateCommentInTree(state.comments, commentId, {
        isVoted: !newIsVoted,
        voteCount: comment.voteCount,   // 还原原始值
      }),
    }));
    Taro.showToast({ title: '操作失败，请重试', icon: 'none' });
  }
}
```

### 44.4 Service 设计

```typescript
// src/services/comment.service.ts [MODIFIED]
export const commentService = {
  // ... (Phase 4 已有方法不变)

  /** 评论上赞/取消赞 (toggle, 无需 body) */
  voteComment: (commentId: string) =>
    request<void>({
      url: `/cases/comments/${commentId}/vote`,
      method: 'POST',
    }),
};
```

### 44.5 数据流时序图

```
用户 (评论列表)  CommentList  CommentStore  commentService  后端 API
     │               │              │              │             │
     │ 1. 点击爱心图标 │              │              │             │
     │──────────────►│              │              │             │
     │               │ 2. toggleVote(commentId)    │             │
     │               │─────────────►│              │             │
     │               │              │ 3. 乐观更新:  │             │
     │               │              │    isVoted=true             │
     │               │              │    voteCount +1             │
     │               │              │    (弹跳动效)  │             │
     │               │◄─────────────│              │             │
     │ 4. UI 立即更新  │              │              │             │
     │◄──────────────│              │              │             │
     │               │              │ 5. POST /vote│             │
     │               │              │─────────────►│             │
     │               │              │              │────────────►│
     │               │              │              │             │
     │               │              │  6a. 200 OK  │             │
     │               │              │◄─────────────│◄────────────│
     │               │              │  (无操作, 乐观更新已生效)    │
     │               │              │              │             │
     │               │              │  6b. 401 未登录│             │
     │               │              │◄─────────────│◄────────────│
     │               │              │ 7. 回滚本地状态│             │
     │               │              │    (isVoted=false,         │
     │               │              │     voteCount -1)          │
     │               │◄─────────────│              │             │
     │ 8. Toast "请先登录"              │              │             │
     │◄──────────────│              │              │             │
     │               │              │              │             │
     │               │              │  6c. 429 rate-limited       │
     │               │              │◄─────────────│◄────────────│
     │               │              │ 9. 回滚本地状态│             │
     │               │◄─────────────│              │             │
     │ 10. Toast "点赞过于频繁"          │              │             │
     │◄──────────────│              │              │             │
```

### 44.6 类型定义

```typescript
// src/types/comment.d.ts [MODIFIED]
interface CommentItem {
  // ... (Phase 4 已有字段)
  /** Phase 5: 赞数 */
  voteCount: number;
  /** Phase 5: 当前用户是否已赞 */
  isVoted: boolean;
}

interface VoteButtonProps {
  /** 评论 ID */
  commentId: string;
  /** 赞数 */
  voteCount: number;
  /** 是否已赞 */
  isVoted: boolean;
  /** 赞切换回调 (抽象组件, 不直接调用 Store) */
  onToggle: (commentId: string) => void;
  /** 尺寸 */
  size?: 'small' | 'default';
}

/** 赞数格式化 */
function formatVoteCount(count: number): string {
  if (count === 0) return '';
  if (count < 1000) return String(count);
  if (count < 10000) return (count / 1000).toFixed(1) + 'k';
  return (count / 10000).toFixed(1) + 'w';
}
```

### 44.7 路由变更

无新增路由。VoteButton 为评论组件的子组件。

---

## 45. iOS AR Quick Look -- USDZ 原生 AR (Section 42)

### 45.1 文件结构

```
[NEW]     src/webview/ar-renderer/usdz-handler.ts   # USDZ 下载 + AR Quick Look 调起
[MODIFIED] src/pages/design/index/index.tsx          # AR 预览按钮增强 (USDZ 检测 + 平台判断)
```

### 45.2 组件树

```
pages/design/index  [MODIFIED]
└── View (工作台)  [MODIFIED]
    └── View (顶部: 当前颜色信息栏)  [MODIFIED]
        └── Button (AR 预览入口)  [MODIFIED] — 逻辑增强
            ├── 条件: iOS 12+ && usdzAvailable === true
            │   └── Button ("AR 快速预览 (iOS)", ARKit 图标)
            │       → downloadAndOpenUSDZ(usdzUrl)
            │
            │       点击后流程:
            │       ├── Loading: "正在准备 AR 预览..." + 进度条 (%)
            │       ├── Taro.downloadFile → 本地临时路径
            │       ├── 成功: 尝试 Taro.openDocument({ fileType: 'usdz' })
            │       │   └── 微信支持: 打开系统 AR Quick Look
            │       │   └── 微信不支持: 引导打开 Safari
            │       ├── 失败: Error + "重试" + "使用网页 AR 预览" 降级按钮
            │       └── 取消下载按钮
            │
            ├── 条件: usdzAvailable === false && arModelUrl 存在
            │   └── Button ("AR 预览")  → Phase 4 WebView AR 流程 (不变)
            │
            └── 条件: 非 iOS 或 iOS < 12
                └── Button ("AR 预览")  → Phase 4 WebView AR 流程 (不变)
```

### 45.3 Store 设计

USDZ 相关状态由页面级 `useState` 管理（不创建独立 Store）：

```typescript
// pages/design/index/index.tsx — 页面级状态
const [usdzAvailable, setUsdzAvailable] = useState<boolean>(false);
const [usdzUrl, setUsdzUrl] = useState<string | null>(null);
const [usdzDownloading, setUsdzDownloading] = useState<boolean>(false);
const [usdzDownloadProgress, setUsdzDownloadProgress] = useState<number>(0);
const [usdzError, setUsdzError] = useState<string | null>(null);

// 平台检测
const isIOS12Plus = useMemo(() => {
  const info = Taro.getSystemInfoSync();
  if (info.platform !== 'ios') return false;
  const versionMatch = info.system.match(/[\d.]+/);
  if (!versionMatch) return false;
  return parseFloat(versionMatch[0]) >= 12;
}, []);
```

### 45.4 Service 设计

```typescript
// src/services/ar.service.ts [MODIFIED] — Phase 4 ar.service.ts 扩展
export const arService = {
  // ... (Phase 4 已有: getArTexture)

  /** 查询车型 USDZ 文件信息 */
  getUsdzInfo: (modelId: string) =>
    request<UsdzInfo>({
      url: `/vehicles/models/${modelId}/usdz`,
      method: 'GET',
    }),
};

interface UsdzInfo {
  available: boolean;
  url: string;
  fileSizeBytes: number;
  generatedAt: string;
  /** 本地缓存的文件路径 (已下载过时返回) */
  localCachePath?: string;
}
```

### 45.5 USDZ 下载 + AR Quick Look 调起

```typescript
// src/webview/ar-renderer/usdz-handler.ts
import Taro from '@tarojs/taro';

export interface UsdzDownloadResult {
  success: boolean;
  localPath?: string;
  error?: string;
}

/**
 * 下载 USDZ 文件到本地并尝试打开 AR Quick Look
 * @returns 下载结果 + 是否成功打开 AR
 */
export async function downloadAndOpenUSDZ(
  usdzUrl: string,
  onProgress?: (progress: number) => void
): Promise<{ downloaded: boolean; openedAR: boolean; error?: string }> {
  // 1. 下载文件 (带进度) + 文件大小检查
  const downloadTask = Taro.downloadFile({
    url: usdzUrl,
    success: () => {},
    fail: () => {},
  });

  downloadTask.onProgressUpdate((res) => {
    onProgress?.(res.progress);
  });

  try {
    const res = await downloadTask;
    if (res.statusCode !== 200) {
      return { downloaded: false, openedAR: false, error: `下载失败 (HTTP ${res.statusCode})` };
    }

    const localPath = res.tempFilePath;

    // 2. 尝试通过 wx.openDocument 打开 USDZ
    try {
      await Taro.openDocument({
        filePath: localPath,
        fileType: 'usdz',
        showMenu: true,
      });
      return { downloaded: true, openedAR: true };
    } catch {
      // 3. wx.openDocument 不支持 USDZ → 降级引导
      Taro.showModal({
        title: 'AR 预览提示',
        content: '请在 Safari 中打开查看 AR 效果',
        confirmText: '知道了',
        showCancel: false,
      });
      return { downloaded: true, openedAR: false, error: 'wx.openDocument 不支持 usdz' };
    }
  } catch (err) {
    return {
      downloaded: false,
      openedAR: false,
      error: err instanceof Error ? err.message : '下载失败',
    };
  }
}
```

### 45.6 数据流时序图

```
用户 (工作台)   DesignPage   usdz-handler   arService   后端/OSS   系统 AR
     │              │              │            │           │          │
     │ 1. 页面加载    │              │            │           │          │
     │──────────────►│              │            │           │          │
     │              │ 2. 平台检测 (iOS 12+?)     │           │          │
     │              │──────────────│            │           │          │
     │              │              │            │           │          │
     │              │ 3. getUsdzInfo(modelId)   │           │          │
     │              │─────────────────────────►│           │          │
     │              │              │ GET /usdz  │           │          │
     │              │              │───────────►│           │          │
     │              │              │ 200 {      │           │          │
     │              │              │  available │           │          │
     │              │              │  : true }  │           │          │
     │              │◄─────────────────────────│           │          │
     │              │              │            │           │          │
     │ 4. "AR快速预览(iOS)"按钮展示              │           │          │
     │◄──────────────│              │            │           │          │
     │              │              │            │           │          │
     │ 5. 点击按钮    │              │            │           │          │
     │──────────────►│              │            │           │          │
     │              │ 6. downloadAndOpenUSDZ(url)│           │          │
     │              │─────────────►│            │           │          │
     │              │              │ 7. downloadFile          │          │
     │              │              │───────────────────────►│          │
     │              │              │ progress: 0%~100%      │          │
     │ 8. 进度条更新  │              │◄───────────────────────│          │
     │◄──────────────│              │            │           │          │
     │              │              │            │           │          │
     │              │              │ 9. 下载完成  │           │          │
     │              │              │◄───────────────────────│          │
     │              │              │ 10. wx.openDocument     │          │
     │              │              │──────────────────────────────────►│
     │ 11. 系统 AR Quick Look 打开 │            │           │          │
     │◄─────────────────────────────────────────────────────────────│
     │              │              │            │           │          │
     │              │              │ ALT: wx.openDocument 失败        │
     │              │              │ 12. 弹窗引导 Safari 打开          │
     │◄──────────────│◄─────────────│            │           │          │
```

### 45.7 类型定义

```typescript
interface UsdzInfo {
  available: boolean;
  url: string;
  fileSizeBytes: number;
  generatedAt: string;
  localCachePath?: string;
}

interface UsdzDownloadState {
  downloading: boolean;
  progress: number;       // 0-100
  error: string | null;
  localPath: string | null;
}
```

### 45.8 路由变更

无新增路由。AR 预览按钮逻辑在现有 `design/index` 页面内增强。

---

## 46. Share Enhancement v2 -- 案例分享视频式预览 (Section 43)

### 46.1 文件结构

```
[NEW]     src/components/ShareVideoPreview/
          ├── index.tsx          # Canvas 帧动画视频式预览组件
          └── index.less

[MODIFIED] src/pages/cases/share-card/index/index.tsx  # 新增模式切换 + 视频预览集成
```

### 46.2 组件树

```
pages/cases/share-card/index  [MODIFIED]
└── View (分享卡片页)  [MODIFIED]
    ├── View (模式切换 Tab)                                # [NEW]
    │   ├── Tab ("静态卡片", 选中态高亮) → 展示 Phase 4 ShareCardCanvas
    │   └── Tab ("视频预览", 选中态高亮) → 展示 ShareVideoPreview
    │
    ├── ShareCardCanvas (Phase 4 已有, 静态模式)
    │   └── Canvas (750×1334rpx 静态卡片渲染)
    │
    └── ShareVideoPreview (视频预览模式)                    # [NEW]
        ├── View (Canvas 初始化 loading)
        │   ├── ProgressBar ("正在生成预览...")
        │   └── Text (百分比)
        │
        ├── ErrorState ("生成失败")                         ← error 状态
        │   └── Button ("重新生成")
        │
        └── View (动画播放区, success 状态)
            ├── Canvas (id="share-video-canvas", 750×1334rpx)
            │   └── 帧动画 (requestAnimationFrame 驱动, ~30fps)
            │       阶段 1 (0-1.5s): 封面图模糊→清晰 + 画面暗→亮
            │       阶段 2 (1.5-3.0s): 颜色渐变叠加 (左上→右下)
            │       阶段 3 (3.0-4.0s): 标题+信息 从下方淡入上移
            │       阶段 4 (4.0-5.0s): Logo+小程序码 从右侧滑入
            │       → 循环播放
            │
            └── View (操作按钮组)
                ├── Button ("保存封面图") → 导出阶段 4 静态画面
                ├── Button ("转发给好友") → Taro.showShareMenu (阶段 4 封面图)
                └── Button ("录屏分享") → Toast 引导系统录屏
```

### 46.3 Store 设计

视频预览不创建独立 Store，页面级状态管理：

```typescript
// pages/cases/share-card/index/index.tsx
const [previewMode, setPreviewMode] = useState<'static' | 'video'>('static');
const [videoLoading, setVideoLoading] = useState<boolean>(true);
const [videoError, setVideoError] = useState<string | null>(null);
const [staticFramePath, setStaticFramePath] = useState<string | null>(null);
```

### 46.4 Service 设计

无新增 API。复用 Phase 4 的 `shareCardService.getShareCardData()`。

### 46.5 Canvas 帧动画设计

```typescript
// src/components/ShareVideoPreview/index.tsx
interface AnimationPhase {
  name: string;
  startTime: number;   // 相对动画开始的时间 (秒)
  endTime: number;
  draw: (ctx: CanvasRenderingContext2D, progress: number, data: ShareCardData, canvasW: number, canvasH: number) => void;
}

const ANIMATION_PHASES: AnimationPhase[] = [
  {
    name: 'fadeIn',
    startTime: 0,
    endTime: 1.5,
    draw: (ctx, progress, data, w, h) => {
      // Cover image: blur → sharp + dark → bright
      const alpha = easeInOutCubic(progress);
      ctx.globalAlpha = alpha;
      // 绘制封面图 (模糊度随 progress 降低)
      // 绘制亮度蒙层 (alpha 随 progress 降低)
    },
  },
  {
    name: 'gradient',
    startTime: 1.5,
    endTime: 3.0,
    draw: (ctx, progress, data, w, h) => {
      // Semi-transparent color gradient overlay (TL → BR)
      const gradient = ctx.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, `rgba(${colorR},${colorG},${colorB},${0.4 * progress})`);
      gradient.addColorStop(1, `rgba(${colorR},${colorG},${colorB},0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    },
  },
  {
    name: 'slideUp',
    startTime: 3.0,
    endTime: 4.0,
    draw: (ctx, progress, data, w, h) => {
      // Title + subtitle: slide up from bottom
      const yOffset = (1 - easeOutCubic(progress)) * 60;
      ctx.globalAlpha = progress;
      // 绘制标题 (白色, 36rpx)
      // 绘制副标题 (白色, 24rpx)
    },
  },
  {
    name: 'slideInRight',
    startTime: 4.0,
    endTime: 5.0,
    draw: (ctx, progress, data, w, h) => {
      // Logo: slide in from right
      const xOffset = (1 - easeOutCubic(progress)) * 80;
      ctx.globalAlpha = progress;
      // 绘制门店 Logo + 名称
      // 绘制小程序码
    },
  },
];

// 动画循环
let animationId: number;
const startTime = performance.now();
const totalDuration = 5.0; // 秒

function animate() {
  const elapsed = (performance.now() - startTime) / 1000;
  const loopTime = elapsed % totalDuration;

  ctx.clearRect(0, 0, canvasW, canvasH);

  // 绘制所有已开始的阶段
  for (const phase of ANIMATION_PHASES) {
    if (loopTime >= phase.startTime) {
      const phaseProgress = Math.min(
        (loopTime - phase.startTime) / (phase.endTime - phase.startTime),
        1.0
      );
      ctx.save();
      phase.draw(ctx, phaseProgress, cardData, canvasW, canvasH);
      ctx.restore();
    }
  }

  animationId = requestAnimationFrame(animate);
}
```

### 46.6 数据流

```
用户 (分享页)   ShareCardPage  shareCardService   后端 API    Canvas
     │               │               │                │          │
     │ 1. 页面加载    │               │                │          │
     │──────────────►│               │                │          │
     │               │ 2. getShareCardData(caseId)    │          │
     │               │──────────────►│                │          │
     │               │               │ GET /cases/:id │          │
     │               │               │  /share-card   │          │
     │               │               │───────────────►│          │
     │               │               │ 200 ShareCard  │          │
     │               │◄──────────────│◄───────────────│          │
     │               │               │                │          │
     │ 3. 默认"静态卡片"模式 (Phase 4)               │          │
     │◄──────────────│               │                │          │
     │               │               │                │          │
     │ 4. 切换"视频预览"│               │                │          │
     │──────────────►│               │                │          │
     │               │ 5. 初始化动画  │                │          │
     │               │───────────────│──────────────────────────►│
     │               │               │     6. requestAnimationFrame loop
     │ 7. 动画循环播放 │               │                │          │
     │◄──────────────│               │                │          │
     │               │               │                │          │
     │ 8. 点击"保存封面图"              │                │          │
     │──────────────►│               │                │          │
     │               │ 9. 绘制阶段4静态画面             │          │
     │               │───────────────│──────────────────────────►│
     │               │               │     Canvas.toTempFilePath │
     │               │               │──────────────────────────►│
     │ 10. 保存至相册  │               │                │          │
     │◄──────────────│               │                │          │
```

### 46.7 类型定义

```typescript
interface ShareVideoPreviewProps {
  /** 分享卡片数据 */
  cardData: ShareCardData;
  /** 是否可见 (模式切换控制) */
  visible: boolean;
  /** 静态帧生成回调 (保存封面图) */
  onStaticFrameReady: (tempFilePath: string) => void;
  /** 视频预览错误回调 */
  onError: (error: string) => void;
}

/** 缓动函数 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
```

### 46.8 路由变更

无新增路由。视频预览为分享卡片页内部模式切换。

---

## 47. Phase 5 状态矩阵汇总

### 47.1 所有新增/修改页面状态覆盖

| 页面/模块 | Loading | Empty | Error | Success | 特殊状态 |
|-----------|---------|-------|-------|---------|----------|
| 门店切换页 | 骨架屏 (3 条门店项: 图标+名称行+地址行) | "暂无关联门店" 插画 + 返回按钮 | API 失败 + 错误提示 + 重试 | 门店列表 (当前活跃绿色勾) | 确认切换对话框 / 切换 loading 遮罩 |
| 预约创建 (候补) | 候补提交按钮 loading | N/A (满员时才展示) | 重复候补/队列已满 Toast | 候补成功绿色卡片 + 排队位置 + 预估时间 | 展开/收起候补信息区 |
| 候补列表 (我的页) | 骨架屏 (3 条项: 圆形序号占位 + 2 行文字线 + 时段标签) | "暂无候补" 插画 + "去预约" 按钮 | 错误图标 + 错误信息 + "重试" 按钮 | WaitlistCard 列表 (waiting=橙色圆点, promoted=绿色圆点, expired=灰色圆点) | 下拉刷新 / promoted 项可跳转预约详情 |
| 案例详情 (推荐区) | 骨架屏 (3 个推荐卡片方块) | 0 条 → 区域不渲染 (无痕) | 静默隐藏 (无报错) | 横向滚动卡片列表 | < 3 条居中展示不强制横滑 |
| 案例列表 (标签栏) | 骨架屏 (6-8 个胶囊占位) | 0 个标签 → 栏不渲染 | 加载失败 + 重试按钮 | 横向滚动标签胶囊 (选中态高亮) | 多选 AND 逻辑 / "全部" 重置按钮 |
| 离线指示条 (全局) | N/A | N/A | N/A | 灰色指示条 (断网) / 绿色恢复过渡 (2s 消失) | 首次离线引导气泡 / 已恢复连接动画 |
| 评论赞 | N/A (微交互 200ms 无需全局 loading) | N/A | API 失败 → 乐观更新回滚 + Toast | 空心灰 ↔ 红色实心 toggle + 数字变化 | 弹跳动效 (scale 1.0→1.3→1.0) |
| USDZ AR 预览 | 下载进度条 + "正在准备 AR 预览..." | N/A (无 USDZ 不展示) | 下载失败 + "重试" + "使用网页 AR 预览" 降级 | iOS 原生 AR Quick Look 打开 | 微信不支持 → Safari 引导 / 取消下载 |
| 视频式分享预览 | Canvas 初始化进度条 "正在生成预览..." | N/A | Canvas 绘制失败 + "重新生成" | 动画循环播放 (4 阶段 5s) | 模式切换 (静态/视频) / 静态帧导出 |

### 47.2 组件级状态矩阵

| 组件 | Loading | Empty | Error | Success | 特殊状态 |
|------|---------|-------|-------|---------|----------|
| StoreSwitcher | 骨架屏 (3 条目占位) | "暂无关联门店" + 返回 | 加载失败 + 重试 | 门店列表 (勾选态) | 切换确认弹窗 / switch-loading |
| RecommendationStrip | 3 个卡片方块骨架 | 区域不渲染 | 静默隐藏 | 横向滚动卡片 | < 3 条居中模式 |
| TagFilterBar | 6-8 个胶囊骨架 | 栏不渲染 | 重试按钮 | 横向滚动胶囊 | "全部" 重置按钮显隐 |
| OfflineIndicator | N/A | N/A | N/A | 灰色离线条 | 绿色恢复过渡 2s / 首次引导气泡 |
| VoteButton | N/A | N/A | N/A | 空心 (未赞) / 红色实心 (已赞) | 弹跳动效 / 0 赞不显数字 |
| ShareVideoPreview | 进度条 "正在生成..." | N/A | "重新生成" 按钮 | 循环动画 4 阶段 5s | 模式切换 Tab |

---

## 48. Phase 5 架构约束

1. **Tab Bar 上限已到**：Phase 3 后微信小程序 Tab Bar 已达 5 个上限。Phase 5 不新增 Tab，新增的 store-switch 页面为子路由 (`navigateTo`)。与 Phase 4 约定一致。

2. **门店切换的 JWT 刷新原子性**：`AuthStore.switchStore` 必须保证 JWT 刷新的原子性：(a) 新 JWT 写入 `Taro.Storage` 成功后才更新内存状态；(b) JWT 刷新失败时 `activeStoreId` 不回退 (保持当前门店)；(c) 并行调用 `switchStore` 时必须排队 (通过 `storeSwitching` 标志防重入)。切换过程中所有 API 请求暂停 (使用 request 拦截器判断 `storeSwitching`)。

3. **离线模式敏感数据脱敏**：离线缓存的客户手机号在写入 `Taro.Storage` 前必须调用 `maskPhone()` 脱敏 (前 3 后 4 保留，中间替换为 `****`)。脱敏在 `cache-manager.ts` 的 `set` 方法中自动执行，通过资源类型 `type === 'customer'` 判断。脱敏后的数据不可逆，缓存数据泄露时保护客户隐私。

4. **离线缓存 LRU 淘汰的存储空间硬限制**：Taro.Storage 单个 key 最大 1MB，总容量上限 10MB。`CacheManager` 在每次 `set` 操作前检查 `getCurrentSize() + newSize <= maxBytes`，超限时执行 `evictLRU()` 淘汰最久未访问项。淘汰日志记录到本地 (通过 `Taro.getLogManager`)。

5. **评论赞乐观更新的回滚保证**：`CommentStore.toggleVote` 的乐观更新必须在 API 失败时完整回滚：(a) 回滚 `isVoted` 和 `voteCount` 到调用前的值；(b) 回滚需在 `catch` 中立即同步执行，不能在异步回调中延迟；(c) 频率限制 (429) 的 Toast 须明确指出限频原因 (code=4035)。

6. **USDZ AR Quick Look 的平台降级链**：(a) iOS 12+ 且 USDZ 可用 → 原生 AR Quick Look；(b) iOS 12+ 但 USDZ 不可用 → Phase 4 WebView AR；(c) 非 iOS 或 iOS < 12 → Phase 4 WebView AR；(d) `wx.openDocument` 不支持 usdz → Safari 引导降级。降级链顺序不可改变。

7. **视频预览的 Canvas 性能约束**：`ShareVideoPreview` 的 `requestAnimationFrame` 循环中：(a) 每帧绘制前必须 `ctx.clearRect` 全清 Canvas；(b) 阶段绘制使用 `ctx.save/restore` 管理状态隔离；(c) 图片资源 (封面/Logo/小程序码) 在动画启动前预加载至内存 (`Taro.getImageInfo`)；(d) 页面 `useUnload` 时 `cancelAnimationFrame(animationId)`。

8. **标签筛选 AND 逻辑的客户端职责**：标签筛选为 AND 逻辑，`selectedTagIds` 通过逗号拼接后作为 `tags` 查询参数传给后端。客户端仅负责状态管理和参数拼接，AND 逻辑的实际过滤由后端 SQL 完成。客户端不做本地过滤，避免分页数据不完整。

9. **候补队列的时段状态预检**：创建预约页在渲染时段卡片时，调用 `GET /api/v1/appointments/waitlist/status?customer_phone=` 检查当前用户是否已在候补队列中。若已存在，对应时段卡片展示"已加入候补"标签 (绿色)，不可再次加入。避免重复提交触发 4032 错误码。

10. **案例推荐区的异步加载隔离**：`RecommendationStrip` 的加载与案例详情主内容 (`CaseStore.fetchCaseDetail`) 完全解耦。推荐 API 在详情主内容渲染完成后 (`useEffect` 中独立调用) 才发起。推荐加载失败不触发任何全局 ErrorBoundary，不阻塞评论区的渲染。

11. **多门店导航栏指示器的条件渲染**：`custom-tab-bar` 中的门店名称指示器仅在 `AuthStore.storeList.length > 1` 时渲染。单门店店员不展示门店名称 (避免冗余信息)。指示器文本最多 8 字，超出部分 CSS `text-overflow: ellipsis` 截断。

12. **候补状态跨页面一致性**：候补列表支持下拉刷新 (`refreshing` 标志) 实时更新排队位置。候补被提升为正式预约 (`status: 'promoted'`) 后，`promotedAt` 和 `appointmentId` 字段立即可用。页面通过 `useDidShow` 生命周期自动检查最新候补状态。

---

*架构版本：v5.0 (Phase 5)*
*编写角色：Architect*
*日期：2026-07-22*
*前置依赖：Phase 4 社区化模块完成并通过验收*
