// ASSISTANT A-011: a deliberately narrow public export, never a report serializer.
export const tasks = ['ceo'];
export const issues = ['source_unavailable', 'auth_required', 'quota_limited', 'archive_failed', 'readback_failed', 'duplicate_work', 'insufficient_evidence', 'history_unavailable', 'validation_failed', 'unknown'];
export const nextActions = ['continue_research', 'verify_sources', 'retry_archive', 'restore_access', 'wait_for_quota', 'review_with_user', 'advance_topic', 'none'];
const keys = ['version','task','plannedDate','startedAt','finishedAt','attempt','execution','research','archive','stage','completedUnits','reusedSources','issues','nextAction'];
const stages = ['discovery','evidence','analysis','synthesis','archive'];
function fail() { throw new Error('Invalid public receipt; use the documented allowlist (input omitted).'); }
function oneOf(value, values) { if (!values.includes(value)) fail(); }
function integer(value, min, max) { if (!Number.isSafeInteger(value) || value < min || value > max) fail(); }
function timestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)) fail();
  if (!Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) fail();
}
export function validateReceipt(r) {
  if (!r || typeof r !== 'object' || Array.isArray(r) || Object.keys(r).length !== keys.length || keys.some(k => !Object.hasOwn(r,k))) fail();
  if (r.version !== 1) fail();
  oneOf(r.task,tasks);
  if (typeof r.plannedDate !== 'string' || !/^\d{4}-\d\d-\d\d$/.test(r.plannedDate)) fail();
  timestamp(`${r.plannedDate}T00:00:00.000Z`);
  timestamp(r.startedAt); timestamp(r.finishedAt);
  if (r.finishedAt < r.startedAt) fail();
  integer(r.attempt,1,1000); integer(r.completedUnits,0,10000);
  if (r.reusedSources !== null) integer(r.reusedSources,0,100000);
  oneOf(r.execution,['succeeded','failed','blocked']);
  oneOf(r.research,['partial','complete','no_change']);
  oneOf(r.archive,['verified','failed','not_attempted']);
  oneOf(r.stage,stages); oneOf(r.nextAction,nextActions);
  if (!Array.isArray(r.issues) || r.issues.length > issues.length || new Set(r.issues).size !== r.issues.length) fail();
  r.issues.forEach(i=>oneOf(i,issues));
  if (r.execution === 'succeeded' && r.archive !== 'verified') fail();
  if (r.execution !== 'succeeded' && r.issues.length === 0) fail();
  return r;
}
export function receiptPath(r) {
  validateReceipt(r);
  return `automation/runs/${r.task}/${r.plannedDate}-a${r.attempt}.json`;
}
export function renderSummary(receipts) {
  receipts.forEach(validateReceipt);
  const sorted = [...receipts].sort((a,b)=>b.plannedDate.localeCompare(a.plannedDate)||a.task.localeCompare(b.task)||b.attempt-a.attempt);
  const rows = sorted.map(r=>`| ${r.plannedDate} | ${r.task} | ${r.attempt} | ${r.execution} | ${r.research} | ${r.archive} | ${r.completedUnits} | ${r.reusedSources ?? 'unknown'} | ${r.issues.join(', ') || 'none'} | ${r.nextAction} |`);
  const counts = new Map();
  receipts.forEach(r=>r.issues.forEach(i=>counts.set(i,(counts.get(i)||0)+1)));
  return ['# CEO 研究运行汇总','',
    '只包含已提交回执；缺少回执不代表任务没有执行。Actions 成功表示回执有效，不代表研究完整。',
    '完整证据、失败原因、用户反馈与续办清单保留在各任务的私人归档。','',
    '| 日期 | 任务 | 尝试 | 执行 | 研究 | 私人归档 | 完成单元 | 复用来源 | 问题分类 | 下一步 |',
    '|---|---|---|---|---|---|---|---|---|---|',...rows,
    ...(rows.length?[]:['','尚无运行回执。']), '', '## 问题频次（按回执计数）','',
    ...[...counts].sort((a,b)=>b[1]-a[1]).map(([k,v])=>`- ${k}: ${v}`),''].join('\n');
}
