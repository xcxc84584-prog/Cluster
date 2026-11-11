(()=>{'use strict';
const $=id=>document.getElementById(id);
const tr=(zh,en)=>$('uiLanguage')?.value==='en'?en:zh;
const CHUNK=4*1024*1024;const LARGE=16*1024*1024;
let root=null,busy=false,tab=null,active=false,cancelRequested=false,jobType=null;
const tokenFile='Fold_Token.txt',folder='backup_cluster',magic='CLUSTER_BACKUP_V1';
const labels={full:['完整提交','Full snapshot'],differential:['差異提交','Differential snapshot'],incremental:['增量提交','Incremental snapshot']};
const ui=document.createElement('section');ui.id='clusterBackupPage';ui.className='cb-page';ui.hidden=true;
ui.innerHTML='<div class="cb-shell"><div class="cb-head"><div><small>PROJECT TOOL / VERSION CONTROL</small><h2 data-zh="備份管理" data-en="Backup Management">備份管理</h2><p data-zh="完整、差異與增量快照 · SHA-256 完整性驗證" data-en="Full, differential and incremental snapshots · SHA-256 integrity">完整、差異與增量快照 · SHA-256 完整性驗證</p></div><button id="cbChoose" type="button" data-zh="選擇專案資料夾" data-en="Choose project folder">選擇專案資料夾</button></div><div class="cb-status"><span id="cbRoot">NO PROJECT SELECTED</span><span id="cbMessage" role="status" aria-live="polite"></span></div><div class="cb-track"><div id="cbFill"></div></div><div class="cb-toolbar"><button id="cbNew" type="button" data-zh="新增提交" data-en="New commit">新增提交</button><button id="cbRefresh" type="button" data-zh="重新整理" data-en="Refresh">重新整理</button></div><div id="cbList" class="cb-list"></div></div>';
$('workarea').append(ui);
const modal=document.createElement('dialog');modal.id='cbDialog';modal.className='cb-dialog';modal.innerHTML='<div class="cb-dialog-head"><h3 id="cbDialogTitle"></h3><button id="cbDismiss" type="button" aria-label="Close">×</button></div><p id="cbDialogHint"></p><div id="cbChoices"></div><div class="cb-track"><div id="cbModalFill"></div></div><p id="cbModalStatus" role="status"></p><div class="cb-actions"><button id="cbCancel" type="button"></button></div>';document.body.append(modal);
function progress(p,msg){$('cbFill').style.width=p+'%';$('cbModalFill').style.width=p+'%';$('cbMessage').textContent=msg;$('cbModalStatus').textContent=msg}
function fail(e){progress(0,String(e?.message||e));console.error('[Cluster Backup]',e);if(jobType==='commit'){dialog(tr('備份失敗','Backup failed'),String(e?.message||e));$('cbCancel').textContent=tr('關閉','Close')}}
function checkpoint(){if(cancelRequested)throw Error(tr('上次備份已中斷','Previous backup interrupted'))}
function translate(){document.querySelectorAll('#clusterBackupPage [data-zh],#cbDialog [data-zh],#projectToolMenu [data-zh]').forEach(e=>{e.textContent=e.dataset[$('uiLanguage')?.value==='en'?'en':'zh']})}
function closeModal(){if(modal.open)modal.close()}
$('cbDismiss').onclick=closeModal;$('cbCancel').onclick=closeModal;
function dialog(title,hint){$('cbDialogTitle').textContent=title;$('cbDialogHint').textContent=hint;$('cbChoices').replaceChildren();$('cbCancel').textContent=tr('取消','Cancel');$('cbModalFill').style.width='0%';$('cbModalStatus').textContent='';if(!modal.open)modal.showModal()}
function addChoice(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;$('cbChoices').append(b)}
function safeName(s){if(!s||s==='.'||s==='..'||s.includes('/')||s.includes('\\'))throw Error('Invalid path');return s}
async function dir(parent,name,create=false){return parent.getDirectoryHandle(safeName(name),{create})}
async function file(parent,name,create=false){
 const checked=safeName(name);
 try{return await parent.getFileHandle(checked,{create})}
 catch(e){
  if(e.name==='SecurityError')throw new Error('FILE_SYSTEM_SECURITY_DENIED: '+checked+' ('+(create?'write':'read')+'). Browser blocked this file name or location; no bypass attempted. '+e.message);
  throw e;
 }
}
async function readText(d,n){return (await (await file(d,n)).getFile()).text()}
async function writeText(d,n,s){const h=await file(d,n,true),w=await h.createWritable();try{await w.write(s);await w.close()}catch(e){await w.abort().catch(()=>{});throw e}}
async function sha(blob){const bytes=blob instanceof Blob?await blob.arrayBuffer():blob;const hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('')}
// Never access Git internals through browser file handles. Exclude at any nesting depth.
function protectedPath(path){return path.split('/').some(part=>part.toLowerCase()==='.git')}
function safeRestoreState(state){return Object.fromEntries(Object.entries(state).filter(([path])=>!protectedPath(path)))}
async function walk(d,prefix='',out=[]){
 for await(const [name,h] of d.entries()){
  if(!prefix&&name===folder)continue;
  if(h.kind==='directory'&&name.toLowerCase()==='.git')continue;
  const p=prefix+name;
  if(h.kind==='directory')await walk(h,p+'/',out);
  else if(!protectedPath(p))out.push({path:p,handle:h});
 }
 return out.sort((a,b)=>a.path.localeCompare(b.path));
}
async function locate(d,path,create=false){const bits=path.split('/');let x=d;for(const part of bits.slice(0,-1))x=await dir(x,part,create);return {parent:x,name:bits.at(-1)}}
async function bytesFor(d,path){const {parent,name}=await locate(d,path);return (await file(parent,name)).getFile()}
async function putBytes(d,path,blob){
 try{
  const {parent,name}=await locate(d,path,true),h=await file(parent,name,true),w=await h.createWritable();
  try{await w.write(blob);await w.close()}catch(e){await w.abort().catch(()=>{});throw e}
 }catch(e){throw new Error('FILE_WRITE_FAILED ['+path+']: '+e.message)}
}
async function removePath(d,path){try{const {parent,name}=await locate(d,path);await parent.removeEntry(name)}catch(e){if(e.name!=='NotFoundError')throw e}}
async function store(){if(!root)throw Error(tr('請先選擇專案資料夾','Choose a project folder first'));let d;try{d=await dir(root,folder)}catch(e){if(e.name!=='NotFoundError')throw e;d=await dir(root,folder,true);const t={magic,projectId:crypto.randomUUID(),created:new Date().toISOString()};await writeText(d,tokenFile,JSON.stringify(t));await writeText(d,'manifest.json',JSON.stringify({magic,projectId:t.projectId,commits:[]},null,2));}
let token,manifest;try{token=JSON.parse(await readText(d,tokenFile));manifest=JSON.parse(await readText(d,'manifest.json'))}catch{throw Error(tr('備份功能遭到拒絕,專案中存在未經授權的backup_cluster文件夾','Backup denied: unauthorized backup_cluster folder exists'))}
if(token.magic!==magic||manifest.magic!==magic||!token.projectId||token.projectId!==manifest.projectId||!Array.isArray(manifest.commits))throw Error(tr('備份功能遭到拒絕,專案中存在未經授權的backup_cluster文件夾','Backup denied: unauthorized backup_cluster folder exists'));
return {d,manifest}}
async function choose(){if(!window.showDirectoryPicker)throw Error(tr('請使用支援 File System Access API 的 Chromium 瀏覽器及安全來源','Requires Chromium File System Access API on a secure origin'));root=await showDirectoryPicker({mode:'readwrite'});$('cbRoot').textContent=root.name;await refresh();const {d}=await store();await guardRecovery(d)}
async function fingerprint(blob){if(blob.size<LARGE)return {hash:await sha(blob),size:blob.size};const chunks=[];for(let offset=0;offset<blob.size;offset+=CHUNK){checkpoint();chunks.push(await sha(blob.slice(offset,offset+CHUNK)));await new Promise(resolve=>setTimeout(resolve,0))}return {hash:await sha(new Blob([chunks.join('')])),size:blob.size,chunks}}
async function readObject(d,v){if(!v.chunks)return bytesFor(d,'objects/'+v.hash);const parts=[];for(const h of v.chunks){const part=await bytesFor(d,'objects/'+h);if(await sha(part)!==h)throw Error('CHUNK_HASH_MISMATCH: '+h);parts.push(part)}return new Blob(parts)}
async function snapshot(){checkpoint();const entries=await walk(root),files={};let i=0;for(const entry of entries){checkpoint();const f=await entry.handle.getFile();files[entry.path]=await fingerprint(f);progress(Math.round(++i/Math.max(1,entries.length)*40),tr('掃描檔案','Scanning files')+' '+i+'/'+entries.length)}return {entries,files}}
async function reconstruct(d,manifest,id){const commits=manifest.commits;const target=commits.findIndex(x=>x.id===id);if(target<0)throw Error('Missing commit');let base=-1;for(let i=target;i>=0;i--)if(commits[i].type==='full'){base=i;break}if(base<0)throw Error('Full snapshot missing');const state=Object.create(null);for(let i=base;i<=target;i++){const c=commits[i];if(c.type==='differential'){for(const k of Object.keys(state))delete state[k];Object.assign(state,commits[base].files);for(const p of c.deleted||[])delete state[p];Object.assign(state,c.files);continue}for(const p of c.deleted||[])delete state[p];Object.assign(state,c.files)}return state}
async function verify(d,state){let i=0;for(const [p,v] of Object.entries(state)){const f=await readObject(d,v);const actual=await fingerprint(f);if(actual.hash!==v.hash||actual.size!==v.size)throw Error('HASH_MISMATCH: '+p);progress(60+Math.round(++i/Math.max(1,Object.keys(state).length)*30),tr('驗證還原鏈','Verifying restore chain')+' '+i)}return true}
async function commitUnlocked(type){if(busy)return;busy=true;cancelRequested=false;jobType='commit';try{const {d,manifest}=await store();if(await guardRecovery(d))return;if(!manifest.commits.length&&type!=='full')throw Error(tr('首次提交必須為完整提交','First commit must be full'));const {entries,files}=await snapshot();const previous=manifest.commits.at(-1);const full=type==='full';const reference=full?{}:safeRestoreState(await reconstruct(d,manifest,type==='differential'?[...manifest.commits].reverse().find(c=>c.type==='full').id:previous.id));const changed=Object.fromEntries(Object.entries(files).filter(([p,v])=>!reference[p]||reference[p].hash!==v.hash));const deleted=Object.keys(reference).filter(p=>!files[p]);const objects=await dir(d,'objects',true);let i=0;for(const entry of entries.filter(e=>changed[e.path])){checkpoint();const f=await entry.handle.getFile(),v=files[entry.path],h=v.hash;if((await fingerprint(f)).hash!==h)throw Error('SOURCE_CHANGED_DURING_BACKUP: '+entry.path);if(v.chunks){for(let off=0,index=0;off<f.size;off+=CHUNK,index++){checkpoint();const hash=v.chunks[index];try{await file(objects,hash)}catch(e){if(e.name!=='NotFoundError')throw e;await putBytes(d,'objects/'+hash,f.slice(off,off+CHUNK))}}}else{try{await file(objects,h)}catch(e){if(e.name!=='NotFoundError')throw e;await putBytes(d,'objects/'+h,f)}}progress(40+Math.round(++i/Math.max(1,Object.keys(changed).length)*20),tr('寫入備份','Writing backup')+' '+i)}
const id=new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomUUID().slice(0,8);const c={id,type,time:new Date().toISOString(),parent:previous?.id||null,files:changed,deleted};const candidate={...manifest,commits:[...manifest.commits,c]};const state=safeRestoreState(await reconstruct(d,candidate,id));if(Object.keys(state).length!==Object.keys(files).length||Object.entries(files).some(([p,v])=>state[p]?.hash!==v.hash))throw Error('RESTORE_STATE_MISMATCH');await verify(d,state);checkpoint();await writeText(d,'manifest.json',JSON.stringify(candidate,null,2));progress(100,tr('提交成功 · 還原測試通過','Commit successful · Restore verification passed'));closeModal();await refresh(false)}catch(e){fail(e)}finally{busy=false;jobType=null;cancelRequested=false}}
async function commit(type){
 if(!navigator.locks?.request)return fail(new Error('WEB_LOCKS_UNAVAILABLE'));
 const {manifest}=await store();
 return navigator.locks.request('cluster-restore:'+manifest.projectId,{mode:'exclusive',ifAvailable:true},async lock=>{
  if(!lock)return fail(new Error('PROJECT_BACKUP_LOCKED'));
  return commitUnlocked(type);
 });
}
// DPR2.7: plan file-level changes first; only touched paths require rollback.
async function restorePlan(state,current,force,skipped){
 const existing=new Map(current.map(e=>[e.path,e.handle]));
 const writes=[],unchanged=[],deletes=[];
 for(const [path,v] of Object.entries(state)){
  if(skipped.includes(path))continue;
  const handle=existing.get(path);
  if(!handle){writes.push({path,v,mode:'create'});continue}
  const live=await fingerprint(await handle.getFile());
  if(live.hash===v.hash&&live.size===v.size){unchanged.push(path);continue}
  writes.push({path,v,mode:'update',live});
 }
 if(!force)for(const e of current)if(!Object.hasOwn(state,e.path))deletes.push(e.path);
 return {writes,unchanged,deletes,existing};
}
async function patchChunks(d,entry,handle){
 const {v}=entry;
 if(!v.chunks||!entry.live?.chunks||v.chunks.length!==entry.live.chunks.length)return false;
 const oldFile=await handle.getFile();
 if(oldFile.size!==v.size)return false;
 const changed=v.chunks.map((hash,i)=>({hash,i})).filter(x=>x.hash!==entry.live.chunks[x.i]);
 if(!changed.length)return false;
 // FileSystemWritableFileStream defaults to keepExistingData=true.
 // Writing only modified ranges avoids transferring unchanged bytes from backup.
 const writer=await handle.createWritable({keepExistingData:true});
 try{
  for(const {hash,i} of changed){
   const part=await bytesFor(d,'objects/'+hash);
   if(await sha(part)!==hash)throw Error('CHUNK_HASH_MISMATCH: '+hash);
   await writer.seek(i*CHUNK);
   await writer.write(part);
  }
  await writer.close();
 }catch(e){await writer.abort().catch(()=>{});throw e}
 return true;
}
// DPR2.8: persistent recovery pointer, written before touching project files.
const pendingFile='restore-pending.json';
async function pendingRestore(d){
 try{return JSON.parse(await readText(d,pendingFile))}catch(e){if(e.name==='NotFoundError')return null;throw e}
}
async function writePending(d,value){await writeText(d,pendingFile,JSON.stringify(value))}
async function clearPending(d){try{await d.removeEntry(pendingFile)}catch(e){if(e.name!=='NotFoundError')throw e}}
async function recoverRollbackUnlocked(){
 if(busy)return;
 busy=true;jobType='recovery';
 try{
  const {d}=await store(),pending=await pendingRestore(d);
  if(!pending){progress(100,tr('沒有未完成還原','No interrupted restore'));return}
  const safety=await dir(await dir(d,'rollback'),safeName(pending.rollbackId));
  const journal=JSON.parse(await readText(safety,'rollback-manifest.json'));
  if(journal.status==='completed'||journal.status==='rolled-back'){await clearPending(d);return}
  if(!['prepared','applying','verifying','deleting'].includes(journal.status))throw Error('UNKNOWN_RESTORE_STATE');
  // Original paths are preserved even when a previous attempt stopped halfway.
  for(const [path,v] of Object.entries(journal.originals||{})){
   if(protectedPath(path))throw Error('PROTECTED_GIT_RECOVERY_PATH: '+path);
   const saved=await bytesFor(safety,path);
   const fp=await fingerprint(saved);
   if(fp.hash!==v.hash||fp.size!==v.size)throw Error('RECOVERY_SOURCE_HASH_MISMATCH: '+path);
  }
  for(const [path,v] of Object.entries(journal.originals||{})){
   await putBytes(root,path,await bytesFor(safety,path));
   const actual=await fingerprint(await bytesFor(root,path));
   if(actual.hash!==v.hash||actual.size!==v.size)throw Error('RECOVERY_VERIFY_FAILED: '+path);
  }
  for(const path of journal.created||[]){if(protectedPath(path))throw Error('PROTECTED_GIT_RECOVERY_PATH: '+path);await removePath(root,path)}
  journal.status='rolled-back';journal.updated=new Date().toISOString();
  await writeText(safety,'rollback-manifest.json',JSON.stringify(journal));
  await clearPending(d);
  progress(100,tr('中斷還原已回滾','Interrupted restore rolled back'));
 }catch(e){fail(e);dialog(tr('恢復失敗，請保留備份資料','Recovery failed; preserve backup data'),String(e.message||e))}
 finally{busy=false;jobType=null}
}
async function recoverRollback(){
 if(!navigator.locks?.request)return fail(new Error('WEB_LOCKS_UNAVAILABLE'));
 const {manifest}=await store();
 return navigator.locks.request('cluster-restore:'+manifest.projectId,{mode:'exclusive',ifAvailable:true},async lock=>{
  if(!lock)return fail(new Error('PROJECT_RESTORE_LOCKED'));
  return recoverRollbackUnlocked();
 });
}
async function guardRecovery(d){
 const pending=await pendingRestore(d);
 if(!pending)return false;
 dialog(tr('偵測到未完成的還原','Interrupted restore detected'),
 tr('必須先回滾未完成交易，才能進行新的備份或還原。請勿刪除 backup_cluster。','Roll back the interrupted transaction before starting new backup or restore. Do not delete backup_cluster.'));
 addChoice(tr('執行回滾','Roll back'),()=>{closeModal();void recoverRollback()});
 return true;
}
async function restoreUnlocked(id,force=false){
 if(busy)return;busy=true;jobType='restore';
 let safety=null,mutationStarted=false,plan=null,rollbackId=null,storage=null,journal=null;
 try{
  const {d,manifest}=await store();if(await guardRecovery(d))return;const state=safeRestoreState(await reconstruct(d,manifest,id));
  const skipped=[];
  if(!force)await verify(d,state);
  else for(const [path,v] of Object.entries(state)){
   try{const data=await readObject(d,v);const check=await fingerprint(data);if(check.hash!==v.hash||check.size!==v.size)throw Error('HASH_MISMATCH')}
   catch(e){skipped.push(path)}
  }
  const current=await walk(root);
  plan=await restorePlan(state,current,force,skipped);
  const {writes,unchanged,deletes,existing}=plan;
  const touched=[...new Set([...writes.filter(e=>e.mode==='update').map(e=>e.path),...deletes])];
  progress(20,tr('差異分析完成','Difference analysis complete')+': '+writes.length+' writes, '+unchanged.length+' skipped');
  const rollback=await dir(d,'rollback',true);
  rollbackId=crypto.randomUUID();safety=await dir(rollback,rollbackId,true);storage=d;
  const originals=Object.create(null);
  // Save only files that might be overwritten/deleted, not the whole project.
  for(const path of touched){
   const source=await existing.get(path).getFile();
   originals[path]=await fingerprint(source);
   await putBytes(safety,path,source);
   const copy=await bytesFor(safety,path);
   if((await fingerprint(copy)).hash!==originals[path].hash)throw Error('ROLLBACK_PREPARE_MISMATCH: '+path);
  }
  const created=writes.filter(e=>e.mode==='create').map(e=>e.path);
  journal={target:id,status:'prepared',originals,created,skipped,updated:new Date().toISOString()};
  await writeText(safety,'rollback-manifest.json',JSON.stringify(journal));
  await writePending(d,{rollbackId,target:id,status:'prepared'});
  mutationStarted=true;
  journal.status='applying';await writeText(safety,'rollback-manifest.json',JSON.stringify(journal));
  let n=0;
  for(const entry of writes){
   checkpoint();
   const handle=existing.get(entry.path);
   const patched=handle&&await patchChunks(d,entry,handle);
   if(!patched)await putBytes(root,entry.path,await readObject(d,entry.v));
   progress(30+Math.round(++n/Math.max(1,writes.length+deletes.length)*55),tr('差異還原','Smart restoring')+' '+n+'/'+(writes.length+deletes.length));
  }
  // Defer deletion until all writes are complete; reject concurrent external edits.
  journal.status='deleting';await writeText(safety,'rollback-manifest.json',JSON.stringify(journal));
  for(const path of deletes){checkpoint();const live=await fingerprint(await bytesFor(root,path));const original=journal.originals[path];if(!original||live.hash!==original.hash||live.size!==original.size)throw Error('DELETE_SOURCE_CHANGED: '+path);await removePath(root,path);n++}
  journal.status='verifying';await writeText(safety,'rollback-manifest.json',JSON.stringify(journal));
  // Verify target state, including files skipped during write.
  const result=await walk(root),found=new Map(result.map(e=>[e.path,e.handle]));
  if(!force&&result.length!==Object.keys(state).length)throw Error('RESTORE_COUNT_MISMATCH');
  for(const [path,v] of Object.entries(state)){
   if(skipped.includes(path))continue;
   const handle=found.get(path);
   if(!handle)throw Error('RESTORE_MISSING_FILE: '+path);
   const actual=await fingerprint(await handle.getFile());
   if(actual.hash!==v.hash||actual.size!==v.size)throw Error('RESTORE_HASH_MISMATCH: '+path);
  }
  journal.status='completed';await writeText(safety,'rollback-manifest.json',JSON.stringify(journal));await clearPending(d);
  progress(100,skipped.length?tr('強制還原完成，略過損毀檔案：','Force restore completed; skipped corrupt files: ')+skipped.join(', '):tr('還原成功，略過未變更檔案：','Restore successful; unchanged files skipped: ')+unchanged.length);
  closeModal();await refresh(false);
 }catch(e){
  if(mutationStarted&&safety&&plan){
   try{
    for(const path of plan.writes.filter(x=>x.mode==='create').map(x=>x.path))await removePath(root,path);
    for(const path of [...new Set([...plan.writes.filter(x=>x.mode==='update').map(x=>x.path),...plan.deletes])]){
     await putBytes(root,path,await bytesFor(safety,path));
     const restored=await bytesFor(root,path),original=await bytesFor(safety,path);
     if((await fingerprint(restored)).hash!==(await fingerprint(original)).hash)throw Error('ROLLBACK_HASH_MISMATCH: '+path);
    }
    journal.status='rolled-back';await writeText(safety,'rollback-manifest.json',JSON.stringify(journal));if(storage)await clearPending(storage);
   }catch(rollbackError){fail(new Error('RESTORE_FAILED_AND_ROLLBACK_FAILED: '+e.message+' / '+rollbackError.message));return}
  }
  fail(e);
 }finally{busy=false;jobType=null;cancelRequested=false}
}
// Serialize restore/recovery across same-origin tabs where Web Locks is available.
async function restore(id,force=false){
 if(!root)return fail(new Error(tr('請先選擇專案資料夾','Choose a project folder first')));
 if(!navigator.locks?.request)return fail(new Error(tr('瀏覽器不支援跨分頁還原鎖','Browser does not support cross-tab restore locking')));
 const {d,manifest}=await store();
 const lockName='cluster-restore:'+manifest.projectId;
 return navigator.locks.request(lockName,{mode:'exclusive',ifAvailable:true},async lock=>{
  if(!lock){fail(new Error(tr('另一個分頁正在操作此專案','Another tab is operating on this project')));return}
  return restoreUnlocked(id,force);
 });
}
async function forceRestore(id){if(busy)return;const before=(await store()).manifest.commits.length;await commit('full');const after=(await store()).manifest.commits.length;if(after!==before+1){fail(new Error(tr('安全完整備份失敗，拒絕強制還原','Safety full snapshot failed; force restore denied')));return}await restore(id,true)}
async function refresh(reset=true){if(reset)progress(0,'');if(!root){$('cbList').textContent=tr('請選擇專案資料夾','Choose a project folder');return}try{const {manifest}=await store();$('cbList').replaceChildren();for(const c of [...manifest.commits].reverse()){const row=document.createElement('div');row.className='cb-item';const info=document.createElement('div');const name=document.createElement('strong');name.textContent=(labels[c.type]?.[$('uiLanguage')?.value==='en'?1:0]||c.type)+' · '+new Date(c.time).toLocaleString();const detail=document.createElement('small');detail.textContent=c.id+' · '+Object.keys(c.files).length+' files';info.append(name,detail);const b=document.createElement('button');b.textContent=tr('還原','Restore');b.onclick=()=>{dialog(tr('確認還原版本','Confirm restore'),tr('將覆寫目前專案檔案，備份紀錄不會刪除。','This overwrites project files; backup history remains.'));addChoice(tr('確認還原','Restore now'),()=>void restore(c.id))};const forceButton=document.createElement('button');forceButton.textContent=tr('強制還原','Force restore');forceButton.onclick=()=>{dialog(tr('強制還原（高風險）','Force restore (high risk)'),tr('將先完整備份目前專案。損毀的備份檔案會略過，可能產生不完整版本。','A full safety snapshot will be created first. Corrupted files will be skipped, potentially producing an incomplete version.'));addChoice(tr('確認強制還原','Confirm force restore'),()=>{closeModal();void forceRestore(c.id)})};row.append(info,b,forceButton);$('cbList').append(row)}if(!manifest.commits.length)$('cbList').textContent=tr('尚無提交紀錄，請先進行完整提交','No commits yet. Create a full snapshot first')}catch(e){fail(e)}}
function submit(){if(busy){dialog(tr('備份進行中','Backup in progress'),tr('是否中斷上次備份？中斷將等待目前檔案操作結束。','Interrupt the previous backup? Cancellation occurs after the current file operation.'));addChoice(tr('中斷上次備份','Interrupt previous backup'),()=>{cancelRequested=true;closeModal()});return}dialog(tr('提交專案備份','Commit project backup'),tr('選擇提交類型，首次提交必須為完整提交。','Select commit type. First commit must be full.'));for(const type of ['full','differential','incremental'])addChoice(labels[type][$('uiLanguage')?.value==='en'?1:0],()=>void commit(type))}
window.addEventListener('cluster:file-open',()=>deactivate());window.addEventListener('cluster:tab-change',()=>deactivate());
function deactivate(){if(!active)return;active=false;ui.hidden=true;document.body.classList.remove('cluster-backup-active');tab?.classList.remove('is-active');const hasDoc=!!window.ClusterEditorView?.hasActive?.();const editor=$('editorShell'),empty=$('empty'),bottom=$('clusterBottomBar');if(editor)editor.hidden=!hasDoc;if(empty)empty.hidden=hasDoc;if(bottom)bottom.hidden=!hasDoc;window.ClusterEditorView?.sync?.();}
function closePage(){deactivate();tab?.remove();tab=null;window.ClusterEditorView?.sync?.()}
function syncTabs(){if(!tab)return;const tabs=$('tabList');if(!tabs.contains(tab))tabs.append(tab);tab.classList.toggle('is-active',active);ui.hidden=!active;window.ClusterTabOrder?.apply?.()}
function open(){window.ClusterTerminal?.deactivate?.();window.ClusterAI?.deactivate?.();window.ClusterSyntaxPage?.deactivate?.();window.ClusterDevelopmentEnvironment?.deactivate?.();window.ClusterAgentPermissions?.deactivate?.();active=true;ui.hidden=false;document.body.classList.add('cluster-backup-active');['editorShell','empty','localRangeView','clusterBottomBar'].forEach(id=>{if($(id))$(id).hidden=true});document.querySelectorAll('#tabList .tab').forEach(e=>e.classList.remove('is-active'));if(!tab){tab=document.createElement('div');tab.className='tab cb-tab';tab.dataset.tabKey='tool:backup-management';const b=document.createElement('button');b.className='tab-select';b.textContent='▣ Backup Management';b.onclick=open;const x=document.createElement('button');x.className='tab-close';x.textContent='×';x.onclick=closePage;tab.append(b,x);$('tabList').append(tab)}tab.classList.add('is-active');syncTabs();translate();void refresh(false)}
$('cbChoose').onclick=()=>void choose().catch(fail);$('cbNew').onclick=submit;$('cbRefresh').onclick=()=>void refresh();
$('uiLanguage')?.addEventListener('change',()=>{translate();if(active)void refresh(false)});
const header=$('fileButton')?.closest('header'),fileWrap=$('fileButton')?.closest('.menu-wrap');
const project=document.createElement('div');project.className='menu-wrap cb-project-wrap';project.innerHTML='<button id="projectToolButton" type="button" aria-expanded="false" aria-controls="projectToolMenu" data-zh="Project Tool ▾" data-en="Project Tool ▾">Project Tool ▾</button><div id="projectToolMenu" class="menu cb-project-menu" hidden><button id="cbPowerShell" type="button">⌘　PowerShell</button><button id="cbAgent" type="button">✧　AI Agent</button><button id="cbManagement" type="button" data-zh="▣　備份管理" data-en="▣　Backup Management">▣　備份管理</button></div>';
header?.insertBefore(project,fileWrap);const pbtn=$('projectToolButton'),pmenu=$('projectToolMenu');pbtn.onclick=()=>{pmenu.hidden=!pmenu.hidden;pbtn.setAttribute('aria-expanded',String(!pmenu.hidden))};
function hideMenu(){pmenu.hidden=true;pbtn.setAttribute('aria-expanded','false')}
$('cbPowerShell').onclick=()=>{hideMenu();window.ClusterTerminal?.open?.()};
$('cbAgent').onclick=()=>{hideMenu();window.ClusterAI?.open?.()};
$('cbManagement').onclick=()=>{hideMenu();open()};
document.addEventListener('click',e=>{if(!project.contains(e.target))hideMenu()});
const submitButton=document.createElement('button');submitButton.id='cbSubmitButton';submitButton.type='button';submitButton.textContent=tr('提交','Commit');submitButton.onclick=submit;header?.insertBefore(submitButton,fileWrap);
const ai=$('clusterAiOpen');if(ai)ai.remove();
function consolidateHeader(){const children=[...header.children];for(const b of children){if(b===submitButton||b===project||b===fileWrap||b.id==='blockDirectoryButton'||b.id==='cexpToggle'||b.classList.contains('brand'))continue;if(b.tagName==='BUTTON'&&/powershell|ai agent/i.test((b.textContent||'').trim()))b.remove()}const explorer=$('cexpToggle');if(explorer&&explorer.nextElementSibling!==project)explorer.after(project);const block=$('blockDirectoryButton');if(block){if(submitButton.nextElementSibling!==fileWrap)header.insertBefore(submitButton,fileWrap);if(fileWrap.nextElementSibling!==block)header.insertBefore(fileWrap,block)}}
consolidateHeader();const observer=new MutationObserver(()=>{observer.disconnect();consolidateHeader();observer.observe(header,{childList:true})});observer.observe(header,{childList:true}); 
$('uiLanguage')?.addEventListener('change',()=>{submitButton.textContent=tr('提交','Commit')});translate();
window.ClusterBackup={open,deactivate,closePage,syncTabs,isActive:()=>active,submit,choose,refresh};
})();