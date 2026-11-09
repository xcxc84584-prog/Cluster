'use strict';
// P3.5 standalone MCP Streamable HTTP bridge. Node >=20. Start with node remote-mcp.cjs.
// HTTPS termination must be supplied by a trusted reverse proxy / tunnel.
// Do not expose the terminal service (43879) directly.
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const {URL}=require('node:url');
const configDir=path.join(process.env.LOCALAPPDATA||path.join(os.homedir(),'AppData','Local'),'ClusterTerminalAgent');
const pairingPath=path.join(configDir,'pairing-token');
const accessPath=path.join(configDir,'remote-mcp-token');
const host='127.0.0.1',port=Number(process.env.CLUSTER_MCP_PORT||43880);
const upstream='http://127.0.0.1:'+(process.env.CLUSTER_TERMINAL_PORT||43879);
fs.mkdirSync(configDir,{recursive:true});
if(!fs.existsSync(accessPath))fs.writeFileSync(accessPath,crypto.randomBytes(32).toString('hex')+'\n',{mode:0o600,flag:'wx'});
const accessToken=fs.readFileSync(accessPath,'utf8').trim();
// OAuth compatibility is implemented by a separate gateway; the local MCP remains
// bound to loopback and continues to require its independent bearer credential.
// Never accept unauthenticated remote requests on this port.
const tools=[
 {name:'cluster.get_status',description:'Get status of the paired Cluster local Agent and browser editor.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'cluster.get_task_status',description:'Get recent local task states.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'cluster.list_files',description:'List files opened in Cluster editor.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'cluster.get_editor_state',description:'Get active Cluster editor state.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'cluster.read_file',description:'Read an open and saved Cluster editor file by its ID.',inputSchema:{type:'object',properties:{id:{type:'string'}},required:['id'],additionalProperties:false}},
 {name:'cluster.list_roots',description:'List Explorer roots.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'cluster.list_directory',description:'List entries in an authorized Explorer directory.',inputSchema:{type:'object',properties:{path:{type:'string'}},required:['path'],additionalProperties:false}},
 {name:'cluster.read_path',description:'Read a portion of an Explorer file using offset and length; supports large files without loading them all.',inputSchema:{type:'object',properties:{path:{type:'string'},offset:{type:'integer',minimum:0},length:{type:'integer',minimum:1,maximum:262144}},required:['path'],additionalProperties:false}},
 {name:'cluster.create_file',description:'Create an empty file in an authorized Explorer directory.',inputSchema:{type:'object',properties:{path:{type:'string'},name:{type:'string'}},required:['path','name'],additionalProperties:false}},
 {name:'cluster.write_path',description:'Replace a file with UTF-8 text only if expectedLastModified matches; full replacement requires confirmFullReplace=true. Large files should use an external streaming editor.',inputSchema:{type:'object',properties:{path:{type:'string'},content:{type:'string'},expectedLastModified:{type:'number'},confirmFullReplace:{type:'boolean',const:true}},required:['path','content','expectedLastModified','confirmFullReplace'],additionalProperties:false}},
 {name:'cluster.delete_path',description:'Request interactive user approval to delete one Explorer file.',inputSchema:{type:'object',properties:{path:{type:'string'}},required:['path'],additionalProperties:false}},
 {name:'cluster.powershell_request',description:'Execute a PowerShell command only after the Cluster browser explicitly confirms the exact command. Runs as the local signed-in user; not sandboxed.',inputSchema:{type:'object',properties:{command:{type:'string'}},required:['command'],additionalProperties:false}}
];
const names=new Set(tools.map(x=>x.name));
const maxBody=32768;
function json(res,status,obj){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':'none'});res.end(JSON.stringify(obj));}
function rpcError(id,code,message){return {jsonrpc:'2.0',id,error:{code,message}};}
function equalToken(candidate){if(typeof candidate!=='string')return false;const a=Buffer.from(candidate),b=Buffer.from(accessToken);return a.length===b.length&&crypto.timingSafeEqual(a,b);}
async function upstreamCall(name,args){
 const token=fs.readFileSync(pairingPath,'utf8').trim();
 const route=name==='cluster.get_status'?'/mcp/status':name==='cluster.get_task_status'?'/mcp/tasks':'/mcp/call';
 const response=await fetch(upstream+route,{method:route==='/mcp/call'?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(route==='/mcp/call'?{body:JSON.stringify({name,arguments:args||{}})}:{}),signal:AbortSignal.timeout(14000)});
 const data=await response.json();
 if(!response.ok)throw Error(data.error||'Local Agent HTTP '+response.status);
 return data;
}
async function rpc(msg){
 const id=msg.id;
 if(msg.method==='initialize')return {jsonrpc:'2.0',id,result:{protocolVersion:'2025-03-26',capabilities:{tools:{listChanged:false}},serverInfo:{name:'cluster-remote-mcp',version:'0.1.0'}}};
 if(msg.method==='ping')return {jsonrpc:'2.0',id,result:{}};
 if(msg.method==='tools/list')return {jsonrpc:'2.0',id,result:{tools}};
 if(msg.method==='tools/call'){
  const name=msg.params?.name;
  if(!names.has(name))return rpcError(id,-32602,'Unknown tool');
  if(name==='cluster.read_file'&&(typeof msg.params?.arguments?.id!=='string'||msg.params.arguments.id.length>200))return rpcError(id,-32602,'Invalid document ID');
  try{const result=await upstreamCall(name,msg.params?.arguments);return {jsonrpc:'2.0',id,result:{content:[{type:'text',text:JSON.stringify(result.result??result)}]}};}
  catch(e){return {jsonrpc:'2.0',id,result:{isError:true,content:[{type:'text',text:String(e.message).slice(0,500)}]}};}
 }
 return rpcError(id,-32601,'Method not found');
}
const server=http.createServer(async(req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname!=='/mcp'){json(res,404,{error:'Not Found'});return;}
 const authorization=req.headers.authorization||'';
 if(!authorization.startsWith('Bearer ')||!equalToken(authorization.slice(7))){res.setHeader('WWW-Authenticate','Bearer realm="Cluster MCP"');json(res,401,{error:'Unauthorized'});return;}
 if(req.method==='GET'){res.writeHead(405,{'Allow':'POST, DELETE','Cache-Control':'no-store'});res.end();return;}
 if(req.method==='DELETE'){res.writeHead(204);res.end();return;}
 if(req.method!=='POST'){json(res,405,{error:'Method not allowed'});return;}
 let body='';try{for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>maxBody){json(res,413,{error:'Request too large'});return;}}}catch{return;}
 let msg;try{msg=JSON.parse(body)}catch{json(res,400,rpcError(null,-32700,'Parse error'));return;}
 if(!msg||msg.jsonrpc!=='2.0'||typeof msg.method!=='string'||Array.isArray(msg)){json(res,400,rpcError(msg?.id??null,-32600,'Invalid Request'));return;}
 if(msg.id===undefined){res.writeHead(202,{'Cache-Control':'no-store'});res.end();return;}
 const result=await rpc(msg);
 json(res,200,result);
});
server.listen(port,host,()=>{console.log('Cluster MCP listening at http://'+host+':'+port+'/mcp');console.log('Bearer token saved to '+accessPath);console.log('Run a trusted HTTPS tunnel to this port. Never publish the token.');});
