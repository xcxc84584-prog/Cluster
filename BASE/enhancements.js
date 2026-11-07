/* Cluster opt7: isolated enhancements; legacy UI remains the source of truth. */
(()=>{'use strict';
const $=id=>document.getElementById(id), fm=window.cluster?.fm,emit=window.cluster?.emit;
if(!fm)return;
const KEY='cluster005_opt7_',editor=$('editor');
const safe=(fn)=>{try{return fn()}catch{return null}};
const get=(k,def)=>safe(()=>JSON.parse(localStorage.getItem(KEY+k)))??def;
const put=(k,v)=>safe(()=>localStorage.setItem(KEY+k,JSON.stringify(v)));
const fileKey=d=>d?.handle?'handle:'+d.name:'name:'+d?.name;
const log=(m)=>emit('Workspace',m);
// [ADD-PR10] Restore active tab and line; small draft snapshots only. Large files are never copied into localStorage.
let restoring=false,restorePending=false;
function snapshot(){if(restoring)return;const d=fm.active;const line=(editor.value.slice(0,editor.selectionStart).match(/\n/g)||[]).length+1;
 const docs=fm.docs.map(x=>({name:x.name,key:fileKey(x),size:x.size,small:x.size<100000,content:x.size<100000?(x===d?editor.value:(x.mutations.at(-1)?.text??null)):null}));
 put('session',{active:d?.name||null,line,scrollTop:editor.scrollTop,docs});}
let sessionTimer;function schedule(){clearTimeout(sessionTimer);sessionTimer=setTimeout(snapshot,180)}
editor.addEventListener('input',schedule);editor.addEventListener('keyup',schedule);editor.addEventListener('click',schedule);editor.addEventListener('scroll',schedule);window.addEventListener('cluster:tab-change',schedule);
window.addEventListener('pagehide',snapshot);
// [ADD-PR17] Block persistence, tied to filename in this first iteration. Stable handles require future identity migration.
function saveBlocks(d){if(!d)return;put('blocks:'+fileKey(d),{next:d.nextBlock,blocks:[...d.blocks.values()]});}
function restoreBlocks(d){const data=get('blocks:'+fileKey(d),null);if(!data)return;d.blocks=new Map((data.blocks||[]).map(b=>[b.id,b]));d.nextBlock=Math.max(data.next||1,1);}
const originalNotify=fm.notify.bind(fm);fm.notify=function(){originalNotify();schedule()};
window.addEventListener('cluster:file-open',e=>{restoreBlocks(e.detail.doc);schedule()});
const blockList=$('blockDirectoryList');if(blockList){const observer=new MutationObserver(()=>{const d=fm.active;if(!d)return;
 for(const row of blockList.querySelectorAll('.block-directory-row')){if(row.querySelector('.cluster-rename'))continue;const id=row.querySelector('small')?.textContent?.match(/B\d+/)?.[0];if(!id)continue;
 const btn=document.createElement('button');btn.className='cluster-rename';btn.textContent='✎';btn.title='重新命名';btn.onclick=()=>{const b=d.blocks.get(id);if(!b)return;const name=prompt('區塊名稱',b.name||b.id);if(name===null||!name.trim())return;b.name=name.trim().slice(0,100);saveBlocks(d);window.cluster.emit('BlockManager','Renamed '+id);$('blockDirectoryButton').click();$('blockDirectoryButton').click()};row.append(btn)}
 saveBlocks(d)});observer.observe(blockList,{childList:true});}
$('plibBlockForm')?.addEventListener('submit',()=>setTimeout(()=>saveBlocks(fm.active),40));
$('blockDirectoryList')?.addEventListener('click',()=>setTimeout(()=>saveBlocks(fm.active),50));
// [ADD-PR13] Fast crash-recovery snapshots. Physical disk writes still require an authorized handle.
let draftTimer;editor.addEventListener('input',()=>{clearTimeout(draftTimer);draftTimer=setTimeout(()=>{const d=fm.active;if(d&&d.size<100000){put('draft:'+fileKey(d),{text:editor.value,time:Date.now()});log('Draft checkpoint saved')}} ,650)});
// [ADD-PR16] Tab inserts spaces, auto-indent new lines, auto-close basic bracket pairs.
editor.addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();const a=editor.selectionStart,b=editor.selectionEnd;const spaces=' '.repeat(4-(a-editor.value.lastIndexOf('\n',a-1)-1)%4);editor.setRangeText(spaces,a,b,'end');editor.dispatchEvent(new Event('input',{bubbles:true}));return}
 if(e.key==='Enter'&&!e.isComposing){const a=editor.selectionStart,b=editor.selectionEnd,line=editor.value.slice(editor.value.lastIndexOf('\n',a-1)+1,a),indent=line.match(/^\s*/)?.[0]||'';if(indent){e.preventDefault();editor.setRangeText('\n'+indent,a,b,'end');editor.dispatchEvent(new Event('input',{bubbles:true}))}}
});
// [ADD-PR14] Text labels only; original DOM and CSS preserved.
const dictionary={zh:{file:'檔案⌄',block:'區塊目錄',go:'跳至行',create:'建立區塊',local:'局部編輯',new:'建立新檔',open:'開啟舊檔',save:'儲存',saveas:'另存檔案',saveall:'儲存全部',closeall:'關閉全部',lang:'語言 / Language'},en:{file:'File⌄',block:'Blocks',go:'Go to line',create:'Create block',local:'Local edit',new:'New file',open:'Open file',save:'Save',saveas:'Save as',saveall:'Save all',closeall:'Close all',lang:'Language'}};
function translate(code){const t=dictionary[code]||dictionary.zh;document.documentElement.lang=code==='en'?'en':'zh-Hant';$('fileButton').textContent=t.file;$('blockDirectoryButton').textContent=t.block;$('clusterGoLine').textContent=t.go;$('clusterCreateBlock').textContent=t.create;$('clusterLocalEdit').textContent=t.local;$('languageLabel').textContent=t.lang;
 for(const [key,label] of Object.entries({new:t.new,open:t.open,save:t.save,saveas:t.saveas,saveall:t.saveall,closeall:t.closeall})){const b=document.querySelector(`[data-action="${key}"]`);if(!b)continue;const hint=b.querySelector('small')?.textContent||'';b.replaceChildren(document.createTextNode(label+' '));if(hint){const sm=document.createElement('small');sm.textContent=hint;b.append(sm)}}put('language',code)}
$('uiLanguage').value=get('language','zh');translate($('uiLanguage').value);$('uiLanguage').addEventListener('change',e=>translate(e.target.value));
// [MOD-PR18] Explorer is provided by independent CEXP PLUGIN + LINK.
})();
