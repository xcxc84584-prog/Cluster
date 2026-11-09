import {FileManager} from '../PLUGIN/FileManager/file-manager.js';
const $=id=>document.getElementById(id);
const emit=(plugin,message)=>{const event={time:new Date().toISOString(),plugin,message};try{const a=JSON.parse(localStorage.getItem('cluster005_logs')||'[]');a.push(event);localStorage.setItem('cluster005_logs',JSON.stringify(a.slice(-2000)))}catch{}$('notice').textContent=message.slice(0,100)};
const fm=new FileManager(emit);window.cluster={fm,emit};let start=1,count=160,token=0,shownDoc=null;
const editor=$('editor'),gutter=$('gutter');
let lastSmallText='',externalSyncBusy=false;

// [FIX-001] Gutter uses one non-wrapping DOM row per physical line.
// The old CSS sets #gutter{white-space:normal}; textContent with newline characters
// collapses into spaces and wraps as '1 2 3' instead of one number per row.
function renderGutter(first,total){
  const fragment=document.createDocumentFragment();
  for(let i=0;i<Math.min(total,5000);i++){
    const row=document.createElement('span');
    row.className='line-number';
    row.textContent=String(first+i);
    if(fm.active && [...fm.active.blocks.values()].some(b=>first+i>=b.start&&first+i<=b.end))row.classList.add('cluster-block');
    fragment.appendChild(row);
  }
  gutter.replaceChildren(fragment);
}
function refreshSmallGutter(){
  const d=fm.active;
  if(!d||d.size>=100000)return;
  const lines=editor.value.split('\n').length;
  if(gutter.childElementCount!==Math.min(lines,5000))renderGutter(1,lines);
}

