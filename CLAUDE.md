# CLAUDE.md · WrapLab Client — 车衣改色小程序

> 文档先行、需求后行。逐 Phase 完整交付。
>
> 与其他文档的分工：`CLAUDE.md` 定**规则** · `docs/00_requirements.md` 定**需求** · `docs/01_architecture.md` 定**架构** · `docs/04_ui_design.md` 定**UI**。

---

## 一、铁律

1. **文档先行**：先需求 + 架构文档，审核通过后再写代码。
2. **技术栈固定**：Taro + React + TypeScript（跨平台小程序），3D 渲染通过 WebView 嵌入 Three.js H5，postMessage 双向通信。
3. **主 Agent = 监督者**：所有写文件任务、评审任务必须派发子 Agent。主 Agent 只负责调度和关卡检查，严禁直接写文件、严禁自己做评审。
4. **子 Agent 完工必落盘**：更新进度 + 记录实现要点与踩坑。不落盘视为未完成。

## 二、开发流程

严格遵循 **8 步 5 关** 流程，详见 `.claude/skills/rigorous-dev-workflow.md`。

```
🧭 PM 需求 → 🔍 需求评审 → 🏛️ 设计 → 👁️ 设计评审 → 🎨 UI设计 → 🔍 UI评审 → 🏗️🎨 开发 → 🧪 测试 → 👁️ 审查 → 🏗️🎨 修复 → 🧪 回归 → ✅ 交付
   ↓ Gate 1                ↓ Gate 2              ↓ Gate 2.5       ↓ Gate 3              ↓ Gate 4
```

子 Agent 角色定义见 `.codex/agency-agents/`。

## 三、技术栈（已锁定）

| 层 | 选型 | 备注 |
|---|---|---|
| 框架 | Taro (React mode) + TypeScript | 跨平台：微信/支付宝/抖音/鸿蒙 |
| 3D 渲染 | WebView + Three.js H5 | postMessage 双向通信 |
| 状态管理 | Zustand / React Context | |
| 地图 | Taro Map / 微信地图 SDK | 施工门店地图功能 |
| 测试 | Vitest + React Testing Library | |

## 四、项目结构

```
wraplab-client/
├── CLAUDE.md
├── .claude/skills/rigorous-dev-workflow.md
├── .codex/agency-agents/
├── src/
│   ├── pages/          # Taro 页面
│   ├── components/     # 公共组件
│   ├── webview/        # Three.js H5 3D 渲染
│   └── ...
└── docs/
```

## 五、开工/收工

- **开工**：读 `docs/worklog/TODO.md` + 最近 `daily/` 日志。
- **收工**：更新 TODO + 写 `docs/worklog/daily/YYYY-MM-DD.md` + 必要时更新 `ROADMAP.md`。
- 子 Agent 完工后必须落盘（更新进度 + 记录要点与踩坑）。不落盘视为未完成。

## 六、质量门禁

```bash
npm run lint && npm run test
```

**零失败方可提交。无例外。**

## 七、速查

| 想了解 | 去 |
|--------|-----|
| 严格开发流程 | `.claude/skills/rigorous-dev-workflow.md` |
| 子 Agent 角色定义 | `.codex/agency-agents/` |
| 需求文档 | `docs/00_requirements.md` |

---

*本文件随项目演进持续更新。*
