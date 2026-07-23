# 严格开发工作流 · Rigorous Development Workflow

> 主 Agent 调度手册。每个模块严格按此流程执行，前一关卡通过后方可进入下一阶段。

---

## 一、Agent 角色赋能

子 Agent 角色定义来源：`.codex/agency-agents/`。主 Agent 不可自己写文件，必须派发对应角色子 Agent。评审环节也必须派发专业评审 Agent，主 Agent 不自己做评审。

| 角色 | 文件 | 赋能 |
|------|------|------|
| 🧭 Product Manager | `product-manager.md` | 需求分析、用户故事、验收标准、边界定义 |
| 🔍 Requirements Reviewer | `requirements-reviewer.md` | 需求评审——检查完整性、清晰度、可测试性、边界 |
| 🏛️ Software Architect | `software-architect.md` | 架构设计、技术决策 |
| 🏗️ Backend Developer | `backend-developer.md` | NestJS 后端开发 |
| 🎨 Frontend Developer | `frontend-developer.md` | Taro 小程序前端开发 |
| 🎨 UI Designer | `ui-designer.md` | 设计系统、页面设计稿、交互规范 |
| 🔍 UI Design Reviewer | `ui-design-reviewer.md` | UI 设计评审 |
| 🧪 QA Engineer | `qa-engineer.md` | 测试编写、执行、回归验证 |
| 👁️ Code Reviewer | `code-reviewer.md` | 设计评审、代码审查、架构合规检查 |

---

## 二、8 步流程 + 5 道关卡

> **触发条件**：Gate 2.5 仅在项目含前端界面时执行。纯后端项目跳过此 Gate。

```
🚦 需求     🧭 PM 出需求文档 ────→ 🔍 需求评审 ──────────→ ✅ Gate 1
🚦 设计     🏛️ Architect 架构设计 → 👁️ Reviewer 设计评审 → ✅ Gate 2
🚦 UI设计   🎨 UI Designer 设计  → 🔍 UI 设计评审 ──────→ ✅ Gate 2.5
🚦 开发     🏗️ Backend + 🎨 Frontend 并行开发 → 自测通过 → ✅ Gate 3
🚦 质量     🧪 QA 测试 → 👁️ Reviewer 代码审查 → 🏗️🎨 修复 → 🧪 回归验证 → ✅ Gate 4
🚦 交付     主 Agent 终审 → 收尾落盘
```

**关键原则**：每个评审环节都由专业 Agent 执行，主 Agent 不越权做评审。评审不通过则打回上一阶段重做。

---

## 三、各阶段详细说明

### 阶段 1：需求（PM + Requirements Reviewer）

**Step 1.1 — 🧭 PM 出需求文档**：
- 产出：`docs/00_requirements.md`
- 基于设计文档的分 Phase 计划，逐 Phase 编写需求

**Step 1.2 — 🔍 Requirements Reviewer 需求评审**：
- 按 `.codex/agency-agents/requirements-reviewer.md` 审查清单执行
- 输出需求评审报告（🔴 Blocker / 🟡 Should Fix / 💭 Nice to Have）

**Gate 1 检查清单（主 Agent 执行）**：
- [ ] 🔍 需求评审结论为 ✅ 通过
- [ ] 无 🔴 Blocker 遗留
- [ ] 业务场景清晰 + 验收标准可测试 + 边界明确

---

### 阶段 2：设计（Architect + Reviewer）

**Step 2.1 — 🏛️ Architect 架构设计**：
- 产出：架构设计文档（更新 `docs/01_architecture.md`）
- 基于已通过的需求文档进行设计

**Step 2.2 — 👁️ Code Reviewer 设计评审**：
- 按 `.codex/agency-agents/code-reviewer.md` 审查清单执行（设计评审模式）
- 重点检查：架构合规、接口完整、数据流清晰、与需求对齐

**Gate 2 检查清单（主 Agent 执行）**：
- [ ] 👁️ Reviewer 设计审查结论为 ✅ 通过，无 🔴 Blocker
- [ ] 架构符合技术栈约束（Taro + NestJS + MySQL）
- [ ] 接口定义完整，数据流清晰

---

### 阶段 2.5：UI/UX 设计（🎨 UI Designer + 🔍 UI Design Reviewer）

**Step 2.5.1 — 🎨 UI/UX Designer 出设计稿**：
- 基于已通过的 `00_requirements.md` + `01_architecture.md`
- 产出：`docs/04_ui_design.md`（设计规范文档）

**Step 2.5.2 — 🔍 UI Design Reviewer 设计评审**：
- 重点检查：全页面覆盖、信息架构、视觉层级、交互流程
- 输出 UI 设计评审报告

**Gate 2.5 检查清单（主 Agent 执行）**：
- [ ] 🔍 UI Design Reviewer 评审结论为 ✅ 通过，无 🔴 Blocker
- [ ] 设计稿覆盖需求文档中所有前端页面/视图
- [ ] 每个页面涵盖全部状态（loading/empty/error/edge）

---

### 阶段 3：开发（Backend + Frontend 并行）

**Step 3.1 — 🏗️ Backend + 🎨 Frontend 并行开发**：
- 产出：可运行代码 + 自测通过
- Backend（NestJS）：`modules/` → `controllers/` → `services/` → `entities/`
- Frontend（Taro）：`pages/` → `components/` → `webview/`

**Gate 3 检查清单（主 Agent 执行）**：
- [ ] 代码可运行（NestJS 可启动 / Taro 可 build）
- [ ] 自测基本流程通过
- [ ] 代码符合代码风格规范
- [ ] 无遗留 TODO 或硬编码占位

---

### 阶段 4：质量（QA + Reviewer + Developer 闭环）

**Step 4.1 — 🧪 QA 测试**：根据验收标准编写测试，输出测试报告

**Step 4.2 — 👁️ Reviewer 代码审查**：输出审查报告

**Step 4.3 — 🏗️🎨 Developer 修复**：修复所有 🔴 Blocker

**Step 4.4 — 🧪 QA 回归验证**：重跑全量测试，确认无回归

**Gate 4 检查清单（主 Agent 执行）**：
- [ ] 🧪 QA 测试全量通过（0 fail）
- [ ] 👁️ Reviewer 审查无 🔴 Blocker 遗留
- [ ] 🧪 回归测试通过
- [ ] 所有子 Agent 已落盘

---

## 四、交付与收尾

- [ ] 更新 `ROADMAP.md` 勾选完成项
- [ ] 写收工日志记录本轮产出
- [ ] 汇总产出清单
- [ ] 更新项目 memory 文件

---

## 五、严禁事项

1. **禁止跳过任何阶段**
2. **禁止主 Agent 直接写文件**
3. **禁止主 Agent 自己做评审**
4. **禁止 Gate 未通过就进入下一阶段**
5. **禁止子 Agent 不落盘**
6. **禁止 Reviewer 放水**

---

## 六、项目适配说明

本项目（WrapLab）遵循上述标准流程，结合以下项目特定约束：

- **技术栈**：Taro + React + TypeScript（小程序前端）、NestJS + TypeORM + MySQL（后端）、WebView + Three.js（3D 渲染）
- **多租户**：所有业务数据表带 `store_id`，JWT 中注入门店上下文
- **3D 渲染**：通过 WebView postMessage 与 Taro 小程序双向通信
- **AI 生图**：NestJS 服务层组装 Prompt 调用外部 API
- **当前阶段**：Phase 1 需求设计阶段