function tabs(){const list=$('tabList');list.replaceChildren();for(const d of fm.docs){const el=document.createElement('div');el.className='tab'+(d===fm.active?' is-active':'');const select=document.createElement('button');select.className='tab-select';select.textContent=d.name+(d.dirty?' ●':'');select.onclick=()=>{start=1;fm.select(d.id)};const close=document.createElement('button');close.className='tab-close';close.textContent='×';close.title='關閉文件';close.onclick=()=>{if(d.dirty&&!confirm('文件尚未儲存，確定關閉？'))return;fm.close(d.id)};el.append(select,close);list.append(el)}$('empty').hidden=!!fm.active;$('editorShell').hidden=!fm.active;$('clusterBottomBar').hidden=!fm.active;$('footerName').textContent=fm.active?.name||'未命名.txt';$('tierStatus').textContent=fm.active?(fm.active.size<100000?'L0':'L1'):'L0';updateBlockDirectory()}
fm.onChange(()=>{tabs();render()});
function setLoad(msg){$('clusterLoad').hidden=false;$('loadLabel').textContent=msg;$('loadPercent').textContent='';$('loadDetail').textContent=''}
async function render(){const d=fm.active,t=++token;if(!d)return;shownDoc=d;editor.disabled=false;try{if(d.size<100000){editor.value=d.mutations.length?d.mutations.at(-1).text:await d.getAllSmall();if(t!==token)return;start=1;const n=editor.value.split('\n').length;lastSmallText=editor.value;renderGutter(1,n);$('clusterLoad').hidden=true;return}if(!d.indexComplete){editor.disabled=true;editor.value='正在建立行號索引…';gutter.textContent='';setLoad('Indexing');if(!d.indexing)d.index(p=>{if(fm.active===d){$('loadLabel').textContent='Indexing';$('loadPercent').textContent=(p*100).toFixed(1)+'%'}}).then(()=>{if(fm.active===d)render()}).catch(e=>emit('SegmentLoader','ERROR PR6:001 '+e.message));return}const lines=await d.getLines(start,count);if(t!==token)return;editor.value=d.pendingView&&d.pendingView.start===start?d.pendingView.text:lines.join('\n');renderGutter(start,lines.length);setLoad(`Visible ${start}–${start+lines.length-1}`)}catch(e){emit('SegmentLoader','ERROR PR6:001 '+e.message)}}
const action={new:()=>fm.create(),open:async()=>{try{if(window.showOpenFilePicker && window.isSecureContext){try{const handles=await window.showOpenFilePicker({multiple:true});for(const handle of handles){const file=await handle.getFile();await fm.open(file,handle);emit('FileManager',`External watch active: ${file.name}`)}await pollExternal();return}catch(err){if(err.name==='AbortError')return;emit('FileManager',`Native picker fallback: ${err.message}`)}}const picker=$('fileInput');if(!picker)throw Error('fileInput missing');picker.value='';picker.click();emit('FileManager','Open file picker requested')}catch(e){emit('FileManager','ERROR OPEN: '+e.message)}},save:()=>save(false),saveas:()=>save(true),saveall:async()=>{for(const d of fm.docs)await save(false,d)},closeall:()=>{if(fm.docs.some(d=>d.dirty)&&!confirm('有未儲存文件，確定全部關閉？'))return;for(const d of [...fm.docs])fm.close(d.id)}};
async function save(as=false,doc=fm.active){if(!doc)return;try{if(doc.pendingView){await doc.replaceLines(doc.pendingView.start,doc.pendingView.end,doc.pendingView.text);doc.pendingView=null}await fm.save(doc,as);tabs()}catch(e){emit('FileManager','ERROR '+e.message)}}
$('fileButton').onclick=()=>{$('fileMenu').hidden=!$('fileMenu').hidden;$('fileButton').setAttribute('aria-expanded',String(!$('fileMenu').hidden))};$('fileMenu').addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;$('fileMenu').hidden=true;action[b.dataset.action]?.()});document.addEventListener('pointerdown',e=>{if(!e.target.closest('.menu-wrap'))$('fileMenu').hidden=true});
$('fileInput').onchange=async e=>{const files=Array.from(e.target.files||[]);e.target.value='';for(const f of files){try{emit('FileManager',`Opening ${f.name}`);await fm.open(f);emit('FileManager',`Opened ${f.name}; external watch unavailable (File input has no persistent handle)`)}catch(err){emit('FileManager',`ERROR OPEN ${f.name}: ${err.message}`)}}};
// [FIX-PR8] Center target line and prefetch surrounding slice window.
const lineHeight=()=>{const st=getComputedStyle(editor);return parseFloat(st.lineHeight)||23.2};
const centerLine=(localLine)=>{const h=lineHeight(),visible=Math.max(1,Math.floor(editor.clientHeight/h));editor.scrollTop=Math.max(0,(localLine-1-(visible-1)/2)*h);gutter.scrollTop=editor.scrollTop};
$('clusterGoLine').onclick=async()=>{const d=fm.active;if(!d)return;const n=Number($('clusterLine').value);if(!Number.isInteger(n)||n<1){emit('SegmentLoader','ERROR PR8:001 Invalid line');return}
 try{if(d.size<100000){const lines=editor.value.split('\n');if(n>lines.length)throw Error('Line out of range');const pos=lines.slice(0,n-1).join('\n').length+(n>1?1:0);editor.focus();editor.setSelectionRange(pos,pos);centerLine(n);return}
 if(!d.indexComplete||n>d.lineStarts.length)throw Error('Index unavailable or out of range');
 const visible=Math.max(5,Math.ceil(editor.clientHeight/lineHeight()));const before=Math.max(visible,Math.floor(count/3));start=Math.max(1,n-before);await render();
 const local=n-start+1;const lines=editor.value.split('\n');const pos=lines.slice(0,local-1).join('\n').length+(local>1?1:0);editor.focus();editor.setSelectionRange(pos,pos);centerLine(local);
 // Preload adjacent byte slices in background without changing the viewport.
 const offset=d.lineStarts[n-1]||0;const slice=Math.floor(offset/(250*1024));Promise.all([slice-1,slice,slice+1].filter(i=>i>=0&&i<d.nodes.length).map(i=>d.getSlice(i))).catch(e=>emit('SegmentLoader',`PREFETCH ERROR ${e.message}`));
 emit('SegmentLoader',`Goto line ${n}, viewport center, adjacent slices prefetched`);
 }catch(e){emit('SegmentLoader','ERROR PR8:001 '+e.message)}
};
$('clusterLocalEdit').onclick=()=>{const d=fm.active;if(!d)return;const n=Number($('clusterLine').value)||1;start=Math.max(1,n);render()};
editor.addEventListener('input',()=>{const d=fm.active;if(!d)return;d.dirty=true;if(d.size<100000){d.syncSmallBlocks(lastSmallText,editor.value);lastSmallText=editor.value;d.mutations=[{start:0,end:d.size,text:editor.value}];d.version++;refreshSmallGutter();updateBlockDirectory()}else{d.pendingView={start,end:Math.min(d.lineStarts.length,start+count-1),text:editor.value}};tabs()});
editor.addEventListener('scroll',()=>{gutter.scrollTop=editor.scrollTop;gutter.scrollLeft=editor.scrollLeft});
const updatePos=()=>{const prefix=editor.value.slice(0,editor.selectionStart).split('\n');$('position').textContent=`Ln ${start+prefix.length-1}, Col ${prefix.at(-1).length+1}`};editor.addEventListener('click',updatePos);editor.addEventListener('keyup',updatePos);
window.addEventListener('keydown',e=>{if(!e.ctrlKey)return;const k=e.key.toLowerCase();if(k==='n'||k==='o'||k==='s'){e.preventDefault();(k==='n'?action.new:k==='o'?action.open:e.shiftKey?action.saveas:action.save)()}});
$('autoSyncToggle').disabled=false;$('autoSyncToggle').title='自動保存（需文件寫入權限）';
const shell=document.createElement('a');shell.href='../local-powershell/';shell.textContent='PowerShell';shell.className='opt1-shell-link';shell.style.cssText='font-size:12px;color:#cddcff;text-decoration:none;border:1px solid #4a5262;border-radius:6px;padding:6px 10px';(document.getElementById('clusterAiOpen')||$('cexpToggle')).after(shell);


