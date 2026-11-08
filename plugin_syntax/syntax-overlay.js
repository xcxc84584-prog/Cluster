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
const languages={c:'c',h:'c',cc:'cpp',cpp:'cpp',cxx:'cpp',hpp:'cpp',hxx:'cpp',py:'python',js:'javascript',mjs:'javascript',cjs:'javascript',ts:'typescript',tsx:'tsx',jsx:'jsx',html:'markup',htm:'markup',xml:'markup',css:'css',json:'json',md:'markdown',ps1:'powershell',java:'java',rs:'rust',go:'go',sh:'bash',sql:'sql'};
let active=false,seq=0,timer=0,lastDoc=null;
const getLanguage=d=>{const name=d?.name||'';const ext=name.split('.').pop().toLowerCase();return languages[ext]||'none'};
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
align();schedule();
})();
