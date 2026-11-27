# CEO 研究回执同步

本仓库只接收「观潮 · CEO 商业研究室」的公开运行回执。研究仍由已授权的 ChatGPT 任务与私有 Sites 站点完成，GitHub Actions 只校验回执、生成汇总，不运行研究模型或读取私人站点。

每轮先在私人站点保存报告并回读；再在共享私人账本保存运行、问题、反馈与检查点并回读。之后将严格白名单回执写入 `automation/runs/ceo/YYYY-MM-DD-aN.json`。计划日期按 Europe/Copenhagen，实际起止时间为 UTC ISO 毫秒；实际重新运行才递增 N，同一次 GitHub 重试沿用同一路径和内容。路径存在先读回，同内容视为成功，冲突不覆盖历史。

提交前运行 `node scripts/run-receipts.mjs check <临时文件>`。仅允许 version,task,plannedDate,startedAt,finishedAt,attempt,execution,research,archive,stage,completedUnits,reusedSources,issues,nextAction 字段，task 固定 ceo。失败也应记录真实问题分类；私人研究正文、站点链接、错误原文、反馈、凭据和会话标识不进入公开回执或提交消息。提交后读回字段与文件路径；只有看到对应 commit 的 Actions 成功才称校验通过。

`CEO receipt summary` Actions 在回执或校验代码变化时自动运行，校验全部回执并生成 GitHub Summary 和保留 30 天的 `ceo-run-summary` artifact。它不会自动更新私人站点，也不负责定时触发研究。