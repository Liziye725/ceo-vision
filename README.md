# 观潮 · CEO Vision

「观潮 · CEO 商业研究室」的公开代码镜像与 CEO 专用运行回执。私有 Sites 项目仍承载线上网站和持久报告；本仓库不存私人报告、站点身份、访问凭据或用户反馈。网站源码来自当前 Sites 源仓库，页面位于 `app/`，持久化 API 位于 `worker/`。

## 代码与构建

Node.js 24+：`node scripts/build.mjs` 构建 Worker 到 `dist/server/index.js`。公开构建使用 `.openai/hosting.example.json`；在授权的 Sites 源仓库部署时使用该站实际的 `.openai/hosting.json`、R2 绑定和私有发布流程。本仓库是代码镜像，不应作为替换现有 Sites 源仓库的自动部署入口。网站的真实历史报告保存在私有 R2，未从源仓库复制到此处。

站点提供 `GET /api/workflow`、`GET /api/state`、`GET /api/reports/{id}`、`POST /api/reports`、`POST /api/runs` 等现有端点。研究标准与排队规则见 [研究工作流](RESEARCH_WORKFLOW.md)。源码中的通用服务端最低校验不代替每轮研究的14维度、11份实质来源、5项CEO决策、三情景及风险清单验收。

## CEO 运行回执

`automation/runs/ceo/` 保存公开白名单状态；`src/run-receipt.mjs` 和 `scripts/run-receipts.mjs` 负责校验与汇总，`.github/workflows/ceo-receipts.yml` 在 push/PR 后运行。手动验证：`node --test tests/run-receipt.test.mjs`，`node scripts/run-receipts.mjs summary automation/runs .data/schedule-summary.md`。流程见 [同步协议](instructions/SCHEDULE-SYNC.zh-CN.md)。

维护事项见仓库 Issues。Actions 成功只证明回执格式有效；报告质量与私人归档须在原站回读确认。