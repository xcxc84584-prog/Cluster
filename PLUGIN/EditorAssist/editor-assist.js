/* [FIX-PR16] EditorAssist: single owner for Enter, Tab and paired delimiters. */
(()=>{'use strict';const el=document.getElementById('editor');if(!el)return;
 const pairs={'(':')','[':']','{':'}','"':'"',"'":"'"};const closers=new Set(Object.values(pairs));
 function insert(text,a=el.selectionStart,b=el.selectionEnd,caret=a+text.length){el.setRangeText(text,a,b,'end');el.setSelectionRange(caret,caret);el.dispatchEvent(new Event('input',{bubbles:true}));}
 el.addEventListener('keydown',e=>{
  if(e.isComposing||e.ctrlKey||e.metaKey||e.altKey||e.defaultPrevented)return;
  const a=el.selectionStart,b=el.selectionEnd,v=el.value,key=e.key;
  if(key==='Tab'){
   e.preventDefault();e.stopImmediatePropagation();const start=v.lastIndexOf('\n',a-1)+1;
   if(e.shiftKey){const prefix=v.slice(start).match(/^( {1,4}|\t)/)?.[0];if(prefix)insert('',start,start+prefix.length,Math.max(start,a-prefix.length));}
   else {const col=a-start;insert(' '.repeat(4-col%4),a,b);}
   return;
  }
  if(key==='Enter'){
   e.preventDefault();e.stopImmediatePropagation();const line=v.slice(v.lastIndexOf('\n',a-1)+1,a);
   const indent=line.match(/^[ \t]*/)?.[0]||'';
   const paired=v[a-1]==='{'&&v[a]==='}';
   if(paired){insert('\n'+indent+'    '+'\n'+indent,a,b,a+1+indent.length+4);return;}
   const extra=/[({\[]\s*$/.test(line)?'    ':'';
   insert('\n'+indent+extra,a,b);return;
  }
  if(closers.has(key)&&a===b&&v[a]===key){e.preventDefault();e.stopImmediatePropagation();el.setSelectionRange(a+1,a+1);return;}
  if(Object.hasOwn(pairs,key)){
   // A quote immediately after a backslash is escaped and should not auto-pair.
   if((key==='"'||key==="'")&&v[a-1]==='\\')return;
   e.preventDefault();e.stopImmediatePropagation();const selected=v.slice(a,b);
   insert(key+selected+pairs[key],a,b,a+1);if(selected)el.setSelectionRange(a+1,a+1+selected.length);return;
  }
  if(key==='Backspace'&&a===b&&pairs[v[a-1]]===v[a]){e.preventDefault();e.stopImmediatePropagation();insert('',a-1,a+1,a-1);}
 },true);
})();
