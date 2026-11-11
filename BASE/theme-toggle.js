/* Cluster day/night theme. User-controlled, persisted, and independent of editor data. */
(()=>{
 'use strict';
 const key='cluster-ui-theme-v1';
 const select=document.getElementById('clusterTheme');
 if(!select)return;
 const get=()=>{try{return localStorage.getItem(key)==='light'?'light':'dark'}catch{return 'dark'}};
 function apply(mode){
  const theme=mode==='light'?'light':'dark';
  document.documentElement.dataset.clusterTheme=theme;
  document.documentElement.style.colorScheme=theme;
  select.value=theme;
  try{localStorage.setItem(key,theme)}catch{}
  window.dispatchEvent(new CustomEvent('cluster:theme-change',{detail:{theme}}));
 }
 select.addEventListener('change',()=>apply(select.value));
 apply(get());
})();