// [ADD-001] Block UI: stable BlockID, named line range, locate/delete and current content.
const bd=$('blockDirectory'),bdButton=$('blockDirectoryButton'),dialog=$('plibBlockDialog');
function updateBlockDirectory(){
 const d=fm.active,list=$('blockDirectoryList');if(!list)return;list.replaceChildren();
 const blocks=d?[...d.blocks.values()]:[];$('blockDirectoryCount').textContent=`${blocks.length} 個區塊`;
 if(!blocks.length){const empty=document.createElement('p');empty.className='block-directory-empty';empty.textContent='目前文件沒有區塊';list.append(empty)}
 for(const b of blocks){
   const row=document.createElement('div');row.className='block-directory-row';
   const item=document.createElement('button');item.type='button';item.className='block-directory-item';
   const title=document.createElement('strong');title.textContent=b.name||b.id;
   const meta=document.createElement('small');meta.textContent=`${b.id}  ·  Lines ${b.start}–${b.end}`;
   item.append(title,meta);item.title='點擊定位至區塊';item.onclick=()=>{bd.hidden=true;$('clusterLine').value=b.start;$('clusterGoLine').click()};
   const remove=document.createElement('button');remove.type='button';remove.className='block-directory-delete';remove.textContent='刪除';remove.title='刪除區塊';remove.onclick=()=>{d.blocks.delete(b.id);emit('SegmentLoader',`Block deleted ${b.id}`);updateBlockDirectory();refreshBlockGutter()};
   row.append(item,remove);list.append(row);
 }

}
async function getBlockContent(d,b){
 if(d.size<100000)return (d.mutations.length?d.mutations.at(-1).text:await d.getAllSmall()).split('\n').slice(b.start-1,b.end).join('\n');
 if(d.pendingView&&b.start>=d.pendingView.start&&b.end<=d.pendingView.end)return d.pendingView.text.split('\n').slice(b.start-d.pendingView.start,b.end-d.pendingView.start+1).join('\n');
 return (await d.getLines(b.start,b.end-b.start+1)).join('\n');
}
function refreshBlockGutter(){const d=fm.active;if(!d)return;const n=d.size<100000?editor.value.split('\n').length:editor.value.split('\n').length;renderGutter(d.size<100000?1:start,n)}
bdButton.onclick=()=>{bd.hidden=!bd.hidden;bdButton.setAttribute('aria-expanded',String(!bd.hidden));updateBlockDirectory()};
$('blockDirectoryClose').onclick=()=>{bd.hidden=true;bdButton.setAttribute('aria-expanded','false')};
$('clusterCreateBlock').onclick=()=>{if(!fm.active)return;const line=Number($('clusterLine').value)||1;$('plibStart').value=line;$('plibEnd').value=line;$('plibName').value='';$('plibError').textContent='';dialog.showModal()};
$('plibCancel').onclick=()=>dialog.close();
$('plibBlockForm').onsubmit=async e=>{e.preventDefault();const d=fm.active;if(!d)return;const a=Number($('plibStart').value),b=Number($('plibEnd').value),name=$('plibName').value.trim();
 try{const total=d.size<100000?(d.mutations.length?d.mutations.at(-1).text:await d.getAllSmall()).split('\n').length:d.lineStarts.length;
 if(!Number.isInteger(a)||!Number.isInteger(b)||a<1||b<a||b>total)throw Error(`行號範圍錯誤，文件共 ${total} 行`);
 if(!name)throw Error('請輸入區塊名稱');
 const id='B'+String(d.nextBlock++).padStart(4,'0');const block={id,name,start:a,end:b};d.blocks.set(id,block);
 const content=await getBlockContent(d,block);emit('SegmentLoader',`PASS PR5 CREATE BlockID:${id} Lines:${a}-${b} Content:${content.slice(0,1000)}`);
 dialog.close();updateBlockDirectory();refreshBlockGutter();bd.hidden=false;bdButton.setAttribute('aria-expanded','true');
 }catch(err){$('plibError').textContent=err.message;emit('SegmentLoader',`ERROR PR5:001 ${err.message}`)}};
