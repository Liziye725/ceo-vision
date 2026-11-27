const PAGE = /*__PAGE__*/;
const WORKFLOW = /*__WORKFLOW__*/;
const DEFAULT_QUEUE = [
  {company:'英伟达',ticker:'NVDA',sector:'AI 与半导体',angle:'平台优势、AI 资本开支与供应约束'},
  {company:'微软',ticker:'MSFT',sector:'云与软件',angle:'AI 商业化、云增长与资本回报'},
  {company:'台积电',ticker:'TSM',sector:'AI 与半导体',angle:'先进制程、产能周期与地缘风险'},
  {company:'比亚迪',ticker:'1211.HK',sector:'汽车与制造',angle:'全球化、价格竞争与垂直整合'},
  {company:'阿里巴巴',ticker:'BABA',sector:'平台与消费',angle:'电商效率、云与 AI 的资本配置'},
  {company:'亚马逊',ticker:'AMZN',sector:'云与零售',angle:'零售利润、AWS 与物流网络'},
  {company:'腾讯',ticker:'0700.HK',sector:'平台与消费',angle:'生态流量、广告、游戏与 AI'},
  {company:'宁德时代',ticker:'300750.SZ',sector:'能源与制造',angle:'储能需求、电池价格与海外扩张'},
  {company:'苹果',ticker:'AAPL',sector:'消费科技',angle:'硬件周期、服务收入与 AI 入口'},
  {company:'拼多多',ticker:'PDD',sector:'平台与消费',angle:'商家生态、跨境监管与单位经济'},
  {company:'Alphabet',ticker:'GOOGL',sector:'云与软件',angle:'搜索重构、AI 推理成本与云竞争'},
  {company:'沃尔玛',ticker:'WMT',sector:'零售与消费',angle:'消费分层、履约效率与零售媒体'}
];
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const error=(message,status=400)=>json({error:message},status);
async function objects(bucket,prefix){let all=[],cursor;do{const r=await bucket.list({prefix,cursor,limit:1000});all.push(...r.objects);cursor=r.truncated?r.cursor:undefined;}while(cursor);return all;}
async function get(bucket,key){const r=await bucket.get(key);return r?await r.json():null;}
async function put(bucket,key,value){return bucket.put(key,JSON.stringify(value),{httpMetadata:{contentType:'application/json'}});}
const reportSummary=r=>({id:r.id,company:r.company,ticker:r.ticker,sector:r.sector,title:r.title,subtitle:r.subtitle,asOf:r.asOf,evidenceThrough:r.evidenceThrough,summary:r.summary,verdict:r.verdict,sourceCount:r.sources.length,dimensionCount:r.dimensions.length,createdAt:r.createdAt});
async function reports(bucket){const items=await objects(bucket,'reports/');const records=await Promise.all(items.map(o=>get(bucket,o.key)));return records.filter(Boolean).sort((a,b)=>(b.asOf+b.id).localeCompare(a.asOf+a.id));}
function validateReport(r){
 for(const key of ['id','company','ticker','sector','title','asOf','evidenceThrough','summary','verdict'])if(typeof r[key]!=='string'||!r[key].trim())throw new Error('Missing report field: '+key);
 if(!/^[a-z0-9][a-z0-9._-]{2,119}$/.test(r.id))throw new Error('Invalid report id');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(r.asOf))throw new Error('Invalid report date');
 for(const key of ['metrics','findings','dimensions','decisions','scenarios','sources','gaps','watchlist'])if(!Array.isArray(r[key]))throw new Error('Missing array: '+key);
 if(r.dimensions.length<14)throw new Error('A report must cover all 14 dimensions');
 if(r.sources.length<6||!r.sources.some(s=>s.kind==='一手'))throw new Error('At least 6 sources including a primary source required');
 if(r.decisions.length<3||r.findings.length<3||r.scenarios.length<3)throw new Error('Insufficient decision, finding, or scenario coverage');
 const ids=new Set();for(const s of r.sources){if(!s.id||ids.has(s.id)||!s.title||!s.publisher||!s.date)throw new Error('Invalid source metadata');ids.add(s.id);const u=new URL(s.url);if(!['https:','http:'].includes(u.protocol))throw new Error('Invalid source URL');}
 for(const row of [...r.metrics,...r.findings,...r.dimensions,...r.decisions]){if(!Array.isArray(row.sourceIds)||row.sourceIds.length===0||row.sourceIds.some(id=>!ids.has(id)))throw new Error('Claims must reference valid sources');}
 for(const d of r.dimensions)for(const k of ['key','title','facts','implication','decision','unknowns'])if(!d[k])throw new Error('Incomplete dimension '+k);
 for(const f of r.findings)if(!f.evidence||!f.inference||!f.counterargument||!f.confidence)throw new Error('Findings need evidence, inference, counterargument, confidence');
}
async function digest(value){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));return [...new Uint8Array(b)].map(v=>v.toString(16).padStart(2,'0')).join('');}
export default {async fetch(request,env){
 try{
  const url=new URL(request.url),path=url.pathname;
  if(path==='/'&&request.method==='GET')return new Response(PAGE,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'"}});
  if(path==='/api/workflow'&&request.method==='GET')return json({revision:'2026-11-14.1',instructions:WORKFLOW});
  if(path==='/api/health')return json({ok:true,storage:!!env.BUCKET});
  if(!path.startsWith('/api/'))return error('Not found',404);
  if(!env.BUCKET)return error('Persistent storage is not configured',503);
  // This shared workspace is owner-private. Sites dispatch authorizes browser and service access.
  // Preserve the owner-only audience; service tokens are consumed by dispatch, not forwarded here.
  if(!['GET','HEAD'].includes(request.method)){
   const origin=request.headers.get('Origin');if(origin&&origin!==url.origin)return error('Cross-origin writes are not allowed',403);
   if(!request.headers.get('Content-Type')?.startsWith('application/json'))return error('JSON required',415);
   if(Number(request.headers.get('Content-Length'))>900000)return error('Payload too large',413);
  }
  if(path==='/api/state'&&request.method==='GET'){
   const all=await reports(env.BUCKET);
   const extra=await objects(env.BUCKET,'queue/');const queue=[...DEFAULT_QUEUE];
   for(const o of extra){const row=await get(env.BUCKET,o.key);const i=queue.findIndex(q=>q.ticker===row.ticker);if(i<0)queue.push(row);else queue[i]={...queue[i],...row};}
   const runKeys=(await objects(env.BUCKET,'runs/')).sort((a,b)=>b.key.localeCompare(a.key)).slice(0,30);
   const runs=await Promise.all(runKeys.map(o=>get(env.BUCKET,o.key)));
   return json({reports:all.map(reportSummary),queue:queue.map(q=>({...q,lastReport:all.find(r=>r.ticker===q.ticker)?.asOf||null})),schedule:await get(env.BUCKET,'settings/schedule.json'),runs});
  }
  if(path==='/api/reports'&&request.method==='POST'){
   const raw=await request.text();if(raw.length>800000)return error('Payload too large',413);
   const record=JSON.parse(raw);validateReport(record);const hash=await digest(record),key='reports/'+record.id+'.json';
   const old=await get(env.BUCKET,key);if(old)return old.contentHash===hash?json({ok:true,id:old.id,duplicate:true}):error('Report id already exists; use a new revision id to preserve history',409);
   record.createdAt=new Date().toISOString();record.contentHash=hash;await put(env.BUCKET,key,record);
   const saved=await get(env.BUCKET,key);if(saved?.contentHash!==hash)throw new Error('Write readback failed');
   await put(env.BUCKET,'runs/'+record.createdAt+'-'+record.id+'.json',{id:record.id,at:record.createdAt,status:'succeeded',company:record.company,message:'已入库并回读验证',reportId:record.id});
   return json({ok:true,id:record.id,sourceCount:record.sources.length,verified:true},201);
  }
  if(path.startsWith('/api/reports/')&&request.method==='GET'){
   const id=path.slice('/api/reports/'.length);if(!/^[a-z0-9][a-z0-9._-]{2,119}$/.test(id))return error('Invalid id');
   const r=await get(env.BUCKET,'reports/'+id+'.json');return r?json(r):error('Report not found',404);
  }
  if(path==='/api/queue'&&request.method==='POST'){
   const r=await request.json();for(const k of ['company','ticker','sector','angle'])if(typeof r[k]!=='string'||!r[k].trim()||r[k].length>200)return error('请填写完整的公司、代码、行业与研究问题');
   const record={company:r.company.trim(),ticker:r.ticker.trim().toUpperCase(),sector:r.sector.trim(),angle:r.angle.trim(),priority:'user',addedAt:new Date().toISOString()};
   await put(env.BUCKET,'queue/'+encodeURIComponent(record.ticker)+'.json',record);return json({ok:true,record});
  }
  if(path==='/api/schedule'&&request.method==='POST'){
   const r=await request.json();if(!r.automationId||!r.timezone||!r.schedule||typeof r.enabled!=='boolean')return error('Verified automation metadata required');
   await put(env.BUCKET,'settings/schedule.json',{automationId:r.automationId,timezone:r.timezone,schedule:r.schedule,enabled:r.enabled,label:r.label||'周一至周五 00:00',updatedAt:new Date().toISOString()});return json({ok:true});
  }
  if(path==='/api/runs'&&request.method==='POST'){
   const r=await request.json();if(!['failed','partial','skipped'].includes(r.status)||typeof r.message!=='string')return error('Invalid run');
   const at=new Date().toISOString();await put(env.BUCKET,'runs/'+at+'.json',{at,status:r.status,message:r.message.slice(0,2000),company:String(r.company||'').slice(0,200)});return json({ok:true});
  }
  return error('Not found',404);
 }catch(e){return error(e.message||'Unexpected error',500);}
}};
