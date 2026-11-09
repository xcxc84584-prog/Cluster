'use strict';
// Run on Windows, as the signed-in user. This agent never serves a command HTTP endpoint.
const http=require('node:http');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {WebSocketServer}=require('ws');
const pty=require('node-pty');
const PORT=Number(process.env.CLUSTER_TERMINAL_PORT||43879);
const ORIGIN=process.env.CLUSTER_TERMINAL_ORIGIN;
if(!ORIGIN||!/^https:\/\/[^/]+(?:\/[^?#]*)?$/.test(ORIGIN)){
 console.error('Set CLUSTER_TERMINAL_ORIGIN to the exact GitHub Pages origin (e.g. https://account.github.io).');process.exit(1);
}
const allowedOrigin=new URL(ORIGIN).origin;
const configDir=path.join(process.env.LOCALAPPDATA||path.join(require('node:os').homedir(),'AppData','Local'),'ClusterTerminalAgent');
fs.mkdirSync(configDir,{recursive:true});
const tokenFile=path.join(configDir,'pairing-token');
let token;
if(fs.existsSync(tokenFile)){
 token=fs.readFileSync(tokenFile,'utf8').trim();
 if(!/^[a-f0-9]{64}$/.test(token))throw Error('Invalid stored pairing token');
}else{
 token=crypto.randomBytes(32).toString('hex');
 fs.writeFileSync(tokenFile,token+'\n',{flag:'wx',mode:0o600});
}

const providerFile=path.join(configDir,'ai-provider.json');
function readProvider(){try{const p=JSON.parse(fs.readFileSync(providerFile,'utf8'));return {apiKey:p.apiKey||'',model:p.model||'gpt-4.1-mini'};}catch{return {apiKey:'',model:'gpt-4.1-mini'};}}
function saveProvider(p){fs.writeFileSync(providerFile,JSON.stringify(p),{mode:0o600});}
const MAX_SESSIONS=8,MAX_MESSAGE=65536;
const roots=new Map();const sessions=new Map();
const gatewayStarted=Date.now();
const gatewayTasks=new Map();
const pendingTools=new Map();let browserBridge=null;const registeredRootPaths=new Map();
const powershellJobs=new Map();
function runApprovedPowerShell(requestId,command){
 return new Promise((resolve,reject)=>{
  const exe=process.env.SystemRoot?path.join(process.env.SystemRoot,'System32','WindowsPowerShell','v1.0','powershell.exe'):'powershell.exe';
  const encoded=Buffer.from(command,'utf16le').toString('base64');
  const child=spawn(exe,['-NoLogo','-NoProfile','-NonInteractive','-EncodedCommand',encoded],{cwd:path.parse(process.env.SystemRoot||process.cwd()).root,windowsHide:true,stdio:['ignore','pipe','pipe']});
  powershellJobs.set(requestId,child);
  let stdout='',stderr='',bytes=0,finished=false;
  const timeout=setTimeout(()=>{child.kill();},15000);
  const collect=(key,buf)=>{bytes+=buf.length;if(bytes>131072){child.kill();return;}if(key==='out')stdout+=buf.toString('utf8');else stderr+=buf.toString('utf8');};
  child.stdout.on('data',b=>collect('out',b));child.stderr.on('data',b=>collect('err',b));
  child.on('error',e=>{if(!finished){finished=true;clearTimeout(timeout);powershellJobs.delete(requestId);reject(e)}});
  child.on('close',code=>{if(finished)return;finished=true;clearTimeout(timeout);powershellJobs.delete(requestId);resolve({exitCode:code,stdout:stdout.slice(0,65536),stderr:stderr.slice(0,65536),truncated:bytes>131072})});
 });
}

function gatewayResponse(res,status,data){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
const server=http.createServer((req,res)=>{
 const route=(req.url||'').split('?')[0];
 if(!isLoopback(req.socket.remoteAddress)||typeof req.headers.authorization!=='string'||req.headers.authorization.length!==7+token.length||!crypto.timingSafeEqual(Buffer.from(req.headers.authorization),Buffer.from('Bearer '+token))){gatewayResponse(res,403,{error:'Forbidden'});return;}
 if(req.method==='POST'&&route==='/mcp/call'){
  let raw='';req.on('data',chunk=>{raw+=chunk;if(raw.length>8192)req.destroy();});
  req.on('end',()=>{let m;try{m=JSON.parse(raw)}catch{gatewayResponse(res,400,{error:'Invalid JSON'});return;}
   if(!['cluster.list_files','cluster.read_file','cluster.get_editor_state','cluster.list_roots','cluster.get_root_windows_path','cluster.list_directory','cluster.read_path','cluster.create_file','cluster.write_path','cluster.delete_path','cluster.powershell_request'].includes(m.name)){gatewayResponse(res,400,{error:'Unknown tool'});return;}
   if(!browserBridge||browserBridge.readyState!==1){gatewayResponse(res,503,{error:'Cluster browser bridge disconnected'});return;}
   const requestId=crypto.randomUUID();const timer=setTimeout(()=>{pendingTools.delete(requestId);gatewayResponse(res,504,{error:'Browser bridge timeout'});},125000);
   pendingTools.set(requestId,{res,timer,name:m.name,command:m.name==='cluster.powershell_request'?m.arguments?.command:null});
   send(browserBridge,{type:'tool_call',requestId,name:m.name,args:m.arguments||{}});
  });return;
 }
 if(req.method!=='GET'||!['/mcp/status','/mcp/tasks'].includes(route)){gatewayResponse(res,404,{error:'Not Found'});return;}
 if(route==='/mcp/status')gatewayResponse(res,200,{connected:true,service:'Cluster Local Gateway',version:'p3.4-readonly',uptimeMs:Date.now()-gatewayStarted,activeTerminalSessions:sessions.size,capabilities:['cluster.get_status','cluster.get_task_status','cluster.list_files','cluster.read_file','cluster.get_editor_state','cluster.list_roots','cluster.list_directory','cluster.read_path','cluster.create_file','cluster.write_path','cluster.delete_path','cluster.powershell_request'],browserEditorConnected:!!browserBridge&&browserBridge.readyState===1});
 else gatewayResponse(res,200,{tasks:[...gatewayTasks.values()].slice(-50)});
});
const wss=new WebSocketServer({noServer:true,maxPayload:MAX_MESSAGE});
function isLoopback(addr){return addr==='127.0.0.1'||addr==='::1'||addr==='::ffff:127.0.0.1';}
server.on('upgrade',(req,socket,head)=>{
 const origin=req.headers.origin;
 if(!isLoopback(req.socket.remoteAddress)||origin!==allowedOrigin||!['/terminal','/agent'].includes(req.url)){
  socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();return;
 }
 wss.handleUpgrade(req,socket,head,ws=>{ws.clusterAgentMode=req.url==='/agent';wss.emit('connection',ws,req)});
});
function send(ws,obj){if(ws.readyState===1)ws.send(JSON.stringify(obj));}
function validRoot(value,expected){
 if(typeof value!=='string'||!path.win32.isAbsolute(value)||value.includes('\0'))throw Error('Absolute Windows directory required');
 const canonical=fs.realpathSync.native(value);
 if(!fs.statSync(canonical).isDirectory())throw Error('Not a directory');
 // Workspace display names are labels only; the user explicitly authorizes an existing absolute directory.
 return canonical;
}
function closeSession(id){const s=sessions.get(id);if(!s)return; sessions.delete(id);try{s.pty.kill();}catch{} }
wss.on('connection',ws=>{
 let authorized=false;const owned=new Set();let aiTask=null;const timeout=setTimeout(()=>{if(!authorized)ws.close(1008,'Authentication required');},10000);
 ws.on('message',raw=>{
  let m;try{m=JSON.parse(raw.toString());if(!m||typeof m.type!=='string')throw Error('Invalid message');
   if(!authorized){if(m.type!=='auth'||typeof m.token!=='string'||m.token.length!==token.length||!crypto.timingSafeEqual(Buffer.from(m.token),Buffer.from(token)))throw Error('Authentication failed');authorized=true;clearTimeout(timeout);send(ws,{type:'ready',maxSessions:MAX_SESSIONS});return;}
   if(ws.clusterAgentMode){
    if(m.type==='root_path_register'){
     if(ws!==browserBridge)throw Error('Only registered Cluster browser can register paths');
     const name=String(m.root||'');if(!name||name.length>255)throw Error('Invalid root');
     const dir=validRoot(m.path);if(path.win32.basename(dir).toLowerCase()!==name.toLowerCase())throw Error('ROOT_NAME_MISMATCH: selected folder name and Windows path differ');
     registeredRootPaths.set(name,dir);send(ws,{type:'root_path_registered',root:name,path:dir});return;
    }
    if(m.type==='ping'){send(ws,{type:'pong',requestId:m.requestId,at:Date.now()});return;}
    if(m.type==='bridge_register'){browserBridge=ws;send(ws,{type:'bridge_registered'});return;}
    if(m.type==='tool_result'){const pending=pendingTools.get(m.requestId);if(!pending||ws!==browserBridge)return;pendingTools.delete(m.requestId);clearTimeout(pending.timer);
     if(pending.name==='cluster.powershell_request'&&!m.error&&m.result?.approved===true){
      if(sessions.size===0){gatewayResponse(pending.res,403,{error:'POWERSHELL_WINDOW_REQUIRED: Open a PowerShell session in Cluster first'});return;}
      const command=pending.command;
      if(typeof command!=='string'||!command.trim()||command.length>2000){gatewayResponse(pending.res,422,{error:'Invalid approved command'});return;}
      runApprovedPowerShell(m.requestId,command).then(result=>{send(browserBridge,{type:'powershell_execution_result',command,result});gatewayResponse(pending.res,200,{result});}).catch(e=>{send(browserBridge,{type:'powershell_execution_result',command,error:e.message});gatewayResponse(pending.res,422,{error:e.message});});return;
     }
     if(pending.name==='cluster.get_root_windows_path'&&!m.error){const name=String(m.result?.root||'');const dir=registeredRootPaths.get(name);gatewayResponse(pending.res,200,{result:{root:name,absolutePath:dir||null,verified:false,registered:!!dir,reason:dir?'HANDLE_IDENTITY_NOT_VERIFIED':'ROOT_PATH_NOT_REGISTERED',verification:'Windows path exists and basename matches Explorer root; handle identity not independently verified'}});return;}
     gatewayResponse(pending.res,m.error?422:200,m.error?{error:String(m.error).slice(0,300)}:{result:m.result});return;}
    if(m.type==='provider_get'){const p=readProvider();send(ws,{type:'provider_info',configured:!!p.apiKey,model:p.model});return;}
    if(m.type==='provider_set'){
     if(typeof m.apiKey!=='string'||!/^sk-[\w-]{10,256}$/.test(m.apiKey)||typeof m.model!=='string'||/^[\w.:-]{1,100}$/.test(m.model)===false)throw Error('Invalid API key or model');
     saveProvider({apiKey:m.apiKey,model:m.model});send(ws,{type:'provider_info',configured:true,model:m.model});return;
    }
    if(m.type==='task_cancel'){
     if(aiTask&&m.requestId===aiTask.requestId){aiTask.controller.abort();send(ws,{type:'task_status',requestId:m.requestId,status:'interrupted',message:'Cancelled by user'});aiTask=null;}
     return;
    }
    if(m.type==='task'){
     const requestId=typeof m.requestId==='string'?m.requestId:'';
     if(!/^[\w-]{1,100}$/.test(requestId)||typeof m.prompt!=='string'||!m.prompt.trim()||m.prompt.length>8000)throw Error('Invalid task');
     if(aiTask)throw Error('A task is already running');
     const provider=readProvider();
     if(!provider.apiKey){send(ws,{type:'task_status',requestId,status:'failed',message:'Configure an OpenAI API key first.'});return;}
     const controller=new AbortController();aiTask={requestId,controller};
     gatewayTasks.set(requestId,{requestId,status:'running',updatedAt:Date.now()});send(ws,{type:'task_status',requestId,status:'running',message:'Requesting model response'});
     const timer=setTimeout(()=>controller.abort(),90000);
     (async()=>{
      try{
       const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Authorization':'Bearer '+provider.apiKey,'Content-Type':'application/json'},body:JSON.stringify({model:provider.model,messages:[{role:'system',content:'You are the Cluster IDE assistant. You cannot edit files or execute commands in this version. Respond with clear guidance.'},{role:'user',content:m.prompt}],max_completion_tokens:2048}),signal:controller.signal});
       const data=await response.json();
       if(!response.ok)throw Error('Model API error '+response.status+': '+String(data.error?.message||'Request failed').slice(0,250));
       if(aiTask?.requestId!==requestId)return;
       const answer=data.choices?.[0]?.message?.content;
       if(typeof answer!=='string')throw Error('No text response from model');
       send(ws,{type:'task_result',requestId,text:answer});
       gatewayTasks.set(requestId,{requestId,status:'completed',updatedAt:Date.now()});send(ws,{type:'task_status',requestId,status:'completed',message:'Completed'});
      }catch(e){if(aiTask?.requestId===requestId)send(ws,{type:'task_status',requestId,status:e.name==='AbortError'?'interrupted':'failed',message:e.name==='AbortError'?'Request timed out':e.message});}
      finally{clearTimeout(timer);if(aiTask?.requestId===requestId)aiTask=null;}
     })();return;
    }
    throw Error('Unsupported AI Agent operation');
   }
   if(m.type==='revoke'){
    token=crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(tokenFile,token+'\n',{mode:0o600});
    for(const id of [...sessions.keys()])closeSession(id);
    roots.clear();
    // Revoke access and terminate the local listener. Port 43879 must be released.
    for(const client of wss.clients)send(client,{type:'revoked',portClosed:true});
    setTimeout(()=>{
     for(const client of wss.clients){try{client.close(1000,'Pairing revoked');}catch{}}
     wss.close();
     server.close(()=>process.exit(0));
     // Do not leave a bound port behind if a socket refuses to close.
     setTimeout(()=>process.exit(0),1500).unref();
    },120);
    return;
   }
   if(m.type==='bind'){
    if(typeof m.workspaceId!=='string'||!/^[-\w:.]{1,160}$/.test(m.workspaceId))throw Error('Invalid workspace ID');
    if(m.workspaceId!=='cluster-drive-c'||typeof m.path!=='string'||m.path.toUpperCase()!=='C:\\')throw Error('Only C:\\\\ terminal sessions are supported');
    const dir=validRoot('C:\\\\');roots.set(m.workspaceId,dir);send(ws,{type:'bound',workspaceId:m.workspaceId,rootName:path.win32.basename(dir)});return;
   }
   if(m.type==='create'){
    if(sessions.size>=MAX_SESSIONS)throw Error('Session limit reached');
    const cwd=roots.get(m.workspaceId);if(!cwd)throw Error('Bind a workspace first');
    const id=crypto.randomUUID();const shell=process.env.SystemRoot?path.join(process.env.SystemRoot,'System32','WindowsPowerShell','v1.0','powershell.exe'):'powershell.exe';
    const term=pty.spawn(shell,['-NoLogo'],{name:'xterm-256color',cols:Math.max(20,Math.min(300,Number(m.cols)||100)),rows:Math.max(5,Math.min(100,Number(m.rows)||30)),cwd,env:{...process.env,TERM:'xterm-256color'}});
    sessions.set(id,{pty:term,owner:ws});owned.add(id);
    send(ws,{type:'created',requestId:m.requestId,id,workspaceId:m.workspaceId,cwd});
    term.onData(data=>send(ws,{type:'data',id,data}));
    term.onExit(e=>{sessions.delete(id);owned.delete(id);send(ws,{type:'exit',id,exitCode:e.exitCode});});return;
   }
   if(!owned.has(m.id))throw Error('Unknown or unauthorized session');
   const term=sessions.get(m.id)?.pty;if(!term)throw Error('Session closed');
   if(m.type==='input'){if(typeof m.data!=='string'||m.data.length>32768)throw Error('Invalid input');term.write(m.data);}
   else if(m.type==='resize'){const cols=Number(m.cols),rows=Number(m.rows);if(!Number.isInteger(cols)||!Number.isInteger(rows)||cols<20||cols>300||rows<5||rows>100)throw Error('Invalid size');term.resize(cols,rows);}
   else if(m.type==='close'){closeSession(m.id);owned.delete(m.id);send(ws,{type:'closed',id:m.id});}
   else throw Error('Unknown operation');
  }catch(e){send(ws,{type:'error',requestId:m?.requestId,message:e.message});}
 });
 ws.on('close',()=>{if(browserBridge===ws){browserBridge=null;for(const [id,p] of pendingTools){clearTimeout(p.timer);gatewayResponse(p.res,503,{error:'Browser disconnected'});pendingTools.delete(id);}}aiTask?.controller.abort();clearTimeout(timeout);for(const id of owned)closeSession(id);});
});
server.on('error',e=>{if(e.code==='EADDRINUSE'){console.error('Port '+PORT+' already in use. Cluster Agent may already be running. Do not start a second copy.');process.exitCode=0;}else{console.error(e);process.exitCode=1;}});
server.listen(PORT,'127.0.0.1',()=>{
 console.log('Cluster Terminal Agent listening on 127.0.0.1:'+PORT);
 console.log('Allowed origin: '+allowedOrigin);
 console.log('Pairing token (keep private; persists across Agent restarts): '+token);
 console.log('Keep this window open while using terminals. Do not share the token.');
});
process.on('SIGINT',()=>{for(const id of [...sessions.keys()])closeSession(id);server.close(()=>process.exit(0));});
module.exports={validRoot,isLoopback};
