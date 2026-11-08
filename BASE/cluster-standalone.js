/* Cluster v0.0.5 opt6: standalone compatible */
(function(){
/* Cluster v0.0.5 SegmentLoader: lazy 256000-byte slices; sparse line checkpoints; edit transactions */
const SLICE_BYTES=250*1024;
const decoder=new TextDecoder('utf-8');
const encoder=new TextEncoder();
function setDocStatus(doc,kind,detail,progress){
 if(!doc)return;
 doc.saveState={kind,detail,progress:Math.max(0,Math.min(100,progress))};
 if(window.cluster?.fm?.active===doc)ClusterVJournal.status(kind,detail,progress);
}
function showActiveStatus(doc){const x=doc?.saveState||{kind:'green',detail:'未選取文件',progress:100};ClusterVJournal.status(x.kind,x.detail,x.progress)}
class SegmentDocument {
 constructor(file,emit=()=>{}){this.file=file;this.emit=emit;this.id=crypto.randomUUID();this.name=file.name;this.size=file.size;this.version=0;this.nodes=[];this.changes=[];this.blocks=new Map();this.blockAnchors=new Map();this.nextBlock=1;this.lineStarts=[0];this.indexedBytes=0;this.indexedLines=1;this.indexComplete=false;this.cache=new Map();this.cacheLimit=12;this.indexing=false;this.mutations=[];this.vOperations=[];this.vRevision=0;this.vKey=null;this.vError=null;this.saveState={kind:"green",detail:"已同步",progress:100};this.indexPromise=null;this.saveBusy=false;}  
 async init(){const n=Math.max(1,Math.ceil(this.size/SLICE_BYTES));for(let i=0;i<n;i++){const start=i*SLICE_BYTES,end=Math.min(this.size,start+SLICE_BYTES);this.nodes.push({id:i,start,end,prev:i?i-1:null,next:i+1<n?i+1:null});if(i===n-1||i%128===0)this.emit('SegmentLoader',`Load "${this.name}",Slice:${Math.ceil(end/1024)}/${Math.ceil(this.size/1024)}KB`)}this.emit('SegmentLoader','Sliced loading successfully established.');return this}
 async getSlice(i){if(i<0||i>=this.nodes.length)return '';if(this.cache.has(i))return this.cache.get(i);const node=this.nodes[i];const text=decoder.decode(await this.file.slice(node.start,node.end).arrayBuffer());this.cache.set(i,text);if(this.cache.size>this.cacheLimit)this.cache.delete(this.cache.keys().next().value);return text}
 async textRange(start,end){start=Math.max(0,start);end=Math.min(this.size,end);if(end<=start)return '';return decoder.decode(await this.file.slice(start,end).arrayBuffer())}
 async index(onProgress=()=>{}){if(this.indexing)return;this.indexing=true;let offset=0,carryCR=false;const block=1024*1024;try{while(offset<this.size){const end=Math.min(this.size,offset+block);const bytes=new Uint8Array(await this.file.slice(offset,end).arrayBuffer());for(let i=0;i<bytes.length;i++){if(bytes[i]===10)this.lineStarts.push(offset+i+1)}offset=end;this.indexedBytes=offset;this.indexedLines=this.lineStarts.length;onProgress(offset/Math.max(1,this.size));if(offset%(8*block)===0)await new Promise(r=>setTimeout(r,0))}this.indexComplete=true;this.emit('SegmentLoader',`Index complete,lines:${this.lineStarts.length}`)}catch(e){this.emit('SegmentLoader',`ERROR PR6:001 ${e.message}`);throw e}finally{this.indexing=false}}
 async getLines(first,count){if(this.vOperations.length){const overlay=[...this.vOperations].reverse().find(x=>x.kind==='window'&&x.start===first&&x.count===count);if(overlay)return overlay.text.split('\n')} if(!this.indexComplete&&first>this.indexedLines)throw Error('行號索引尚未完成');const start=this.lineStarts[Math.max(0,first-1)]??this.size;/* [FIX-PR1-001] End of requested line window is EOF when no subsequent newline exists. */const nextLineIndex=first+count-1;const end=nextLineIndex<this.lineStarts.length?this.lineStarts[nextLineIndex]:this.size;let text=await this.textRange(start,end);let lines=text.split('\n');return lines.slice(0,count).map(s=>s.endsWith('\r')?s.slice(0,-1):s)}
 async getBaseWindowLines(first,count){const begin=this.lineStarts[first-1]??this.size;const end=this.lineStarts[first+count-1]??this.size;return (await this.textRange(begin,end)).split('\n').slice(0,count).map(x=>x.replace(/\r$/,''))}
 async getAllSmall(){return this.file.text()}
 async replaceLines(start,end,newText){if(!this.indexComplete)throw Error('需等待索引完成');if(start<1||end<start||end>this.lineStarts.length)throw Error('行號範圍無效');const old=await this.getLines(start,end-start+1);const before=this.lineStarts[start-1];const after=this.lineStarts[end]??this.size;const replacement=newText+(after<this.size?'\n':'');this.mutations.push({start:before,end:after,text:replacement,old:old.join('\n')});this.mutations.sort((a,b)=>a.start-b.start);this.version++;const delta=newText.split('\n').length-(end-start+1);for(const block of this.blocks.values()){if(block.start> end){block.start+=delta;block.end+=delta}else if(block.end>=start){block.end+=delta;if(block.start>start)block.start=start}}return {delta,version:this.version}}
 async createBlock(start,end){if(!this.indexComplete)throw Error('索引尚未完成');if(start<1||end<start||end>this.lineStarts.length)throw Error('範圍無效');const id='B'+String(this.nextBlock++).padStart(4,'0');const content=(await this.getLines(start,end-start+1)).join('\n');const block={id,start,end,content};this.blocks.set(id,block);return block}
 async checkBlock(id){const b=this.blocks.get(id);if(!b)throw Error('Block ID 不存在');return {...b,content:(await this.getLines(b.start,b.end-b.start+1)).join('\n')}}
 async deleteBlock(id){return this.blocks.delete(id)}
 async syncSmallBlocks(oldText,newText){
   if(!this.blocks.size||oldText===newText)return;
   const a=oldText.split('\n'),b=newText.split('\n');let pre=0;
   while(pre<a.length&&pre<b.length&&a[pre]===b[pre])pre++;
   let suf=0;while(suf<a.length-pre&&suf<b.length-pre&&a[a.length-1-suf]===b[b.length-1-suf])suf++;
   const removed=a.length-pre-suf,added=b.length-pre-suf,delta=added-removed;
   for(const block of this.blocks.values()){
     if(block.start>pre+removed){block.start+=delta;block.end+=delta}
     else if(block.end>pre){block.end=Math.max(block.start,block.end+delta)}
   }
 }
 async exportBlob(){if(!this.mutations.length)return this.file;const parts=[];let cursor=0;for(const m of this.mutations){if(m.start<cursor)throw Error('重疊修改請先儲存後繼續');parts.push(this.file.slice(cursor,m.start),m.text);cursor=m.end}parts.push(this.file.slice(cursor));return new Blob(parts,{type:'text/plain;charset=utf-8'})}
}

// [MOD-PR15] Persist completed indexes without delaying the editor.
const _indexOriginal=SegmentDocument.prototype.index;
SegmentDocument.prototype.index=async function(progress){
 if(await window.ClusterIndexCache?.restore(this))return;
 await _indexOriginal.call(this,progress);
 void window.ClusterIndexCache?.store(this);
};


class FileManager {
 constructor(emit){this.emit=emit;this.docs=[];this.active=null;this.listeners=new Set()}
 onChange(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn)}
 notify(){for(const fn of this.listeners)fn(this)}
 async open(file,handle=null){const doc=await new SegmentDocument(file,this.emit).init();doc.handle=handle;doc.dirty=false;
try{doc.vKey=await ClusterVJournal.fingerprint(file);const record=await ClusterVJournal.read(doc.vKey);if(record?.operations?.length){const accept=confirm(`找到 ${file.name} 的 ${record.operations.length} 筆尚未同步 V 操作。\n確定：載入 V 並顯示合成版本（不寫入原始文件）\n取消：捨棄 V 操作`);if(accept){doc.vOperations=record.operations;doc.vRevision=record.revision;doc.dirty=true;doc.mutations=record.mutations||[];setDocStatus('yellow','已恢復 V，等待主動儲存',100)}else{await ClusterVJournal.remove(doc.vKey);setDocStatus('green','已捨棄 V，使用原始文件',100)}}else setDocStatus('green','原始文件與 V 同步',100)}catch(e){doc.vError=e;setDocStatus('red','無法讀取 V：'+e.message,0)}this.docs.push(doc);this.active=doc;showActiveStatus(doc);this.notify();window.dispatchEvent(new CustomEvent('cluster:file-open',{detail:{doc}}));return doc}
 async create(){return this.open(new File([''],'未命名.txt',{type:'text/plain'}))}
 select(id){this.active=this.docs.find(x=>x.id===id)||null;showActiveStatus(this.active);this.notify();window.dispatchEvent(new Event('cluster:tab-change'))}
 close(id){this.docs=this.docs.filter(x=>x.id!==id);if(this.active?.id===id)this.active=this.docs.at(-1)||null;showActiveStatus(this.active);this.notify();window.dispatchEvent(new CustomEvent('cluster:file-close',{detail:{id}}))}
 async save(doc=this.active,saveAs=false,forceMerge=false){if(!doc)throw Error('沒有文件');if(doc.vError)throw Error('V 日誌異常，禁止覆寫原始文件');if(doc.saveBusy)throw Error('此文件已有儲存工作進行中');doc.saveBusy=true;try{if(doc.size>=100000&&doc.vOperations.length){
  if(!doc.indexComplete)throw Error('行號索引尚未完成');
  // Derive minimal edits against immutable Base instead of treating each
  // overlapping viewport as a conflicting full-window replacement.
  const latest=new Map();
  for(const op of doc.vOperations)if(op.kind==='window')latest.set(op.start+':'+op.count,op);
  const candidates=[];
  for(const op of latest.values()){
    if(!Number.isInteger(op.start)||!Number.isInteger(op.count)||op.start<1||op.count<1)
      throw Error('V 操作的原始座標無效');
    const expected=Math.min(op.count,doc.lineStarts.length-op.start+1);
    if(expected<=0)throw Error('V 操作超出原始文件範圍');
    const base=await doc.getBaseWindowLines(op.start,expected);
    const edited=op.text.split('\n').map(x=>x.replace(/\r$/,''));
    let prefix=0;
    while(prefix<base.length&&prefix<edited.length&&base[prefix]===edited[prefix])prefix++;
    let suffix=0;
    while(suffix<base.length-prefix&&suffix<edited.length-prefix&&
      base[base.length-1-suffix]===edited[edited.length-1-suffix])suffix++;
    const removed=base.length-prefix-suffix;
    const added=edited.slice(prefix,edited.length-suffix);
    if(!removed&&!added.length)continue;
    const line=op.start+prefix;
    candidates.push({line,removed,added,order:op.id||0});
  }
  candidates.sort((a,b)=>a.line-b.line||a.order-b.order);
  const selected=[];let conflicts=0;
  for(const edit of candidates){
    const overlap=selected.find(p=>
      (edit.removed===0&&p.removed===0&&edit.line===p.line)||
      (edit.removed===0&&edit.line>=p.line&&edit.line<p.line+p.removed)||
      (p.removed===0&&p.line>=edit.line&&p.line<edit.line+edit.removed)||
      (edit.removed>0&&p.removed>0&&edit.line<p.line+p.removed&&p.line<edit.line+edit.removed));
    if(overlap){
      // Identical edits can be deduplicated without prompting.
      if(edit.line===overlap.line&&edit.removed===overlap.removed&&
        edit.added.join('\n')===overlap.added.join('\n'))continue;
      conflicts++;
      if(!forceMerge)throw Error('V_ACTUAL_CONFLICT:'+conflicts);
      if(edit.order>overlap.order){selected.splice(selected.indexOf(overlap),1);selected.push(edit)}
    }else selected.push(edit);
  }
  selected.sort((a,b)=>a.line-b.line);
  const patches=selected.map(edit=>{
    const from=doc.lineStarts[edit.line-1]??doc.size;
    const to=doc.lineStarts[edit.line+edit.removed-1]??doc.size;
    const terminated=to<doc.size;
    return {start:from,end:to,text:edit.added.join('\n')+(terminated?'\n':'')};
  });
  doc.mutations=patches;
 }const revision=doc.vRevision;setDocStatus(doc,'yellow','V 與原始文件整合：準備快照',5);const blob=await doc.exportBlob();let handle=doc.handle;try{if(saveAs||!handle?.createWritable){if(!window.showSaveFilePicker)throw Error('瀏覽器不支援直接存檔，請使用支援 File System Access API 的瀏覽器');handle=await showSaveFilePicker({suggestedName:doc.name})}const writer=await handle.createWritable();let written=0;try{const reader=blob.stream().getReader();while(true){const {done,value}=await reader.read();if(done)break;await writer.write(value);written+=value.byteLength;setDocStatus(doc,'yellow',`整合寫入 ${Math.round(written/Math.max(1,blob.size)*100)}%`,10+Math.floor(written/Math.max(1,blob.size)*80))}setDocStatus(doc,'yellow','整合提交：確認原始文件',95);await writer.close()}catch(e){await writer.abort().catch(()=>{});throw e}doc.handle=handle;doc.file=await handle.getFile();doc.size=doc.file.size;doc.mutations=[];doc.pendingView=null;doc.vOperations=[];doc.dirty=false;if(doc.indexPromise)await doc.indexPromise;doc.lineStarts=[0];doc.indexComplete=false;doc.indexedBytes=0;doc.cache.clear();doc.nodes=[];await doc.init();if(this.active===doc){start=1;token++;void render()}if(doc.vKey)await ClusterVJournal.remove(doc.vKey);doc.vKey=await ClusterVJournal.fingerprint(doc.file);if(doc.vRevision!==revision){doc.dirty=true;setDocStatus(doc,'yellow','儲存期間出現新編輯，仍需同步',100)}else setDocStatus(doc,'green','原始文件同步成功',100);this.notify();this.emit('FileManager',`Committed "${doc.name}"`)}catch(e){setDocStatus(doc,'red','同步失敗：'+e.message,0);throw e}}finally{doc.saveBusy=false}}

}


const $=id=>document.getElementById(id);
const emit=(plugin,message)=>{const event={time:new Date().toISOString(),plugin,message};try{const a=JSON.parse(localStorage.getItem('cluster005_logs')||'[]');a.push(event);localStorage.setItem('cluster005_logs',JSON.stringify(a.filter(x=>Date.parse(x.time)>Date.now()-7*86400000).slice(-1000)))}catch{}$('notice').textContent=message.slice(0,100)};
const fm=new FileManager(emit);window.cluster={fm,emit};let start=1,count=160,token=0,shownDoc=null;
const editor=$('editor'),gutter=$('gutter');
let lastSmallText='',externalSyncBusy=false;
const vTimers=new Map();async function persistV(d){try{if(!d.vKey)d.vKey=await ClusterVJournal.fingerprint(d.file);setDocStatus(d,'yellow','正在記錄 V 操作',35);await ClusterVJournal.write(d.vKey,{revision:d.vRevision,operations:d.vOperations,mutations:d.mutations});d.vError=null;setDocStatus(d,'yellow',`V 已持久化（${d.vOperations.length} 筆），原始文件未同步`,100)}catch(e){d.vError=e;setDocStatus(d,'red','V 記錄失敗：'+e.message,0)}}
function queueV(d,op){d.vOperations.push({...op,id:++d.vRevision,at:Date.now()});setDocStatus(d,'yellow','V 尚未完成持久化',5);clearTimeout(vTimers.get(d.id));vTimers.set(d.id,setTimeout(()=>persistV(d),350))}
async function flushV(d){clearTimeout(vTimers.get(d.id));if(d.vOperations.length)await persistV(d);if(d.vError)throw d.vError}


// Display-only V line offset. Each original window contributes at most once:
// b = sum(new logical line count - original logical line count) for completed
// V windows before the displayed original line. Never change source indexing.
// Line-coordinate mapping for V windows. Only count changed content, not
// the entire 160-line viewport. Overlapping edited ranges are unsafe to sum.
function vLineMap(doc){
 const latest=new Map();
 for(const op of doc?.vOperations||[]){
  if(op.kind==='window'&&Number.isInteger(op.start)&&Number.isInteger(op.count)&&op.count>0&&typeof op.text==='string')
   latest.set(op.start+':'+op.count,op);
 }
 const windows=[...latest.values()].sort((a,b)=>a.start-b.start);
 const entries=[];let previousEnd=0,offset=0,conflict=false;
 for(const op of windows){
  const originalCount=Math.min(op.count,Math.max(0,doc.lineStarts.length-op.start+1));
  if(!originalCount)continue;
  const end=op.start+originalCount-1;
  if(op.start<=previousEnd){conflict=true;continue}
  // An untouched window must not contribute an artificial -1 or +1.
  const newCount=op.text.split('\n').length;
  const delta=newCount-originalCount;
  entries.push({start:op.start,end,delta,before:offset,after:offset+delta,newCount});
  offset+=delta;previousEnd=end;
 }
 return {entries,conflict,total:doc.lineStarts.length+offset};
}
function vDisplayLine(map,baseLine){
 let delta=0;
 for(const e of map.entries){if(baseLine>e.end)delta=e.after;else break}
 return baseLine+delta;
}
function vBaseLine(map,displayLine){
 let delta=0;
 for(const e of map.entries){
  const begin=e.start+e.before,finish=begin+e.newCount-1;
  if(displayLine<begin)break;
  if(displayLine<=finish)return Math.max(e.start,Math.min(e.end,e.start+displayLine-begin));
  delta=e.after;
 }
 return displayLine-delta;
}
// [FIX-001] Gutter uses one non-wrapping DOM row per physical line.
// The old CSS sets #gutter{white-space:normal}; textContent with newline characters
// collapses into spaces and wraps as '1 2 3' instead of one number per row.
function renderGutter(first,total){
  const fragment=document.createDocumentFragment();
  for(let i=0;i<Math.min(total,5000);i++){
    const row=document.createElement('span');
    row.className='line-number';
    row.textContent=String(vDisplayLine(vLineMap(fm.active),first+i));
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

function tabs(){const list=$('tabList');const terminalVisible=!document.getElementById('clusterTerminalPanel')?.hidden;list.replaceChildren();for(const d of fm.docs){const el=document.createElement('div');el.className='tab'+(d===fm.active?' is-active':'');const select=document.createElement('button');select.className='tab-select';select.textContent=d.name+(d.dirty?' ●':'');select.onclick=()=>{window.ClusterTerminal?.deactivate?.();start=1;fm.select(d.id)};const close=document.createElement('button');close.className='tab-close';close.textContent='×';close.title='關閉文件';close.onclick=()=>{if(d.dirty&&!confirm('文件尚未儲存，確定關閉？'))return;fm.close(d.id)};el.dataset.tabKey='file:'+d.id;el.append(select,close);list.append(el)}$('empty').hidden=terminalVisible||!!fm.active;$('editorShell').hidden=terminalVisible||!fm.active;$('clusterBottomBar').hidden=terminalVisible||!fm.active;$('footerName').textContent=fm.active?.name||'未命名.txt';$('tierStatus').textContent=fm.active?(fm.active.size<100000?'L0':'L1'):'L0';updateBlockDirectory();window.ClusterTerminal?.syncTabs?.();window.ClusterTabOrder?.apply?.()}
fm.onChange(()=>{tabs();if(document.activeElement!==editor||shownDoc!==fm.active)render()});

/* Long-press tab reordering. Works across file and PowerShell tabs. */
(()=>{
 const list=$('tabList'),order=[];let drag=null,timer=null;
 const clear=()=>{if(timer){clearTimeout(timer);timer=null;}if(drag?.tab)drag.tab.classList.remove('cluster-tab-dragging');drag=null;};
 const apply=()=>{const nodes=[...list.querySelectorAll('.tab[data-tab-key]')],byKey=new Map(nodes.map(n=>[n.dataset.tabKey,n]));const current=new Set(byKey.keys());for(let i=order.length-1;i>=0;i--)if(!current.has(order[i]))order.splice(i,1);for(const n of nodes)if(!order.includes(n.dataset.tabKey))order.push(n.dataset.tabKey);for(const key of order)list.append(byKey.get(key));};
 const start=e=>{if(e.button!==0||e.target.closest('.tab-close'))return;const tab=e.target.closest('.tab[data-tab-key]');if(!tab||!list.contains(tab))return;clear();drag={tab,x:e.clientX,y:e.clientY,active:false};timer=setTimeout(()=>{if(!drag)return;drag.active=true;tab.classList.add('cluster-tab-dragging');},450);};
 const move=e=>{if(!drag)return;if(!drag.active){if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>9)clear();return;}const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('.tab[data-tab-key]');if(!target||target===drag.tab||target.parentElement!==list)return;const rect=target.getBoundingClientRect();list.insertBefore(drag.tab,e.clientX<rect.left+rect.width/2?target:target.nextSibling);};
 const end=e=>{if(!drag)return;const active=drag.active;if(active){e.preventDefault();e.stopPropagation();order.splice(0,order.length,...[...list.querySelectorAll('.tab[data-tab-key]')].map(n=>n.dataset.tabKey));}clear();};
 list.addEventListener('pointerdown',start);
 document.addEventListener('pointermove',move);
 document.addEventListener('pointerup',end,true);
 document.addEventListener('pointercancel',clear);
 list.addEventListener('click',e=>{if(list.dataset.suppressTabClick==='1'){e.preventDefault();e.stopImmediatePropagation();list.dataset.suppressTabClick='0';}},true);
 window.ClusterTabOrder={apply};
})();

function setLoad(msg){$('clusterLoad').hidden=false;$('loadLabel').textContent=msg;$('loadPercent').textContent='';$('loadDetail').textContent=''}
async function render(){const d=fm.active,t=++token;if(!d)return;shownDoc=d;editor.disabled=!d.indexComplete&&d.size>=100000;try{if(d.size<100000){editor.value=d.vOperations.length?([ ...d.vOperations ].reverse().find(x=>x.kind==='small')?.text??await d.getAllSmall()):d.mutations.length?d.mutations.at(-1).text:await d.getAllSmall();if(t!==token)return;start=1;const n=editor.value.split('\n').length;lastSmallText=editor.value;renderGutter(1,n);$('clusterLoad').hidden=true;return}if(!d.indexComplete){editor.disabled=true;editor.value='正在建立行號索引…';gutter.textContent='';setLoad('Indexing');if(!d.indexPromise)d.indexPromise=d.index(p=>{if(fm.active===d){$('loadLabel').textContent='Indexing';$('loadPercent').textContent=(p*100).toFixed(1)+'%'}}).then(()=>{if(fm.active===d)void render()}).catch(e=>emit('SegmentLoader','ERROR PR6:001 '+e.message)).finally(()=>{d.indexPromise=null});return}const lines=await d.getLines(start,count);if(t!==token)return;editor.value=d.pendingView&&d.pendingView.start===start?d.pendingView.text:lines.join('\n');renderGutter(start,editor.value.split('\n').length);setLoad(`Visible ${start}–${start+lines.length-1}`)}catch(e){emit('SegmentLoader','ERROR PR6:001 '+e.message)}}
const action={new:()=>fm.create(),open:async()=>{try{if(window.showOpenFilePicker && window.isSecureContext){try{const handles=await window.showOpenFilePicker({multiple:true});for(const handle of handles){const file=await handle.getFile();await fm.open(file,handle);emit('FileManager',`External watch active: ${file.name}`)}await pollExternal();return}catch(err){if(err.name==='AbortError')return;emit('FileManager',`Native picker fallback: ${err.message}`)}}const picker=$('fileInput');if(!picker)throw Error('fileInput missing');picker.value='';picker.click();emit('FileManager','Open file picker requested')}catch(e){emit('FileManager','ERROR OPEN: '+e.message)}},save:()=>save(false),saveas:()=>save(true),saveall:async()=>{for(const d of fm.docs)await save(false,d)},closeall:()=>{if(fm.docs.some(d=>d.dirty)&&!confirm('有未儲存文件，確定全部關閉？'))return;for(const d of [...fm.docs])fm.close(d.id);window.ClusterTerminal?.closeAll?.()}};
async function save(as=false,doc=fm.active){if(!doc)return;try{if(doc.pendingView&&doc.size<100000){await doc.replaceLines(doc.pendingView.start,doc.pendingView.end,doc.pendingView.text);doc.pendingView=null}await flushV(doc);editor.disabled=true;try{await fm.save(doc,as)}catch(e){if(String(e.message).startsWith('V_ACTUAL_CONFLICT:')){const ok=confirm('偵測到實際 V 編輯範圍衝突。強制合併會依最新編輯覆蓋衝突區域，可能遺失較早的衝突修改。V 紀錄在儲存成功前仍會保留。是否強制合併？');if(ok)await fm.save(doc,as,true);else emit('FileManager','已取消強制合併；V 紀錄保留')}else throw e}finally{editor.disabled=false}tabs()}catch(e){emit('FileManager','ERROR '+e.message)}}
$('fileButton').onclick=()=>{if(!$('fileMenu').hidden){/* closing */}else{$('blockDirectory').hidden=true;$('blockDirectoryButton').setAttribute('aria-expanded','false')} $('fileMenu').hidden=!$('fileMenu').hidden;$('fileButton').setAttribute('aria-expanded',String(!$('fileMenu').hidden))};$('fileMenu').addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;$('fileMenu').hidden=true;action[b.dataset.action]?.()});document.addEventListener('pointerdown',e=>{if(!e.target.closest('.menu-wrap'))$('fileMenu').hidden=true});
$('fileInput').onchange=async e=>{const files=Array.from(e.target.files||[]);e.target.value='';for(const f of files){try{emit('FileManager',`Opening ${f.name}`);await fm.open(f);emit('FileManager',`Opened ${f.name}; external watch unavailable (File input has no persistent handle)`)}catch(err){emit('FileManager',`ERROR OPEN ${f.name}: ${err.message}`)}}};
// [FIX-PR8] Center target line and prefetch surrounding slice window.
const lineHeight=()=>{const st=getComputedStyle(editor);return parseFloat(st.lineHeight)||23.2};
const centerLine=(localLine)=>{const h=lineHeight(),visible=Math.max(1,Math.floor(editor.clientHeight/h));editor.scrollTop=Math.max(0,(localLine-1-(visible-1)/2)*h);gutter.scrollTop=editor.scrollTop};
$('clusterGoLine').onclick=async()=>{const d=fm.active;if(!d)return;const n=Number($('clusterLine').value);if(!Number.isInteger(n)||n<1){emit('SegmentLoader','ERROR PR8:001 Invalid line');return}
 try{if(d.size<100000){const lines=editor.value.split('\n');if(n>lines.length)throw Error('Line out of range');const pos=lines.slice(0,n-1).join('\n').length+(n>1?1:0);editor.focus();editor.setSelectionRange(pos,pos);centerLine(n);return}
 const map=vLineMap(d);if(!d.indexComplete||n>map.total)throw Error('Index unavailable or out of range');if(map.conflict)emit('SegmentLoader','V 視窗重疊：Go to line 暫以非重疊區間偏移定位');const baseN=vBaseLine(map,n);
 const visible=Math.max(5,Math.ceil(editor.clientHeight/lineHeight()));const before=Math.max(visible,Math.floor(count/3));await flushV(d);start=Math.max(1,baseN-before);await render();
 const local=baseN-start+1;const lines=editor.value.split('\n');const pos=lines.slice(0,local-1).join('\n').length+(local>1?1:0);editor.focus();editor.setSelectionRange(pos,pos);centerLine(local);
 // Preload adjacent byte slices in background without changing the viewport.
 const offset=d.lineStarts[baseN-1]||0;const slice=Math.floor(offset/(250*1024));Promise.all([slice-1,slice,slice+1].filter(i=>i>=0&&i<d.nodes.length).map(i=>d.getSlice(i))).catch(e=>emit('SegmentLoader',`PREFETCH ERROR ${e.message}`));
 emit('SegmentLoader',`Goto line ${n}, viewport center, adjacent slices prefetched`);
 }catch(e){emit('SegmentLoader','ERROR PR8:001 '+e.message)}
};
$('clusterLocalEdit').onclick=()=>{const d=fm.active;if(!d)return;const n=Number($('clusterLine').value)||1;void flushV(d).then(()=>{start=Math.max(1,n);return render()})};
editor.addEventListener('input',()=>{const d=fm.active;if(!d)return;d.dirty=true;if(d.size<100000){d.syncSmallBlocks(lastSmallText,editor.value);lastSmallText=editor.value;d.mutations=[{start:0,end:d.size,text:editor.value}];d.version++;queueV(d,{kind:'small',text:editor.value});refreshSmallGutter();updateBlockDirectory()}else{d.pendingView={start,end:Math.min(d.lineStarts.length,start+count-1),text:editor.value};queueV(d,{kind:'window',start,count,text:editor.value})};tabs()});
// [OPT2] Virtual page scrolling: shift logical windows when reaching either edge.
let pageShiftBusy=false;
async function shiftWindow(direction){
 const d=fm.active;if(!d||d.size<100000||!d.indexComplete||pageShiftBusy||editor.disabled)return;
 const maxStart=Math.max(1,d.lineStarts.length-count+1);
 const next=Math.max(1,Math.min(maxStart,start+direction*Math.max(25,Math.floor(count/2))));
 if(next===start)return;
 pageShiftBusy=true;
 try{await flushV(d);const oldStart=start;start=next;await render();const h=lineHeight();
   editor.scrollTop=direction>0?Math.max(0,(oldStart+count-next-Math.ceil(editor.clientHeight/h))*h):Math.max(0,(oldStart-next)*h);
   gutter.scrollTop=editor.scrollTop;
 }catch(e){emit('SegmentLoader','Window shift failed: '+e.message)}finally{pageShiftBusy=false}
}
editor.addEventListener('wheel',e=>{const d=fm.active;if(!d||d.size<100000||!d.indexComplete||pageShiftBusy)return;
 const nearBottom=editor.scrollTop+editor.clientHeight>=editor.scrollHeight-2;
 const nearTop=editor.scrollTop<=2;
 if((e.deltaY>0&&nearBottom)||(e.deltaY<0&&nearTop)){e.preventDefault();void shiftWindow(e.deltaY>0?1:-1)}
},{passive:false});
editor.addEventListener('scroll',()=>{gutter.scrollTop=editor.scrollTop;gutter.scrollLeft=editor.scrollLeft});
const updatePos=()=>{const prefix=editor.value.slice(0,editor.selectionStart).split('\n');$('position').textContent=`Ln ${vDisplayLine(vLineMap(fm.active),start+prefix.length-1)}, Col ${prefix.at(-1).length+1}`};editor.addEventListener('click',updatePos);editor.addEventListener('keyup',updatePos);
window.addEventListener('keydown',e=>{if(!e.ctrlKey)return;const k=e.key.toLowerCase();if(k==='n'||k==='o'||k==='s'){e.preventDefault();(k==='n'?action.new:k==='o'?action.open:e.shiftKey?action.saveas:action.save)()}});
$('autoSyncToggle').disabled=false;$('autoSyncToggle').title='自動保存（需文件寫入權限）';
const shell=document.createElement('button');shell.type='button';shell.textContent='PowerShell';shell.className='opt1-shell-link';shell.style.cssText='font-size:12px;color:#cddcff;background:transparent;cursor:pointer;border:1px solid #4a5262;border-radius:6px;padding:6px 10px';shell.onclick=()=>window.ClusterTerminal?.open();$('cexpToggle').after(shell);


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
bdButton.onclick=()=>{if(bd.hidden){$('fileMenu').hidden=true;$('fileButton').setAttribute('aria-expanded','false')}bd.hidden=!bd.hidden;bdButton.setAttribute('aria-expanded',String(!bd.hidden));updateBlockDirectory()};
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

})();
