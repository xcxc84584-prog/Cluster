import {SegmentDocument} from '../SegmentLoader/segment.js';
export class FileManager {
 constructor(emit){this.emit=emit;this.docs=[];this.active=null;this.listeners=new Set()}
 onChange(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn)}
 notify(){for(const fn of this.listeners)fn(this)}
 async open(file,handle=null){const doc=await new SegmentDocument(file,this.emit).init();doc.handle=handle;doc.dirty=false;this.docs.push(doc);this.active=doc;this.notify();return doc}
 async create(){return this.open(new File([''],'未命名.txt',{type:'text/plain'}))}
 select(id){this.active=this.docs.find(x=>x.id===id)||null;this.notify()}
 close(id){this.docs=this.docs.filter(x=>x.id!==id);if(this.active?.id===id)this.active=this.docs.at(-1)||null;this.notify()}
 async save(doc=this.active,saveAs=false){if(!doc)throw Error('沒有文件');const blob=await doc.exportBlob();if(!saveAs&&doc.handle?.createWritable){const writer=await doc.handle.createWritable();await blob.stream().pipeTo(writer);doc.file=await doc.handle.getFile();doc.size=doc.file.size;doc.mutations=[];doc.pendingView=null;doc.dirty=false;this.emit('FileManager',`Saved "${doc.name}"`);this.notify();return}if(window.showSaveFilePicker){const handle=await showSaveFilePicker({suggestedName:doc.name});const writer=await handle.createWritable();await blob.stream().pipeTo(writer);doc.handle=handle;doc.file=await handle.getFile();doc.size=doc.file.size;doc.mutations=[];doc.pendingView=null;doc.dirty=false;this.notify();return}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=doc.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);this.emit('FileManager',`Downloaded "${doc.name}"`)}
}
