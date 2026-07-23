# WrapLab Client — 车衣改色跨平台小程序

基于 Taro + React + TypeScript 构建的跨平台小程序，支持微信/支付宝/抖音/鸿蒙多端运行。

## 核心功能

- **车型选择**：品牌 → 车系 → 车型三级联动
- **3D 改色预览**：Three.js WebView 渲染，实时换色
- **材质对比**：哑面/亮面/金属等多种材质效果对比
- **报价下单**：选色配置 → 自动计算面积 → 生成报价
- **案例广场**：热门方案浏览、点赞、分享
- **门店预约**：在线预约、排队等候

## 技术栈

| 层 | 选型 |
|---|------|
| 框架 | Taro 4.x |
| UI | React 18 + TypeScript |
| 状态管理 | Zustand |
| 3D 渲染 | Three.js (WebView) |
| 网络 | Taro.request + WebSocket |
| 测试 | Jest |

## 快速开始

```bash
# 安装依赖
npm install --legacy-peer-deps

# 微信小程序开发
npm run dev:weapp

# 构建
npm run build:weapp

# 运行测试
npm run test
```

## 项目结构

```
src/
├── pages/          # 页面（home/design/cases/profile/store/auth）
├── components/     # 通用组件（ColorSwatch/ThreeDViewer/StoreMap 等）
├── stores/         # Zustand 状态管理
├── services/       # API 服务层
├── utils/          # 工具函数（缓存/校验/网络/防抖）
├── webview/        # 3D/AR WebView 页面
└── types/          # TypeScript 类型定义
```
