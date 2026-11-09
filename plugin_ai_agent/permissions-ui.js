/* Cluster AI Agent Permission Management — scoped browser permissions; no OS execution grant. */
(()=>{'use strict';
const $=id=>document.getElementById(id),tabs=$('tabList'),host=$('workarea'),button=$('agentPermissionsOpenPage');
if(!tabs||!host||!button)return;
const style=document.createElement('style');style.textContent=`
#clusterAgentPermissions[hidden]{display:none!important}\n#clusterAgentPermissions{position:absolute;inset:0;z-index:9;overflow:auto;background:#0d1017;color:#dce6f5;padding:24px;font:14px/1.55 system-ui,sans-serif}
#clusterAgentPermissions *{box-sizing:border-box}
.cap-head{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #263244;padding-bottom:20px;margin-bottom:22px;gap:12px}
.cap-eyebrow{font-size:10px;letter-spacing:2px;color:#75a9ef;font-weight:700}
.cap-title{font-size:23px;font-weight:650;margin:3px 0;color:#f4f7fc}
.cap-sub{color:#8392a9;font-size:12px}
.cap-pill{border:1px solid #344860;border-radius:20px;color:#8fa6c8;padding:5px 12px;font-size:11px;white-space:nowrap}
.cap-grid{display:grid;grid-template-columns:minmax(190px,260px) minmax(0,1fr);gap:18px;max-width:1150px}
.cap-card{background:linear-gradient(145deg,#171d29,#111722);border:1px solid #293548;border-radius:11px;padding:20px;min-width:0}
.cap-card h3{font-size:13px;color:#e3edff;margin:0 0 13px;letter-spacing:.3px}
.cap-nav{display:flex;flex-direction:column;gap:5px}
.cap-nav button{background:transparent;border:1px solid transparent;color:#a5b5ce;text-align:left;padding:10px 12px;border-radius:7px;cursor:pointer}
.cap-nav button.active{background:#172e4c;border-color:#31547e;color:#e1efff}
.cap-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:13px 0;border-bottom:1px solid #283343}
.cap-row:last-child{border:0}.cap-row strong{display:block;font-size:13px}.cap-row small{display:block;color:#8595aa;font-size:11px;margin-top:4px}
.cap-state{font-size:11px;color:#8ba5c8;border:1px solid #35445b;padding:4px 9px;border-radius:6px;white-space:nowrap}
.cap-note{margin-top:18px;color:#8fa2bb;font-size:12px;line-height:1.7;border-left:2px solid #4278b5;padding-left:12px}
@media(max-width:680px){#clusterAgentPermissions{padding:14px}.cap-grid{grid-template-columns:1fr}.cap-head{align-items:flex-start}.cap-title{font-size:19px}}
`;document.head.append(style);
const page=document.createElement('section');page.id='clusterAgentPermissions';page.hidden=true;host.append(page);
const tab=document.createElement('div');tab.className='tab';tab.dataset.tabKey='tool:agent-permissions';const select=document.createElement('button');select.className='tab-select';select.onclick=open;const closeButton=document.createElement('button');closeButton.className='tab-close';closeButton.textContent='×';closeButton.onclick=close;tab.append(select,closeButton);
let opened=false,active=false,section='overview';
const scopes=['read','write','delete','powershell'];
const policy={roots:Object.create(null),log:[]};
const rootNames=()=>window.ClusterCEXP?.roots?.map(r=>r.name)||[];
function record(action,root,result){policy.log.unshift({time:new Date().toLocaleString(),action,root,result});policy.log.length=Math.min(policy.log.length,100);if(active)render()}
function allowed(name,root){return policy.roots[root]?.[name]??(name==='read'||name==='write')}
function requireAccess(name,root){const ok=allowed(name,root);record(name,root,ok?'allow':'deny');if(!ok)throw Error('AI Agent permission denied: '+name+' @ '+root);return true}
function setAccess(root,name,value){if(!rootNames().includes(root)||!scopes.includes(name))throw Error('Invalid permission scope');policy.roots[root]??={read:true,write:true,delete:false,powershell:false};policy.roots[root][name]=!!value;record('policy:'+name,root,value?'enabled':'disabled');}

const lang=()=> $('uiLanguage')?.value==='en'?'en':'zh';
const t=(zh,en)=>lang()==='zh'?zh:en;
const pages=[['overview','總覽','Overview'],['workspace','工作區','Workspaces'],['files','檔案存取','File Access'],['terminal','PowerShell 執行','PowerShell Execution'],['audit','操作紀錄','Audit Log']];
function render(){
 select.textContent='◇ '+t('AI AGENT權限管理','AI Agent Permissions');
 button.querySelector('.cluster-tool-text').textContent=t('AI AGENT權限管理','AI Agent Permissions');
 const data={
 overview:[['工作區授權','Workspace authorization','尚未設定','Not configured'],['檔案讀寫','File read / write','尚未設定','Not configured'],['PowerShell 執行','PowerShell execution','未啟用','Disabled']],
 workspace:[['已授權工作區','Authorized workspaces','尚未設定','Not configured'],['路徑映射','Path mapping','尚未設定','Not configured']],
 files:[['讀取檔案','Read files','尚未設定','Not configured'],['建立及修改','Create and modify','尚未設定','Not configured'],['刪除檔案','Delete files','尚未設定','Not configured']],
 terminal:[['命令執行','Command execution','未啟用','Disabled'],['執行前確認','Pre-execution approval','尚未設定','Not configured']],
 audit:[['審計事件','Audit events','尚未連接','Not connected']]
 };
 page.innerHTML='';
 const head=document.createElement('div');head.className='cap-head';
 head.innerHTML='<div><div class="cap-eyebrow">CLUSTER / SECURITY CENTER</div><h2 class="cap-title"></h2><div class="cap-sub"></div></div><span class="cap-pill">UI PREVIEW · BASE</span>';
 head.querySelector('.cap-pill').textContent='SESSION POLICY · BASE';head.querySelector('h2').textContent=t('AI AGENT 權限管理','AI Agent Permission Management');
 head.querySelector('.cap-sub').textContent=t('工作區、檔案與終端權限的統一管理介面','Unified workspace, file and terminal permission management');
 const grid=document.createElement('div');grid.className='cap-grid';const side=document.createElement('div');side.className='cap-card cap-nav';
 for(const [id,zh,en] of pages){const b=document.createElement('button');b.textContent=t(zh,en);b.className=id===section?'active':'';b.onclick=()=>{section=id;render()};side.append(b)}
 const main=document.createElement('div');main.className='cap-card';const heading=document.createElement('h3');heading.textContent=t(...pages.find(p=>p[0]===section).slice(1));main.append(heading);
 for(const [zh,en,zs,es] of data[section]){const row=document.createElement('div');row.className='cap-row';const label=document.createElement('div');const strong=document.createElement('strong');strong.textContent=t(zh,en);const small=document.createElement('small');small.textContent=t('權限控制預留接口 · 尚未連接執行橋接','Reserved permission interface · execution bridge not connected');label.append(strong,small);const state=document.createElement('span');state.className='cap-state';state.textContent=t(zs,es);row.append(label,state);main.append(row)}
 if(section==='workspace'||section==='files'||section==='terminal'){
 const roots=rootNames();
 if(!roots.length){const empty=document.createElement('p');empty.className='cap-note';empty.textContent=t('請先在 Explorer 加入工作區，才能設定權限。','Add a workspace in Explorer before configuring permissions.');main.append(empty)}
 for(const root of roots){
  const title=document.createElement('h3');title.textContent='▣ '+root;title.style.marginTop='18px';main.append(title);
  const names=section==='terminal'?['powershell']:section==='files'?['read','write','delete']:scopes;
  for(const name of names){
   const row=document.createElement('label');row.className='cap-row';const label=document.createElement('span');label.textContent=({read:t('讀取','Read'),write:t('建立及修改','Create and modify'),delete:t('刪除','Delete'),powershell:t('PowerShell 請求','PowerShell requests')})[name];
   const toggle=document.createElement('input');toggle.type='checkbox';toggle.checked=allowed(name,root);toggle.onchange=()=>{setAccess(root,name,toggle.checked);render()};row.append(label,toggle);main.append(row)
  }
 }
}
if(section==='audit'){for(const event of policy.log.slice(0,40)){const row=document.createElement('div');row.className='cap-row';row.textContent=event.time+' · '+event.action+' · '+event.root+' · '+event.result;main.append(row)}}
const note=document.createElement('div');note.className='cap-note';note.textContent=t('基礎讀取與修改權限預設開啟，刪除及 PowerShell 預設關閉；設定僅在目前頁面工作階段生效。PowerShell 執行橋接尚未完成；開啟請求權限不代表允許執行命令。','Read and write permissions default to on; delete and PowerShell default to off. Settings apply only to this page session. PowerShell execution bridge is not implemented; allowing requests does not authorize command execution.');main.append(note);grid.append(side,main);page.append(head,grid);
}
function deactivate(){active=false;page.hidden=true;tab.classList.remove('is-active')}
function open(){opened=true;active=true;window.ClusterTerminal?.deactivate?.();window.ClusterAI?.deactivate?.();window.ClusterDevelopmentEnvironment?.deactivate?.();window.ClusterSyntaxPage?.deactivate?.();document.body.classList.remove('cluster-terminal-active','cluster-ai-active');for(const id of ['editorShell','empty','localRangeView','clusterBottomBar']){const el=$(id);if(el)el.hidden=true}document.querySelectorAll('#tabList .tab').forEach(x=>x.classList.remove('is-active'));if(!tabs.contains(tab))tabs.append(tab);tab.classList.add('is-active');page.hidden=false;window.ClusterTabOrder?.apply?.();$('fileMenu').hidden=true;render()}
function close(){const wasActive=active;opened=false;deactivate();tab.remove();if(wasActive)window.cluster?.fm?.notify?.()}
button.onclick=open;$('uiLanguage')?.addEventListener('change',render);window.cluster?.fm?.onChange?.(()=>{if(opened&&!tabs.contains(tab))tabs.append(tab);if(active){deactivate();}});
tabs.addEventListener('click',event=>{if(active&&event.target.closest('.tab-select')&&!tab.contains(event.target)){deactivate()}},true);
document.addEventListener('click',event=>{if(active&&event.target.closest('#syntaxOpenPage,#developmentOpenPage,#clusterAiOpen,#terminalOpen'))deactivate()},true);
window.ClusterAgentPermissions={open,close,deactivate,isActive:()=>active,render,allowed,requireAccess,record,rootNames};
render();
})();