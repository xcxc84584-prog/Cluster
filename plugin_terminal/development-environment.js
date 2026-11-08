/* Cluster PowerShell Development Environment — isolated additive plugin */
(()=>{'use strict';
const $=id=>document.getElementById(id), terminal=$('clusterTerminalPanel'), tabs=$('tabList'), host=$('workarea');
if(!terminal||!tabs||!host)return;
const packages=[
['python','Python','3.13','winget install --id Python.Python.3.13 -e --accept-package-agreements --accept-source-agreements','winget uninstall --id Python.Python.3.13 -e','py -3.13 --version'],
['git','Git','latest','winget install --id Git.Git -e','winget uninstall --id Git.Git -e','git --version'],
['node','Node.js / npm','LTS','winget install --id OpenJS.NodeJS.LTS -e','winget uninstall --id OpenJS.NodeJS.LTS -e','node --version'],
['cmake','CMake','latest','winget install --id Kitware.CMake -e','winget uninstall --id Kitware.CMake -e','cmake --version'],
['ninja','Ninja','latest','winget install --id Ninja-build.Ninja -e','winget uninstall --id Ninja-build.Ninja -e','ninja --version'],
['msys2','MSYS2 (GCC / G++)','rolling','winget install --id MSYS2.MSYS2 -e && C:\\msys64\\usr\\bin\\bash.exe -lc "pacman -Sy --noconfirm mingw-w64-ucrt-x86_64-gcc"','echo Manual removal required: MSYS2 may contain shared toolchains.','C:\\msys64\\ucrt64\\bin\\g++.exe --version'],
['java','OpenJDK','21','winget install --id EclipseAdoptium.Temurin.21.JDK -e','winget uninstall --id EclipseAdoptium.Temurin.21.JDK -e','java -version'],
['arduino','Arduino CLI','latest','winget install --id ArduinoSA.CLI -e','winget uninstall --id ArduinoSA.CLI -e','arduino-cli version'],
['nano','Arduino Mbed Nano Core','latest','arduino-cli core update-index && arduino-cli core install arduino:mbed_nano','arduino-cli core uninstall arduino:mbed_nano','arduino-cli core list'],
['esp32','ESP32 Arduino Core','latest','arduino-cli config add board_manager.additional_urls https://espressif.github.io/arduino-esp32/package_esp32_index.json && arduino-cli core update-index && arduino-cli core install esp32:esp32','arduino-cli core uninstall esp32:esp32','arduino-cli core list'],
['pyserial','Python pyserial','latest','py -m pip install pyserial','py -m pip uninstall pyserial','py -m pip show pyserial'],
['clang',"LLVM / Clang",'latest',"winget install --id LLVM.LLVM -e --accept-package-agreements --accept-source-agreements","winget uninstall --id LLVM.LLVM -e","clang --version"],
['dotnet',".NET SDK",'8',"winget install --id Microsoft.DotNet.SDK.8 -e --accept-package-agreements --accept-source-agreements","winget uninstall --id Microsoft.DotNet.SDK.8 -e","dotnet --version"],
['go',"Go SDK",'latest',"winget install --id GoLang.Go -e --accept-package-agreements --accept-source-agreements","winget uninstall --id GoLang.Go -e","go version"],
['rust',"Rust / Cargo",'latest',"winget install --id Rustlang.Rustup -e --accept-package-agreements --accept-source-agreements","winget uninstall --id Rustlang.Rustup -e","rustc --version"],
['powershell7',"PowerShell 7",'latest',"winget install --id Microsoft.PowerShell -e --accept-package-agreements --accept-source-agreements","winget uninstall --id Microsoft.PowerShell -e","pwsh --version"],
['gh',"GitHub CLI",'latest',"winget install --id GitHub.cli -e --accept-package-agreements --accept-source-agreements","winget uninstall --id GitHub.cli -e","gh --version"],
['vscode',"Visual Studio Code",'latest',"winget install --id Microsoft.VisualStudioCode -e --accept-package-agreements --accept-source-agreements","winget uninstall --id Microsoft.VisualStudioCode -e","code --version"],
['esptool',"esptool",'latest',"py -m pip install esptool","py -m pip uninstall esptool","py -m esptool version"],
['pytest',"pytest",'latest',"py -m pip install pytest","py -m pip uninstall pytest","py -m pytest --version"],
['black',"Black Formatter",'latest',"py -m pip install black","py -m pip uninstall black","py -m black --version"],
['ruff',"Ruff",'latest',"py -m pip install ruff","py -m pip uninstall ruff","ruff --version"],
['jupyter',"JupyterLab",'latest',"py -m pip install jupyter","py -m pip uninstall jupyter","jupyter lab --version"],
['platformio',"PlatformIO Core",'latest',"py -m pip install platformio","py -m pip uninstall platformio","pio --version"],
['docker',"Docker Desktop",'latest',"winget install --id Docker.DockerDesktop -e --accept-package-agreements --accept-source-agreements","winget uninstall --id Docker.DockerDesktop -e","docker --version"],
['typescript',"TypeScript Compiler",'latest',"npm install -g typescript","npm uninstall -g typescript","tsc --version"],
['openocd',"OpenOCD",'latest',"winget install --id xpack-dev-tools.openocd-xpack -e","winget uninstall --id xpack-dev-tools.openocd-xpack -e","openocd --version"],
['postman',"Postman",'latest',"winget install --id Postman.Postman -e","winget uninstall --id Postman.Postman -e","winget list --id Postman.Postman -e"]
];
const dict={zh:{new:'+工作階段',close:'關閉工作階段',tool:'PowerShell 工具',revoke:'移除本地存取權限',dev:'開發環境',search:'搜尋語言或插件，例如 C、Python、Java...',pkg:'可安裝內容',version:'版本',install:'快速安裝 CMD 下載',uninstall:'快速卸載 CMD 下載',detect:'偵測 CMD 下載',download:'下載',guide:'啟用 Windows PowerShell',steps:['下載並安裝 Node.js 20+ 與 Cluster 本地 Agent 安裝程式。','執行安裝程式，取得配對 Token。','將 Token 貼入下方欄位，僅在信任的個人電腦上記住配對。','往後開啟 Cluster，選擇 PowerShell 即可連線。'],help:'安裝、疑難排解與移除教學'},en:{new:'+Session',close:'Close Session',tool:'PowerShell Tool',revoke:'Remove Local Permission',dev:'Development Environment',search:'Search languages or plugins: C, Python, Java...',pkg:'Available Package',version:'Version',install:'Download Install CMD',uninstall:'Download Uninstall CMD',detect:'Download Detect CMD',download:'Download',guide:'Enable Windows PowerShell',steps:['Install Node.js 20+ and download the Cluster Agent installer.','Run the installer and obtain the pairing token.','Paste the token below; remember pairing only on a trusted personal device.','Open Cluster and select PowerShell on future visits.'],help:'Installation, troubleshooting and removal guide'}};
const lang=()=>$('uiLanguage')?.value==='en'?'en':'zh';
const panel=document.createElement('section');panel.id='clusterDevelopmentPanel';panel.hidden=true;panel.className='cluster-terminal-panel';
panel.style.cssText='overflow:auto;padding:20px;background:#101116;color:#eee;position:absolute;inset:0;z-index:8';
host.append(panel);
const tab=document.createElement('div');tab.className='tab cluster-dev-tab';tab.dataset.tabKey='tool:development-environment';tab.style.display='none';const tabSelect=document.createElement('button');tabSelect.className='tab-select';const tabClose=document.createElement('button');tabClose.textContent='×';tab.append(tabSelect,tabClose);
let active=false;
function script(p,kind){const cmd=p[kind==='install'?3:kind==='uninstall'?4:5];const lines=['@echo off','setlocal','chcp 65001 >nul','echo Cluster: '+p[1]+' '+kind];if(kind==='uninstall')lines.push('choice /C YN /M "Remove '+p[1]+'?"','if errorlevel 2 exit /b 2');lines.push(cmd,'set "result=%errorlevel%"','echo Exit code: %result%','pause','exit /b %result%');return lines.join('\r\n')+'\r\n';}
function download(p,kind){const blob=new Blob([script(p,kind)],{type:'application/octet-stream'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=p[0]+'-'+kind+'.cmd';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
const searchAliases={"python":"python py py3 pip venv","git":"git version control","node":"javascript js node npm web","cmake":"c cpp c++ cmake","ninja":"c cpp c++ build ninja","msys2":"c cpp c++ gcc g++ mingw compiler","java":"java jave jdk javac","arduino":"arduino c cpp embedded","nano":"arduino nano ble nrf52840 c cpp","esp32":"esp32 arduino c cpp","pyserial":"python serial uart","clang":"c cpp c++ clang llvm compiler","dotnet":"c# csharp dotnet asp.net","go":"golang go","rust":"rust rustlang cargo","powershell7":"powershell ps pwsh","gh":"github gh","vscode":"editor vscode ide","esptool":"esp32 esp8266 python esptool","pytest":"python testing pytest","black":"python formatter black","ruff":"python linter ruff","jupyter":"python notebook data science","platformio":"arduino esp32 embedded python platformio","docker":"container docker","typescript":"typescript ts javascript node","openocd":"openocd c cpp embedded jtag debug","postman":"api http postman"};
const normalizedQuery=q=>q.toLowerCase().normalize('NFKC').trim();
const matchesPackage=(p,q)=>{const tokens=normalizedQuery(q).split(/\s+/).filter(Boolean);const hay=normalizedQuery([p[0],p[1],p[2],searchAliases[p[0]]||''].join(' '));return tokens.every(token=>hay.split(/[^a-z0-9+#.]+/).some(word=>word.startsWith(token))||hay.includes(token));};
let searchText='',category='all',selectedId='python';
const categories=[['all','全部','All'],['languages','程式語言','Languages'],['build','建置工具','Build Tools'],['embedded','嵌入式','Embedded']];
const groupOf=id=>['python','node','java','pyserial','clang','dotnet','go','rust','typescript','pytest','black','ruff','jupyter'].includes(id)?'languages':['cmake','ninja','msys2','git','powershell7','gh','vscode','docker','postman'].includes(id)?'build':'embedded';
const glyphOf=id=>({python:'Py',git:'Git',node:'JS',cmake:'C',ninja:'N',msys2:'C++',java:'J',arduino:'A',nano:'BLE',esp32:'ESP',pyserial:'COM'})[id]||'DEV';
function render(){const d=dict[lang()];tabSelect.textContent=d.dev;
 const previous=document.activeElement?.classList.contains('dev-search');const caret=previous?document.activeElement.selectionStart:0;
 const root=document.createElement('div');root.className='dev-layout';
 const heading=document.createElement('div');heading.className='dev-heading';
 heading.innerHTML='<div class="dev-eyebrow">CLUSTER / POWERSHELL TOOL</div>';
 const title=document.createElement('h2');title.textContent=d.dev;
 const subtitle=document.createElement('p');subtitle.className='dev-subtitle';subtitle.textContent=lang()==='zh'?'管理 Windows 開發工具鏈、檢視指令並下載設定腳本':'Manage Windows toolchains, inspect commands and download setup scripts';
 const input=document.createElement('input');input.className='dev-search';input.type='search';input.placeholder=d.search;input.value=searchText;
 heading.append(title,subtitle,input);root.append(heading);
 const workspace=document.createElement('div');workspace.className='dev-workspace';
 const sidebar=document.createElement('nav');sidebar.className='dev-sidebar';sidebar.setAttribute('aria-label',lang()==='zh'?'環境分類':'Environment categories');
 const sideTitle=document.createElement('div');sideTitle.className='dev-sidebar-title';sideTitle.textContent=lang()==='zh'?'分類':'Categories';sidebar.append(sideTitle);
 const visible=packages.filter(p=>(category==='all'||groupOf(p[0])===category)&&matchesPackage(p,searchText));
 for(const [id,zh,en] of categories){const btn=document.createElement('button');btn.className='dev-filter';btn.type='button';btn.setAttribute('aria-pressed',String(category===id));const label=document.createElement('span');label.textContent=lang()==='zh'?zh:en;const count=document.createElement('span');count.className='dev-count';count.textContent=String(id==='all'?packages.length:packages.filter(p=>groupOf(p[0])===id).length);btn.append(label,count);btn.onclick=()=>{category=id;render()};sidebar.append(btn)}
 const list=document.createElement('div');list.className='dev-list';const meta=document.createElement('div');meta.className='dev-list-meta';meta.textContent=lang()==='zh'?('可用環境 · '+visible.length+' 項'):('Available environments · '+visible.length);list.append(meta);
 if(!visible.some(p=>p[0]===selectedId))selectedId=visible[0]?.[0]||'';
 for(const p of visible){const item=document.createElement('button');item.className='dev-item';item.type='button';item.setAttribute('aria-selected',String(selectedId===p[0]));const glyph=document.createElement('span');glyph.className='dev-glyph';glyph.textContent=glyphOf(p[0]);const content=document.createElement('span');const name=document.createElement('span');name.className='dev-item-name';name.textContent=p[1];const description=document.createElement('span');description.className='dev-item-desc';description.textContent=(lang()==='zh'?'版本 ':'Version ')+p[2]+' · '+(categories.find(c=>c[0]===groupOf(p[0]))?.[lang()==='zh'?1:2]||'');content.append(name,description);item.append(glyph,content);item.onclick=()=>{selectedId=p[0];render()};list.append(item)}
 if(!visible.length){const empty=document.createElement('p');empty.className='dev-empty';empty.textContent=lang()==='zh'?'找不到符合條件的環境':'No matching environments';list.append(empty)}
 const details=document.createElement('aside');details.className='dev-details';const p=packages.find(x=>x[0]===selectedId);
 if(p){const top=document.createElement('div');top.className='dev-detail-head';const glyph=document.createElement('span');glyph.className='dev-glyph';glyph.textContent=glyphOf(p[0]);const info=document.createElement('div');const h=document.createElement('h3');h.textContent=p[1];const version=document.createElement('div');version.className='dev-muted';version.textContent=(lang()==='zh'?'版本：':'Version: ')+p[2];info.append(h,version);top.append(glyph,info);details.append(top);
 const section=document.createElement('div');section.className='dev-section';const sectionTitle=document.createElement('div');sectionTitle.className='dev-section-title';sectionTitle.textContent=lang()==='zh'?'CMD 腳本下載':'CMD SCRIPT DOWNLOADS';section.append(sectionTitle);const actions=document.createElement('div');actions.className='dev-actions';for(const [kind,zh,en] of [['install','↓ 安裝','↓ Install'],['uninstall','↓ 卸載','↓ Uninstall'],['detect','↓ 偵測','↓ Detect']]){const btn=document.createElement('button');btn.className='dev-action'+(kind==='install'?' primary':'');btn.textContent=lang()==='zh'?zh:en;btn.title=(lang()==='zh'?'下載':'Download')+' '+kind+' .cmd';btn.onclick=()=>download(p,kind);actions.append(btn)}section.append(actions);details.append(section);
 const commandSection=document.createElement('div');commandSection.className='dev-section';const label=document.createElement('div');label.className='dev-section-title';label.textContent=lang()==='zh'?'安裝命令預覽':'INSTALL COMMAND PREVIEW';const command=document.createElement('div');command.className='dev-command';command.textContent=p[3];const note=document.createElement('p');note.className='dev-muted';note.textContent=lang()==='zh'?'腳本只會下載到本機，不會自動執行。卸載前請檢查共用依賴。':'Scripts are downloaded, never executed automatically. Check shared dependencies before uninstalling.';commandSection.append(label,command,note);details.append(commandSection)}
 workspace.append(sidebar,list,details);root.append(workspace);panel.replaceChildren(root);
 input.oninput=()=>{searchText=input.value;render()};
 if(previous){input.focus();input.setSelectionRange(caret,caret)}
}
let opened=false;
function ensureTab(){if(!opened)return;if(!tabs.contains(tab))tabs.append(tab);tab.style.display='flex';window.ClusterTabOrder?.apply?.();}
function deactivate(){if(!opened)return;active=false;panel.hidden=true;tab.classList.remove('is-active');}
function open(){opened=true;active=true;ensureTab();window.ClusterTerminal?.deactivate?.();terminal.hidden=true;document.body.classList.remove('cluster-terminal-active');$('editorShell').hidden=true;$('empty').hidden=true;if($('localRangeView'))$('localRangeView').hidden=true;if($('clusterBottomBar'))$('clusterBottomBar').hidden=true;panel.hidden=false;document.querySelectorAll('#tabList .tab').forEach(t=>t.classList.remove('is-active'));tab.classList.add('is-active');render();}
function close(){if(!opened)return;const wasActive=active;opened=false;active=false;panel.hidden=true;tab.remove();if(wasActive)window.cluster?.fm?.notify?.();}
tabSelect.onclick=open;tabClose.onclick=close;
const toolbar=terminal.querySelector('.terminal-toolbar'),revoke=$('terminalRevoke'),newSession=$('terminalNew'),closeSession=$('terminalClose');
const menuWrap=document.createElement('span');menuWrap.style.cssText='position:relative;display:inline-flex';const trigger=document.createElement('button');trigger.id='terminalToolButton';trigger.type='button';const menu=document.createElement('div');menu.hidden=true;menu.style.cssText='position:absolute;right:0;top:100%;z-index:30;min-width:230px;padding:8px;background:#24252c;border:1px solid #555;border-radius:8px';revoke.remove();revoke.style.cssText+=';display:block;width:100%;margin-bottom:6px';const devButton=document.createElement('button');devButton.type='button';devButton.id='terminalDevButton';devButton.style.cssText='display:block;width:100%';menu.append(revoke,devButton);menuWrap.append(trigger,menu);toolbar.append(menuWrap);trigger.onclick=()=>{menu.hidden=!menu.hidden};devButton.onclick=()=>{menu.hidden=true;open()};document.addEventListener('click',e=>{if(!menuWrap.contains(e.target))menu.hidden=true});
function localize(){const d=dict[lang()];newSession.textContent=d.new;closeSession.textContent=d.close;trigger.textContent=d.tool+' ▾';revoke.textContent=d.revoke;devButton.textContent=d.dev;const guide=$('terminalSetup');if(guide){const h=guide.querySelector('h3'),li=guide.querySelectorAll('ol li');if(h)h.textContent=d.guide;li.forEach((el,i)=>{if(i===0){const a=el.querySelector('a');if(a){a.textContent=lang()==='zh'?'下載 Cluster Agent 安裝程式 (.cmd)':'Download Cluster Agent installer (.cmd)';el.replaceChildren(document.createTextNode(lang()==='zh'?'安裝 Node.js 20+，並':'Install Node.js 20+ and '),a)}else el.textContent=d.steps[i]}else el.textContent=d.steps[i]});const a=guide.querySelector('p a[href="../TERMINAL_SETUP.md"]');if(a)a.textContent=d.help;}if(active)render();}
$('uiLanguage')?.addEventListener('change',localize);localize();
// Editor's tabs() rebuilds #tabList via replaceChildren. Keep this tab alive
// across file changes without forcing the Development panel back on top.
window.cluster?.fm?.onChange?.(()=>{if(opened)ensureTab();});
// Toolbar navigation also changes views without selecting a tab.
document.addEventListener('click',event=>{
 if(!opened||!active)return;
 const button=event.target.closest('button');
 if(!button)return;
 if(button.id==='terminalNew'||button.id==='terminalConnect'||button.id==='terminalClose'||button.id==='terminalDismissGuide'||button.id==='terminalButton'||button.id==='powershellButton'||button.dataset.action==='new'||button.dataset.action==='open')deactivate();
},true);
tabs.addEventListener('click',event=>{
 const clicked=event.target.closest('.tab');
 if(!clicked||clicked===tab||!opened)return;
 if(event.target.closest('.tab-select'))deactivate();
},true);
// Terminal sessions and file tabs are separate views; their selection should
// not close or remove the Development Environment tab.
const observer=new MutationObserver(()=>{if(opened&&!tabs.contains(tab))ensureTab();});
observer.observe(tabs,{childList:true});
document.querySelector('[data-action="closeall"]')?.addEventListener('click',close);
window.ClusterDevelopmentEnvironment={open,close,deactivate,download};
})();
