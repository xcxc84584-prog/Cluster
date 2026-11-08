$ErrorActionPreference='Stop'
Write-Host 'Cluster MCP HTTPS Tunnel' -ForegroundColor Cyan
Write-Host 'This publishes the MCP endpoint through a temporary public HTTPS URL.' -ForegroundColor Yellow
Write-Host 'The endpoint requires a separate bearer token. Do not share it.'
$base=Join-Path $env:LOCALAPPDATA 'ClusterTerminalAgent'
$app=Join-Path $base 'app'
$launcher=Join-Path $app 'start-remote-mcp.cmd'
$tokenPath=Join-Path $base 'remote-mcp-token'
if(!(Test-Path $launcher)){
 Write-Host 'Cluster Agent installation not found. Download and run the installer first.' -ForegroundColor Red
 Start-Process 'https://github.com/xcxc84584-prog/Cluster/blob/main/Install-Cluster-Terminal.cmd'
 exit 2
}
$body=@{jsonrpc='2.0';id=1;method='tools/list';params=@{}}|ConvertTo-Json -Depth 5
function Test-LocalMcp {
 if(!(Test-Path $tokenPath)){return $null}
 try {
  $token=(Get-Content $tokenPath -Raw).Trim()
  $result=Invoke-RestMethod -Uri 'http://127.0.0.1:43880/mcp' -Method Post -Headers @{Authorization="Bearer $token"} -ContentType 'application/json' -Body $body -TimeoutSec 2
  if($result.result.tools){return $result}
 }catch{}
 return $null
}
Write-Host '[1/3] Checking local MCP...' -ForegroundColor Cyan
$check=Test-LocalMcp
if(!$check){
 $listener=Get-NetTCPConnection -LocalPort 43880 -State Listen -ErrorAction SilentlyContinue
 if($listener){
  throw 'Port 43880 is occupied but did not respond as Cluster MCP. Close the conflicting process and retry.'
 }
 Write-Host '[2/3] Starting local MCP automatically...' -ForegroundColor Cyan
 Start-Process -FilePath 'cmd.exe' -ArgumentList ('/k '+[char]34+$launcher+[char]34) -WorkingDirectory $app
 for($attempt=0;$attempt -lt 20;$attempt++){
  Start-Sleep -Milliseconds 500
  $check=Test-LocalMcp
  if($check){break}
 }
 if(!$check){throw 'Could not start local MCP. Check the newly opened MCP window for the error.'}
}else{
 Write-Host '[2/3] Existing local MCP is running. Reusing it.' -ForegroundColor Green
}
Write-Host ('[3/3] Local MCP ready: '+$check.result.tools.Count+' tools.') -ForegroundColor Green
$cmd=Get-Command cloudflared -ErrorAction SilentlyContinue
if(!$cmd){
 Write-Host 'cloudflared not found. Install it from the official Cloudflare package.' -ForegroundColor Yellow
 Write-Host 'Run: winget install --id Cloudflare.cloudflared -e'
 $answer=Read-Host 'Install cloudflared using winget now? (Y/N)'
 if($answer -notin @('Y','y')){exit 1}
 & winget install --id Cloudflare.cloudflared -e
 if($LASTEXITCODE -ne 0){throw 'cloudflared installation failed'}
 $cmd=Get-Command cloudflared -ErrorAction SilentlyContinue
 if(!$cmd){
  $locations=@("$env:ProgramFiles\cloudflared\cloudflared.exe","$env:LOCALAPPDATA\Microsoft\WinGet\Links\cloudflared.exe")
  $found=$locations|Where-Object {Test-Path $_}|Select-Object -First 1
  if(!$found){throw 'Restart PowerShell and rerun after installation.'}
  $exe=$found
 }else{$exe=$cmd.Source}
}else{$exe=$cmd.Source}
Write-Host ''
Write-Host 'IMPORTANT: A temporary tunnel URL is NOT sufficient to register a ChatGPT connector.' -ForegroundColor Yellow
Write-Host 'ChatGPT may require OAuth and a stable HTTPS URL. Never paste bearer tokens into chats.'
$confirm=Read-Host 'Start temporary HTTPS tunnel? (Y/N)'
if($confirm -notin @('Y','y')){exit 0}
Write-Host 'Look for https://...trycloudflare.com in the output. Keep this window open.' -ForegroundColor Cyan
& $exe tunnel --url http://127.0.0.1:43880 --no-autoupdate
