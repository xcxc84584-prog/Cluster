'use strict';
// Cluster MCP stdio bridge P3. Read-only. Run on the same Windows account as Cluster Agent.
// MCP stdio transport uses newline-delimited JSON-RPC messages.
const fs=require('node:fs');
const path=require('node:path');
const readline=require('node:readline');
const tokenPath=path.join(process.env.LOCALAPPDATA||path.join(require('node:os').homedir(),'AppData','Local'),'ClusterTerminalAgent','pairing-token');
const endpoint='http://127.0.0.1:'+(process.env.CLUSTER_TERMINAL_PORT||43879);
function respond(id,result){process.stdout.write(JSON.stringify({jsonrpc:'2.0',id,result})+'\n');}
function error(id,code,message){process.stdout.write(JSON.stringify({jsonrpc:'2.0',id,error:{code,message}})+'\n');}
async function local(route,call){
 const token=fs.readFileSync(tokenPath,'utf8').trim();
 const response=await fetch(endpoint+route,{method:call?'POST':'GET',headers:{Authorization:'Bearer '+token,...(call?{'Content-Type':'application/json'}:{})},...(call?{body:JSON.stringify(call)}:{}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Local gateway returned HTTP '+response.status);
 return response.json();
}
const tools=[
 {name:'cluster.get_status',description:'Read the status of the local Cluster Gateway. This does not expose browser editor state.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'cluster.get_task_status',description:'List recent locally recorded gateway tasks (read-only).',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'cluster.list_files',description:'List documents currently opened in Cluster editor; not entire disk.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'cluster.get_editor_state',description:'Get active Cluster editor tab metadata.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'cluster.read_file',description:'Read an opened, saved, small document by ID; unsaved edits and large files are rejected.',inputSchema:{type:'object',properties:{id:{type:'string'}},required:['id'],additionalProperties:false}}
];
async function handle(m){
 if(!m||m.jsonrpc!=='2.0'||typeof m.method!=='string')return;
 if(m.method==='notifications/initialized')return;
 if(m.id===undefined)return;
 if(m.method==='initialize'){respond(m.id,{protocolVersion:'2025-03-26',capabilities:{tools:{listChanged:false}},serverInfo:{name:'cluster-local-mcp',version:'0.1.0'}});return;}
 if(m.method==='ping'){respond(m.id,{});return;}
 if(m.method==='tools/list'){respond(m.id,{tools});return;}
 if(m.method==='tools/call'){
  const name=m.params?.name;
  const route=name==='cluster.get_status'?'/mcp/status':name==='cluster.get_task_status'?'/mcp/tasks':tools.some(t=>t.name===name)?'/mcp/call':null;
  if(!route){error(m.id,-32602,'Unknown tool');return;}
  try{const data=await local(route,route==='/mcp/call'?{name,arguments:m.params?.arguments||{}}:null);respond(m.id,{content:[{type:'text',text:JSON.stringify(data,null,2)}]});}
  catch(e){respond(m.id,{isError:true,content:[{type:'text',text:'Cluster gateway unavailable: '+e.message}]});}
  return;
 }
 error(m.id,-32601,'Method not found');
}
readline.createInterface({input:process.stdin,crlfDelay:Infinity}).on('line',line=>{try{void handle(JSON.parse(line)).catch(e=>console.error(e.message));}catch(e){console.error('Invalid MCP message: '+e.message);}});
