/* Cluster opt5: translate dynamic application chrome, never user document content. */
(()=>{'use strict';
 const picker=document.getElementById('uiLanguage');if(!picker)return;
 const pairs=[
 ['尚未載入工作區 · 按 ＋ 加入本地資料夾','No workspace loaded · Press + to add a local folder'],
 ['目前文件沒有區塊','No blocks in the current file'],
 ['選擇「檔案」建立或開啟文件','Choose File to create or open a document'],
 ['就緒','Ready'],['已準備就緒','Ready'],['區塊目錄','Blocks'],
 ['新增資料夾','Add folder'],['單獨加入檔案','Add file'],['重新整理','Refresh'],
 ['關閉區塊目錄','Close Blocks'],['關閉','Close'],
 ['程式碼編輯區','Code editor'],['定位行號','Go to line number'],
 ['局部同步編輯頁面','Local synchronized editor'],['局部同步文字編輯','Local synchronized text editor'],
 ['刪除區塊','Delete block'],['點擊定位至區塊','Go to block'],
 ['建立區塊','Create block'],['局部編輯','Local edit'],['跳至行','Go to line'],
 ['效能階梯','Performance tier'],['工作區 / 本地','WORKSPACE / LOCAL']
 ];
 const zhToEn=new Map(pairs),enToZh=new Map(pairs.map(([zh,en])=>[en,zh]));
 const selectors=['#cexpTree','#cexpStatus','#cexpCount','#cexpSidebar .cexp-head',
 '#blockDirectory','#empty','#clusterBottomBar','#localRangeView','#notice'];
 const attrs=['title','aria-label','placeholder'];
 let applying=false;
 function translate(value,lang){
  const exact=lang==='en'?zhToEn.get(value):enToZh.get(value);
  if(exact!==undefined)return exact;
  let m=value.match(/^(\d+) 個區塊$/);
  if(lang==='en'&&m)return `${m[1]} Blocks`;
  m=value.match(/^(\d+) Blocks?$/);
  if(lang==='zh'&&m)return `${m[1]} 個區塊`;
  return value;
 }
 function applyNode(root,lang){
  if(root.nodeType===Node.TEXT_NODE){
   const value=root.nodeValue||'',trim=value.trim();if(!trim)return;
   const next=translate(trim,lang);
   if(next!==trim)root.nodeValue=value.replace(trim,next);
   return;
  }
  if(root.nodeType!==Node.ELEMENT_NODE)return;
  if(root.matches('textarea,input,option,script,style,[contenteditable],.cexp-label,.cexp-file-name'))return;
  for(const attr of attrs){const value=root.getAttribute(attr);if(value){const next=translate(value,lang);if(next!==value)root.setAttribute(attr,next);}}
  for(const child of [...root.childNodes])applyNode(child,lang);
 }
 function apply(){if(applying)return;applying=true;try{
  const lang=picker.value==='en'?'en':'zh';
  for(const selector of selectors)for(const el of document.querySelectorAll(selector))applyNode(el,lang);
 }finally{applying=false;}}
 picker.addEventListener('change',apply);
 const observer=new MutationObserver(()=>{if(!applying)apply();});
 for(const selector of selectors){const el=document.querySelector(selector);if(el)observer.observe(el,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:attrs});}
 apply();window.ClusterDynamicI18n={refresh:apply};
})();
