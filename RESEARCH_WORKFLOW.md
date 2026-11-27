# 观潮 · CEO 深度研究工作流（revision 2026-11-14.1）

这是用户授权的持续研究与自动入库任务。每次深度研究一家公司，中文撰写，从全球 CEO 视角将多源事实转化为可执行决策。站点必须保持 owner-private。不要发送邮件或消息给他人。

## 读取与选题

1. 用 Sites get_site 读取运行上下文提供的 project_id，确认当前用户 owner、访问仅限 owner，获取 current_live_url 与 siwc_bypass_bearer_token。该 token 仅以内存传递，HTTP 请求此 Site 时使用 `OAI-Sites-Authorization: Bearer <token>`。不要打印、保存或在浏览器暴露 token。访问受限就记录阻塞，不能放宽站点权限。
2. GET `/api/workflow` 获取最新指引，GET `/api/state` 获取历史报告、排队公司、运行记录。所有请求沿用上述平台服务访问。这些端点在网页关闭时同样有效。
3. 优先研究用户加入的尚未研究公司；再按队列顺序轮选未研究公司；全部覆盖后优先财报/重大变化驱动的更新，否则选择最久未覆盖公司。新报告保留旧版。每次只写一家公司。

## 研究标准

以运行当天为资料截止日，核查真实最新资料及发布时间。第一轮核实公司、代码、业务边界、CEO 和最新财报期；避免将预测、预告或未来日期当已发生事实。争议重大事件必须核对公司官方公告、监管原文与独立来源。首选 SEC/交易所、年报季报、业绩会、公司产品和定价文档；结合客户/竞争对手/供应商披露、行业协会、监管、央行/统计机构以及可靠新闻。目标 10–20 个有效来源，至少 6 个且含一手来源；质量优先，不凑数量。相同稿件转载不算独立证据。付费或无法访问资料应标注缺口，不推测内容。不访问用户私人邮件/文档，除非另行授权。

必须覆盖 14 个维度：①产品/商业模式 ②市场/增长空间 ③AI 冲击与价值迁移 ④竞争/护城河 ⑤客户/需求/留存 ⑥产业链/利润分配 ⑦供应链/交付韧性 ⑧财报/现金流/资产负债 ⑨宏观/利率/汇率/周期 ⑩微观/单位经济/定价 ⑪资本配置/投资并购/回报 ⑫组织/治理/人才 ⑬监管/地缘/合规 ⑭风险/情景/战略选择。无公开数据也必须列出缺口与验证办法。

正文目标 4,000–7,000 中文字，按信息复杂度调整。财务数据明确期间、币种、单位、GAAP/非 GAAP、同比基数。计算值给出公式和数据来源。禁止虚构 CAC/LTV/留存/市场规模，无法取得标为待核实。

把事实、推断、建议分开。核心判断包括支持证据、因果链、信心（高/中/低）、反证/替代解释。高信心至少两个独立证据支持，不将来源数量等同真实性。信息重要性按对现金流/战略选择影响、规模、时效和可逆性排序。

CEO 决策至少 3–5 条：做什么/不做什么或延后什么、取舍、责任角色、30/90/365 天期限、触发与止损条件、需要补充的信息。给出基准/上行/下行情景，不把情景假设当预测事实；阈值明确标为管理建议。区别“目标公司 CEO”与“采购/投资/合作方 CEO”的视角。

## 数据格式与写入

GET `/api/reports/{id}` 可取得已有报告作为结构示范。POST `/api/reports` 发送 JSON，Content-Type 为 application/json。字段如下：

```
{
 id: "ticker-YYYY-MM-DD", company, ticker, sector, title, subtitle,
 asOf: "YYYY-MM-DD", evidenceThrough: "最近核实的来源日期或说明", summary, verdict,
 metrics: [{label,value,detail,sourceIds:[]}],
 findings: [{title,evidence,inference,confidence,counterargument,sourceIds:[]}],
 dimensions: [{key,title,facts,implication,decision,unknowns,sourceIds:[]}],
 decisions: [{title,horizon,action,tradeoff,trigger,owner,sourceIds:[]}],
 scenarios: [{name,assumptions,outcome,signals}],
 sources: [{id,title,publisher,url,date,kind:"一手或第三方",note}],
 gaps: [], watchlist: [{metric,reason,trigger}], researchNote
}
```

所有引用 sourceIds 必须指向 sources 中实际核实的链接。dimensions 恰好覆盖 14 个维度，关键指标/判断/维度/决策均附来源。报告不得包含访问凭据、原文大段复制或无来源的数值。

## 成功、失败与重试

研究通过来源/日期/财务口径/引用一致性检查后才入库；资料不足不要伪造完成。POST 写入返回 verified=true 后，再 GET `/api/reports/{id}` 核对标题、日期、来源数与正文，GET `/api/state` 确认索引和成功记录。无需部署或修改源码。

相同 id 与相同内容可重试且不重复写入；相同 id 但内容不同会返回 409。先 GET 查明是否前次已成功；修订报告用 `ticker-YYYY-MM-DD-r2` 新 id 保留历史，不能覆盖旧版。网络/429/5xx 可有限重试最多 3 次并退避；重复失败则停止写入。失败或部分完成时 POST `/api/runs`：{status:"failed" 或 "partial",company,message}，简述真实原因、不含凭据。最终返回公司、报告链接（`/#report={id}`）、3 个关键洞察、主要缺口以及入库验证结果。不要把任务创建成功写成研究运行成功。

## 站点运行说明

网站以持久化 R2 存储报告、队列、调度元数据与运行记录。浏览器存储只用于个人收藏。GET `/api/workflow` 是云任务可独立检索的版本化指引，后续任务先读取它。自动任务的定时执行由 Sites linked automation 承担，网站本身不以浏览器计时器充当调度。日历工作日为周一至周五，不自动排除法定节假日；执行时间是开始时间，研究完成后发布。
