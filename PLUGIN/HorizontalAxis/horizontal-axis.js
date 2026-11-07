/* [MOD-EPR1-002] HorizontalAxis 1.1.0: native scrollbar matching Y-axis.
   AREA A1: editor configuration; BEHAVIOR B1: no soft wrap;
   TRIGGER T1: plugin load. The browser owns scrollX and scrollY.
   No overlay, range slider, polling, MutationObserver or document writes. */
(()=>{'use strict';
 const editor=document.getElementById('editor');
 const local=document.getElementById('localRangeEditor');
 for(const el of [editor,local]){
   if(!el)continue;
   el.setAttribute('wrap','off');
   el.style.whiteSpace='pre';
   el.style.overflowWrap='normal';
   el.style.overflowX='auto';
   el.style.overflowY='auto';
 }
 window.ClusterHorizontalAxis={version:'1.1.0',update:()=>{}};
})();
