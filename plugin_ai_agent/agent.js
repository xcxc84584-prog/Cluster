/* Cluster AI Agent P0: authenticated local bridge, no simulated model execution. */
(()=>{'use strict';
const button=document.getElementById('clusterAiOpen'),host=document.getElementById('workarea'),tabs=document.getElementById('tabList');
if(!button||!host||!tabs)return;
const panel=document.createElement('section');panel.id='clusterAiPanel';panel.hidden=true;
panel.innerHTML='<div class="cai-bar"><strong>✧ AI Agent</strong><span id="caiStatus" role="status"></span><button id="caiSettings" type="button" data-zh="模型設定" data-en="Model settings"></button><button id="caiStop" type="button" hidden data-zh="中斷" data-en="Stop"></button><button id="caiPing" type="button" data-zh="測試連線" data-en="Test connection"></button><button id="caiRevokeLocal" type="button" class="cai-danger" data-zh="移除本地權限" data-en="Remove Local Permission" title="Revoke local pairing and close PowerShell sessions"></button><button id="caiClose" type="button">×</button></div><div class="cai-setup" id="caiSetup"><h2 data-zh="連結本地 AI Agent" data-en="Connect local AI Agent"></h2><p data-zh="沿用 Cluster PowerShell 的本地 Agent。初次使用請下載安裝程式並完成 PS BIND 配對。" data-en="Uses the existing Cluster PowerShell local Agent. Install and pair with PS BIND first."></p><a href="../Install-Cluster-Terminal.cmd" download="Install-Cluster-Terminal.cmd" data-zh="下載 Windows CMD 安裝程式" data-en="Download Windows CMD installer"></a><p data-zh="請從 PowerShell 配對畫面複製 Token；此處可使用相同的 64 字元 Token。" data-en="Copy the same 64-character token from the PowerShell pairing screen."></p><label for="caiToken">Pairing Token</label><input id="caiToken" type="password" autocomplete="off" spellcheck="false" placeholder="64-character token"><label class="cai-remember"><input id="caiRemember" type="checkbox"><span data-zh="記住此裝置的配對" data-en="Remember pairing on this device"></span></label><button id="caiConnect" type="button" data-zh="連線" data-en="Connect"></button><p id="caiError" role="alert"></p></div><div id="caiProvider" class="cai-setup" hidden><h2 data-zh="模型設定（僅限 OpenAI API）" data-en="Model settings (OpenAI API only)"></h2><p data-zh="金鑰傳送至本機 Agent 儲存，不存於網頁。請勿在共用電腦設定。" data-en="The key is stored by the local Agent, not in the browser. Avoid shared computers."></p><label>API Key<input id="caiApiKey" type="password" autocomplete="off" placeholder="sk-..."></label><label>Model<input id="caiModel" value="gpt-4.1-mini"></label><button id="caiSaveProvider" type="button" data-zh="儲存設定" data-en="Save settings"></button><button id="caiBack" type="button" data-zh="返回" data-en="Back"></button><p id="caiProviderStatus" role="status"></p></div><div id="caiWorkspace" class="cai-workspace" hidden><div class="cai-feed" id="caiFeed" role="log" aria-live="polite"></div><form id="caiForm"><textarea id="caiPrompt" maxlength="8000" rows="3" data-placeholder-zh="輸入任務需求…" data-placeholder-en="Describe a task…"></textarea><button type="submit" data-zh="送出" data-en="Send"></button></form></div>';
host.append(panel);
const guide=document.createElement('section');guide.id='caiConnectGuide';guide.className='cai-guide';
guide.innerHTML=`<div class="cai-guide-head"><strong data-zh="連接 ChatGPT" data-en="Connect ChatGPT"></strong><button type="button" id="caiGuideDismiss" data-zh="關閉教學 ×" data-en="Close guide ×"></button></div><ol>
<li data-zh="首次使用，先安裝本地程式並完成連線。" data-en="First install the local program and connect."></li>
<li data-zh="在「工作區」允許需要的檔案與 PowerShell 操作。" data-en="Allow file and PowerShell actions in Workspace."></li>
<li data-zh="完成連線後，依照畫面指示連接 ChatGPT。" data-en="Follow the on-screen steps to connect ChatGPT."></li>
</ol><p><a href="../Install-Cluster-Terminal.cmd" download="Install-Cluster-Terminal.cmd" data-zh="安裝本地程式" data-en="Install local program"></a></p><div class="cai-guide-state" id="caiGuideState" role="status"></div>`;
const $=id=>document.getElementById(id);
$('caiWorkspace').append(guide);guide.hidden=true;guide.querySelector('#caiGuideDismiss').onclick=()=>{guideDismissed=true;sessionStorage.setItem('cluster-ai-guide-dismissed','1');guide.hidden=true};let ws=null,ready=false,active=false,tab=null,taskId=null;const tokenKey='cluster-terminal-token',rememberKey='cluster-terminal-remembered-token-v1',oldKey='cluster-ai-agent-token-v1';
$('caiToken').value=sessionStorage.getItem(tokenKey)||localStorage.getItem(rememberKey)||sessionStorage.getItem(oldKey)||localStorage.getItem(oldKey)||'';
$('caiRemember').checked=!!(localStorage.getItem(rememberKey)||localStorage.getItem(oldKey));
function lang(){return document.getElementById('uiLanguage')?.value==='en'?'en':'zh'}
let guideDismissed=sessionStorage.getItem('cluster-ai-guide-dismissed')==='1';
function updateGuide(){guide.hidden=!ready||guideDismissed;const state=document.getElementById('caiGuideState');if(state)state.textContent=lang()==='zh'?'本地 Agent 已 BIND；遠端 HTTPS MCP 尚未設定':'Local Agent bound; remote HTTPS MCP not configured';}
function translate(){const l=lang();panel.querySelectorAll('[data-zh]').forEach(e=>e.textContent=e.dataset[l]);$('caiPrompt').placeholder=$('caiPrompt').dataset['placeholder'+(l==='zh'?'Zh':'En')];$('caiStatus').textContent=ready?(l==='zh'?'已連線':'Connected'):(l==='zh'?'未連線':'Disconnected');updateGuide();}
function message(s,kind='system'){const e=document.createElement('div');e.className='cai-msg cai-'+kind;const time=document.createElement('time');time.style.cssText='display:block;color:#8395b1;font-size:11px;margin-bottom:4px';time.textContent=new Intl.DateTimeFormat(lang()==='zh'?'zh-TW':'en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:lang()!=='zh'}).format(new Date());const body=document.createElement('span');body.textContent=s;e.append(time,body);$('caiFeed').append(e);$('caiFeed').scrollTop=$('caiFeed').scrollHeight;}

const explorerTools=Object.freeze({
 async run(name,args={}){
  const api=window.ClusterCEXP;if(!api)throw Error('Explorer unavailable');
  const tr=(zh,en)=>lang()==='zh'?zh:en;
  const roots=api.roots;
  if(name==='cluster.find_root_windows_path'){
   const root=roots.find(n=>n.name===String(args.root||''));
   if(!root||root.kind!=='directory')throw Error('Explorer folder not found');
   window.ClusterAgentPermissions?.requireAccess('read',root.name);
   const candidates=Array.isArray(args.candidates)?args.candidates.filter(x=>typeof x==='string').slice(0,30):[];
   const result=await new Promise(resolve=>{
    const overlay=document.createElement('div');overlay.style.cssText='position:fixed;inset:0;z-index:2147483646;display:grid;place-items:center;background:#030914cc;backdrop-filter:blur(5px);padding:20px';
    const card=document.createElement('section');card.className='cap-card';card.style.cssText='width:min(620px,100%);background:#141c29;color:#e1eafa;border:1px solid #35577c;border-radius:12px;padding:22px;box-shadow:0 24px 70px #0009';
    const heading=document.createElement('h3');heading.className='cap-title';heading.textContent=tr('確認資料夾位置','Confirm folder location');
    const hint=document.createElement('p');hint.className='cap-note';hint.textContent=tr('請確認下方找到的位置；若不正確，請輸入完整 Windows 路徑。','Confirm the found location, or enter the full Windows path.');
    const input=document.createElement('input');input.type='text';input.style.cssText='width:100%;box-sizing:border-box;background:#0b1220;color:#fff;border:1px solid #3c5877;padding:11px;border-radius:7px';input.value=candidates.length===1?candidates[0]:'';
    const select=document.createElement('select');select.style.cssText='width:100%;margin-bottom:12px;background:#0b1220;color:#fff;padding:9px';const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=tr('選擇找到的資料夾，或自行輸入','Choose a found folder or type a path');select.append(placeholder);
    candidates.forEach(x=>{const o=document.createElement('option');o.value=x;o.textContent=x;select.append(o)});select.onchange=()=>{if(select.value)input.value=select.value};
    const actions=document.createElement('div');actions.style.cssText='display:flex;justify-content:flex-end;gap:12px;margin-top:18px';
    const cancel=document.createElement('button');cancel.textContent=tr('取消','Cancel');
    const ok=document.createElement('button');ok.textContent=tr('確認位置','Confirm path');ok.style.cssText='background:#235c9d;color:white;border:1px solid #4278b5;padding:9px 16px;border-radius:6px';
    const finish=value=>{clearTimeout(timer);overlay.remove();resolve(value)};
    cancel.onclick=()=>finish(null);ok.onclick=()=>finish(input.value.trim());
    const timer=setTimeout(()=>finish(null),110000);
    actions.append(cancel,ok);card.append(heading,hint,select,input,actions);overlay.append(card);document.body.append(overlay);input.focus();
   });
   if(!result)throw Error('Folder path confirmation cancelled or timed out');
   return {root:root.name,absolutePath:result};
  }
  if(name==='cluster.open_powershell'){
   window.ClusterAgentPermissions?.requireAccess('powershell','workspace');
   if(!window.ClusterTerminal?.openForAgent)throw Error('PowerShell terminal unavailable');
   await window.ClusterTerminal.openForAgent();
   message(tr('AI Agent 已要求開啟 PowerShell 視窗','AI Agent requested PowerShell window'));
   return {requested:true,ready:!!window.ClusterTerminal.hasSession?.(),message:'PowerShell terminal opening; wait for session readiness before executing commands'};
  }
  if(name==='cluster.powershell_request'){
   const permission=window.ClusterAgentPermissions;
   if(!permission)throw Error('AI Agent permission manager unavailable');
   const selected=String(args.path||'').split('/').filter(Boolean)[0];
   const root=window.ClusterCEXP?.roots?.find(n=>n.name===selected);
   if(!root)throw Error('Specify an authorized Explorer workspace in path');
   permission.requireAccess('powershell',root.name);
   const command=String(args.command||'');
   if(!command.trim()||command.length>2000)throw Error('Invalid command');
   if(!window.ClusterTerminal?.hasSession?.()){message(tr('AI Agent 正在開啟 PowerShell 視窗；請確認本地連線。','AI Agent is opening a PowerShell window; check the local connection.'));await window.ClusterTerminal?.openForAgent?.();throw Error('POWERSHELL_WINDOW_OPENING: PowerShell window requested. Retry when the terminal session is ready.');}
   const allowed=permission.allowAllPowerShell?.()===true?true:await new Promise(resolve=>{
    const overlay=document.createElement('div');overlay.className='cluster-ps-approval';overlay.style.cssText='position:fixed;inset:0;z-index:2147483646;background:rgba(5,10,18,.8);display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(5px)';
    const panel=document.createElement('section');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.style.cssText='width:min(650px,100%);max-height:85vh;overflow:auto;background:linear-gradient(145deg,#171d29,#111722);color:#dce6f5;border:1px solid #31547e;border-radius:11px;padding:22px;box-shadow:0 18px 70px #000';
    const title=document.createElement('h3');title.className='cap-title';title.textContent=tr('AI Agent：PowerShell 執行授權','AI Agent: PowerShell execution approval');
    const note=document.createElement('p');note.className='cap-note';note.textContent=tr('此命令將以目前 Windows 使用者身分執行，不受工作區沙盒限制。請核對完整命令。','This command runs as your Windows user, outside the workspace sandbox. Review it carefully.');
    const workspace=document.createElement('p');workspace.textContent=tr('工作區：','Workspace: ')+root.name;
    const pre=document.createElement('pre');pre.textContent=command;pre.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;max-height:38vh;overflow:auto;background:#090e17;padding:12px;border-radius:6px';
    const actions=document.createElement('div');actions.style.cssText='display:flex;gap:12px;justify-content:flex-end;margin-top:18px';
    const deny=document.createElement('button');deny.type='button';deny.textContent=tr('拒絕','Deny');
    const approve=document.createElement('button');approve.type='button';approve.textContent=tr('授權並執行','Approve and execute');
    approve.style.cssText='background:#245a9b;border:1px solid #4278b5;color:white;padding:9px 15px;border-radius:6px';deny.style.cssText='padding:9px 15px';
    let finished=false;const done=value=>{if(finished)return;finished=true;clearTimeout(timer);overlay.remove();resolve(value)};
    const timer=setTimeout(()=>done(false),120000);
    approve.addEventListener('click',()=>done(true));deny.addEventListener('click',()=>done(false));
    overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();done(false)}});
    actions.append(deny,approve);panel.append(title,note,workspace,pre,actions);overlay.append(panel);document.body.append(overlay);deny.focus();
    message(tr('等待使用者在 Cluster 視窗確認 PowerShell 指令','Waiting for PowerShell approval in Cluster browser'));
   });
   if(!allowed)throw Error('PowerShell approval denied or timed out');
   return {approved:true};
  }
  const segments=String(args.path||'').split('/').filter(Boolean);
  if(name==='cluster.list_roots'){message((lang()==='zh'?'查詢 Explorer 根目錄':'Listed Explorer roots'));return roots.map(n=>({name:n.name,kind:n.kind}));}
  if(!segments.length||segments.some(x=>x==='.'||x==='..'||x.includes('\\')||x.includes('\0')))throw Error('Invalid Explorer path');
  const root=roots.find(n=>n.name===segments[0]);
  if(!root)throw Error('Explorer root not found');
  const permission=window.ClusterAgentPermissions;
  if(!permission)throw Error('AI Agent permission manager unavailable');
  const scope=name==='cluster.list_directory'||name==='cluster.read_path'?'read':name==='cluster.create_file'||name==='cluster.write_path'?'write':name==='cluster.delete_path'?'delete':name==='cluster.powershell_request'?'powershell':null;
  if(scope)permission.requireAccess(scope,root.name);
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
   await api.refreshExpanded(root);api.emit('ai-create');return {created:true,path:args.path+'/'+filename};
  }
  if(name==='cluster.write_path'){
   if(handle.kind!=='file')throw Error('Not a file');await check(true);
   const content=args.content;if(typeof content!=='string')throw Error('Text content required');
   // Workspace write permission is sufficient; no timestamp or overwrite flag is required.
   const w=await handle.createWritable();try{await w.write(content);await w.close();}catch(e){try{await w.abort()}catch{}throw e}
   audit('修改文件：'+args.path,'Updated file: '+args.path);await api.refreshExpanded(root);api.emit('ai-write');return {updated:true,path:args.path};
  }
  if(name==='cluster.delete_path'){
   if(!root.parent&&segments.length===1)throw Error('Cannot delete root');
   const parentParts=segments.slice(0,-1);let parent=root.handle;
   for(const part of parentParts.slice(1))parent=await parent.getDirectoryHandle(part);
   if(handle.kind!=='file')throw Error('Only file deletion is supported');
   if(await parent.queryPermission?.({mode:'readwrite'})!=='granted')throw Error('Write permission required');
   audit('工作區授權刪除：'+args.path,'Workspace-authorized deletion: '+args.path);
   await parent.removeEntry(segments.at(-1));await api.refreshExpanded(root);api.emit('ai-delete');return {deleted:true,path:args.path};
  }
  if(name==='cluster.powershell_request'){
   const command=String(args.command||'');if(!command||command.length>2000)throw Error('Invalid command');
   const allowed=window.confirm(tr('AI Agent 要使用本地 PowerShell：','AI Agent requests local PowerShell: ')+'\n'+command+'\n'+tr('是否授權？','Authorize?'));
   audit(allowed?'已授權 PowerShell 請求':'拒絕 PowerShell 請求',allowed?'PowerShell request authorized':'PowerShell request denied',allowed?'system':'error');
   if(!allowed)throw Error('User denied PowerShell');
   return {approved:true};
  }
  throw Error('Unsupported tool');
 }
});
function deactivate(){active=false;panel.hidden=true;document.body.classList.remove('cluster-ai-active');tab?.classList.remove('is-active');}
function syncTabs(){if(!tab)return;if(!tabs.contains(tab))tabs.append(tab);tab.classList.toggle('is-active',active);window.ClusterTabOrder?.apply?.();}
function open(){window.ClusterTerminal?.deactivate?.();window.ClusterSyntaxPage?.deactivate?.();window.ClusterDevelopmentEnvironment?.deactivate?.();window.ClusterAgentPermissions?.deactivate?.();active=true;panel.hidden=false;document.body.classList.add('cluster-ai-active');document.getElementById('editorShell').hidden=true;document.getElementById('empty').hidden=true;document.getElementById('localRangeView').hidden=true;document.getElementById('clusterBottomBar').hidden=true;document.querySelectorAll('#tabList .tab').forEach(e=>e.classList.remove('is-active'));if(!tab){tab=document.createElement('div');tab.className='tab cai-tab';tab.dataset.tabKey='ai-agent';const b=document.createElement('button');b.className='tab-select';b.textContent='✧ AI Agent';b.onclick=open;const x=document.createElement('button');x.className='tab-close';x.textContent='×';x.onclick=close;tab.append(b,x);tabs.append(tab);}tab.classList.add('is-active');window.ClusterTabOrder?.apply?.();translate();}
function close(){deactivate();tab?.remove();tab=null;window.cluster?.fm?.notify?.();}
function connect(){const token=$('caiToken').value.trim();if(!/^[a-f0-9]{64}$/i.test(token)){$('caiError').textContent='Invalid 64-character pairing token';return;}// Persist only after successful authentication; both plugins use the same credential.
ws?.close();ready=false;$('caiError').textContent='';$('caiStatus').textContent='Connecting…';try{const socket=new WebSocket('ws://127.0.0.1:43879/agent');ws=socket;socket.onopen=()=>socket.send(JSON.stringify({type:'auth',token}));socket.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch{return}if(m.type==='ready'){ready=true;sessionStorage.setItem(tokenKey,token);if($('caiRemember').checked)localStorage.setItem(rememberKey,token);else localStorage.removeItem(rememberKey);sessionStorage.removeItem(oldKey);localStorage.removeItem(oldKey);window.dispatchEvent(new Event('cluster-local-paired'));socket.send(JSON.stringify({type:'bridge_register'}));$('caiSetup').hidden=true;$('caiWorkspace').hidden=false;translate();message(lang()==='zh'?'本地 Gateway 已連線。此視窗只顯示連線與任務狀態。':'Local Gateway connected. This panel displays connection and task status only.');}else if(m.type==='tool_call'){const bridge=window.ClusterReadOnlyBridge;const args=m.args||{};Promise.resolve().then(async()=>{if(m.name.startsWith('cluster.')&&['cluster.list_roots','cluster.find_root_windows_path','cluster.open_powershell','cluster.list_directory','cluster.read_path','cluster.create_file','cluster.write_path','cluster.delete_path','cluster.powershell_request'].includes(m.name))return explorerTools.run(m.name,args);if(!bridge)throw Error('Editor bridge not loaded');if(m.name==='cluster.list_files')return bridge.listFiles();if(m.name==='cluster.get_editor_state')return bridge.getEditorState();if(m.name==='cluster.read_file')return bridge.readFile(args.id);throw Error('Unsupported read-only tool');}).then(result=>socket.send(JSON.stringify({type:'tool_result',requestId:m.requestId,result}))).catch(err=>{message((lang()==='zh'?'操作失敗：':'Operation failed: ')+m.name+' · '+String(err.message),'error');socket.send(JSON.stringify({type:'tool_result',requestId:m.requestId,error:String(err.message)}));});message((lang()==='zh'?'收到操作請求：':'Operation requested: ')+m.name+' '+String(args.path||args.command||'').slice(0,160));}else if(m.type==='powershell_execution_result'){const out=m.result;const raw=String(out?.stdout||'');const clean=raw.replace(/#< CLIXML[\\s\\S]*$/,'').trimEnd();const error=String(m.error||'');message(error?error:(clean||((out?.exitCode!==0)?(lang()==='zh'?'執行失敗（代碼 '+out?.exitCode+'）':'Execution failed (code '+out?.exitCode+')'):(lang()==='zh'?'執行完成':'Completed'))),error||out?.exitCode!==0?'error':'system');}else if(m.type==='provider_info'){$('caiProviderStatus').textContent=m.configured?'Configured: '+m.model:'Not configured';$('caiModel').value=m.model||'gpt-4.1-mini';$('caiApiKey').value='';message(m.configured?'Model ready: '+m.model:'Configure a model to send tasks');}else if(m.type==='task_result'){message(m.text,'system');}else if(m.type==='pong'){message(lang()==='zh'?'本地 Agent 回應正常 · PONG':'Local Agent responded · PONG');}else if(m.type==='task_status'){message(m.status.toUpperCase()+' · '+m.message,m.status==='failed'?'error':'system');if(['completed','failed','interrupted'].includes(m.status)&&m.requestId===taskId){taskId=null;$('caiStop').hidden=true;}}else if(m.type==='error'){$('caiError').textContent=m.message;message('ERROR · '+m.message,'error');}};socket.onerror=()=>{$('caiError').textContent=lang()==='zh'?'無法連接本地 Agent。請先啟動安裝程式。':'Cannot reach local Agent. Start the installed service.';};socket.onclose=()=>{if(ws!==socket)return;ready=false;taskId=null;guide.hidden=true;$('caiStop').hidden=true;$('caiProvider').hidden=true;$('caiSetup').hidden=false;$('caiWorkspace').hidden=true;translate();};}catch(e){$('caiError').textContent=e.message;}}
$('caiForm').onsubmit=e=>{e.preventDefault();const prompt=$('caiPrompt').value.trim();if(!prompt||!ready||ws?.readyState!==1)return;const requestId=crypto.randomUUID();if(taskId){message('A task is already running','error');return;}taskId=requestId;$('caiStop').hidden=false;message(prompt,'user');ws.send(JSON.stringify({type:'task',requestId,prompt}));$('caiPrompt').value='';};
button.onclick=open;$('caiClose').onclick=close;$('caiSettings').onclick=()=>{$('caiProvider').hidden=false;$('caiWorkspace').hidden=true;};$('caiBack').onclick=()=>{$('caiProvider').hidden=true;$('caiWorkspace').hidden=false;};$('caiSaveProvider').onclick=()=>{if(!ready){$('caiProviderStatus').textContent='Agent disconnected';return;}ws.send(JSON.stringify({type:'provider_set',apiKey:$('caiApiKey').value.trim(),model:$('caiModel').value.trim()}));};$('caiStop').onclick=()=>{if(taskId&&ready)ws.send(JSON.stringify({type:'task_cancel',requestId:taskId}));};$('caiPing').onclick=()=>{if(!ready||ws?.readyState!==WebSocket.OPEN){message(lang()==='zh'?'尚未連線':'Not connected','error');return;}ws.send(JSON.stringify({type:'ping',requestId:crypto.randomUUID()}));};$('caiRevokeLocal').onclick=()=>{if(!window.ClusterTerminal?.revokeLocalPermission?.())return;ws?.close();ready=false;sessionStorage.removeItem(tokenKey);localStorage.removeItem(rememberKey);sessionStorage.removeItem(oldKey);localStorage.removeItem(oldKey);$('caiToken').value='';$('caiRemember').checked=false;$('caiSetup').hidden=false;$('caiWorkspace').hidden=true;translate();message(lang()==='zh'?'本地權限已移除，PowerShell 視窗已關閉':'Local permission removed; PowerShell sessions closed');};$('caiConnect').onclick=connect;
document.getElementById('uiLanguage')?.addEventListener('change',translate);
document.querySelector('[data-action="closeall"]')?.addEventListener('click',close);
window.addEventListener('cluster-local-paired',()=>{const t=sessionStorage.getItem(tokenKey)||localStorage.getItem(rememberKey);if(t&&!ready&&ws?.readyState!==WebSocket.CONNECTING){$('caiToken').value=t;connect();}});const saved=sessionStorage.getItem(tokenKey)||localStorage.getItem(rememberKey);if(saved){$('caiToken').value=saved;setTimeout(connect,500);}window.ClusterAI={open,close,connect,deactivate,syncTabs,isActive:()=>active,closeAll:close};translate();
})();