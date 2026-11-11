/* Cluster Prism overlay: presentation-only, no Base/V writes. */
(()=>{
'use strict';
const editor=document.getElementById('editor');
const shell=document.getElementById('editorShell');
if(!editor||!shell)return;
const overlay=document.createElement('div');
overlay.id='clusterSyntaxOverlay';
overlay.setAttribute('aria-hidden','true');
const code=document.createElement('pre');
code.id='clusterSyntaxCode';
overlay.append(code);shell.insertBefore(overlay,editor);
const languages={c:'c',h:'c',ino:'cpp',bak:'cpp',cc:'cpp',cpp:'cpp',cxx:'cpp',hpp:'cpp',hxx:'cpp',py:'python',js:'javascript',mjs:'javascript',cjs:'javascript',ts:'typescript',tsx:'tsx',jsx:'jsx',html:'markup',htm:'markup',xml:'markup',css:'css',json:'json',md:'markdown',ps1:'powershell',java:'java',rs:'rust',go:'go',sh:'bash',sql:'sql'};
const STORAGE_KEY='cluster.syntax.extensions.v1';
const defaults={...languages};
const supported=['c','cpp','python','javascript','typescript','jsx','tsx','markup','css','json','markdown','powershell','java','rust','go','bash','sql'];
function normalizeSuffix(value){
 const v=String(value||'').trim().toLowerCase().replace(/^\*+/,'');
 const suffix=v.startsWith('.')?v:'.'+v;
 if(!/^\.[a-z0-9_-]+(?:\.[a-z0-9_-]+)*$/.test(suffix)||suffix.length>40)throw Error('無效後綴 / Invalid suffix');
 return suffix;
}
function readRules(){
 try{
  const stored=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
  if(stored&&typeof stored==='object'&&!Array.isArray(stored)){
   const rules={};
   for(const [key,val] of Object.entries(stored)){
    try{const ext=normalizeSuffix(key);if(supported.includes(val))rules[ext]=val}catch{}
   }
   return rules;
  }
 }catch{}
 return Object.fromEntries(Object.entries(defaults).map(([ext,lang])=>['.'+ext,lang]));
}
let rules=readRules();
function saveRules(){
 localStorage.setItem(STORAGE_KEY,JSON.stringify(rules));
}
function languageForFile(name){
 const lower=String(name||'').toLowerCase();
 const suffix=Object.keys(rules).filter(x=>lower.endsWith(x)).sort((a,b)=>b.length-a.length)[0];
 return suffix?rules[suffix]:'none';
}
const syntaxLabels={
 zh:{title:'文本著色器',subtitle:'管理文件副檔名與語法語言的對應規則',addHeading:'後綴規則',addHint:'選擇副檔名及對應語言',extension:'文件後綴',language:'語法語言',add:'新增規則',remove:'刪除規則',list:'重新整理列表',registered:'已註冊的後綴',selected:'已選擇',added:'已新增',removed:'已刪除',missing:'找不到後綴',empty:'尚無規則',count:'筆規則',invalid:'無效後綴'},
 en:{title:'Syntax Highlighter',subtitle:'Manage file extensions and language highlighting rules',addHeading:'Extension rules',addHint:'Choose a file extension and syntax language',extension:'File extension',language:'Syntax language',add:'Add rule',remove:'Remove rule',list:'Refresh list',registered:'Registered extensions',selected:'Selected',added:'Added',removed:'Removed',missing:'Extension not found',empty:'No rules',count:'rules',invalid:'Invalid extension'}
};
function currentSyntaxLocale(){return document.getElementById('uiLanguage')?.value==='en'?'en':'zh'}
function syntaxT(key){return syntaxLabels[currentSyntaxLocale()][key]||key}
function translateSyntaxUI(){
 document.querySelectorAll('[data-syntax-i18n]').forEach(el=>{el.textContent=syntaxT(el.dataset.syntaxI18n)});
 const open=document.getElementById('syntaxOpenPage');
 if(open){const label=open.querySelector('.cluster-tool-text');if(label)label.textContent=syntaxT('title');else open.textContent='🎨　'+syntaxT('title');}
 const tab=document.querySelector('[data-tab-key="plugin:syntax"] .tab-select');
 if(tab)tab.textContent='🎨 '+syntaxT('title');
}
document.getElementById('uiLanguage')?.addEventListener('change',translateSyntaxUI);
let pageActive=false;
function setupSyntaxPage(){
 let pageOpened=false;
 const page=document.getElementById('syntaxEditorPage'),button=document.getElementById('syntaxOpenPage');
 const tabs=document.getElementById('tabList'),shell=document.getElementById('editorShell'),empty=document.getElementById('empty');
 if(!page||!button||!tabs||!shell||!empty)return;
 function sync(){
  let tab=tabs.querySelector('[data-tab-key="plugin:syntax"]');
  if(!tab&&pageOpened){
   tab=document.createElement('div');tab.className='tab';tab.dataset.tabKey='plugin:syntax';
   const open=document.createElement('button');open.type='button';open.className='tab-select';open.textContent='🎨 '+syntaxT('title');
   open.onclick=activate;
   const close=document.createElement('button');close.type='button';close.className='tab-close';close.textContent='×';close.onclick=closePage;
   tab.append(open,close);tabs.append(tab);
  }
  if(tab){tab.classList.toggle('is-active',pageActive);window.ClusterTabOrder?.apply?.();}
  page.hidden=!pageActive;
  if(pageActive){shell.hidden=true;empty.hidden=true;document.getElementById('clusterBottomBar').hidden=true}
 }
 function activate(){
  pageOpened=true;pageActive=true;window.ClusterTerminal?.deactivate?.();window.ClusterAI?.deactivate?.();window.ClusterBackup?.deactivate?.();window.ClusterDevelopmentEnvironment?.deactivate?.();window.ClusterAgentPermissions?.deactivate?.();document.querySelectorAll('#tabList .tab').forEach(t=>t.classList.remove('is-active'));
  document.getElementById('fileMenu').hidden=true;sync();
 }
 function deactivate(){
  pageActive=false;page.hidden=true;
  const tab=tabs.querySelector('[data-tab-key="plugin:syntax"]');tab?.classList.remove('is-active');
  const other=!!document.body.classList.contains('cluster-terminal-active')||!!window.ClusterAI?.isActive?.()||!!window.ClusterAgentPermissions?.isActive?.();
  shell.hidden=other||!window.cluster?.fm?.active;
  empty.hidden=other||!!window.cluster?.fm?.active;
  document.getElementById('clusterBottomBar').hidden=other||!window.cluster?.fm?.active;
 }
 function closePage(){pageOpened=false;deactivate();tabs.querySelector('[data-tab-key="plugin:syntax"]')?.remove();}
 button.onclick=activate;translateSyntaxUI();
 window.ClusterSyntaxPage={activate,deactivate,sync,close:closePage,isActive:()=>pageActive};
 window.cluster?.fm?.onChange?.(()=>{if(pageOpened)sync();});
}
function setupTools(){
 const input=document.getElementById('syntaxExtInput'),select=document.getElementById('syntaxLangSelect');
 const status=document.getElementById('syntaxExtStatus'),entries=document.getElementById('syntaxExtEntries');
 if(!input||!select||!status||!entries)return;
 for(const lang of supported){
  const option=document.createElement('option');option.value=lang;option.textContent=lang;select.append(option);
 }
 const show=()=>{
  entries.replaceChildren();
  for(const [ext,lang] of Object.entries(rules).sort(([a],[b])=>a.localeCompare(b))){
   const item=document.createElement('button');item.type='button';item.className='syntax-ext-entry';
   item.textContent=ext+'  →  '+lang;
   item.onclick=()=>{input.value=ext;select.value=lang;status.textContent=syntaxT('selected')+': '+ext};
   entries.append(item);
  }
  if(!entries.childElementCount)entries.textContent=syntaxT('empty');
 };
 const report=msg=>{status.textContent=msg;show();schedule()};
 document.getElementById('syntaxExtAdd')?.addEventListener('click',()=>{
  try{const suffix=normalizeSuffix(input.value),lang=select.value;if(!supported.includes(lang))throw Error('不支援的語言 / Unsupported language');
   rules[suffix]=lang;saveRules();report(syntaxT('added')+': '+suffix+' → '+lang);
  }catch(e){status.textContent=e.message}
 });
 document.getElementById('syntaxExtRemove')?.addEventListener('click',()=>{
  try{const suffix=normalizeSuffix(input.value);if(!(suffix in rules))throw Error(syntaxT('missing'));
   delete rules[suffix];saveRules();report(syntaxT('removed')+': '+suffix);
  }catch(e){status.textContent=e.message}
 });
 document.getElementById('syntaxExtList')?.addEventListener('click',()=>{show();status.textContent=Object.keys(rules).length+' '+syntaxT('count')});
 show();
}
let active=false,seq=0,timer=0,lastDoc=null;
const getLanguage=d=>languageForFile(d?.name);
function align(){
 const s=getComputedStyle(editor);
 overlay.style.left=editor.offsetLeft+'px';overlay.style.top=editor.offsetTop+'px';
 overlay.style.width=editor.offsetWidth+'px';overlay.style.height=editor.offsetHeight+'px';
 code.style.margin='0';code.style.border='0';code.style.color='#e6e6e6';code.style.font=s.font;code.style.lineHeight=s.lineHeight;code.style.letterSpacing=s.letterSpacing;
 code.style.padding=s.padding;code.style.minHeight='100%';code.style.tabSize=s.tabSize;
 code.style.whiteSpace=s.whiteSpace;code.style.overflowWrap=s.overflowWrap;
 code.style.width=editor.clientWidth+'px';code.style.boxSizing='border-box';
 code.style.transform='translate('+-editor.scrollLeft+'px,'+-editor.scrollTop+'px)';
}
function escapeText(text){return document.createTextNode(text)}
function appendToken(out,token,classes,skip){
 if(typeof token==='string'){
  const end=skip.pos+token.length;
  if(end>skip.start){
   const part=token.slice(Math.max(0,skip.start-skip.pos));
   if(classes.length){const span=document.createElement('span');span.className='token '+classes.join(' ');span.append(escapeText(part));out.append(span)}
   else out.append(escapeText(part));
  }
  skip.pos=end;return;
 }
 const types=[...classes,token.type];
 const value=token.content;
 if(Array.isArray(value))for(const t of value)appendToken(out,t,types,skip);
 else appendToken(out,value,types,skip);
}
function showPlain(text){code.textContent=text;shell.classList.remove('syntax-enabled');active=false}
async function refresh(){
 const id=++seq,d=window.cluster?.fm?.active;
 const text=editor.value||'';
 align();
 if(!d||shell.hidden||editor.disabled||!window.Prism||!window.Prism.languages){showPlain(text);return}
 const lang=getLanguage(d),grammar=window.Prism.languages[lang];
 if(!grammar||text.length>120000||lang==='none'){showPlain(text);return}
 // Warm up Prism grammar with bounded preceding logical lines. This handles
 // common comments/strings spanning adjacent 160-line editor windows.
 // It is deliberately bounded: an unterminated construct spanning more than
 // the lookback may be colored provisionally rather than scanning 1 GiB.
 let prefix='';
 const start=window.ClusterSyntaxViewport?.start?.()||1;
 if(start>1&&d.indexComplete&&typeof d.getLines==='function'){
  try{
   const from=Math.max(1,start-256),n=start-from;
   const prior=await d.getLines(from,n);
   if(id!==seq)return;
   prefix=prior.join('\n')+'\n';
   if(prefix.length>64000)prefix=prefix.slice(-64000);
  }catch{prefix=''}
 }
 if(id!==seq)return;
 try{
  const tokens=window.Prism.tokenize(prefix+text,grammar);
  if(id!==seq)return;
  const fragment=document.createDocumentFragment(),skip={start:prefix.length,pos:0};
  for(const t of tokens)appendToken(fragment,t,[],skip);
  code.replaceChildren(fragment);
  shell.classList.add('syntax-enabled');active=true;
  align();
 }catch(e){showPlain(text);console.warn('Cluster syntax fallback:',e)}
}
function schedule(){
 ++seq;clearTimeout(timer);timer=setTimeout(()=>{void refresh()},80);
}
editor.addEventListener('input',schedule);
editor.addEventListener('scroll',align,{passive:true});
window.addEventListener('resize',()=>{align();schedule()});
new MutationObserver(schedule).observe(document.getElementById('gutter'),{childList:true,subtree:false});
new MutationObserver(schedule).observe(shell,{attributes:true,attributeFilter:['hidden']});
const check=()=>{
 const d=window.cluster?.fm?.active;
 if(d!==lastDoc){lastDoc=d;schedule()}
};
window.clusterSyntax={refresh:schedule,dispose(){clearTimeout(timer);++seq;overlay.remove();shell.classList.remove('syntax-enabled')}};
window.addEventListener('focus',check);
document.addEventListener('click',check,true);
setupSyntaxPage();setupTools();align();schedule();
})();
