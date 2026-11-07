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

const MAX_SESSIONS=8,MAX_MESSAGE=65536;
const roots=new Map();const sessions=new Map();
const server=http.createServer((req,res)=>{res.writeHead(404,{'Content-Type':'text/plain','Cache-Control':'no-store'});res.end('Not Found');});
const wss=new WebSocketServer({noServer:true,maxPayload:MAX_MESSAGE});
function isLoopback(addr){return addr==='127.0.0.1'||addr==='::1'||addr==='::ffff:127.0.0.1';}
server.on('upgrade',(req,socket,head)=>{
 const origin=req.headers.origin;
 if(!isLoopback(req.socket.remoteAddress)||origin!==allowedOrigin||req.url!=='/terminal'){
  socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();return;
 }
 wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
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
 let authorized=false;const owned=new Set();const timeout=setTimeout(()=>{if(!authorized)ws.close(1008,'Authentication required');},10000);
 ws.on('message',raw=>{
  let m;try{m=JSON.parse(raw.toString());if(!m||typeof m.type!=='string')throw Error('Invalid message');
   if(!authorized){if(m.type!=='auth'||typeof m.token!=='string'||m.token.length!==token.length||!crypto.timingSafeEqual(Buffer.from(m.token),Buffer.from(token)))throw Error('Authentication failed');authorized=true;clearTimeout(timeout);send(ws,{type:'ready',maxSessions:MAX_SESSIONS});return;}
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
   if(m.type==='openExplorer'){
    if(process.platform!=='win32')throw Error('Windows File Explorer is only available on Windows');
    const child=spawn('explorer.exe',[],{detached:true,stdio:'ignore',windowsHide:false});
    child.on('error',e=>send(ws,{type:'error',message:'Unable to open File Explorer: '+e.message}));
    child.unref();send(ws,{type:'explorerOpened'});return;
   }
   if(m.type==='bind'){
    if(typeof m.workspaceId!=='string'||!/^[-\w:.]{1,160}$/.test(m.workspaceId))throw Error('Invalid workspace ID');
    const dir=validRoot(m.path,m.rootName);roots.set(m.workspaceId,dir);send(ws,{type:'bound',workspaceId:m.workspaceId,rootName:path.win32.basename(dir)});return;
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
 ws.on('close',()=>{clearTimeout(timeout);for(const id of owned)closeSession(id);});
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