// [ADD-002] External disk polling, only for granted file handles. Never overwrite dirty local edits.
async function pollExternal(){if(externalSyncBusy||document.hidden)return;externalSyncBusy=true;
 try{for(const d of fm.docs){if(!d.handle?.getFile)continue;try{
 const f=await d.handle.getFile();if(f.lastModified===d.file.lastModified&&f.size===d.file.size)continue;
 if(d.dirty||d.pendingView){emit('FileManager',`CONFLICT External edit: ${d.name} (local dirty; not overwritten)`);continue}
 const old=d.file;d.file=f;d.size=f.size;d.nodes=[];d.cache.clear();d.lineStarts=[0];d.indexComplete=false;d.indexedBytes=0;d.mutations=[];d.pendingView=null;await d.init();
 emit('FileManager',`External sync: ${d.name} ${old.lastModified} -> ${f.lastModified}`);if(fm.active===d)await render();
 }catch(err){if(err.name!=='NotAllowedError')emit('FileManager',`External check failed: ${d.name} ${err.message}`)}}
 }finally{externalSyncBusy=false}}
setInterval(pollExternal,2500);window.addEventListener('focus',pollExternal);document.addEventListener('visibilitychange',()=>{if(!document.hidden)pollExternal()});

window.addEventListener('beforeunload',e=>{if(fm.docs.some(d=>d.dirty)){e.preventDefault();e.returnValue=''}});
