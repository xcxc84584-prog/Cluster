/* [MOD-001] CEXP 1.1.0 – file service, guarded mutations, persisted roots. */
'use strict';
(()=>{
 const roots=[],events=new EventTarget();let seq=0;const DB='cluster-cexp-roots-v1';let mutationQueue=Promise.resolve();
 const emit=(reason)=>events.dispatchEvent(new CustomEvent('change',{detail:{reason}}));
 function node(handle,parent=null){return {id:'cx'+(++seq),handle,parent,name:handle.name,kind:handle.kind,children:null,expanded:false};}
 // [ADD-OPT4-001] Standalone file roots and ephemeral unsaved documents.
 function draftNode(detail){return {id:'draft:'+detail.docId,docId:detail.docId,handle:null,parent:null,name:detail.name||'未命名.txt',kind:'draft',children:null,expanded:false,temporary:true};}
 async function containsHandle(handle){for(const root of roots){if(root.handle&&await same(root.handle,handle))return true;const queue=[root];while(queue.length){const item=queue.pop();for(const child of item.children||[]){if(child.handle&&await same(child.handle,handle))return true;if(child.kind==='directory')queue.push(child);}}}return false;}
 // [FIX-OPT13.1-001] Persistent handle identity survives closing/removing a workspace root.
 async function rememberIdentity(id,handle){const db=await dbOpen();try{await new Promise((ok,no)=>{const tx=db.transaction('identities','readwrite');tx.objectStore('identities').put({id,handle});tx.oncomplete=ok;tx.onerror=()=>no(tx.error);tx.onabort=()=>no(tx.error);});}finally{db.close();}}
 async function stableId(handle){
  const db=await dbOpen();let records=[];
  try{records=await new Promise((ok,no)=>{const req=db.transaction('identities').objectStore('identities').getAll();req.onsuccess=()=>ok(req.result);req.onerror=()=>no(req.error);});}
  finally{db.close();}
  for(const entry of records){try{if(await same(entry.handle,handle))return entry.id;}catch{}}
  const id=crypto.randomUUID(),write=await dbOpen();
  try{await new Promise((ok,no)=>{const tx=write.transaction('identities','readwrite');tx.objectStore('identities').put({id,handle});tx.oncomplete=ok;tx.onerror=()=>no(tx.error);tx.onabort=()=>no(tx.error);});}finally{write.close();}
  return id;
 }
 async function addFile(handle){if(!handle||handle.kind!=='file')throw Error('FILE_HANDLE_REQUIRED');if(await containsHandle(handle))return null;const n=node(handle);n.persistId=await stableId(handle);roots.push(n);await saveRoots();emit('file-added');return n;}
 function addDraft(detail){if(!detail?.docId)return;const existing=roots.find(x=>x.docId===detail.docId);if(existing){existing.name=detail.name||existing.name;emit('draft-updated');return existing;}const n=draftNode(detail);roots.push(n);emit('draft-added');return n;}
 function removeDraft(docId){const i=roots.findIndex(x=>x.docId===docId);if(i!==-1){roots.splice(i,1);emit('draft-removed');}}
 async function syncDocument(detail){if(detail.handle?.kind==='file'&&['open','save','saveas'].includes(detail.type)){if(await containsHandle(detail.handle))return;}if(detail.type==='new'){addDraft(detail);return;}if(detail.type==='close'){removeDraft(detail.docId);return;}if(detail.type==='saveas'||detail.type==='save'){if(detail.docId)removeDraft(detail.docId);}if(detail.handle?.kind==='file'&&['open','save','saveas'].includes(detail.type)){if(await revealHandle(detail.handle))return;await addFile(detail.handle);}}
 
 function dbOpen(){return new Promise((ok,no)=>{const req=indexedDB.open(DB,3);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('roots'))req.result.createObjectStore('roots',{keyPath:'id'});if(!req.result.objectStoreNames.contains('order'))req.result.createObjectStore('order',{keyPath:'key'});if(!req.result.objectStoreNames.contains('identities'))req.result.createObjectStore('identities',{keyPath:'id'});};req.onsuccess=()=>ok(req.result);req.onerror=()=>no(req.error);});}
 async function transact(mode,fn){const db=await dbOpen();try{return await new Promise((ok,no)=>{const tx=db.transaction('roots',mode),store=tx.objectStore('roots');let value;try{value=fn(store);}catch(e){no(e);return;}tx.oncomplete=()=>ok(value);tx.onerror=()=>no(tx.error);});}finally{db.close();}}
 async function saveRoots(){const db=await dbOpen();try{await new Promise((ok,no)=>{const tx=db.transaction('roots','readwrite'),store=tx.objectStore('roots');store.clear();for(const [position,r] of roots.entries())if(r.handle&&r.persistId)store.put({id:r.persistId,handle:r.handle,position});tx.oncomplete=ok;tx.onerror=()=>no(tx.error);});}finally{db.close();}}
 async function restore(){if(!('indexedDB'in window))return;const db=await dbOpen();let entries;try{entries=await new Promise((ok,no)=>{const req=db.transaction('roots').objectStore('roots').getAll();req.onsuccess=()=>ok(req.result);req.onerror=()=>no(req.error);});}finally{db.close();}entries.sort((a,b)=>(a.position??0)-(b.position??0));for(const item of entries){if(['directory','file'].includes(item.handle?.kind)&&!roots.some(r=>r.persistId===item.id)){if(await containsHandle(item.handle))continue;const n=node(item.handle);n.persistId=item.id;roots.push(n);await rememberIdentity(item.id,item.handle);}}emit('restored');}
 async function addRoot(handle){if(handle.kind!=='directory')throw Error('ROOT_MUST_BE_DIRECTORY');for(const r of roots){if(await same(r.handle,handle))return r;}const n=node(handle);n.persistId=await stableId(handle);roots.push(n);await saveRoots();emit('root-added');return n;}
 async function permission(handle,write=false,request=false){const options={mode:write?'readwrite':'read'};let state=await handle.queryPermission?.(options);if(state!=='granted'&&request)state=await handle.requestPermission?.(options);return state==='granted';}
 function orderKey(n){const root=rootOf(n);return root.persistId+':'+pathOf(n).join('/');}
 // [ADD-OPT13.2-001] Each folder owns its durable Explorer order file.
 const ORDER_FILE='.cluster-explorer-order.json';
 async function readFolderOrder(n){
  if(n.kind!=='directory')return null;
  try{
   const h=await n.handle.getFileHandle(ORDER_FILE);
   const data=JSON.parse(await (await h.getFile()).text());
   if(data?.schema!=='cluster.explorer.order.v1'||!Array.isArray(data.names))return null;
   return [...new Set(data.names.filter(x=>typeof x==='string'&&x!==ORDER_FILE))];
  }catch(e){if(e.name==='NotFoundError')return null;throw e;}
 }
 async function getOrder(n){
  const local=await readFolderOrder(n);
  if(local!==null)return local;
  const db=await dbOpen();try{return await new Promise((ok,no)=>{const r=db.transaction('order').objectStore('order').get(orderKey(n));r.onsuccess=()=>ok(r.result?.names||[]);r.onerror=()=>no(r.error);});}finally{db.close();}
 }
 async function setOrder(n,names){
  const normalized=[...new Set(names.filter(x=>typeof x==='string'&&x!==ORDER_FILE))];
  // Never claim persistence unless the folder JSON write completes.
  if(!await permission(n.handle,true,true))throw Error('SORT_WRITE_PERMISSION_DENIED');
  let h;
  try{h=await n.handle.getFileHandle(ORDER_FILE);}catch(e){if(e.name!=='NotFoundError')throw e;}
  if(h){const data=JSON.parse(await (await h.getFile()).text());if(data?.schema!=='cluster.explorer.order.v1')throw Error('SORT_FILE_NAME_CONFLICT');}
  else h=await n.handle.getFileHandle(ORDER_FILE,{create:true});
  const writer=await h.createWritable();
  try{await writer.write(JSON.stringify({schema:'cluster.explorer.order.v1',version:1,names:normalized,updatedAt:new Date().toISOString()},null,2)+'\n');await writer.close();}
  catch(e){try{await writer.abort();}catch{}throw e;}
  // IndexedDB remains a compatibility cache, never the primary source.
  const db=await dbOpen();try{await new Promise((ok,no)=>{const tx=db.transaction('order','readwrite');tx.objectStore('order').put({key:orderKey(n),names:normalized});tx.oncomplete=ok;tx.onerror=()=>no(tx.error);});}finally{db.close();}
 }
 async function reorder(n,target,before=true){if(n.parent!==target.parent)throw Error('REORDER_SAME_FOLDER_ONLY');const parent=n.parent;const items=parent?parent.children||[]:roots;const from=items.indexOf(n),to=items.indexOf(target);if(from<0||to<0||from===to)return;items.splice(from,1);const index=items.indexOf(target);items.splice(index+(before?0:1),0,n);try{if(parent)await setOrder(parent,items.map(x=>x.name));else await saveRoots();}catch(e){items.splice(items.indexOf(n),1);items.splice(from,0,n);emit('reorder-rollback');throw e;}emit('reorder');}
 // [FIX-OPT5-002] Reconcile rescanned entries by name/kind, retaining nested open state.
 async function expand(n,force=false){
  if(n.kind!=='directory')return;
  if(n.expanded&&!force){n.expanded=false;emit('collapse');return;}
  if(n.expanded&&n.children&&!force)return;
  if(!await permission(n.handle,false,true))throw Error('需要授權資料夾存取權限');
  const previous=new Map((n.children||[]).map(x=>[x.kind+'\0'+x.name,x]));
  const items=[];
  for await(const h of n.handle.values()){
   if(h.kind==='file'&&h.name===ORDER_FILE)continue;
   const key=h.kind+'\0'+h.name;
   const existing=previous.get(key);
   if(existing){existing.handle=h;existing.parent=n;items.push(existing);}
   else items.push(node(h,n));
  }
  const order=await getOrder(n);const oldNames=(n.children||[]).map(x=>x.name);const preferred=order.length?order:oldNames;
  items.sort((a,b)=>{const ai=preferred.indexOf(a.name),bi=preferred.indexOf(b.name);if(ai>=0&&bi>=0)return ai-bi;if(ai>=0)return -1;if(bi>=0)return 1;return Number(b.kind==='directory')-Number(a.kind==='directory')||a.name.localeCompare(b.name);});
  const changed=!n.expanded||items.length!==(n.children||[]).length||items.some((item,i)=>item!==(n.children||[])[i]);\n  n.children=items;n.expanded=true;if(changed)emit('expand');
 }
 // [FIX-OPT6-001] Snapshot every expanded descendant before refreshing; reconcile by path.
 // Refresh never collapses a folder unless it has actually been removed from disk.
 async function refreshExpanded(n){
  if(n.kind!=='directory')return;
  const expanded=[];
  function remember(item,path=[]){if(item.kind!=='directory'||!item.expanded)return;expanded.push(path);for(const child of item.children||[])remember(child,[...path,child.name]);}
  remember(n);
  if(!expanded.length)return;
  await expand(n,true);
  for(const path of expanded.slice(1).sort((a,b)=>a.length-b.length)){
   let cur=n;
   for(const segment of path){cur=(cur.children||[]).find(x=>x.kind==='directory'&&x.name===segment);if(!cur)break;}
   if(cur&&cur.kind==='directory')await expand(cur,true);
  }
  emit('refresh-complete');
 }
 // Refresh expanded Explorer folders after changes made by Windows, PowerShell, or other programs.
 // Never prompt for permissions during background checks. Only one scan may run at a time.
 let externalScanBusy=false;
 async function syncExternalChanges(){
  if(externalScanBusy||document.hidden)return;
  externalScanBusy=true;
  try{
   for(const root of [...roots]){
    if(root.kind!=='directory'||!root.expanded)continue;
    try{
     if(await permission(root.handle,false,false))await refreshExpanded(root);
    }catch(e){if(e?.name!=='NotFoundError'&&e?.name!=='NotAllowedError')console.warn('[Cluster Explorer] external refresh',e)}
   }
  }finally{externalScanBusy=false}
 }
 setInterval(()=>{void syncExternalChanges()},2000);
 window.addEventListener('focus',()=>{void syncExternalChanges()});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void syncExternalChanges()});
 // [ADD-OPT6-002] Resolve a file under a workspace root without loading its contents.
 // Only expand ancestors required to reveal the active editor document.
 async function revealHandle(handle){
  if(!handle||handle.kind!=='file')return null;
  for(const root of roots){
   if(root.kind==='file'&&root.handle&&await same(root.handle,handle))return root;
   if(root.kind!=='directory'||!root.handle?.resolve)continue;
   let parts;try{parts=await root.handle.resolve(handle);}catch{continue;}
   if(!Array.isArray(parts))continue;
   let cur=root;
   for(let i=0;i<parts.length;i++){
    if(!cur.expanded||!cur.children)await expand(cur);
    const child=(cur.children||[]).find(x=>x.name===parts[i]&&(i===parts.length-1?x.kind==='file':x.kind==='directory'));
    if(!child){cur=null;break;}cur=child;
   }
   if(cur?.kind==='file')return cur;
  }
  return null;
 }
 async function removeRoot(n){const i=roots.indexOf(n);if(i>=0){roots.splice(i,1);await saveRoots();emit('remove-root');}}
 function validate(name){if(!name||name==='.'||name==='..'||/[\\/\x00-\x1f]/.test(name)||name.trim()!==name)throw Error('INVALID_NAME');return name;}
 async function ensureFree(parent,name){try{await parent.getFileHandle(name);throw Error('TARGET_EXISTS');}catch(e){if(e.message==='TARGET_EXISTS')throw e;if(e.name!=='NotFoundError'&&e.name!=='TypeMismatchError')throw e;}try{await parent.getDirectoryHandle(name);throw Error('TARGET_EXISTS');}catch(e){if(e.message==='TARGET_EXISTS')throw e;if(e.name!=='NotFoundError'&&e.name!=='TypeMismatchError')throw e;}}
 async function create(n,name,kind){if(n.kind!=='directory')throw Error('NOT_DIRECTORY');validate(name);if(!await permission(n.handle,true,true))throw Error('WRITE_PERMISSION_DENIED');await ensureFree(n.handle,name);const h=kind==='directory'?await n.handle.getDirectoryHandle(name,{create:true}):await n.handle.getFileHandle(name,{create:true});await expand(n,true);return h;}
 function rootOf(n){while(n.parent)n=n.parent;return n;}
 function pathOf(n){const names=[];while(n.parent){names.unshift(n.name);n=n.parent;}return names;}
 async function directoryAt(root,names){let h=root.handle;for(const name of names)h=await h.getDirectoryHandle(name);return h;}
 async function same(a,b){return a===b||Boolean(await a.isSameEntry?.(b));}
 async function copyVerified(src,dest,name){if(src.kind==='file'){const original=await src.getFile(),target=await dest.getFileHandle(name,{create:true});const writer=await target.createWritable();try{await original.stream().pipeTo(writer);}catch(e){try{await writer.abort();}catch{}throw e;}const copied=await target.getFile();if(copied.size!==original.size)throw Error('COPY_VERIFICATION_FAILED');return;}const d=await dest.getDirectoryHandle(name,{create:true});for await(const child of src.values())await copyVerified(child,d,child.name);}
 async function move(n,dest,name=n.name){if(!n.parent)throw Error('CANNOT_MOVE_ROOT');if(dest.kind!=='directory')throw Error('INVALID_DESTINATION');validate(name);if(n.parent===dest&&n.name===name)return;if(rootOf(n)!==rootOf(dest))throw Error('CROSS_ROOT_MOVE_UNSUPPORTED');let walk=dest;while(walk){if(walk===n)throw Error('CANNOT_MOVE_INTO_SELF');walk=walk.parent;}if(!await permission(n.parent.handle,true,true)||!await permission(dest.handle,true,true))throw Error('WRITE_PERMISSION_DENIED');await ensureFree(dest.handle,name);
 // Prefer atomic native move when available. Fallback copies and verifies before deleting source.
 if(typeof n.handle.move==='function'){try{await n.handle.move(dest.handle,name);await expand(n.parent,true);if(dest!==n.parent)await expand(dest,true);await setOrder(n.parent,(n.parent.children||[]).map(x=>x.name));await setOrder(dest,(dest.children||[]).map(x=>x.name));emit('move');return;}catch(e){if(!['NotSupportedError','TypeError'].includes(e.name))throw e;}}
 let copied=false;try{await copyVerified(n.handle,dest.handle,name);copied=true;}catch(e){try{await dest.handle.removeEntry(name,{recursive:true});}catch{}throw e;}
 if(copied){try{await n.parent.handle.removeEntry(n.name,{recursive:true});}catch(e){throw Error('來源刪除失敗；已保留目的地複本，請人工檢查：'+e.message);}}
 await expand(n.parent,true);if(dest!==n.parent)await expand(dest,true);await setOrder(n.parent,(n.parent.children||[]).map(x=>x.name));await setOrder(dest,(dest.children||[]).map(x=>x.name));emit('move');}
 async function rename(n,name){if(!n.parent)throw Error('CANNOT_RENAME_ROOT');return move(n,n.parent,name);}
 async function remove(n){if(!n.parent)throw Error('ROOT_USE_REMOVE_WORKSPACE');if(!await permission(n.parent.handle,true,true))throw Error('WRITE_PERMISSION_DENIED');await n.parent.handle.removeEntry(n.name,{recursive:n.kind==='directory'});await expand(n.parent,true);emit('delete');}
 window.ClusterCEXP={roots,events,addRoot,addFile,addDraft,removeDraft,syncDocument,restore,expand,refreshExpanded,revealHandle,removeRoot,create,rename,move,remove,reorder,permission,pathOf,emit,version:'1.7.2'};
})();
