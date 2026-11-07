/* Cluster V journal: independent IndexedDB durability, explicit base commit. */
(function(){
const DB='cluster-v-journal-1',STORE='journals';
function db(){return new Promise((ok,no)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
async function transaction(mode,fn){const d=await db();try{return await new Promise((ok,no)=>{const t=d.transaction(STORE,mode),s=t.objectStore(STORE),r=fn(s);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);t.onerror=()=>no(t.error)})}finally{d.close()}}
const read=k=>transaction('readonly',s=>s.get(k)),write=(k,v)=>transaction('readwrite',s=>s.put(v,k)),remove=k=>transaction('readwrite',s=>s.delete(k));
async function fingerprint(file){const a=await file.slice(0,65536).arrayBuffer(),b=await file.slice(Math.max(0,file.size-65536)).arrayBuffer();const bytes=new Uint8Array(a.byteLength+b.byteLength);bytes.set(new Uint8Array(a));bytes.set(new Uint8Array(b),a.byteLength);const hash=await crypto.subtle.digest('SHA-256',bytes);return [file.name,file.size,Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('')].join(':')}
function status(kind,detail='',progress=0){const root=document.getElementById('clusterVStatus');if(!root)return;root.dataset.state=kind;const labels={green:'已同步',yellow:'待同步',red:'失敗／衝突'};root.querySelector('.v-title').textContent=labels[kind]||kind;root.querySelector('.v-detail').textContent=detail;root.querySelector('progress').value=Math.max(0,Math.min(100,progress));root.querySelector('.v-percent').textContent=Math.round(progress)+'%';root.title=detail}
window.ClusterVJournal={read,write,remove,fingerprint,status};
const ui=document.createElement('span');ui.id='clusterVStatus';ui.dataset.state='green';ui.innerHTML='<span class="v-title">已同步</span><progress max="100" value="100"></progress><span class="v-percent">100%</span><span class="v-detail" hidden></span>';const notice=document.getElementById('notice');if(notice?.parentElement)notice.after(ui);else document.body.append(ui);
})();
