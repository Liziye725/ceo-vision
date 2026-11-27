import {readFile,readdir,mkdir,writeFile,lstat} from 'node:fs/promises';
import path from 'node:path';
import {validateReceipt,receiptPath,renderSummary} from '../src/run-receipt.mjs';
// Validate before publishing: never print input, raw errors, or unknown fields.
const [mode,input,output] = process.argv.slice(2);
try {
  if (mode === 'check' && input) {
    const r=validateReceipt(JSON.parse(await readFile(input,'utf8')));
    console.log(receiptPath(r));
  } else if (mode === 'summary' && input && output) {
    const root=path.resolve(input), receipts=[];
    async function walk(dir) {
      for(const entry of await readdir(dir,{withFileTypes:true})) {
        const file=path.join(dir,entry.name);
        if(entry.isSymbolicLink()) throw Error('symlink');
        if(entry.isDirectory()) { await walk(file); continue; }
        if(entry.name === 'README.md' && dir === root) continue;
        if(!entry.isFile() || !entry.name.endsWith('.json') || (await lstat(file)).size > 4096) throw Error('unexpected file');
        const r=validateReceipt(JSON.parse(await readFile(file,'utf8')));
        if(path.relative(root,file).split(path.sep).join('/') !== receiptPath(r).slice('automation/runs/'.length)) throw Error('path mismatch');
        receipts.push(r);
      }
    }
    await walk(root);
    await mkdir(path.dirname(output),{recursive:true});
    await writeFile(output,renderSummary(receipts));
    console.log(`Validated ${receipts.length} public receipts.`);
  } else throw Error('usage');
} catch {
  console.error('Receipt validation failed. Check schema, filename and command arguments; raw input is not logged.');
  process.exitCode=1;
}
