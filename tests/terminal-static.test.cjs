const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('legacy simulated shell removed',()=>assert.equal(fs.existsSync(path.join(__dirname,'../local-powershell')),false));
test('terminal plugin loaded by Cluster',()=>assert.match(read('BASE/index.html'),/plugin_terminal\/terminal\.js/));
test('original PowerShell button now launches embedded tab',()=>{const s=read('BASE/cluster-standalone.js');assert.match(s,/ClusterTerminal\?\.open/);assert.doesNotMatch(s,/local-powershell\//)});
test('per-workspace multiple sessions are possible',()=>{const s=read('agent_terminal/server.cjs');assert.match(s,/sessions\.set\(id/);assert.match(s,/pty\.spawn/);assert.match(s,/MAX_SESSIONS=8/)});
test('agent validates loopback, origin and pairing',()=>{const s=read('agent_terminal/server.cjs');assert.match(s,/isLoopback\(req\.socket\.remoteAddress\)/);assert.match(s,/origin!==allowedOrigin/);assert.match(s,/timingSafeEqual/)});
test('agent binds validated workspace root',()=>{const s=read('agent_terminal/server.cjs');assert.match(s,/realpathSync\.native/);assert.match(s,/roots\.get\(m\.workspaceId\)/)});
