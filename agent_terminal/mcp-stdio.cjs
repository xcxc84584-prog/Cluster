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
async function local(route){
 const token=fs.readFileSync(tokenPath,'utf8').trim();
 const response=await fetch(endpoint+route,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(5000)});
 if(!response.ok)throw Error('Local gateway returned HTTP '+response.status);
 return response.json();
}
const tools=[
 {name:'cluster.get_status',description:'Read the status of the local Cluster Gateway. This does not expose browser editor state.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'cluster.get_task_status',description:'List recent locally recorded gateway tasks (read-only).',inputSchema:{type:'object',properties:{},additionalProperties:false}}
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
  const route=name==='cluster.get_status'?'/mcp/status':name==='cluster.get_task_status'?'/mcp/tasks':null;
  if(!route){error(m.id,-32602,'Unknown tool');return;}
  try{const data=await local(route);respond(m.id,{content:[{type:'text',text:JSON.stringify(data,null,2)}]});}
  catch(e){respond(m.id,{isError:true,content:[{type:'text',text:'Cluster gateway unavailable: '+e.message}]});}
  return;
 }
 error(m.id,-32601,'Method not found');
}
readline.createInterface({input:process.stdin,crlfDelay:Infinity}).on('line',line=>{try{void handle(JSON.parse(line)).catch(e=>console.error(e.message));}catch(e){console.error('Invalid MCP message: '+e.message);}});
