/* [ADD-PR15] Versioned line index cache; immutable source fingerprint.
   Cache is a performance hint only. No index is used if size/mtime/name differ.
   Future versions can add content hashing for stronger validation. */
(()=>{'use strict';
 const open=new Promise((resolve,reject)=>{const r=indexedDB.open('cluster-line-index-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('indexes');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
 const fingerprint=d=>`${d.name}|${d.file.size}|${d.file.lastModified}`;
 async function io(mode,key,value){const db=await open;return new Promise((resolve,reject)=>{const t=db.transaction('indexes',mode),r=mode==='readonly'?t.objectStore('indexes').get(key):t.objectStore('indexes').put(value,key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
 const inflight=new WeakMap();
 async function restore(d){if(d.indexComplete)return true;if(inflight.has(d))return inflight.get(d);
  const task=(async()=>{try{const record=await io('readonly',fingerprint(d));if(!record||record.size!==d.size||record.mtime!==d.file.lastModified)return false;
   d.lineStarts=Array.from(record.lines);d.indexComplete=true;d.indexedBytes=d.size;d.indexedLines=d.lineStarts.length;
   window.cluster.emit('IndexCache',`Restored ${d.lineStarts.length} lines`);return true;
  }catch(e){window.cluster.emit('IndexCache','Cache unavailable: '+e.message);return false}})();inflight.set(d,task);return task}
 async function store(d){if(!d.indexComplete||d.dirty||d.size<100000)return false;
  try{await io('readwrite',fingerprint(d),{size:d.size,mtime:d.file.lastModified,lines:Uint32Array.from(d.lineStarts)});window.cluster.emit('IndexCache','Saved '+d.lineStarts.length+' lines');return true}
  catch(e){window.cluster.emit('IndexCache','Storage quota: '+e.message);return false}}
 window.ClusterIndexCache={restore,store};
})();
