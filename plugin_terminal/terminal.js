/* Cluster Terminal Plugin: GitHub Pages frontend + opt-in local Windows agent. */
(()=>{'use strict';
 const host=document.getElementById('workarea'),tabs=document.getElementById('tabList');
 if(!host||!tabs)return;
 const panel=document.createElement('section');panel.id='clusterTerminalPanel';panel.className='cluster-terminal-panel';panel.hidden=true;
 panel.innerHTML=`<div class="terminal-toolbar"><strong>PowerShell</strong><span id="terminalState">Not connected</span><button type="button" id="terminalNew">+ Session</button><button type="button" id="terminalClose">Close session</button></div><div id="terminalSetup" class="terminal-setup"><h3>Enable real Windows PowerShell</h3><p>Install and start the local Cluster Terminal Agent on this computer. GitHub Pages cannot run PowerShell by itself.</p><ol><li>Download the Agent from this Cluster deployment's <code>agent_terminal/</code> folder.</li><li>Install Node.js 20+ on Windows, then run <code>start-agent.cmd</code>.</li><li>Enter this website's GitHub Pages origin when prompted.</li><li>Copy the pairing token printed by the Agent, paste below, then connect.</li></ol><label>Pairing token <input id="terminalToken" type="password" autocomplete="off" placeholder="Agent pairing token"></label><button id="terminalConnect" type="button">Connect to local Agent</button><p id="terminalError" role="alert"></p><p class="terminal-note">A local agent executes commands with your Windows account permissions. Only connect to a trusted Cluster deployment.</p></div><div id="terminalBind" class="terminal-setup" hidden><h3>Bind workspace root</h3><p id="terminalRootInfo"></p><label>Absolute Windows folder path <input id="terminalRootPath" type="text" placeholder="C:\\Projects\\MyWorkspace"></label><button type="button" id="terminalBindButton">Bind and open PowerShell</button><p id="terminalBindError" role="alert"></p></div><div id="terminalOutput" class="terminal-output" hidden></div>`;
 host.append(panel);
 const $=id=>document.getElementById(id);const sessions=[];const boundWorkspaces=new Set();let selected=null,ws=null,ready=false,pendingWorkspace=null;
 const tokenInput=$('terminalToken');tokenInput.value=sessionStorage.getItem('cluster-terminal-token')||'';
 const showError=e=>{$('terminalError').textContent=String(e?.message||e)};
 function connected(){return ready&&ws?.readyState===WebSocket.OPEN}
 function send(m){if(!connected())throw Error('Agent is not connected');ws.send(JSON.stringify(m));}
 function showTab(){panel.hidden=false;$('editorShell').hidden=true;$('empty').hidden=true;$('localRangeView').hidden=true;$('clusterBottomBar').hidden=true;document.querySelectorAll('#tabList .tab').forEach(t=>t.classList.remove('is-active'));syncTabs();}
 function deactivate(){selected=null;panel.hidden=true;syncTabs();}
 function syncTabs(){tabs.querySelectorAll('.terminal-tab').forEach(x=>x.remove());for(const s of sessions){const el=document.createElement('div');el.className='tab terminal-tab'+(selected===s?' is-active':'');const b=document.createElement('button');b.className='tab-select';b.textContent='⌁ '+s.label;b.onclick=()=>select(s);const c=document.createElement('button');c.className='tab-close';c.textContent='×';c.title='Close terminal';c.onclick=()=>close(s);el.append(b,c);tabs.append(el)} }
 function select(s){selected=s;showTab();$('terminalSetup').hidden=true;$('terminalBind').hidden=true;$('terminalOutput').hidden=false;$('terminalOutput').replaceChildren(s.container);$('terminalState').textContent=s.exited?'Exited':connected()?'Connected':'Disconnected';s.term?.focus();requestAnimationFrame(()=>{s.fit?.fit();resize(s)})}
 function resize(s){if(s?.id&&connected()&&s.term)send({type:'resize',id:s.id,cols:s.term.cols,rows:s.term.rows});}
 function close(s){if(s.id&&connected())send({type:'close',id:s.id});s.term?.dispose();s.container.remove();const i=sessions.indexOf(s);if(i>=0)sessions.splice(i,1);if(selected===s){selected=null;if(sessions.length)select(sessions.at(-1));else{panel.hidden=true;window.cluster?.fm?.notify();}}syncTabs()}
 async function loadXterm(){if(window.Terminal&&window.FitAddon)return;await new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href='https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/css/xterm.css';document.head.append(link);const scripts=['https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/lib/xterm.js','https://cdn.jsdelivr.net/npm/@xterm/addon-fit@0.10.0/lib/addon-fit.js'];let i=0;function next(){if(i===scripts.length){resolve();return}const el=document.createElement('script');el.src=scripts[i++];el.onload=next;el.onerror=()=>reject(Error('Unable to load xterm.js. Check network access.'));document.head.append(el)}next()})}
 function createUI(id,workspaceId,cwd){const container=document.createElement('div');container.className='terminal-screen';const s={id,workspaceId,cwd,container,label:'PS '+(sessions.length+1),exited:false};sessions.push(s);select(s);
  try{const term=new window.Terminal({cursorBlink:true,convertEol:true,theme:{background:'#10141b',foreground:'#e4eaf4'},fontFamily:'Consolas, monospace',fontSize:13,scrollback:5000});const fit=new window.FitAddon.FitAddon();term.loadAddon(fit);term.open(container);fit.fit();s.term=term;s.fit=fit;term.onData(data=>{if(connected())send({type:'input',id,data})});resize(s);term.focus();}catch(e){container.textContent='Terminal UI failed: '+e.message}syncTabs();}
 function onMessage(event){let m;try{m=JSON.parse(event.data)}catch{return}
  if(m.type==='ready'){ready=true;$('terminalState').textContent='Agent connected';$('terminalSetup').hidden=true;void createSession();}
  if(m.type==='bound'){const root=pendingWorkspace;if(root&&root.id===m.workspaceId){boundWorkspaces.add(root.id);$('terminalBind').hidden=true;send({type:'create',workspaceId:root.id,requestId:crypto.randomUUID(),cols:100,rows:30});}}
  if(m.type==='created'){createUI(m.id,m.workspaceId,m.cwd);}
  if(m.type==='data'){sessions.find(s=>s.id===m.id)?.term?.write(m.data);}
  if(m.type==='exit'){const s=sessions.find(s=>s.id===m.id);if(s){s.exited=true;s.term?.writeln('\r\n[PowerShell exited: '+m.exitCode+']');if(selected===s)$('terminalState').textContent='Exited';}}
  if(m.type==='error'){$('terminalBindError').textContent=m.message;showError(m.message);}
 }
 function connect(){const token=tokenInput.value.trim();if(!/^[a-f0-9]{64}$/i.test(token)){showError('Enter the 64-character token shown by the Agent.');return}sessionStorage.setItem('cluster-terminal-token',token);ready=false;showError('');$('terminalState').textContent='Connecting…';try{ws?.close();ws=new WebSocket('ws://127.0.0.1:43879/terminal');ws.onopen=()=>ws.send(JSON.stringify({type:'auth',token}));ws.onmessage=onMessage;ws.onerror=()=>showError('Cannot reach local Agent. Check the Agent window, browser security settings, and allowed origin.');ws.onclose=()=>{ready=false;boundWorkspaces.clear();$('terminalState').textContent='Agent disconnected';for(const s of sessions){s.exited=true;s.term?.writeln('\r\n[Agent disconnected]')}}}catch(e){showError(e)}}
 async function resolveWorkspace(){const d=window.cluster?.fm?.active;const roots=window.ClusterCEXP?.roots||[];
  if(d?.handle){for(const root of roots){if(root.kind!=='directory')continue;try{const rel=await root.handle.resolve(d.handle);if(rel!==null)return {id:root.persistId||root.id,name:root.name};}catch{}}}
  if(roots.filter(r=>r.kind==='directory').length===1){const root=roots.find(r=>r.kind==='directory');return{id:root.persistId||root.id,name:root.name}}
  return null;
 }
 async function createSession(){if(!connected()){panel.hidden=false;$('terminalSetup').hidden=false;$('terminalBind').hidden=true;$('terminalOutput').hidden=true;showTab();return}
  const root=await resolveWorkspace();if(!root){panel.hidden=false;$('terminalSetup').hidden=true;$('terminalBind').hidden=false;$('terminalOutput').hidden=true;$('terminalRootInfo').textContent='Open a file inside a directory workspace in Explorer first (single-file picker cannot reveal a Windows root path).';showTab();return}
  pendingWorkspace=root;try{await loadXterm()}catch(e){showError(e);$('terminalSetup').hidden=false;return}
  // Rebind explicitly on every new agent connection. No absolute path is exposed by browser handles.
  if(boundWorkspaces.has(root.id)){send({type:'create',workspaceId:root.id,requestId:crypto.randomUUID(),cols:100,rows:30});return}
  panel.hidden=false;showTab();$('terminalSetup').hidden=true;$('terminalBind').hidden=false;$('terminalOutput').hidden=true;$('terminalRootInfo').textContent='Workspace: '+root.name+' — enter the matching local Windows directory once per Agent run.';$('terminalRootPath').value='';$('terminalBindError').textContent='';
 }
 $('terminalBindButton').onclick=()=>{if(!pendingWorkspace)return;$('terminalBindError').textContent='';try{send({type:'bind',workspaceId:pendingWorkspace.id,rootName:pendingWorkspace.name,path:$('terminalRootPath').value.trim()})}catch(e){$('terminalBindError').textContent=e.message}};
 $('terminalConnect').onclick=connect;$('terminalNew').onclick=()=>void createSession();$('terminalClose').onclick=()=>{if(selected)close(selected)};
 function open(){void createSession()}
 const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>{if(selected?.fit){selected.fit.fit();resize(selected)}}):null;ro?.observe(panel);
 window.ClusterTerminal={open,createSession,syncTabs,deactivate};
})();
