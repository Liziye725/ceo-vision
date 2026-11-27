import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {validateReceipt,receiptPath,renderSummary} from '../src/run-receipt.mjs';
// Synthetic only; never written to production run history.
const sample=()=>({version:1,task:'career',plannedDate:'2026-01-01',startedAt:'2026-01-01T01:00:00.000Z',finishedAt:'2026-01-01T01:30:00.000Z',attempt:1,execution:'succeeded',research:'partial',archive:'verified',stage:'evidence',completedUnits:1,reusedSources:2,issues:['insufficient_evidence'],nextAction:'continue_research'});
test('partial research can execute successfully; retries retain distinct paths',()=>{
  assert.equal(validateReceipt(sample()).research,'partial');
  assert.notEqual(receiptPath(sample()),receiptPath({...sample(),attempt:2}));
});
test('reject unknown/private fields and free text in every public string',()=>{
  assert.throws(()=>validateReceipt({...sample(),email:'private@example.test'}));
  for(const key of ['task','plannedDate','startedAt','finishedAt','execution','research','archive','stage','nextAction']) assert.throws(()=>validateReceipt({...sample(),[key]:'private@example.test'}));
  assert.throws(()=>validateReceipt({...sample(),issues:['raw private error']}));
});
test('reject impossible dates, time reversal, invalid counts and inconsistent success',()=>{
  for(const patch of [{plannedDate:'2026-02-30'},{finishedAt:'2025-01-01T00:00:00.000Z'},{attempt:0},{reusedSources:-1},{completedUnits:1.5},{archive:'failed'},{execution:'failed',issues:[]}]) assert.throws(()=>validateReceipt({...sample(),...patch}));
});
test('summary distinguishes execution, quality and archive, counts failures',()=>{
  const s=renderSummary([sample(),{...sample(),attempt:2,execution:'failed',archive:'failed',issues:['archive_failed'],nextAction:'retry_archive'}]);
  assert.match(s,/insufficient_evidence: 1/);assert.match(s,/archive_failed: 1/);assert.match(s,/succeeded \| partial \| verified/);
  assert.match(renderSummary([]),/尚无运行回执/);
});
test('CLI validates paths and does not echo rejected private content',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'receipts-'));
  try {
    const root=path.join(dir,'runs'),out=path.join(dir,'summary.md');await mkdir(path.join(root,'career'),{recursive:true});
    const file=path.join(root,'career','2026-01-01-a1.json');await writeFile(file,JSON.stringify(sample()));
    const run=()=>spawnSync(process.execPath,['scripts/run-receipts.mjs','summary',root,out],{encoding:'utf8'});
    assert.equal(run().status,0);assert.match(await readFile(out,'utf8'),/career/);
    await writeFile(file,JSON.stringify({...sample(),email:'PRIVATE_SENTINEL'}));
    const bad=run();assert.equal(bad.status,1);assert.doesNotMatch(bad.stdout+bad.stderr,/PRIVATE_SENTINEL/);
    await writeFile(file,JSON.stringify({...sample(),attempt:2}));assert.equal(run().status,1);
  } finally {await rm(dir,{recursive:true,force:true});}
});
