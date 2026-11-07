/* [ADD-PR18] CEXP LINK adapter; no host-internal imports. */
(()=>{'use strict';const fm=window.cluster.fm;
 const detail=d=>({docId:d.id,handle:d.handle,name:d.name});
 const opening=new Map();const handleKey=async h=>h.name+':'+h.kind;
 async function sameHandle(a,b){if(a===b)return true;if(!a||!b)return false;try{return !!(await a.isSameEntry(b))}catch{return false}}
 async function findOpen(h){for(const d of fm.docs)if(await sameHandle(d.handle,h))return d;return null}

 window.ClusterExplorerHost={
  openHandle:async h=>{const existing=await findOpen(h);if(existing){window.ClusterTerminal?.deactivate?.();fm.select(existing.id);return existing}const key=await handleKey(h);if(opening.has(key))return opening.get(key);const task=(async()=>{const prior=await findOpen(h);if(prior){window.ClusterTerminal?.deactivate?.();fm.select(prior.id);return prior}window.ClusterTerminal?.deactivate?.();return fm.open(await h.getFile(),h)})();opening.set(key,task);try{return await task}finally{opening.delete(key)}},
  activateDraft:async id=>fm.select(id),
  getOpenDocuments:()=>fm.docs.map(detail)
 };
 // [FIX-OPT11-001] LINK owns tab lifecycle; Explorer never edits BASE DOM.
 const matching=(n)=>fm.docs.filter(d=>(n.docId&&d.id===n.docId)||(n.handle&&d.handle===n.handle));
 function closeBatch(docs){
  const unique=[...new Set(docs)];
  if(unique.some(d=>d.dirty)&&!window.confirm('有尚未儲存的文件。關閉分頁前請確認草稿已保存。仍要關閉？'))return false;
  // A single batch mutation avoids transient activation and repeated redraw.
  const ids=new Set(unique.map(d=>d.id));
  fm.docs=fm.docs.filter(d=>!ids.has(d.id));
  if(fm.active&&ids.has(fm.active.id))fm.active=fm.docs.at(-1)||null;
  fm.notify();return true;
 }
 window.ClusterTabs={
  closeByDocId:id=>closeBatch(fm.docs.filter(d=>d.id===id)),
  closeByHandle:async h=>closeBatch(fm.docs.filter(d=>d.handle===h)),
  closeNodes:nodes=>closeBatch(nodes.flatMap(matching)),
  isOpenHandle:async h=>!!(await findOpen(h)),
  getActiveDoc:()=>fm.active?{documentId:fm.active.id,...detail(fm.active)}:null
 };
 let previous=new Map();let active=null;
 function sync(){const next=new Map(fm.docs.map(d=>[d.id,d]));for(const [id,d] of next)if(!previous.has(id))window.dispatchEvent(new CustomEvent('cluster:file-operation',{detail:{type:d.handle?'open':'new',...detail(d)}}));
  for(const [id,d] of previous)if(!next.has(id))window.dispatchEvent(new CustomEvent('cluster:file-operation',{detail:{type:'close',...detail(d)}}));
  previous=next;if(fm.active!==active){active=fm.active;window.dispatchEvent(new CustomEvent('cluster:active-file',{detail:active?detail(active):null}));}}
 fm.onChange(sync);sync();
})();
