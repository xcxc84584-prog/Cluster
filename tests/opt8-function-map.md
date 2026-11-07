| File | Line | Function |
|---|---:|---|
| `BASE/cluster-standalone.js` | 16 | `async createBlock(start,end){if(!this.indexComplete)throw Error('索引尚未完成');i` |
| `BASE/cluster-standalone.js` | 47 | `const emit=(plugin,message)=>{const event={time:new Date().toISOString(),pl` |
| `BASE/cluster-standalone.js` | 55 | `function renderGutter(first,total){` |
| `BASE/cluster-standalone.js` | 66 | `function refreshSmallGutter(){` |
| `BASE/cluster-standalone.js` | 73 | `function tabs(){const list=$('tabList');list.replaceChildren();for(const d ` |
| `BASE/cluster-standalone.js` | 75 | `function setLoad(msg){$('clusterLoad').hidden=false;$('loadLabel').textCont` |
| `BASE/cluster-standalone.js` | 76 | `async function render(){const d=fm.active,t=++token;if(!d)return;shownDoc=d` |
| `BASE/cluster-standalone.js` | 78 | `async function save(as=false,doc=fm.active){if(!doc)return;try{if(doc.pendi` |
| `BASE/cluster-standalone.js` | 82 | `const lineHeight=()=>{const st=getComputedStyle(editor);return parseFloat(s` |
| `BASE/cluster-standalone.js` | 83 | `const centerLine=(localLine)=>{const h=lineHeight(),visible=Math.max(1,Math` |
| `BASE/cluster-standalone.js` | 97 | `const updatePos=()=>{const prefix=editor.value.slice(0,editor.selectionStar` |
| `BASE/cluster-standalone.js` | 105 | `function updateBlockDirectory(){` |
| `BASE/cluster-standalone.js` | 120 | `async function getBlockContent(d,b){` |
| `BASE/cluster-standalone.js` | 125 | `function refreshBlockGutter(){const d=fm.active;if(!d)return;const n=d.size` |
| `BASE/cluster-standalone.js` | 139 | `async function pollExternal(){if(externalSyncBusy||document.hidden)return;e` |
| `BASE/enhancements.js` | 6 | `const safe=(fn)=>{try{return fn()}catch{return null}};` |
| `BASE/enhancements.js` | 7 | `const get=(k,def)=>safe(()=>JSON.parse(localStorage.getItem(KEY+k)))??def;` |
| `BASE/enhancements.js` | 8 | `const put=(k,v)=>safe(()=>localStorage.setItem(KEY+k,JSON.stringify(v)));` |
| `BASE/enhancements.js` | 10 | `const log=(m)=>emit('Workspace',m);` |
| `BASE/enhancements.js` | 13 | `function snapshot(){if(restoring)return;const d=fm.active;const line=(edito` |
| `BASE/enhancements.js` | 16 | `let sessionTimer;function schedule(){clearTimeout(sessionTimer);sessionTime` |
| `BASE/enhancements.js` | 20 | `function saveBlocks(d){if(!d)return;put('blocks:'+fileKey(d),{next:d.nextBl` |
| `BASE/enhancements.js` | 21 | `function restoreBlocks(d){const data=get('blocks:'+fileKey(d),null);if(!dat` |
| `BASE/enhancements.js` | 38 | `function translate(code){const t=dictionary[code]||dictionary.zh;document.d` |
| `link_plugin_CEXP/host-adapter.js` | 16 | `function sync(){const next=new Map(fm.docs.map(d=>[d.id,d]));for(const [id,` |
| `PLUGIN/WorkspacePersistence/persistence.js` | 4 | `async function tx(store,mode,key,value){const db=await dbp;return new Promi` |
| `PLUGIN/WorkspacePersistence/persistence.js` | 5 | `const save=(s,k,v)=>tx(s,'readwrite',k,v),load=(s,k)=>tx(s,'readonly',k);` |
| `PLUGIN/WorkspacePersistence/persistence.js` | 9 | `async function checkpoint(){if(restoring)return;const active=fm.active;cons` |
| `PLUGIN/WorkspacePersistence/persistence.js` | 20 | `function schedule(){if(restoring)return;clearTimeout(timer);timer=setTimeou` |
| `PLUGIN/WorkspacePersistence/persistence.js` | 23 | `async function restore(){try{const session=await load('session','current');` |
| `PLUGIN/EditorAssist/editor-assist.js` | 3 | `const insert=(text,from=el.selectionStart,to=el.selectionEnd,caret=from+tex` |
| `plugin_CEXP/explorer-core.js` | 5 | `const emit=(reason)=>events.dispatchEvent(new CustomEvent('change',{detail:` |
| `plugin_CEXP/explorer-core.js` | 6 | `function node(handle,parent=null){return {id:'cx'+(++seq),handle,parent,nam` |
| `plugin_CEXP/explorer-core.js` | 8 | `function draftNode(detail){return {id:'draft:'+detail.docId,docId:detail.do` |
| `plugin_CEXP/explorer-core.js` | 9 | `async function containsHandle(handle){for(const root of roots){if(root.hand` |
| `plugin_CEXP/explorer-core.js` | 11 | `async function rememberIdentity(id,handle){const db=await dbOpen();try{awai` |
| `plugin_CEXP/explorer-core.js` | 12 | `async function stableId(handle){` |
| `plugin_CEXP/explorer-core.js` | 21 | `async function addFile(handle){if(!handle||handle.kind!=='file')throw Error` |
| `plugin_CEXP/explorer-core.js` | 22 | `function addDraft(detail){if(!detail?.docId)return;const existing=roots.fin` |
| `plugin_CEXP/explorer-core.js` | 23 | `function removeDraft(docId){const i=roots.findIndex(x=>x.docId===docId);if(` |
| `plugin_CEXP/explorer-core.js` | 24 | `async function syncDocument(detail){if(detail.handle?.kind==='file'&&['open` |
| `plugin_CEXP/explorer-core.js` | 26 | `function dbOpen(){return new Promise((ok,no)=>{const req=indexedDB.open(DB,` |
| `plugin_CEXP/explorer-core.js` | 27 | `async function transact(mode,fn){const db=await dbOpen();try{return await n` |
| `plugin_CEXP/explorer-core.js` | 28 | `async function saveRoots(){const db=await dbOpen();try{await new Promise((o` |
| `plugin_CEXP/explorer-core.js` | 29 | `async function restore(){if(!('indexedDB'in window))return;const db=await d` |
| `plugin_CEXP/explorer-core.js` | 30 | `async function addRoot(handle){if(handle.kind!=='directory')throw Error('RO` |
| `plugin_CEXP/explorer-core.js` | 31 | `async function permission(handle,write=false,request=false){const options={` |
| `plugin_CEXP/explorer-core.js` | 32 | `function orderKey(n){const root=rootOf(n);return root.persistId+':'+pathOf(` |
| `plugin_CEXP/explorer-core.js` | 35 | `async function readFolderOrder(n){` |
| `plugin_CEXP/explorer-core.js` | 44 | `async function getOrder(n){` |
| `plugin_CEXP/explorer-core.js` | 49 | `async function setOrder(n,names){` |
| `plugin_CEXP/explorer-core.js` | 63 | `async function reorder(n,target,before=true){if(n.parent!==target.parent)th` |
| `plugin_CEXP/explorer-core.js` | 65 | `async function expand(n,force=false){` |
| `plugin_CEXP/explorer-core.js` | 79 | `const order=await getOrder(n);const oldNames=(n.children||[]).map(x=>x.name` |
| `plugin_CEXP/explorer-core.js` | 85 | `async function refreshExpanded(n){` |
| `plugin_CEXP/explorer-core.js` | 88 | `function remember(item,path=[]){if(item.kind!=='directory'||!item.expanded)` |
| `plugin_CEXP/explorer-core.js` | 101 | `async function revealHandle(handle){` |
| `plugin_CEXP/explorer-core.js` | 111 | `const child=(cur.children||[]).find(x=>x.name===parts[i]&&(i===parts.length` |
| `plugin_CEXP/explorer-core.js` | 118 | `async function removeRoot(n){const i=roots.indexOf(n);if(i>=0){roots.splice` |
| `plugin_CEXP/explorer-core.js` | 119 | `function validate(name){if(!name||name==='.'||name==='..'||/[\\/\x00-\x1f]/` |
| `plugin_CEXP/explorer-core.js` | 120 | `async function ensureFree(parent,name){try{await parent.getFileHandle(name)` |
| `plugin_CEXP/explorer-core.js` | 121 | `async function create(n,name,kind){if(n.kind!=='directory')throw Error('NOT` |
| `plugin_CEXP/explorer-core.js` | 122 | `function rootOf(n){while(n.parent)n=n.parent;return n;}` |
| `plugin_CEXP/explorer-core.js` | 123 | `function pathOf(n){const names=[];while(n.parent){names.unshift(n.name);n=n` |
| `plugin_CEXP/explorer-core.js` | 124 | `async function directoryAt(root,names){let h=root.handle;for(const name of ` |
| `plugin_CEXP/explorer-core.js` | 125 | `async function same(a,b){return a===b||Boolean(await a.isSameEntry?.(b));}` |
| `plugin_CEXP/explorer-core.js` | 126 | `async function copyVerified(src,dest,name){if(src.kind==='file'){const orig` |
| `plugin_CEXP/explorer-core.js` | 127 | `async function move(n,dest,name=n.name){if(!n.parent)throw Error('CANNOT_MO` |
| `plugin_CEXP/explorer-core.js` | 133 | `async function rename(n,name){if(!n.parent)throw Error('CANNOT_RENAME_ROOT'` |
| `plugin_CEXP/explorer-core.js` | 134 | `async function remove(n){if(!n.parent)throw Error('ROOT_USE_REMOVE_WORKSPAC` |
| `link_plugin_CEXP/explorer-ui.js` | 4 | `const setStatus=(msg,error=false)=>{status.textContent=msg;status.className` |
| `link_plugin_CEXP/explorer-ui.js` | 5 | `function toggle(open){panel.hidden=!open;document.body.classList.toggle('ce` |
| `link_plugin_CEXP/explorer-ui.js` | 23 | `function button(text,title,fn,cls=''){const b=document.createElement('butto` |
| `link_plugin_CEXP/explorer-ui.js` | 24 | `function destinations(exclude){const result=[];function walk(n){if(n.kind!=` |
| `link_plugin_CEXP/explorer-ui.js` | 26 | `function inlineEdit(row,initial,submit,placeholder='名稱'){` |
| `link_plugin_CEXP/explorer-ui.js` | 31 | `const cancel=()=>wrap.remove();let busy=false;` |
| `link_plugin_CEXP/explorer-ui.js` | 32 | `const commit=async()=>{if(busy)return;const v=input.value.trim();if(!v){set` |
| `link_plugin_CEXP/explorer-ui.js` | 39 | `function setMoveMode(value){moveMode=Boolean(value);panel.classList.toggle(` |
| `link_plugin_CEXP/explorer-ui.js` | 40 | `async function closeNodeTabs(n){if(n.kind==='draft')return window.ClusterTa` |
| `link_plugin_CEXP/explorer-ui.js` | 41 | `function del(n,row){if(row.querySelector('.cexp-confirm'))return;const wrap` |
| `link_plugin_CEXP/explorer-ui.js` | 42 | `function bindLongPress(label,n){` |
| `link_plugin_CEXP/explorer-ui.js` | 44 | `const clear=()=>{clearTimeout(timer);timer=0;};` |
| `link_plugin_CEXP/explorer-ui.js` | 45 | `function targetAt(x,y){return document.elementFromPoint(x,y)?.closest('.cex` |
| `link_plugin_CEXP/explorer-ui.js` | 74 | `function category(n){if(n.kind==='directory')return 'folder';if(n.kind==='d` |
| `link_plugin_CEXP/explorer-ui.js` | 76 | `async function revealActive(scroll=true){` |
| `link_plugin_CEXP/explorer-ui.js` | 87 | `function draw(n,depth){const row=document.createElement('div');row.classNam` |
| `link_plugin_CEXP/explorer-ui.js` | 89 | `function render(){tree.replaceChildren();if(!api.roots.length){const empty=` |
| `link_plugin_CEXP/explorer-ui.js` | 94 | `async function synchronize(detail={}){` |