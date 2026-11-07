/* [ADD-PR10/13/15] Persistent workspace: IndexedDB file handles, snapshots and line indexes. */
(()=>{'use strict';const fm=window.cluster.fm,el=document.getElementById('editor'),toggle=document.getElementById('autoSyncToggle');
 const dbp=new Promise((resolve,reject)=>{const q=indexedDB.open('cluster-opt8-workspace',1);q.onupgradeneeded=()=>{for(const n of ['documents','session','indexes'])if(!q.result.objectStoreNames.contains(n))q.result.createObjectStore(n)};q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});
 async function tx(store,mode,key,value){const db=await dbp;return new Promise((resolve,reject)=>{const t=db.transaction(store,mode),s=t.objectStore(store),r=mode==='readonly'?s.get(key):s.put(value,key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});}
 const save=(s,k,v)=>tx(s,'readwrite',k,v),load=(s,k)=>tx(s,'readonly',k);
 const key=d=>d._persistKey||(d._persistKey=d.handle?'handle:'+d.name+':'+d.size:'draft:'+d.id);
 let restoring=true, timer=0,writing=false;
 toggle.disabled=false;toggle.checked=localStorage.getItem('cluster-opt8-autosave')!=='false';toggle.addEventListener('change',()=>{localStorage.setItem('cluster-opt8-autosave',String(toggle.checked));schedule()});
 async function checkpoint(){if(restoring)return;const active=fm.active;const records=[];
  for(const d of fm.docs){const id=key(d),small=d.size<100000;let content=null;
   if(small){content=d===active?el.value:d.mutations.at(-1)?.text??await d.file.text();}
   const blocks=[...d.blocks.values()];records.push({id,name:d.name,size:d.size,lastModified:d.file.lastModified,handle:d.handle||null,content,blocks,nextBlock:d.nextBlock});
   await save('documents',id,records.at(-1));
   if(d.indexComplete&&d.size>=100000&&!d.dirty&&d.lineStarts.length<1000000){await save('indexes',id,{size:d.size,lastModified:d.file.lastModified,lines:d.lineStarts});}
  }
  const line=active?el.value.slice(0,el.selectionStart).split('\n').length:1;
  await save('session','current',{ids:records.map(x=>x.id),active:active?key(active):null,line,selection:el.selectionStart,scroll:el.scrollTop});
  // [FIX-PR13] Checkpoint is durable recovery state, NOT a disk commit.
  // Disk write is scheduled separately after an idle period and rechecks document identity/version.
  scheduleDiskSave(active);

 }
 // [FIX-PR13] Do not call fm.save() from a keystroke checkpoint: it triggers
 // fm.notify() -> render(), which can overwrite text while the user is typing.
 let diskTimer=0, diskBusy=false;
 function scheduleDiskSave(doc){
  clearTimeout(diskTimer);
  if(!toggle.checked||!doc?.handle?.createWritable||!doc.dirty)return;
  const revision=doc.version,identity=doc.id;
  diskTimer=setTimeout(async()=>{
   if(diskBusy||!toggle.checked||fm.active?.id!==identity||doc.version!==revision||!doc.dirty)return;
   diskBusy=true;
   try{
    // Large pending views require a separate transaction and are checkpoint-only.
    if(doc.pendingView||doc.size>=100000)return;
    const blob=await doc.exportBlob();
    if(doc.version!==revision)return;
    const writer=await doc.handle.createWritable();
    try{await blob.stream().pipeTo(writer)}catch(e){try{await writer.abort()}catch{}throw e}
    // No render/notify: the editor remains the authoritative in-memory state.
    if(doc.version===revision){doc.file=await doc.handle.getFile();doc.size=doc.file.size;doc.mutations=[];doc.dirty=false;window.cluster.emit('AutoSave','Disk saved safely');}
   }catch(e){window.cluster.emit('AutoSave','Disk save failed: '+e.message)}finally{diskBusy=false;}
  },3500);
 }
 function schedule(){if(restoring)return;clearTimeout(timer);timer=setTimeout(()=>checkpoint().catch(e=>window.cluster.emit('Workspace','Checkpoint ERROR '+e.message)),500)}
 el.addEventListener('input',schedule);el.addEventListener('keyup',schedule);el.addEventListener('scroll',schedule);fm.onChange(schedule);
 window.addEventListener('pagehide',()=>{void checkpoint()});
 async function restore(){try{const session=await load('session','current');if(!session)return;
  for(const id of session.ids||[]){const record=await load('documents',id);if(!record)continue;let file=null,handle=record.handle;
   if(handle){try{if(await handle.queryPermission({mode:'read'})==='granted')file=await handle.getFile()}catch{}}
   if(!file&&record.content!==null)file=new File([record.content],record.name,{lastModified:record.lastModified});
   if(!file)continue;const d=await fm.open(file,handle&&file.size===record.size?handle:null);d._persistKey=id;
   d.blocks=new Map((record.blocks||[]).map(b=>[b.id,b]));d.nextBlock=record.nextBlock||1;
   const index=await load('indexes',id);if(index&&index.size===file.size&&index.lastModified===file.lastModified){d.lineStarts=index.lines;d.indexComplete=true;d.indexedLines=index.lines.length;d.indexedBytes=file.size;}
  }
  const active=fm.docs.find(d=>key(d)===session.active);if(active)fm.select(active.id);
  if(active)setTimeout(()=>{const n=Math.max(1,session.line||1);document.getElementById('clusterLine').value=n;document.getElementById('clusterGoLine').click();if(active.size<100000){el.setSelectionRange(Math.min(session.selection||0,el.value.length),Math.min(session.selection||0,el.value.length));el.scrollTop=session.scroll||0}},120);
 }catch(e){window.cluster.emit('Workspace','Restore ERROR '+e.message)}finally{restoring=false}}
 restore();
})();
