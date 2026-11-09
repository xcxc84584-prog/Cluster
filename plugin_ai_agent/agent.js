/* Cluster AI Agent P0: authenticated local bridge, no simulated model execution. */
(()=>{'use strict';
const button=document.getElementById('clusterAiOpen'),host=document.getElementById('workarea'),tabs=document.getElementById('tabList');
if(!button||!host||!tabs)return;
const panel=document.createElement('section');panel.id='clusterAiPanel';panel.hidden=true;
panel.innerHTML='<div class="cai-bar"><strong>✧ AI Agent</strong><span id="caiStatus" role="status"></span><button id="caiSettings" type="button" data-zh="模型設定" data-en="Model settings"></button><button id="caiStop" type="button" hidden data-zh="中斷" data-en="Stop"></button><button id="caiPing" type="button" data-zh="測試連線" data-en="Test connection"></button><button id="caiRevokeLocal" type="button" class="cai-danger" data-zh="移除本地權限" data-en="Remove Local Permission" title="Revoke local pairing and close PowerShell sessions"></button><button id="caiClose" type="button">×</button></div><div class="cai-setup" id="caiSetup"><h2 data-zh="連結本地 AI Agent" data-en="Connect local AI Agent"></h2><p data-zh="沿用 Cluster PowerShell 的本地 Agent。初次使用請下載安裝程式並完成 PS BIND 配對。" data-en="Uses the existing Cluster PowerShell local Agent. Install and pair with PS BIND first."></p><a href="../Install-Cluster-Terminal.cmd" download="Install-Cluster-Terminal.cmd" data-zh="下載 Windows CMD 安裝程式" data-en="Download Windows CMD installer"></a><p data-zh="請從 PowerShell 配對畫面複製 Token；此處可使用相同的 64 字元 Token。" data-en="Copy the same 64-character token from the PowerShell pairing screen."></p><label for="caiToken">Pairing Token</label><input id="caiToken" type="password" autocomplete="off" spellcheck="false" placeholder="64-character token"><label class="cai-remember"><input id="caiRemember" type="checkbox"><span data-zh="記住此裝置的配對" data-en="Remember pairing on this device"></span></label><button id="caiConnect" type="button" data-zh="連線" data-en="Connect"></button><p id="caiError" role="alert"></p></div><div id="caiProvider" class="cai-setup" hidden><h2 data-zh="模型設定（僅限 OpenAI API）" data-en="Model settings (OpenAI API only)"></h2><p data-zh="金鑰傳送至本機 Agent 儲存，不存於網頁。請勿在共用電腦設定。" data-en="The key is stored by the local Agent, not in the browser. Avoid shared computers."></p><label>API Key<input id="caiApiKey" type="password" autocomplete="off" placeholder="sk-..."></label><label>Model<input id="caiModel" value="gpt-4.1-mini"></label><button id="caiSaveProvider" type="button" data-zh="儲存設定" data-en="Save settings"></button><button id="caiBack" type="button" data-zh="返回" data-en="Back"></button><p id="caiProviderStatus" role="status"></p></div><div id="caiWorkspace" class="cai-workspace" hidden><div class="cai-feed" id="caiFeed" role="log" aria-live="polite"></div><form id="caiForm"><textarea id="caiPrompt" maxlength="8000" rows="3" data-placeholder-zh="輸入任務需求…" data-placeholder-en="Describe a task…"></textarea><button type="submit" data-zh="送出" data-en="Send"></button></form></div>';
host.append(panel);
const guide=document.createElement('section');guide.id='caiConnectGuide';guide.className='cai-guide';
guide.innerHTML=`<div class="cai-guide-head"><strong data-zh="連接 ChatGPT" data-en="Connect ChatGPT"></strong></div><div class="cai-guide-steps"><ol>
<li data-zh="新版安裝器 v20261109-auto-node-1：偵測舊服務時會列出程序並詢問是否停止；確認後更新，保留原有 Token。更新會中斷現有連線。" data-en="Installer v20261109-auto-node-1: Detects existing services and asks before stopping them. Your tokens are preserved, but active connections will be interrupted."></li>\n<li><span data-zh="下載並執行 " data-en="Download and run "></span><a href="../tools/mcp/Cluster-MCP-OneClick.cmd" download="Cluster-MCP-OneClick.cmd">Cluster-MCP-OneClick</a></li>
<li data-zh="首次使用請先下載並執行 Cluster Terminal Agent 安裝程式；新版會自動檢查 Node.js 20+，若未安裝則透過 Windows winget 安裝 LTS 版本，無需自行設定 PATH。請允許安裝提示；若 winget 不存在，請先安裝 Windows App Installer。" data-en="For first-time setup, download and run the Cluster Terminal Agent installer first. It checks Node.js 20+ and automatically installs Node.js LTS via Windows winget if needed, without manual PATH configuration. Accept installer prompts. If winget is missing, install Windows App Installer first."></li>
<li><span data-zh="下載並執行 " data-en="Download and run "></span><a href="../tools/mcp/Cluster-ChatGPT-OAuth-Connect.cmd" download="Cluster-ChatGPT-OAuth-Connect.cmd">Cluster-ChatGPT-OAuth-Connect</a></li>
<li data-zh="複製「Cluster ChatGPT OAuth MCP Ready」顯示的 URL。" data-en="Copy the URL shown under 'Cluster ChatGPT OAuth MCP Ready'."></li>
<li data-zh="開啟 ChatGPT → 個人檔案 → 設定 → 外掛程序 → 瀏覽目錄 → 右上角新增 → 新增自訂 MCP 服務器。" data-en="Open ChatGPT → Profile → Settings → Plugins → Browse directory → Add (top right) → Add custom MCP server."></li>
<li data-zh="填寫 Project 名稱，在「連線」貼上 URL，然後建立外掛程序。" data-en="Enter the Project name, paste the URL into Connection, then create the plugin."></li>
<li data-zh="回到 OAuth Connect 執行視窗，找到「When ChatGPT opens the consent page, use the local approval password file:」下方路徑。" data-en="In the OAuth Connect terminal, find the path after 'When ChatGPT opens the consent page, use the local approval password file:'."></li>
<li data-zh="在檔案總管開啟該路徑，複製密碼，貼入授權頁並按「同意授權」，完成連接。" data-en="Open that path in File Explorer, copy the password, paste it into the consent page, and select Approve to finish."></li>
</ol></div><div class="cai-guide-state" id="caiGuideState" role="status"></div>`;
const $=id=>document.getElementById(id);
$('caiWorkspace').append(guide);guide.hidden=true;let ws=null,ready=false,active=false,tab=null,taskId=null;const tokenKey='cluster-terminal-token',rememberKey='cluster-terminal-remembered-token-v1',oldKey='cluster-ai-agent-token-v1';
$('caiToken').value=sessionStorage.getItem(tokenKey)||localStorage.getItem(rememberKey)||sessionStorage.getItem(oldKey)||localStorage.getItem(oldKey)||'';
$('caiRemember').checked=!!(localStorage.getItem(rememberKey)||localStorage.getItem(oldKey));
function lang(){return document.getElementById('uiLanguage')?.value==='en'?'en':'zh'}
function updateGuide(){guide.hidden=!ready;const state=document.getElementById('caiGuideState');if(state)state.textContent=lang()==='zh'?'本地 Agent 已 BIND；遠端 HTTPS MCP 尚未設定':'Local Agent bound; remote HTTPS MCP not configured';}
function translate(){const l=lang();panel.querySelectorAll('[data-zh]').forEach(e=>e.textContent=e.dataset[l]);$('caiPrompt').placeholder=$('caiPrompt').dataset['placeholder'+(l==='zh'?'Zh':'En')];$('caiStatus').textContent=ready?(l==='zh'?'已連線':'Connected'):(l==='zh'?'未連線':'Disconnected');updateGuide();}
function message(s,kind='system'){const e=document.createElement('div');e.className='cai-msg cai-'+kind;e.textContent=s;$('caiFeed').append(e);$('caiFeed').scrollTop=$('caiFeed').scrollHeight;}

const explorerTools=Object.freeze({
 async run(name,args={}){
  const api=window.ClusterCEXP;if(!api)throw Error('Explorer unavailable');
  const tr=(zh,en)=>lang()==='zh'?zh:en;
  const roots=api.roots;
  const segments=String(args.path||'').split('/').filter(Boolean);
  if(name==='cluster.list_roots'){message((lang()==='zh'?'查詢 Explorer 根目錄':'Listed Explorer roots'));return roots.map(n=>({name:n.name,kind:n.kind}));}
  if(!segments.length||segments.some(x=>x==='.'||x==='..'||x.includes('\\')||x.includes('\0')))throw Error('Invalid Explorer path');
  const root=roots.find(n=>n.name===segments[0]);
  if(!root)throw Error('Explorer root not found');
  let handle=root.handle;
  for(let i=1;i<segments.length;i++){
   if(handle.kind!=='directory')throw Error('Not a directory');
   handle=i===segments.length-1&&['cluster.read_path','cluster.write_path','cluster.delete_path'].includes(name)?await handle.getFileHandle(segments[i]):await handle.getDirectoryHandle(segments[i]);
  }
  const audit=(zh,en,kind='system')=>message('['+new Date().toLocaleTimeString()+'] '+tr(zh,en),kind);
  const check=async(write=false)=>{if(await handle.queryPermission?.({mode:write?'readwrite':'read'})!=='granted')throw Error('Explorer browser permission required; grant access in Explorer first');};
  
  if(name==='cluster.list_directory'){
   if(handle.kind!=='directory')throw Error('Not a directory');await check();
   const items=[];for await(const h of handle.values()){if(h.name==='.cluster-explorer-order.json')continue;items.push({name:h.name,kind:h.kind});}
   audit('查詢目錄：'+args.path,'Listed directory: '+args.path);return {path:args.path,items};
  }
  if(name==='cluster.read_path'){
   if(handle.kind!=='file')throw Error('Not a file');await check();const f=await handle.getFile();const offset=Math.max(0,Math.trunc(Number(args.offset)||0));const length=Math.min(262144,Math.max(1,Math.trunc(Number(args.length)||65536)));const content=new TextDecoder('utf-8',{fatal:false}).decode(await f.slice(offset,offset+length).arrayBuffer());
   audit('讀取文件：'+args.path,'Read file: '+args.path);return {path:args.path,content,size:f.size,lastModified:f.lastModified,offset,nextOffset:Math.min(f.size,offset+length),hasMore:offset+length<f.size};
  }
  if(name==='cluster.create_file'){
   if(handle.kind!=='directory')throw Error('Parent directory required');await check(true);
   const filename=String(args.name||'');if(!filename||filename==='.'||filename==='..'||/[\\/\x00-\x1f]/.test(filename))throw Error('Invalid filename');
   try{await handle.getFileHandle(filename);throw Error('File already exists');}catch(e){if(e.message==='File already exists')throw e;if(e.name!=='NotFoundError')throw e;}
   const h=await handle.getFileHandle(filename,{create:true});audit('建立文件：'+args.path+'/'+filename,'Created file: '+args.path+'/'+filename);
   api.emit('ai-create');return {created:true,path:args.path+'/'+filename};
  }
  if(name==='cluster.write_path'){
   if(handle.kind!=='file')throw Error('Not a file');await check(true);
   const content=args.content;if(typeof content!=='string')throw Error('Text content required');
   const f=await handle.getFile();if(!args.confirmFullReplace)throw Error('Explicit confirmFullReplace=true required');
   if(f.size>0){const probe=await f.slice(0,Math.min(f.size,65536)).arrayBuffer();new TextDecoder('utf-8',{fatal:true}).decode(probe);}
   if(args.expectedLastModified!==f.lastModified)throw Error('File changed or expectedLastModified missing; read first');
   const w=await handle.createWritable();try{await w.write(content);await w.close();}catch(e){try{await w.abort()}catch{}throw e}
   audit('修改文件：'+args.path,'Updated file: '+args.path);api.emit('ai-write');return {updated:true,path:args.path};
  }
  if(name==='cluster.delete_path'){
   if(!root.parent&&segments.length===1)throw Error('Cannot delete root');
   const parentParts=segments.slice(0,-1);let parent=root.handle;
   for(const part of parentParts.slice(1))parent=await parent.getDirectoryHandle(part);
   if(handle.kind!=='file')throw Error('Only file deletion is supported');
   if(await parent.queryPermission?.({mode:'readwrite'})!=='granted')throw Error('Write permission required');
   const allowed=window.confirm(tr('AI Agent 要刪除文件：','AI Agent requests deletion of file: ')+args.path+'\n'+tr('是否授權？','Authorize?'));
   audit(allowed?'已授權刪除：'+args.path:'拒絕刪除：'+args.path,allowed?'Deletion authorized: '+args.path:'Deletion denied: '+args.path,allowed?'system':'error');
   if(!allowed)throw Error('User denied deletion');
   await parent.removeEntry(segments.at(-1));api.emit('ai-delete');return {deleted:true,path:args.path};
  }
  if(name==='cluster.powershell_request'){
   const command=String(args.command||'');if(!command||command.length>2000)throw Error('Invalid command');
   const allowed=window.confirm(tr('AI Agent 要使用本地 PowerShell：','AI Agent requests local PowerShell: ')+'\n'+command+'\n'+tr('是否授權？','Authorize?'));
   audit(allowed?'已授權 PowerShell 請求':'拒絕 PowerShell 請求',allowed?'PowerShell request authorized':'PowerShell request denied',allowed?'system':'error');
   if(!allowed)throw Error('User denied PowerShell');
   throw Error('PowerShell execution bridge not installed; authorization alone does not execute commands');
  }
  throw Error('Unsupported tool');
 }
});
function deactivate(){active=false;panel.hidden=true;document.body.classList.remove('cluster-ai-active');tab?.classList.remove('is-active');}
function syncTabs(){if(!tab)return;if(!tabs.contains(tab))tabs.append(tab);tab.classList.toggle('is-active',active);window.ClusterTabOrder?.apply?.();}
function open(){window.ClusterTerminal?.deactivate?.();active=true;panel.hidden=false;document.body.classList.add('cluster-ai-active');document.getElementById('editorShell').hidden=true;document.getElementById('empty').hidden=true;document.getElementById('localRangeView').hidden=true;document.getElementById('clusterBottomBar').hidden=true;document.querySelectorAll('#tabList .tab').forEach(e=>e.classList.remove('is-active'));if(!tab){tab=document.createElement('div');tab.className='tab cai-tab';tab.dataset.tabKey='ai-agent';const b=document.createElement('button');b.className='tab-select';b.textContent='✧ AI Agent';b.onclick=open;const x=document.createElement('button');x.className='tab-close';x.textContent='×';x.onclick=close;tab.append(b,x);tabs.append(tab);}tab.classList.add('is-active');window.ClusterTabOrder?.apply?.();translate();}
function close(){deactivate();tab?.remove();tab=null;window.cluster?.fm?.notify?.();}
function connect(){const token=$('caiToken').value.trim();if(!/^[a-f0-9]{64}$/i.test(token)){$('caiError').textContent='Invalid 64-character pairing token';return;}// Persist only after successful authentication; both plugins use the same credential.
ws?.close();ready=false;$('caiError').textContent='';$('caiStatus').textContent='Connecting…';try{const socket=new WebSocket('ws://127.0.0.1:43879/agent');ws=socket;socket.onopen=()=>socket.send(JSON.stringify({type:'auth',token}));socket.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch{return}if(m.type==='ready'){ready=true;sessionStorage.setItem(tokenKey,token);if($('caiRemember').checked)localStorage.setItem(rememberKey,token);else localStorage.removeItem(rememberKey);sessionStorage.removeItem(oldKey);localStorage.removeItem(oldKey);window.dispatchEvent(new Event('cluster-local-paired'));socket.send(JSON.stringify({type:'bridge_register'}));$('caiSetup').hidden=true;$('caiWorkspace').hidden=false;translate();message(lang()==='zh'?'本地 Gateway 已連線。此視窗只顯示連線與任務狀態。':'Local Gateway connected. This panel displays connection and task status only.');}else if(m.type==='tool_call'){const bridge=window.ClusterReadOnlyBridge;const args=m.args||{};Promise.resolve().then(async()=>{if(m.name.startsWith('cluster.')&&['cluster.list_roots','cluster.list_directory','cluster.read_path','cluster.create_file','cluster.write_path','cluster.delete_path','cluster.powershell_request'].includes(m.name))return explorerTools.run(m.name,args);if(!bridge)throw Error('Editor bridge not loaded');if(m.name==='cluster.list_files')return bridge.listFiles();if(m.name==='cluster.get_editor_state')return bridge.getEditorState();if(m.name==='cluster.read_file')return bridge.readFile(args.id);throw Error('Unsupported read-only tool');}).then(result=>socket.send(JSON.stringify({type:'tool_result',requestId:m.requestId,result}))).catch(err=>{message((lang()==='zh'?'操作失敗：':'Operation failed: ')+m.name+' · '+String(err.message),'error');socket.send(JSON.stringify({type:'tool_result',requestId:m.requestId,error:String(err.message)}));});message((lang()==='zh'?'收到操作請求：':'Operation requested: ')+m.name+' '+String(args.path||args.command||'').slice(0,160));}else if(m.type==='provider_info'){$('caiProviderStatus').textContent=m.configured?'Configured: '+m.model:'Not configured';$('caiModel').value=m.model||'gpt-4.1-mini';$('caiApiKey').value='';message(m.configured?'Model ready: '+m.model:'Configure a model to send tasks');}else if(m.type==='task_result'){message(m.text,'system');}else if(m.type==='pong'){message(lang()==='zh'?'本地 Agent 回應正常 · PONG':'Local Agent responded · PONG');}else if(m.type==='task_status'){message(m.status.toUpperCase()+' · '+m.message,m.status==='failed'?'error':'system');if(['completed','failed','interrupted'].includes(m.status)&&m.requestId===taskId){taskId=null;$('caiStop').hidden=true;}}else if(m.type==='error'){$('caiError').textContent=m.message;message('ERROR · '+m.message,'error');}};socket.onerror=()=>{$('caiError').textContent=lang()==='zh'?'無法連接本地 Agent。請先啟動安裝程式。':'Cannot reach local Agent. Start the installed service.';};socket.onclose=()=>{if(ws!==socket)return;ready=false;taskId=null;guide.hidden=true;$('caiStop').hidden=true;$('caiProvider').hidden=true;$('caiSetup').hidden=false;$('caiWorkspace').hidden=true;translate();};}catch(e){$('caiError').textContent=e.message;}}
$('caiForm').onsubmit=e=>{e.preventDefault();const prompt=$('caiPrompt').value.trim();if(!prompt||!ready||ws?.readyState!==1)return;const requestId=crypto.randomUUID();if(taskId){message('A task is already running','error');return;}taskId=requestId;$('caiStop').hidden=false;message(prompt,'user');ws.send(JSON.stringify({type:'task',requestId,prompt}));$('caiPrompt').value='';};
button.onclick=open;$('caiClose').onclick=close;$('caiSettings').onclick=()=>{$('caiProvider').hidden=false;$('caiWorkspace').hidden=true;};$('caiBack').onclick=()=>{$('caiProvider').hidden=true;$('caiWorkspace').hidden=false;};$('caiSaveProvider').onclick=()=>{if(!ready){$('caiProviderStatus').textContent='Agent disconnected';return;}ws.send(JSON.stringify({type:'provider_set',apiKey:$('caiApiKey').value.trim(),model:$('caiModel').value.trim()}));};$('caiStop').onclick=()=>{if(taskId&&ready)ws.send(JSON.stringify({type:'task_cancel',requestId:taskId}));};$('caiPing').onclick=()=>{if(!ready||ws?.readyState!==WebSocket.OPEN){message(lang()==='zh'?'尚未連線':'Not connected','error');return;}ws.send(JSON.stringify({type:'ping',requestId:crypto.randomUUID()}));};$('caiRevokeLocal').onclick=()=>{if(!window.ClusterTerminal?.revokeLocalPermission?.())return;ws?.close();ready=false;sessionStorage.removeItem(tokenKey);localStorage.removeItem(rememberKey);sessionStorage.removeItem(oldKey);localStorage.removeItem(oldKey);$('caiToken').value='';$('caiRemember').checked=false;$('caiSetup').hidden=false;$('caiWorkspace').hidden=true;translate();message(lang()==='zh'?'本地權限已移除，PowerShell 視窗已關閉':'Local permission removed; PowerShell sessions closed');};$('caiConnect').onclick=connect;
document.getElementById('uiLanguage')?.addEventListener('change',translate);
document.querySelector('[data-action="closeall"]')?.addEventListener('click',close);
window.addEventListener('cluster-local-paired',()=>{const t=sessionStorage.getItem(tokenKey)||localStorage.getItem(rememberKey);if(t&&!ready&&ws?.readyState!==WebSocket.CONNECTING){$('caiToken').value=t;connect();}});const saved=sessionStorage.getItem(tokenKey)||localStorage.getItem(rememberKey);if(saved){$('caiToken').value=saved;setTimeout(connect,500);}window.ClusterAI={open,close,connect,deactivate,syncTabs,isActive:()=>active,closeAll:close};translate();
})();