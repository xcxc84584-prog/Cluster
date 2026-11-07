/* Cluster v0.0.5 SegmentLoader: lazy 256000-byte slices; sparse line checkpoints; edit transactions */
export const SLICE_BYTES=250*1024;
const decoder=new TextDecoder('utf-8');
const encoder=new TextEncoder();
export class SegmentDocument {
 constructor(file,emit=()=>{}){this.file=file;this.emit=emit;this.id=crypto.randomUUID();this.name=file.name;this.size=file.size;this.version=0;this.nodes=[];this.changes=[];this.blocks=new Map();this.blockAnchors=new Map();this.nextBlock=1;this.lineStarts=[0];this.indexedBytes=0;this.indexedLines=1;this.indexComplete=false;this.cache=new Map();this.cacheLimit=12;this.indexing=false;this.mutations=[];}
 async init(){const n=Math.max(1,Math.ceil(this.size/SLICE_BYTES));for(let i=0;i<n;i++){const start=i*SLICE_BYTES,end=Math.min(this.size,start+SLICE_BYTES);this.nodes.push({id:i,start,end,prev:i?i-1:null,next:i+1<n?i+1:null});if(i===n-1||i%128===0)this.emit('SegmentLoader',`Load "${this.name}",Slice:${Math.ceil(end/1024)}/${Math.ceil(this.size/1024)}KB`)}this.emit('SegmentLoader','Sliced loading successfully established.');return this}
 async getSlice(i){if(i<0||i>=this.nodes.length)return '';if(this.cache.has(i))return this.cache.get(i);const node=this.nodes[i];const text=decoder.decode(await this.file.slice(node.start,node.end).arrayBuffer());this.cache.set(i,text);if(this.cache.size>this.cacheLimit)this.cache.delete(this.cache.keys().next().value);return text}
 async textRange(start,end){start=Math.max(0,start);end=Math.min(this.size,end);if(end<=start)return '';return decoder.decode(await this.file.slice(start,end).arrayBuffer())}
 // [ADD-PR15] Durable line-offset index; restore before scanning the original file.
 async index(onProgress=()=>{}){
  if(this.indexComplete||this.indexing)return;this.indexing=true;
  const key=[this.name,this.size,this.file.lastModified].join('\u0000');
  const db=await new Promise(resolve=>{try{const r=indexedDB.open('cluster-line-index-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('indexes');r.onsuccess=()=>resolve(r.result);r.onerror=()=>resolve(null)}catch{resolve(null)}});
  const read=()=>new Promise(resolve=>{if(!db)return resolve(null);try{const r=db.transaction('indexes').objectStore('indexes').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>resolve(null)}catch{resolve(null)}});
  const write=data=>new Promise(resolve=>{if(!db)return resolve();try{const t=db.transaction('indexes','readwrite');t.objectStore('indexes').put(data,key);t.oncomplete=resolve;t.onerror=resolve}catch{resolve()}});
  try{
   const cached=await read();
   if(cached?.size===this.size&&cached?.modified===this.file.lastModified&&cached.lines?.length){
    this.lineStarts=Array.from(cached.lines);this.indexedBytes=this.size;this.indexedLines=this.lineStarts.length;this.indexComplete=true;onProgress(1);this.emit('SegmentLoader',`Index restored from cache,lines:${this.indexedLines}`);return;
   }
   let offset=0;const block=1024*1024;const lines=[0];
   while(offset<this.size){const end=Math.min(this.size,offset+block),bytes=new Uint8Array(await this.file.slice(offset,end).arrayBuffer());for(let i=0;i<bytes.length;i++)if(bytes[i]===10)lines.push(offset+i+1);offset=end;this.indexedBytes=offset;this.indexedLines=lines.length;onProgress(offset/Math.max(1,this.size));if(offset%(8*block)===0)await new Promise(r=>setTimeout(r,0));}
   this.lineStarts=lines;this.indexComplete=true;this.emit('SegmentLoader',`Index complete,lines:${lines.length}`);
   // IndexedDB may reject large indexes (quota); never block editing on persistence.
   await write({size:this.size,modified:this.file.lastModified,lines:new Float64Array(lines)});
  }catch(e){this.emit('SegmentLoader',`ERROR PR6:001 ${e.message}`);throw e}finally{this.indexing=false;db?.close()}
 }

 async getLines(first,count){if(!this.indexComplete&&first>this.indexedLines)throw Error('行號索引尚未完成');const start=this.lineStarts[Math.max(0,first-1)]??this.size;const end=this.lineStarts[Math.min(this.lineStarts.length-1,first+count-1)]??this.size;let text=await this.textRange(start,Math.min(this.size,end+1));let lines=text.split('\n');return lines.slice(0,count).map(s=>s.endsWith('\r')?s.slice(0,-1):s)}
 async getAllSmall(){return this.file.text()}
 async replaceLines(start,end,newText){if(!this.indexComplete)throw Error('需等待索引完成');if(start<1||end<start||end>this.lineStarts.length)throw Error('行號範圍無效');const old=await this.getLines(start,end-start+1);const before=this.lineStarts[start-1];const after=this.lineStarts[end]??this.size;const replacement=newText+(after<this.size?'\n':'');this.mutations.push({start:before,end:after,text:replacement,old:old.join('\n')});this.mutations.sort((a,b)=>a.start-b.start);this.version++;const delta=newText.split('\n').length-(end-start+1);for(const block of this.blocks.values()){if(block.start> end){block.start+=delta;block.end+=delta}else if(block.end>=start){block.end+=delta;if(block.start>start)block.start=start}}return {delta,version:this.version}}
 async createBlock(start,end){if(!this.indexComplete)throw Error('索引尚未完成');if(start<1||end<start||end>this.lineStarts.length)throw Error('範圍無效');const id='B'+String(this.nextBlock++).padStart(4,'0');const content=(await this.getLines(start,end-start+1)).join('\n');const block={id,start,end,content};this.blocks.set(id,block);return block}
 async checkBlock(id){const b=this.blocks.get(id);if(!b)throw Error('Block ID 不存在');return {...b,content:(await this.getLines(b.start,b.end-b.start+1)).join('\n')}}
 async deleteBlock(id){return this.blocks.delete(id)}
 async syncSmallBlocks(oldText,newText){
   if(!this.blocks.size||oldText===newText)return;
   const a=oldText.split('\n'),b=newText.split('\n');let pre=0;
   while(pre<a.length&&pre<b.length&&a[pre]===b[pre])pre++;
   let suf=0;while(suf<a.length-pre&&suf<b.length-pre&&a[a.length-1-suf]===b[b.length-1-suf])suf++;
   const removed=a.length-pre-suf,added=b.length-pre-suf,delta=added-removed;
   for(const block of this.blocks.values()){
     if(block.start>pre+removed){block.start+=delta;block.end+=delta}
     else if(block.end>pre){block.end=Math.max(block.start,block.end+delta)}
   }
 }
 async exportBlob(){if(!this.mutations.length)return this.file;const parts=[];let cursor=0;for(const m of this.mutations){if(m.start<cursor)throw Error('重疊修改請先儲存後繼續');parts.push(this.file.slice(cursor,m.start),m.text);cursor=m.end}parts.push(this.file.slice(cursor));return new Blob(parts,{type:'text/plain;charset=utf-8'})}
}
