/* [MOD-002] CEXP opt1 compact dark UI and file operations. */
'use strict';
(()=>{const api=window.ClusterCEXP,$=id=>document.getElementById(id),panel=$('cexpSidebar'),tree=$('cexpTree'),status=$('cexpStatus');let selected=null;let activeNode=null;let activeDetail=null;let revealSerial=0;let dragState=null;let moveMode=false;
 const setStatus=(msg,error=false)=>{status.textContent=msg;status.className=error?'cexp-error':'';};
 // Dock Explorer inside the actual workarea, immediately below the shared tab/LOG row.
 const workarea=$('workarea');if(workarea&&panel.parentElement!==workarea)workarea.prepend(panel);
 function toggle(open){panel.hidden=!open;document.body.classList.toggle('cexp-open',open);window.dispatchEvent(new Event('resize'));requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));$('cexpToggle').setAttribute('aria-expanded',String(open));if(open){$('blockDirectory').hidden=true;$('blockDirectoryButton').setAttribute('aria-expanded','false');}}
 $('cexpToggle').addEventListener('click',()=>toggle(panel.hidden));$('cexpClose').addEventListener('click',()=>toggle(false));
 $('cexpAddRoot').addEventListener('click',async()=>{try{if(!window.showDirectoryPicker)throw Error('請使用支援 File System Access API 的 Chromium 瀏覽器');const h=await showDirectoryPicker({mode:'readwrite'});await api.addRoot(h);setStatus('已加入 '+h.name);}catch(e){if(e.name!=='AbortError')setStatus(e.message,true);}});
 // [ADD-OPT4-002] Add a single file without requiring a folder root.
 $('cexpAddFile').addEventListener('click',async()=>{try{if(!window.showOpenFilePicker)throw Error('瀏覽器不支援本地檔案 Handle');const [handle]=await window.showOpenFilePicker({multiple:false});if(!handle)return;await api.addFile(handle);await window.ClusterExplorerHost.openHandle(handle);setStatus('已加入獨立檔案 '+handle.name);}catch(e){if(e.name!=='AbortError')setStatus(e.message,true);}});
 // [FIX-OPT9-001] Refresh is an explicit collapse operation; never close editor tabs.
 // Suppress automatic active-file reveal until a later tab activation.
 $('cexpRefresh').addEventListener('click',async()=>{
  const token=++revealSerial;
  try{
   for(const root of api.roots){
    const close=node=>{node.expanded=false;for(const child of node.children||[])close(child);};
    close(root);
   }
   activeNode=null;selected=null;render();
   setStatus('已重新整理：Explorer 資料夾已全部收合（編輯分頁保留）');
  }catch(e){if(token===revealSerial)setStatus(e.message,true);}
 });
 function button(text,title,fn,cls=''){const b=document.createElement('button');b.textContent=text;b.title=title;b.type='button';b.className=cls;b.addEventListener('click',async e=>{e.stopPropagation();try{await fn();}catch(err){setStatus(err.message,true);}});return b;}
 function destinations(exclude){const result=[];function walk(n){if(n.kind!=='directory'||n===exclude)return;result.push(n);for(const c of n.children||[])walk(c);}for(const r of api.roots)walk(r);return result;}
 // [MOD-OPT3-001] Inline editor overlays the filename, without shifting the row.
 function inlineEdit(row,initial,submit,placeholder='名稱'){
  if(row.querySelector('.cexp-inline'))return;
  const label=row.querySelector('.cexp-label');
  const wrap=document.createElement('span');wrap.className='cexp-inline cexp-rename-overlay';
  const input=document.createElement('input');input.type='text';input.value=initial;input.placeholder=placeholder;input.maxLength=240;input.setAttribute('aria-label',placeholder);
  const cancel=()=>wrap.remove();let busy=false;
  const commit=async()=>{if(busy)return;const v=input.value.trim();if(!v){setStatus('名稱不可為空',true);input.focus();return;}busy=true;input.disabled=true;try{await submit(v);cancel();}catch(e){setStatus(e.message,true);input.disabled=false;busy=false;input.focus();}};
  wrap.append(input);row.append(wrap);
  input.addEventListener('pointerdown',e=>e.stopPropagation());input.addEventListener('click',e=>e.stopPropagation());
  input.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape')cancel();if(e.key==='Enter')void commit();});
  input.addEventListener('blur',()=>{if(!busy)cancel();});input.focus();
  const dot=initial.lastIndexOf('.');if(initial&&dot>0)input.setSelectionRange(0,dot);else input.select();
 }
 function setMoveMode(value){moveMode=Boolean(value);panel.classList.toggle('cexp-move-mode',moveMode);setStatus(moveMode?'移動模式已開啟：長按檔案拖曳排序或移動；再次點擊 ⇄ 退出':'移動模式已關閉');render();}
 async function closeNodeTabs(n){if(n.kind==='draft')return window.ClusterTabs?.closeByDocId?.(n.docId)!==false;if(n.kind==='file')return await window.ClusterTabs?.closeByHandle?.(n.handle)!==false;for(const c of n.children||[])if(!await closeNodeTabs(c))return false;return true;}
 // [FIX-OPT11-002] Closing a File/Folder in Explorer closes all descendant editor tabs.
 // This is not delete: disk files and Explorer nodes are left untouched.
 function descendants(n){if(n.kind==='file'||n.kind==='draft')return [n];return (n.children||[]).flatMap(descendants);}
 async function closeEditorTabs(n){const ok=window.ClusterTabs?.closeNodes?.(descendants(n));if(ok===false)throw Error('已取消關閉編輯分頁');setStatus('已關閉編輯分頁：'+n.name);}
 function del(n,row){if(row.querySelector('.cexp-confirm'))return;const wrap=document.createElement('span');wrap.className='cexp-confirm';const msg=document.createElement('span');msg.textContent='永久刪除？';const yes=button('刪除','確認永久刪除',async()=>{if(!await closeNodeTabs(n))throw Error('編輯分頁未關閉，已取消刪除');await api.remove(n);setStatus('已刪除 '+n.name);});const no=button('取消','取消刪除',()=>wrap.remove());wrap.append(msg,yes,no);row.append(wrap);}
 function bindLongPress(label,n){
  let timer=0,pid=null,armed=false,startX=0,startY=0,point=null;
  const clear=()=>{clearTimeout(timer);timer=0;};
  function targetAt(x,y){return document.elementFromPoint(x,y)?.closest('.cexp-node')||null;}
  label.addEventListener('pointerdown',e=>{if(e.button!==0||dragState||!n.parent)return;pid=e.pointerId;startX=e.clientX;startY=e.clientY;armed=false;
   document.addEventListener('pointermove',onMove);document.addEventListener('pointerup',finish);timer=setTimeout(()=>{armed=true;dragState={node:n};label.classList.add('cexp-dragging');setStatus('拖曳到同層項目可調整排序；拖到資料夾可移動');},moveMode?80:550);
  });
  const onMove=e=>{if(pid!==e.pointerId)return;if(!armed&&Math.hypot(e.clientX-startX,e.clientY-startY)>10)clear();if(!armed)return;point={x:e.clientX,y:e.clientY};
   document.querySelectorAll('.cexp-drop-target,.cexp-sort-target').forEach(x=>x.classList.remove('cexp-drop-target','cexp-sort-target'));
   const row=targetAt(e.clientX,e.clientY),target=row?.__cexpNode;
   if(target&&target!==n)row.classList.add(target.kind==='directory'&&target!==n.parent?'cexp-drop-target':'cexp-sort-target');
  };
  const finish=async e=>{if(pid!==e.pointerId)return;clear();document.removeEventListener('pointermove',onMove);document.removeEventListener('pointerup',finish);pid=null;if(!armed)return;armed=false;dragState=null;label.classList.remove('cexp-dragging');
   const row=targetAt(e.clientX,e.clientY),target=row?.__cexpNode;
   document.querySelectorAll('.cexp-drop-target,.cexp-sort-target').forEach(x=>x.classList.remove('cexp-drop-target','cexp-sort-target'));
   label.dataset.suppressClick='1';setTimeout(()=>{delete label.dataset.suppressClick;},300);
   if(!target||target===n){setStatus('已取消拖曳');return;}
   try{
    // [FIX-OPT13-002] Cross-folder drops target a directory; dropping on a file in another folder moves into its parent.
    const destination=target.kind==='directory'?target:(target.parent!==n.parent?target.parent:null);
    if(destination&&destination!==n.parent){
     if(n.kind==='file'&&await window.ClusterTabs?.isOpenHandle?.(n.handle))throw Error('請先關閉編輯分頁再移動');
     await api.move(n,destination);setStatus('已移動 '+n.name+' 至 '+destination.name);
    }else if(n.parent&&target.parent===n.parent){
     const rect=row.getBoundingClientRect();await api.reorder(n,target,e.clientY<rect.top+rect.height/2);setStatus('已儲存自訂順序');
    }else setStatus('請拖曳至目標資料夾，或同層文件調整排序',true);
   }catch(err){setStatus('拖曳失敗：'+err.message,true);}
  };
  label.addEventListener('pointercancel',()=>{clear();document.removeEventListener('pointermove',onMove);document.removeEventListener('pointerup',finish);pid=null;armed=false;dragState=null;label.classList.remove('cexp-dragging');});
  label.addEventListener('contextmenu',e=>{if(armed)e.preventDefault();});
 }
 // [ADD-OPT6-004] Distinct monochrome iconography and extension-based file categories.
 function category(n){if(n.kind==='directory')return 'folder';if(n.kind==='draft')return 'draft';const ext=n.name.split('.').pop().toLowerCase();if(/^(js|mjs|cjs|ts|tsx|jsx|py|c|cc|cpp|h|hpp|java|go|rs|rb|php|swift|kt|dart|sh|bat|ps1|sql)$/.test(ext))return 'program';if(/^(md|markdown|txt|pdf|doc|docx|rtf|csv|log)$/.test(ext))return 'document';if(/^(json|jsonc|yaml|yml|toml|ini|xml|gitignore|env|config|lock)$/.test(ext))return 'config';if(/^(png|jpg|jpeg|gif|webp|svg|ico|mp3|mp4|wav)$/.test(ext))return 'media';if(/^(html|htm|css|scss|vue|svelte)$/.test(ext))return 'web';return 'other';}
 const categoryGlyph={folder:'▣',draft:'◌',program:'⌘',document:'≡',config:'⚙',media:'◈',web:'◇',other:'▤'};
 async function revealActive(scroll=true){
  const detail=activeDetail,serial=++revealSerial;
  if(!detail){activeNode=null;render();return;}
  let found=null;
  if(detail.handle){try{found=await api.revealHandle(detail.handle);}catch(e){setStatus('無法定位目前文件：'+e.message,true);}}
  if(serial!==revealSerial)return;
  if(!found&&detail.docId)found=api.roots.find(n=>n.docId===detail.docId)||null;
  activeNode=found;
  if(found){selected=found;render();if(scroll&&!panel.hidden){const row=[...tree.querySelectorAll('.cexp-node')].find(x=>x.__cexpNode===found);row?.scrollIntoView({block:'nearest',behavior:'smooth'});}}
  else render();
 }
 function draw(n,depth){const row=document.createElement('div');row.className='cexp-node'+(!n.parent?' cexp-root':'')+(selected===n?' is-selected':'')+(activeNode===n?' is-active-file':'')+' cexp-type-'+category(n);row.style.setProperty('--depth',depth);row.__cexpNode=n;row.setAttribute('role','treeitem');row.setAttribute('aria-label',n.name);if(n.kind==='directory')row.setAttribute('aria-expanded',String(n.expanded));const label=document.createElement('span');label.className='cexp-label';const glyph=document.createElement('span');glyph.className='cexp-glyph';glyph.textContent=n.kind==='directory'?(n.expanded?'▾':'▸'):'·';const icon=document.createElement('span');icon.className='cexp-fileicon';icon.textContent=categoryGlyph[category(n)];icon.title={folder:'資料夾',draft:'未儲存文件',program:'程式碼',document:'文件',config:'設定檔',media:'媒體檔',web:'網頁資源',other:'其他檔案'}[category(n)];const text=document.createElement('span');text.textContent=n.name;label.append(glyph,icon,text);if(activeNode===n)row.setAttribute('aria-current','true');label.tabIndex=0;const act=async()=>{selected=n;render();try{if(n.kind==='directory')await api.expand(n);else if(n.kind==='draft')await window.ClusterExplorerHost.activateDraft(n.docId);else await window.ClusterExplorerHost.openHandle(n.handle);}catch(e){setStatus(e.message,true);}};label.addEventListener('click',e=>{if(label.dataset.suppressClick==='1'){delete label.dataset.suppressClick;e.preventDefault();return;}void act();});label.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();void act();}});bindLongPress(label,n);row.append(label);
 const actions=document.createElement('span');actions.className='cexp-actions';actions.append(button('⊟','關閉此檔案／資料夾的編輯分頁',()=>closeEditorTabs(n),'cexp-close-tabs'));if(n.kind==='directory')actions.append(button('⌁','在所屬 Root 開啟 PowerShell',()=>{if(!window.ClusterTerminal?.openAtWorkspace)throw Error('Terminal Plugin 尚未就緒');window.ClusterTerminal.openAtWorkspace(n);},'cexp-open-terminal'));if(n.kind==='directory')actions.append(button('+','新增檔案',async()=>{inlineEdit(row,'',async name=>{await api.create(n,name,'file');setStatus('已建立 '+name);},'新檔案名稱');}),button('▣','新增資料夾',async()=>{inlineEdit(row,'',async name=>{await api.create(n,name,'directory');setStatus('已建立 '+name);},'新資料夾名稱');}));if(n.parent)actions.append(button('✎','重新命名',()=>inlineEdit(row,n.name,async name=>{if(n.kind==='file'&&await window.ClusterTabs?.isOpenHandle?.(n.handle))throw Error('請先關閉此檔案的編輯分頁再重新命名');await api.rename(n,name);setStatus('已重新命名 '+name);},'重新命名')),button('⇄',moveMode?'解除移動模式':'進入移動模式',()=>setMoveMode(!moveMode),'cexp-mode-button'+(moveMode?' is-on':'')),button('×','永久刪除',()=>del(n,row),'cexp-danger'));else actions.append(button('−',n.kind==='draft'?'從 Explorer 移除暫存入口':'從工作區移除 Root（不刪除磁碟資料）',async()=>{if(!await closeNodeTabs(n))throw Error('編輯分頁未關閉，已取消移除');return n.kind==='draft'?api.removeDraft(n.docId):api.removeRoot(n);}));row.append(actions);tree.append(row);if(n.expanded)for(const child of n.children||[])draw(child,depth+1);}
 function render(){tree.replaceChildren();if(!api.roots.length){const empty=document.createElement('div');empty.className='cexp-muted';empty.textContent='尚未載入工作區 · 按 ＋ 加入本地資料夾';tree.append(empty);}else for(const n of api.roots)draw(n,0);$('cexpCount').textContent=api.roots.length+' ROOTS';}
 // [ADD-OPT3-002] File menu / native editor operations notify Explorer.
 let syncQueue=Promise.resolve();
 // [FIX-OPT5-001] Document events update Explorer entries without filesystem rescans.
 // Only the explicit Refresh button can request a forced directory scan.
 async function synchronize(detail={}){
  try{await api.syncDocument(detail);if(activeDetail&&(detail.docId===activeDetail.docId||detail.handle===activeDetail.handle))await revealActive(false);}catch(e){setStatus('同步失敗：'+e.message,true);}
 }
 window.addEventListener('cluster:file-operation',e=>{const detail=e.detail||{};syncQueue=syncQueue.catch(()=>{}).then(()=>synchronize(detail));});
 window.addEventListener('cluster:session-restored',e=>{syncQueue=syncQueue.catch(()=>{}).then(async()=>{for(const d of e.detail?.documents||[])await api.syncDocument({type:d.handle?'open':'new',...d});render();});});
 // [ADD-OPT6-005] Tab changes highlight and reveal the matching Explorer entry.
 window.addEventListener('cluster:active-file',e=>{activeDetail=e.detail||null;void revealActive(true);});
 api.events.addEventListener('change',render);render();api.restore().then(async()=>{for(const doc of window.ClusterExplorerHost?.getOpenDocuments?.()||[])await api.syncDocument({type:doc.handle?'open':'new',...doc});setStatus(api.roots.length?'已還原 Explorer 項目':'就緒');const d=window.ClusterTabs?.getActiveDoc?.();if(d){activeDetail={docId:d.documentId,handle:d.handle,name:d.name};await revealActive(true);}}).catch(e=>setStatus('Root 還原失敗：'+e.message,true));
})();
