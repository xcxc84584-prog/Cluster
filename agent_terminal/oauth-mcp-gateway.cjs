'use strict';
// Cluster P3.7 OAuth 2.1 authorization-code + PKCE gateway for MCP.
// Node >=20. Place behind a trusted HTTPS tunnel and set CLUSTER_OAUTH_ISSUER
// to its exact stable HTTPS origin. Loopback only; no public listener.
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const {URL,URLSearchParams}=require('node:url');
const dir=path.join(process.env.LOCALAPPDATA||path.join(os.homedir(),'AppData','Local'),'ClusterTerminalAgent');
fs.mkdirSync(dir,{recursive:true});
const issuer=(process.env.CLUSTER_OAUTH_ISSUER||'').replace(/\/$/,'');
if(!/^https:\/\/[^/?#]+$/.test(issuer))throw Error('Set CLUSTER_OAUTH_ISSUER to the exact public HTTPS origin (no path).');
const port=Number(process.env.CLUSTER_OAUTH_PORT||43881);
const adminPath=path.join(dir,'oauth-approval-password');
const bearerPath=path.join(dir,'remote-mcp-token');
if(!fs.existsSync(adminPath))fs.writeFileSync(adminPath,crypto.randomBytes(24).toString('base64url')+'\n',{mode:0o600,flag:'wx'});
const password=fs.readFileSync(adminPath,'utf8').trim();
const clients=new Map(),codes=new Map(),tokens=new Map(),pending=new Map();
const failedApprovals=new Map();
const now=()=>Date.now(),random=()=>crypto.randomBytes(32).toString('base64url');
const secureEqual=(a,b)=>{if(typeof a!=='string'||typeof b!=='string')return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&crypto.timingSafeEqual(x,y)};
const respond=(res,status,obj,extra={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra});res.end(JSON.stringify(obj))};
const fail=(res,status,error,description)=>respond(res,status,{error,error_description:description||error});
const html=(s)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const metadata=()=>({issuer,authorization_endpoint:issuer+'/authorize',token_endpoint:issuer+'/token',registration_endpoint:issuer+'/register',response_types_supported:['code'],grant_types_supported:['authorization_code'],code_challenge_methods_supported:['S256'],token_endpoint_auth_methods_supported:['none'],scopes_supported:['cluster.read']});
const resource=()=>({resource:issuer+'/mcp',authorization_servers:[issuer],scopes_supported:['cluster.read'],bearer_methods_supported:['header']});
function validRedirect(s){try{const u=new URL(s);return !u.hash&&((u.protocol==='https:'&&!!u.hostname)||(u.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(u.hostname)));}catch{return false}}
async function body(req,limit=16384){let b='';for await(const c of req){b+=c;if(Buffer.byteLength(b)>limit)throw Error('request too large')}return b}
function gc(){for(const m of [codes,tokens,pending])for(const [k,v] of m)if(v.expires<now())m.delete(k)}
function redirect(res,url){res.writeHead(302,{Location:url,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});res.end()}
function oauthErrorRedirect(res,uri,state,error){const u=new URL(uri);u.searchParams.set('error',error);if(state)u.searchParams.set('state',state);redirect(res,u.href)}
const server=http.createServer(async(req,res)=>{
 try{
  gc();
  const u=new URL(req.url,'http://127.0.0.1');
  const route=u.pathname;
  if(req.method==='GET'&&(route==='/.well-known/oauth-authorization-server'||route==='/.well-known/openid-configuration'))return respond(res,200,metadata());
  if(req.method==='GET'&&(route==='/.well-known/oauth-protected-resource'||route==='/.well-known/oauth-protected-resource/mcp'))return respond(res,200,resource());
  if(route==='/register'&&req.method==='POST'){
   const data=JSON.parse(await body(req));
   if(!Array.isArray(data.redirect_uris)||data.redirect_uris.length<1||data.redirect_uris.length>8||!data.redirect_uris.every(validRedirect))return fail(res,400,'invalid_redirect_uri');
   if(data.token_endpoint_auth_method&&data.token_endpoint_auth_method!=='none')return fail(res,400,'invalid_client_metadata','Only public PKCE clients supported');
   if(clients.size>=200)return fail(res,429,'temporarily_unavailable','Client registration limit reached');
   const id=random();
   clients.set(id,{redirects:data.redirect_uris,created:now()});
   return respond(res,201,{client_id:id,client_id_issued_at:Math.floor(now()/1000),redirect_uris:data.redirect_uris,token_endpoint_auth_method:'none',grant_types:['authorization_code'],response_types:['code']});
  }
  if(route==='/authorize'&&req.method==='GET'){
   const q=u.searchParams,id=q.get('client_id'),client=clients.get(id),uri=q.get('redirect_uri');
   if(!client||!client.redirects.includes(uri))return fail(res,400,'invalid_request','Unregistered client or redirect URI');
   const state=q.get('state')||'',challenge=q.get('code_challenge')||'';
   if(q.get('response_type')!=='code'||q.get('code_challenge_method')!=='S256'||!/^[A-Za-z0-9_-]{43,128}$/.test(challenge)||!state||state.length>512)return oauthErrorRedirect(res,uri,state,'invalid_request');
   const scope=q.get('scope')||'cluster.read';
   if(scope!=='cluster.read')return oauthErrorRedirect(res,uri,state,'invalid_scope');
   const ticket=random();
   pending.set(ticket,{id,uri,state,challenge,expires:now()+300000});
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; form-action "+issuer+" "+new URL(uri).origin+"; base-uri 'none'; frame-ancestors 'none'",'Referrer-Policy':'no-referrer','X-Frame-Options':'DENY'});
   return res.end('<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cluster · OAuth</title><style>\n:root{color-scheme:dark;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:#080a10;color:#edf1fb}\n*{box-sizing:border-box}body{min-height:100vh;margin:0;display:grid;place-items:center;padding:24px;background:#090b10}\n.shell{width:min(100%,400px);background:#10131a;border:1px solid #303746;border-radius:16px;box-shadow:0 18px 55px #0008;overflow:hidden}\n.top{display:flex;align-items:center;gap:12px;padding:20px 24px;border-bottom:1px solid #293140}.logo{width:36px;height:36px;display:grid;place-items:center;background:#1c3359;color:#a8d1ff;border:1px solid #345b93;border-radius:10px;font-size:21px}.brand{font-size:16px;font-weight:700;letter-spacing:.03em}.sub{font-size:12px;color:#96a4ba}.main{padding:28px 24px 30px}.pill{display:inline-flex;padding:5px 9px;border:1px solid #355c82;border-radius:20px;background:#17263a;color:#a9d2ff;font-size:12px;font-weight:600}\nh1{font-size:21px;line-height:1.35;margin:0 0 24px}p{color:#aeb9c9;line-height:1.65;font-size:13px;margin:0 0 18px}.scope{border:1px solid #303949;background:#0b101a;border-radius:10px;padding:13px 14px;margin:18px 0}.scope strong{display:block;font-size:13px}.scope small{display:block;margin-top:5px;color:#9faec2;line-height:1.5}\nlabel{display:block;font-size:13px;font-weight:600;margin:20px 0 9px}.pw{display:flex;gap:8px}.pw input{min-width:0;flex:1;background:#080d16;border:1px solid #414d60;border-radius:8px;color:#fff;padding:12px;font:inherit;outline:none}.pw input:focus-visible{border-color:#77b6ff;box-shadow:0 0 0 3px #3279c933}\n.pw button,.actions button{font:inherit;cursor:pointer;border-radius:8px}.pw button{padding:0 12px;border:1px solid #3c485a;background:#202937;color:#e2e9f6}\n.actions{display:flex;gap:10px;margin-top:20px}.actions button{min-height:44px;padding:11px 14px;font-size:13px;font-weight:700}.approve{flex:1;background:#3689e8;color:white;border:1px solid #59a4f8}.approve:hover{background:#4899f1}.deny{background:#1c2430;color:#c5d0df;border:1px solid #3a4656}.actions button:disabled{opacity:.55;cursor:wait}\n.foot{border-top:1px solid #293140;padding:15px 24px;color:#8f9db2;font-size:12px;line-height:1.6}.lang{margin-left:auto;background:transparent;border:1px solid #414b5c;border-radius:7px;padding:7px 9px;color:#c7d6ea;cursor:pointer}\n@media(max-width:420px){body{padding:12px}.main{padding:20px}.top{padding:17px 20px}}\n</style></head><body><div class="shell"><header class="top"><div class="logo" aria-hidden="true">✧</div><div><div class="brand">CLUSTER</div><div class="sub">ChatGPT · MCP</div></div><button type="button" class="lang" id="lang" aria-label="Switch language">EN</button></header><main class="main"><h1 id="heading">連接 ChatGPT</h1><form id="consent" method="POST" action="\'+html(issuer)+\'/approve"><input type="hidden" name="ticket" value="\'+ticket+\'"><label for="password" id="passwordLabel">本機授權密碼</label><div class="pw"><input id="password" type="password" name="password" autocomplete="off" required aria-required="true"><button type="button" id="toggle" aria-label="Show password">顯示</button></div><div class="actions"><button class="deny" type="submit" name="decision" value="deny" formnovalidate id="deny">拒絕</button><button class="approve" type="submit" name="decision" value="approve" id="approve">同意授權</button></div></form></main></div><script>\n(function(){var en=false;var dict={zh:[\'唯讀權限 · READ ONLY\',\'授權 ChatGPT 連接 Cluster？\',\'確認你正在主動連接 Cluster。本次授權只允許讀取目前開放的 MCP 資訊，不允許執行 PowerShell 或修改檔案。\',\'允許存取 · 5 個唯讀工具\',\'連線狀態、任務狀態、已開啟檔案列表、編輯器狀態與已儲存檔案內容。\',\'本機授權密碼\',\'顯示\',\'隱藏\',\'拒絕\',\'同意授權\',\'密碼僅保存在你的本機裝置。請勿向任何人分享密碼或 Token。\',\'處理中…\'],en:[\'READ-ONLY ACCESS\',\'Connect ChatGPT to Cluster?\',\'Approve this request only if you initiated it. Access is limited to five read-only MCP tools. No PowerShell execution or file edits.\',\'Allow access · 5 read-only tools\',\'Connection status, task status, open files, editor state and saved file content.\',\'Local approval password\',\'Show\',\'Hide\',\'Deny\',\'Approve access\',\'Your password stays on this device. Never share passwords or tokens.\',\'Processing…\']};var ids=[\'pill\',\'heading\',\'intro\',\'scopeTitle\',\'scopeDesc\',\'passwordLabel\',\'toggle\',\'toggle\',\'deny\',\'approve\',\'footer\'];var pass=document.getElementById(\'password\');function translate(){var d=dict[en?\'en\':\'zh\'];for(var i=0;i<ids.length;i++){if(i===6||i===7)continue;(document.getElementById(ids[i])||{textContent:''}).textContent=(i===1?(en?'Connect ChatGPT':'連接 ChatGPT'):d[i])}document.getElementById(\'toggle\').textContent=pass.type===\'password\'?d[6]:d[7];document.getElementById(\'lang\').textContent=en?\'中\':\'EN\';document.documentElement.lang=en?\'en\':\'zh-Hant\'}document.getElementById(\'lang\').onclick=function(){en=!en;translate()};document.getElementById(\'toggle\').onclick=function(){pass.type=pass.type===\'password\'?\'text\':\'password\';translate()};document.getElementById(\'consent\').addEventListener(\'submit\',function(){var buttons=this.querySelectorAll(\'button[type=submit]\');setTimeout(function(){for(var i=0;i<buttons.length;i++)buttons[i].disabled=true;document.getElementById(\'approve\').textContent=dict[en?\'en\':\'zh\'][11]},0)});translate()})();\n</script></body></html>');
  }
  if(route==='/approve'&&req.method==='POST'){
   const f=new URLSearchParams(await body(req)),ticket=f.get('ticket'),p=pending.get(ticket);
   if(!p)return fail(res,400,'invalid_request','Approval expired');
   if(f.get('decision')==='deny'){pending.delete(ticket);return oauthErrorRedirect(res,p.uri,p.state,'access_denied')}
   const attempts=failedApprovals.get(ticket)||{count:0};
   if(attempts.count>=5){pending.delete(ticket);return fail(res,429,'access_denied','Too many failed attempts; restart authorization');}
   if(!secureEqual(f.get('password'),password)){
    attempts.count++;failedApprovals.set(ticket,attempts);
    if(attempts.count>=5)pending.delete(ticket);
    return fail(res,403,'access_denied','Incorrect local approval password');
   }
   failedApprovals.delete(ticket);
   pending.delete(ticket);
   const code=random();codes.set(code,{...p,expires:now()+60000});
   const target=new URL(p.uri);target.searchParams.set('code',code);target.searchParams.set('state',p.state);
   return redirect(res,target.href);
  }
  if(route==='/token'&&req.method==='POST'){
   const f=new URLSearchParams(await body(req));
   if(f.get('grant_type')!=='authorization_code')return fail(res,400,'unsupported_grant_type');
   const code=f.get('code'),entry=codes.get(code);
   if(!entry||entry.expires<now())return fail(res,400,'invalid_grant');
   codes.delete(code); // one-time, including failed attempts
   const verifier=f.get('code_verifier')||'';
   if(f.get('client_id')!==entry.id||f.get('redirect_uri')!==entry.uri||!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier))return fail(res,400,'invalid_grant');
   const actual=crypto.createHash('sha256').update(verifier).digest('base64url');
   if(!secureEqual(actual,entry.challenge))return fail(res,400,'invalid_grant');
   const access=random();tokens.set(access,{client:entry.id,expires:now()+3600000});
   return respond(res,200,{access_token:access,token_type:'Bearer',expires_in:3600,scope:'cluster.read'});
  }
  if(route==='/mcp'){
   const auth=req.headers.authorization||'',token=auth.startsWith('Bearer ')?auth.slice(7):'',session=tokens.get(token);
   if(!session||session.expires<now())return respond(res,401,{error:'Unauthorized'},{'WWW-Authenticate':'Bearer resource_metadata="'+issuer+'/.well-known/oauth-protected-resource/mcp"'});
   if(!['POST','GET','DELETE'].includes(req.method))return fail(res,405,'method_not_allowed');
   const payload=req.method==='POST'?await body(req,32768):undefined;
   const internal=fs.readFileSync(bearerPath,'utf8').trim();
   const upstream=await fetch('http://127.0.0.1:43880/mcp',{method:req.method,headers:{Authorization:'Bearer '+internal,'Content-Type':'application/json','Accept':'application/json, text/event-stream'},...(payload!==undefined?{body:payload}:{}),signal:AbortSignal.timeout(18000)});
   res.writeHead(upstream.status,{'Content-Type':upstream.headers.get('content-type')||'application/json','Cache-Control':'no-store'});
   return res.end(Buffer.from(await upstream.arrayBuffer()));
  }
  return fail(res,404,'not_found');
 }catch(e){console.error('OAuth gateway error:',e.message);if(!res.headersSent)fail(res,500,'server_error')}
});
server.listen(port,'127.0.0.1',()=>{console.log('Cluster OAuth MCP gateway: http://127.0.0.1:'+port+'/mcp');console.log('Public issuer: '+issuer);console.log('Local approval password file: '+adminPath);console.log('Only tunnel port '+port+' after configuring a stable HTTPS hostname.');});
