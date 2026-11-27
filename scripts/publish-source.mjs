// Fallback source sync for environments without the Sites plugin filesystem helpers.
// Credentials are accepted via hidden stdin only and passed to Git in process memory.
import {spawnSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import readline from 'node:readline';
if(process.stdin.isTTY)spawnSync('stty',['-echo'],{stdio:['inherit','ignore','ignore']});
console.log('Ready for workflow JSON on stdin (input is hidden).');
const rl=readline.createInterface({input:process.stdin,terminal:false});
const input=await new Promise(resolve=>rl.once('line',resolve));rl.close();
if(process.stdin.isTTY)spawnSync('stty',['echo'],{stdio:['inherit','ignore','ignore']});
const {credential}=JSON.parse(input);
function run(args,opts={}){const r=spawnSync(args[0],args.slice(1),{encoding:'utf8',...opts});if(r.status!==0){let message=(r.stderr||r.stdout||'Command failed');if(credential.token)message=message.split(credential.token).join('[redacted]');throw new Error(message)}return r.stdout.trim()}
run(['git','init','-b',credential.branch]);
run(['git','config','user.name','Sites']);run(['git','config','user.email','sites@local']);
const remotes=run(['git','remote']);run(['git','remote',remotes.includes('origin')?'set-url':'add','origin',credential.remote_url]);
run(['git','add','--all']);
const changes=run(['git','status','--porcelain']);if(changes)run(['git','commit','-m','Build CEO research observatory and durable research workflow']);
const pushEnv={...process.env,GIT_TERMINAL_PROMPT:'0'};
if(credential.auth_mode!=='work_proxy'){pushEnv.GIT_CONFIG_COUNT='1';pushEnv.GIT_CONFIG_KEY_0='http.extraHeader';pushEnv.GIT_CONFIG_VALUE_0='Authorization: Bearer '+credential.token;}
run(['git','push','-u','origin',credential.branch],{env:pushEnv});
const commit=run(['git','rev-parse','HEAD']);
mkdirSync('outputs',{recursive:true});
run(['tar','-czf','outputs/deployment.tar.gz','.openai','dist/server']);
console.log(JSON.stringify({commit_sha:commit,archive:process.cwd()+'/outputs/deployment.tar.gz'}));
