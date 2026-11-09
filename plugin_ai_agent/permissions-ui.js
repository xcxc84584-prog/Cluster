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
const policy={read:true,write:true,delete:false,powershell:false,allowAllPowerShell:false,log:[]};
function record(action,root,result){policy.log.unshift({time:new Date().toLocaleString(),action,root:root||'workspace',result});policy.log.length=Math.min(policy.log.length,200);if(active)render()}
function allowed(name){return policy[name]===true}
function requireAccess(name,root){const ok=allowed(name);record(name,root,ok?'allow':'deny');if(!ok)throw Error('AI Agent workspace permission denied: '+name);return true}
const lang=()=> $('uiLanguage')?.value==='en'?'en':'zh';
const t=(zh,en)=>lang()==='zh'?zh:en;
function render(){
 select.textContent='◇ '+t('AI AGENT 權限管理','AI Agent Permissions');
 const buttonText=button.querySelector('.cluster-tool-text');if(buttonText)buttonText.textContent=t('AI AGENT 權限管理','AI Agent Permissions');
 page.replaceChildren();
 const head=document.createElement('div');head.className='cap-head';
 const heading=document.createElement('div');heading.innerHTML='<div class="cap-eyebrow">CLUSTER / SECURITY CENTER</div>';
 const title=document.createElement('h2');title.className='cap-title';title.textContent=t('工作區','Workspace');
 const sub=document.createElement('div');sub.className='cap-sub';sub.textContent=t('統一管理 AI Agent 的檔案 CRUD 與 PowerShell 權限，不依專案區分','Manage AI Agent file CRUD and PowerShell permissions globally, without per-project policies');
 heading.append(title,sub);head.append(heading);page.append(head);
 const main=document.createElement('div');main.className='cap-card';main.style.maxWidth='900px';
 const fields=[
 ['read','讀取檔案','Read files'],
 ['write','建立與修改檔案','Create and modify files'],
 ['delete','刪除檔案','Delete files'],
 ['powershell','PowerShell 執行','PowerShell execution'],
 ['allowAllPowerShell','許可全部 PowerShell 命令（本次頁面工作階段）','Allow all PowerShell commands (current page session)']
 ];
 for(const [key,zh,en] of fields){
  const row=document.createElement('label');row.className='cap-row';
  const label=document.createElement('span');label.textContent=t(zh,en);
  const toggle=document.createElement('input');toggle.type='checkbox';toggle.checked=policy[key];
  toggle.onchange=()=>{
   if(key==='allowAllPowerShell'&&toggle.checked&&!confirm(t('這將允許 AI Agent 不逐次確認執行 PowerShell 命令。是否開啟？','Allow AI Agent to run PowerShell commands without per-command approval?'))){toggle.checked=false;return}
   policy[key]=toggle.checked;record('policy:'+key,'workspace',toggle.checked?'enabled':'disabled');render();
  };
  row.append(label,toggle);main.append(row);
 }
 const note=document.createElement('p');note.className='cap-note';note.textContent=t('設定適用所有 Explorer ROOT；重新載入頁面後重設。PowerShell 自動建立視窗不代表取得命令執行權限。','Settings apply to all Explorer roots and reset on reload. Opening a PowerShell window does not grant execution permission.');main.append(note);
 const auditTitle=document.createElement('h3');auditTitle.textContent=t('操作紀錄','Audit log');auditTitle.style.marginTop='22px';main.append(auditTitle);
 for(const e of policy.log.slice(0,60)){const row=document.createElement('div');row.className='cap-row';row.textContent=e.time+' · '+e.action+' · '+e.root+' · '+e.result;main.append(row)}
 page.append(main);
}
function deactivate(){active=false;page.hidden=true;tab.classList.remove('is-active')}
function open(){opened=true;active=true;window.ClusterTerminal?.deactivate?.();window.ClusterAI?.deactivate?.();window.ClusterDevelopmentEnvironment?.deactivate?.();window.ClusterSyntaxPage?.deactivate?.();document.body.classList.remove('cluster-terminal-active','cluster-ai-active');for(const id of ['editorShell','empty','localRangeView','clusterBottomBar']){const el=$(id);if(el)el.hidden=true}document.querySelectorAll('#tabList .tab').forEach(x=>x.classList.remove('is-active'));if(!tabs.contains(tab))tabs.append(tab);tab.classList.add('is-active');page.hidden=false;window.ClusterTabOrder?.apply?.();$('fileMenu').hidden=true;render()}
function close(){const wasActive=active;opened=false;deactivate();tab.remove();if(wasActive)window.cluster?.fm?.notify?.()}
button.onclick=open;$('uiLanguage')?.addEventListener('change',render);window.cluster?.fm?.onChange?.(()=>{if(opened&&!tabs.contains(tab))tabs.append(tab);if(active){deactivate();}});
tabs.addEventListener('click',event=>{if(active&&event.target.closest('.tab-select')&&!tab.contains(event.target)){deactivate()}},true);
document.addEventListener('click',event=>{if(active&&event.target.closest('#syntaxOpenPage,#developmentOpenPage,#clusterAiOpen,#terminalOpen'))deactivate()},true);
window.ClusterAgentPermissions={open,close,deactivate,isActive:()=>active,render,allowAllPowerShell:()=>policy.allowAllPowerShell,allowed,requireAccess,record,rootNames:()=>window.ClusterCEXP?.roots?.map(r=>r.name)||[]};
render();
})();