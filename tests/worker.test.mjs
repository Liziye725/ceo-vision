import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import worker from '../dist/server/index.js';
// Synthetic fixture: exercise storage and validation without publishing private reports.
const sources=Array.from({length:11},(_,i)=>({id:`s${i+1}`,title:`Official document ${i+1}`,publisher:'Example issuer',url:`https://example.org/source/${i+1}`,date:'2026-11-01',kind:'一手',note:'Synthetic test evidence'}));
const sourceIds=['s1'];
const record={
 id:'example-2026-11-27',company:'Example',ticker:'EXM',sector:'测试',title:'Example CEO research',
 asOf:'2026-11-27',evidenceThrough:'2026-11-26',summary:'Synthetic summary',verdict:'Synthetic verdict',
 metrics:[{label:'Revenue',value:'1',detail:'Synthetic',sourceIds}],
 findings:Array.from({length:3},(_,i)=>({title:`Finding ${i+1}`,evidence:'Synthetic fact',inference:'Synthetic inference',counterargument:'Synthetic counterargument',confidence:'low',sourceIds})),
 dimensions:Array.from({length:14},(_,i)=>({key:`d${i+1}`,title:`Dimension ${i+1}`,facts:'Synthetic fact',implication:'Synthetic implication',decision:'Synthetic decision',unknowns:'Synthetic gap',sourceIds})),
 decisions:Array.from({length:5},(_,i)=>({title:`Decision ${i+1}`,horizon:'30 days',action:'Synthetic action',tradeoff:'Synthetic tradeoff',trigger:'Synthetic trigger',owner:'CEO',sourceIds})),
 scenarios:['基准','上行','下行'].map(name=>({name,assumptions:'Synthetic',outcome:'Synthetic',signals:'Synthetic'})),
 sources,gaps:['Synthetic gap'],watchlist:[{metric:'Synthetic signal',reason:'Synthetic',trigger:'Synthetic'}]
};
class Bucket{data=new Map();async get(k){const x=this.data.get(k);return x?{json:async()=>JSON.parse(x)}:null}async put(k,v){this.data.set(k,v);return {key:k}}async list({prefix}){return {objects:[...this.data.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key})),truncated:false}}}
const env={BUCKET:new Bucket()};
const call=(path,body,headers={})=>worker.fetch(new Request('https://example.test'+path,body?{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)}:undefined),env);
test('published workflow and frontend are complete and script parses',async()=>{const page=await (await call('/')).text();assert.match(page,/14 个研究维度/);new vm.Script(page.match(/<script>([\s\S]*?)<\/script>/)[1]);const flow=await (await call('/api/workflow')).json();assert.match(flow.instructions,/OAI-Sites-Authorization/);assert.match(flow.instructions,/最多 3 次/)});
test('initial research persists, reads back, is indexed, and retries are idempotent',async()=>{assert.equal((await call('/api/reports',record)).status,201);const state=await (await call('/api/state')).json();assert.equal(state.reports.length,1);assert.equal(state.runs.length,1);assert.equal(state.reports[0].sourceCount,11);const saved=await (await call('/api/reports/'+record.id)).json();assert.equal(saved.dimensions.length,14);assert.equal(saved.title,record.title);assert.equal((await (await call('/api/reports',record)).json()).duplicate,true);assert.equal((await (await call('/api/state')).json()).runs.length,1);assert.equal((await call('/api/reports',{...record,title:'Changed'})).status,409)});
test('cross-origin writes and incomplete evidence are rejected without mutation',async()=>{assert.equal((await call('/api/queue',{company:'X'},{Origin:'https://attacker.test'})).status,403);const r=await call('/api/reports',{...record,id:'invalid-record',sources:[]});assert.ok(r.status>=400);assert.equal((await (await call('/api/state')).json()).reports.length,1)});
test('user priorities, failure log and verified schedule metadata survive readback',async()=>{assert.equal((await call('/api/queue',{company:'小米',ticker:'1810.hk',sector:'消费科技',angle:'汽车的资本回报'})).status,200);await call('/api/runs',{status:'failed',company:'Example',message:'Source inaccessible'});await call('/api/schedule',{automationId:'test-only',timezone:'Asia/Shanghai',schedule:'BEGIN:VEVENT\nRRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;BYHOUR=0;BYMINUTE=0;BYSECOND=0\nEND:VEVENT',enabled:true});const state=await (await call('/api/state')).json();assert.equal(state.queue.find(r=>r.ticker==='1810.HK').priority,'user');assert.equal(state.schedule.enabled,true);assert.ok(state.runs.some(r=>r.status==='failed'))});
